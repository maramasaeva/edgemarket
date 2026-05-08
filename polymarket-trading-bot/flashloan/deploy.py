"""
Deploy FlashArb.sol to Polygon mainnet.
Reads PRIVATE_KEY from ../.env
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3
import solcx

# =============================================================================
# Configuration
# =============================================================================

POLYGON_RPC = "https://polygon-rpc.com"
SOLC_VERSION = "0.8.20"
CONTRACT_FILE = Path(__file__).parent / "FlashArb.sol"
DEPLOYED_FILE = Path(__file__).parent / ".deployed"
ENV_FILE = Path(__file__).parent.parent / ".env"

# =============================================================================
# Helpers
# =============================================================================

def load_env():
    """Load .env and return private key."""
    if not ENV_FILE.exists():
        print(f"ERROR: {ENV_FILE} not found.")
        print("Create it with: PRIVATE_KEY=0xYourPrivateKeyHere")
        sys.exit(1)
    load_dotenv(ENV_FILE)
    pk = os.getenv("PRIVATE_KEY")
    if not pk:
        print("ERROR: PRIVATE_KEY not set in .env")
        sys.exit(1)
    return pk


def compile_contract() -> tuple[str, str]:
    """Compile FlashArb.sol and return (abi, bytecode)."""
    print(f"Installing solc {SOLC_VERSION} ...")
    solcx.install_solc(SOLC_VERSION)
    solcx.set_solc_version(SOLC_VERSION)

    source = CONTRACT_FILE.read_text()
    print("Compiling FlashArb.sol ...")

    compiled = solcx.compile_source(
        source,
        output_values=["abi", "bin"],
        solc_version=SOLC_VERSION,
    )

    # solcx returns keys like '<stdin>:FlashArb'
    contract_key = None
    for key in compiled:
        if "FlashArb" in key:
            contract_key = key
            break

    if not contract_key:
        print("ERROR: FlashArb contract not found in compiled output.")
        print(f"Available contracts: {list(compiled.keys())}")
        sys.exit(1)

    contract = compiled[contract_key]
    abi = contract["abi"]
    bytecode = contract["bin"]

    print(f"Compiled successfully. Bytecode size: {len(bytecode) // 2} bytes")
    return json.dumps(abi), bytecode


def deploy(private_key: str, abi_json: str, bytecode: str) -> str:
    """Deploy to Polygon and return contract address."""
    w3 = Web3(Web3.HTTPProvider(POLYGON_RPC, request_kwargs={"timeout": 60}))
    if not w3.is_connected():
        print("ERROR: Cannot connect to Polygon RPC")
        sys.exit(1)

    chain_id = w3.eth.chain_id
    print(f"Connected to chain {chain_id} (block {w3.eth.block_number})")

    if chain_id != 137:
        print(f"WARNING: Expected Polygon (137), got {chain_id}")

    account = w3.eth.account.from_key(private_key)
    deployer = account.address
    balance = w3.eth.get_balance(deployer)
    balance_matic = w3.from_wei(balance, "ether")
    print(f"Deployer: {deployer}")
    print(f"Balance: {balance_matic:.4f} MATIC")

    if balance == 0:
        print("ERROR: Deployer has no MATIC for gas. Fund the wallet first.")
        sys.exit(1)

    abi = json.loads(abi_json)
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)

    # Build transaction
    nonce = w3.eth.get_transaction_count(deployer)
    gas_price = w3.eth.gas_price

    tx = contract.constructor().build_transaction({
        "chainId": chain_id,
        "from": deployer,
        "nonce": nonce,
        "gasPrice": int(gas_price * 1.1),  # 10% buffer
    })

    # Estimate gas
    gas_estimate = w3.eth.estimate_gas(tx)
    tx["gas"] = int(gas_estimate * 1.2)  # 20% buffer

    cost_matic = w3.from_wei(tx["gas"] * tx["gasPrice"], "ether")
    print(f"Estimated deploy cost: ~{cost_matic:.4f} MATIC")

    if balance < tx["gas"] * tx["gasPrice"]:
        print("ERROR: Insufficient MATIC for deployment gas")
        sys.exit(1)

    # Sign and send
    print("Signing transaction ...")
    signed = w3.eth.account.sign_transaction(tx, private_key)

    print("Sending transaction ...")
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"TX hash: {tx_hash.hex()}")
    print("Waiting for confirmation ...")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)

    if receipt.status != 1:
        print("ERROR: Deployment transaction reverted!")
        sys.exit(1)

    contract_address = receipt.contractAddress
    print(f"\nFlashArb deployed at: {contract_address}")
    print(f"TX: https://polygonscan.com/tx/{tx_hash.hex()}")
    print(f"Contract: https://polygonscan.com/address/{contract_address}")

    return contract_address


def save_deployed(address: str, abi_json: str):
    """Save deployed address and ABI."""
    data = {
        "address": address,
        "network": "polygon",
        "chain_id": 137,
        "abi": json.loads(abi_json),
    }
    DEPLOYED_FILE.write_text(json.dumps(data, indent=2))
    print(f"\nSaved to {DEPLOYED_FILE}")


# =============================================================================
# Main
# =============================================================================

def main():
    print("=" * 50)
    print("  FlashArb Deployment — Polygon Mainnet")
    print("=" * 50)
    print()

    private_key = load_env()
    abi_json, bytecode = compile_contract()
    address = deploy(private_key, abi_json, bytecode)
    save_deployed(address, abi_json)

    print("\nDone! Next steps:")
    print("  1. Verify on Polygonscan (optional)")
    print("  2. Run scanner.py to find arb opportunities")
    print("  3. Call executeArb() when profitable trades appear")


if __name__ == "__main__":
    main()
