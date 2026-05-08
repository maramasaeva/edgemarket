"""
1. Approve USDC.e for Polymarket's CTF Exchange + NegRisk Exchange
2. Test CLOB auth through the Vercel proxy
"""
import json
import os
import time
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC = "https://polygon-mainnet.g.alchemy.com/v2/5hkD1oooDXAhLoCwVT2Gn"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

CTF_EXCHANGE = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
NEG_RISK_EXCHANGE = "0xC5d563A36AE78145C45a50134d48A1215220f80a"
NEG_RISK_ADAPTER = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296"

MAX_UINT256 = 2**256 - 1

ERC20_ABI = json.loads("""[
    {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]""")

# Also need to approve the Conditional Tokens Framework contract for the exchanges
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
    print(f"USDC.e balance: {bal / 10**6:.4f}")
    print(f"POL balance: {w3.eth.get_balance(wallet) / 10**18:.4f}")

    nonce = w3.eth.get_transaction_count(wallet)
    gas_price = w3.eth.gas_price

    # Approve USDC.e for CTF Exchange
    spenders = [
        ("CTF Exchange", CTF_EXCHANGE),
        ("NegRisk Exchange", NEG_RISK_EXCHANGE),
        ("NegRisk Adapter", NEG_RISK_ADAPTER),
    ]

    for name, spender in spenders:
        allowance = usdc.functions.allowance(wallet, Web3.to_checksum_address(spender)).call()
        if allowance >= bal:
            print(f"  {name}: already approved ({allowance / 10**6:.2f})")
            continue

        print(f"  Approving USDC.e for {name}...")
        tx = usdc.functions.approve(
            Web3.to_checksum_address(spender),
            MAX_UINT256,
        ).build_transaction({
            "from": wallet,
            "nonce": nonce,
            "gasPrice": gas_price,
            "gas": 60000,
        })
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        print(f"    tx: {tx_hash.hex()} (status: {receipt['status']})")
        nonce += 1

    # Approve CTF (ERC1155) for exchanges
    ctf_operators = [
        ("CTF → CTF Exchange", CTF_EXCHANGE),
        ("CTF → NegRisk Exchange", NEG_RISK_EXCHANGE),
        ("CTF → NegRisk Adapter", NEG_RISK_ADAPTER),
    ]

    for name, operator in ctf_operators:
        approved = ctf.functions.isApprovedForAll(wallet, Web3.to_checksum_address(operator)).call()
        if approved:
            print(f"  {name}: already approved")
            continue

        print(f"  Setting approval: {name}...")
        tx = ctf.functions.setApprovalForAll(
            Web3.to_checksum_address(operator),
            True,
        ).build_transaction({
            "from": wallet,
            "nonce": nonce,
            "gasPrice": gas_price,
            "gas": 60000,
        })
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        print(f"    tx: {tx_hash.hex()} (status: {receipt['status']})")
        nonce += 1

    print("\nAll approvals done!")

    # Test CLOB proxy
    print("\n--- Testing CLOB via proxy ---")
    import requests
    try:
        r = requests.get("https://copyscore-lovat.vercel.app/api/clob/auth/nonce", timeout=10)
        print(f"Proxy /auth/nonce: {r.status_code} → {r.text[:100]}")
    except Exception as e:
        print(f"Proxy test failed: {e}")

    # Test CLOB client via proxy
    print("\n--- Testing ClobClient via proxy ---")
    try:
        from py_clob_client.client import ClobClient
        client = ClobClient(
            "https://copyscore-lovat.vercel.app/api/clob",
            key=PRIVATE_KEY,
            chain_id=137,
            signature_type=0,
        )
        creds = client.create_or_derive_api_creds()
        client.set_api_creds(creds)
        print(f"CLOB via proxy: OK! API key: {creds.api_key[:12]}...")

        from py_clob_client.clob_types import BalanceAllowanceParams, AssetType
        bal_resp = client.get_balance_allowance(
            params=BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
        )
        print(f"CLOB balance: {bal_resp}")
    except Exception as e:
        print(f"ClobClient via proxy failed: {e}")


if __name__ == "__main__":
    main()
