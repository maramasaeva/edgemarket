"""
Deposit POL into Aave V3 on Polygon to earn lending yield.

Steps:
1. Check POL balance
2. Wrap POL -> WMATIC (keep 2 POL for gas)
3. Approve WMATIC for Aave Pool
4. Call pool.supply() to deposit into Aave
5. Print aWPOL (aToken) balance to confirm

Usage:
  python aave_yield.py check    # Just show balances
  python aave_yield.py deposit  # Wrap + approve + deposit (default)
"""
import json
import os
import sys
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC = "https://polygon.drpc.org"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"

# Aave V3 Pool on Polygon
AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD"

# WMATIC / WPOL (same contract)
WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"

# aToken for WMATIC on Aave V3 Polygon (aPolWMATIC)
A_WMATIC = "0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97"

# Keep 2 POL for gas
GAS_RESERVE = 2 * 10**18

# --- Minimal ABIs (only functions we need) ---

WMATIC_ABI = json.loads("""[
    {
        "constant": false,
        "inputs": [],
        "name": "deposit",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "guy", "type": "address"},
            {"name": "wad", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
]""")

AAVE_POOL_ABI = json.loads("""[
    {
        "inputs": [
            {"internalType": "address", "name": "asset", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "address", "name": "onBehalfOf", "type": "address"},
            {"internalType": "uint16", "name": "referralCode", "type": "uint16"}
        ],
        "name": "supply",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]""")

ERC20_BALANCE_ABI = json.loads("""[
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]""")


def get_balances(w3, wallet):
    """Fetch and print all relevant balances."""
    pol_bal = w3.eth.get_balance(wallet)

    wmatic = w3.eth.contract(address=Web3.to_checksum_address(WMATIC), abi=ERC20_BALANCE_ABI)
    wmatic_bal = wmatic.functions.balanceOf(wallet).call()

    a_wmatic = w3.eth.contract(address=Web3.to_checksum_address(A_WMATIC), abi=ERC20_BALANCE_ABI)
    a_wmatic_bal = a_wmatic.functions.balanceOf(wallet).call()

    print(f"  POL (native):     {pol_bal / 1e18:.6f}")
    print(f"  WMATIC:           {wmatic_bal / 1e18:.6f}")
    print(f"  aWMATIC (Aave):   {a_wmatic_bal / 1e18:.6f}")

    return pol_bal, wmatic_bal, a_wmatic_bal


def deposit(w3, wallet):
    """Wrap POL -> WMATIC, approve, and supply to Aave V3."""
    pol_bal = w3.eth.get_balance(wallet)
    print(f"POL balance: {pol_bal / 1e18:.6f}")

    deposit_amount = pol_bal - GAS_RESERVE
    if deposit_amount <= 0:
        print(f"Not enough POL. Have {pol_bal / 1e18:.4f}, need >{GAS_RESERVE / 1e18:.1f} (gas reserve)")
        sys.exit(1)

    print(f"Depositing {deposit_amount / 1e18:.6f} POL into Aave V3 (keeping {GAS_RESERVE / 1e18:.1f} POL for gas)")

    wmatic_contract = w3.eth.contract(
        address=Web3.to_checksum_address(WMATIC), abi=WMATIC_ABI
    )
    pool_contract = w3.eth.contract(
        address=Web3.to_checksum_address(AAVE_POOL), abi=AAVE_POOL_ABI
    )

    nonce = w3.eth.get_transaction_count(wallet)
    gas_price = w3.eth.gas_price

    # --- Step 1: Wrap POL -> WMATIC ---
    print("\n[1/3] Wrapping POL -> WMATIC...")
    wrap_tx = wmatic_contract.functions.deposit().build_transaction({
        "from": wallet,
        "value": deposit_amount,
        "nonce": nonce,
        "gasPrice": gas_price,
        "gas": 50000,
    })
    signed = w3.eth.account.sign_transaction(wrap_tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"  tx: {tx_hash.hex()} (status: {receipt['status']})")
    if receipt["status"] != 1:
        print("  Wrap FAILED!")
        sys.exit(1)
    nonce += 1

    # --- Step 2: Approve WMATIC for Aave Pool ---
    pool_addr = Web3.to_checksum_address(AAVE_POOL)
    allowance = wmatic_contract.functions.allowance(wallet, pool_addr).call()
    if allowance >= deposit_amount:
        print("\n[2/3] WMATIC already approved for Aave Pool, skipping.")
    else:
        print("\n[2/3] Approving WMATIC for Aave Pool...")
        approve_tx = wmatic_contract.functions.approve(
            pool_addr, 2**256 - 1  # max approval
        ).build_transaction({
            "from": wallet,
            "nonce": nonce,
            "gasPrice": gas_price,
            "gas": 60000,
        })
        signed = w3.eth.account.sign_transaction(approve_tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        print(f"  tx: {tx_hash.hex()} (status: {receipt['status']})")
        if receipt["status"] != 1:
            print("  Approve FAILED!")
            sys.exit(1)
        nonce += 1

    # --- Step 3: Supply WMATIC to Aave V3 ---
    print(f"\n[3/3] Supplying {deposit_amount / 1e18:.6f} WMATIC to Aave V3...")
    supply_tx = pool_contract.functions.supply(
        Web3.to_checksum_address(WMATIC),  # asset
        deposit_amount,                     # amount
        wallet,                             # onBehalfOf
        0,                                  # referralCode
    ).build_transaction({
        "from": wallet,
        "nonce": nonce,
        "gasPrice": gas_price,
        "gas": 300000,
    })
    signed = w3.eth.account.sign_transaction(supply_tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"  tx: {tx_hash.hex()} (status: {receipt['status']})")
    if receipt["status"] != 1:
        print("  Supply FAILED!")
        sys.exit(1)

    # --- Confirm ---
    print(f"\n{'=' * 50}")
    print("  AAVE DEPOSIT COMPLETE")
    print(f"{'=' * 50}")
    get_balances(w3, wallet)
    print(f"{'=' * 50}")


def main():
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 30}))
    assert w3.is_connected(), "Not connected to Polygon"

    wallet = Web3.to_checksum_address(WALLET)
    mode = sys.argv[1] if len(sys.argv) > 1 else "deposit"

    print("=" * 50)
    print("  Aave V3 Yield — Polygon (WMATIC)")
    print("=" * 50)

    if mode == "check":
        print("\nBalances:")
        get_balances(w3, wallet)
    elif mode == "deposit":
        deposit(w3, wallet)
    else:
        print(f"Unknown mode: {mode}")
        print("Usage: python aave_yield.py [check|deposit]")
        sys.exit(1)


if __name__ == "__main__":
    main()
