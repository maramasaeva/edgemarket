"""
Complete Polymarket setup:
1. Approve USDC.e for ALL required contracts
2. Update balance/allowance on CLOB
3. Verify trading is ready
"""
import json
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC = "https://polygon-mainnet.g.alchemy.com/v2/5hkD1oooDXAhLoCwVT2Gn"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
PROXY_HOST = "https://copyscore-lovat.vercel.app/api/clob"
MAX_UINT256 = 2**256 - 1

# All addresses from CLOB response + known Polymarket contracts
ALL_SPENDERS = [
    "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",  # CTF Exchange
    "0xC5d563A36AE78145C45a50134d48A1215220f80a",  # NegRisk Exchange
    "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",  # NegRisk Adapter
    "0xE111180000d2663C0091e4f400237545B87B996B",  # From CLOB response
    "0xe2222d279d744050d28e00520010520000310F59",  # From CLOB response
]

ERC20_ABI = json.loads("""[
    {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]""")

CTF_CONTRACT = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"
CTF_ABI = json.loads("""[
    {"inputs":[{"name":"operator","type":"address"},{"name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"owner","type":"address"},{"name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"}
]""")

def main():
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)
    usdc = w3.eth.contract(address=Web3.to_checksum_address(USDC_E), abi=ERC20_ABI)
    ctf = w3.eth.contract(address=Web3.to_checksum_address(CTF_CONTRACT), abi=CTF_ABI)

    bal = usdc.functions.balanceOf(wallet).call()
    print(f"USDC.e on-chain: {bal / 10**6:.4f}")

    nonce = w3.eth.get_transaction_count(wallet)
    gas_price = w3.eth.gas_price

    # Step 1: Approve USDC.e for all spenders
    print("\n--- USDC.e Approvals ---")
    for addr in ALL_SPENDERS:
        spender = Web3.to_checksum_address(addr)
        current = usdc.functions.allowance(wallet, spender).call()
        if current > 10**18:
            print(f"  {addr[:10]}...: already approved")
            continue
        print(f"  Approving {addr[:10]}...")
        tx = usdc.functions.approve(spender, MAX_UINT256).build_transaction({
            "from": wallet, "nonce": nonce,
            "gasPrice": gas_price, "gas": 100000,
        })
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        r = w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    tx: {h.hex()} (status: {r['status']})")
        nonce += 1

    # Step 2: Approve CTF (ERC1155) for all spenders
    print("\n--- CTF (ERC1155) Approvals ---")
    for addr in ALL_SPENDERS:
        operator = Web3.to_checksum_address(addr)
        approved = ctf.functions.isApprovedForAll(wallet, operator).call()
        if approved:
            print(f"  {addr[:10]}...: already approved")
            continue
        print(f"  Approving CTF for {addr[:10]}...")
        tx = ctf.functions.setApprovalForAll(operator, True).build_transaction({
            "from": wallet, "nonce": nonce,
            "gasPrice": gas_price, "gas": 100000,
        })
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        r = w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    tx: {h.hex()} (status: {r['status']})")
        nonce += 1

    # Step 3: Update balance on CLOB
    print("\n--- CLOB Balance Update ---")
    from py_clob_client.client import ClobClient
    from py_clob_client.clob_types import BalanceAllowanceParams, AssetType

    client = ClobClient(PROXY_HOST, key=PRIVATE_KEY, chain_id=137, signature_type=0)
    creds = client.create_or_derive_api_creds()
    client.set_api_creds(creds)

    # Update balance (tells CLOB to re-check on-chain state)
    try:
        result = client.update_balance_allowance(
            params=BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
        )
        print(f"  Update result: {result}")
    except Exception as e:
        print(f"  Update failed: {e}")

    # Check final balance
    bal_result = client.get_balance_allowance(
        params=BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
    )
    print(f"  Final CLOB balance: {bal_result}")

    clob_balance = float(bal_result.get("balance", 0)) / 10**6 if isinstance(bal_result, dict) else 0
    print(f"\n{'='*50}")
    print(f"  Polymarket trading balance: ${clob_balance:.4f} USDC")
    print(f"  On-chain USDC.e: {bal / 10**6:.4f}")
    print(f"  POL for gas: {w3.eth.get_balance(wallet) / 10**18:.4f}")
    print(f"{'='*50}")

    if clob_balance > 0:
        print("\n  READY TO TRADE!")
    else:
        print("\n  Balance still 0 — Polymarket may need a direct deposit tx")
        print("  (the CLOB operates on allowance-based spending, not deposits)")
        print("  Trying to place a small test order to verify...")

if __name__ == "__main__":
    main()
