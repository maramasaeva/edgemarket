"""Test CLOB client initialization and balance check."""
import os
from dotenv import load_dotenv
load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
PROXY_BASE = "https://copyscore-lovat.vercel.app/api/polymarket"

print("Testing CLOB client initialization...")
print(f"Key present: {bool(PRIVATE_KEY)}")
print(f"Key prefix: {PRIVATE_KEY[:10]}..." if PRIVATE_KEY else "No key")

# Test 1: Direct CLOB (will likely fail from Belgium)
print("\n--- Test 1: Direct CLOB connection ---")
try:
    from py_clob_client.client import ClobClient
    client = ClobClient(
        "https://clob.polymarket.com",
        key=PRIVATE_KEY,
        chain_id=137,
        signature_type=0,
    )
    creds = client.create_or_derive_api_creds()
    client.set_api_creds(creds)
    print(f"Direct CLOB: OK! API key: {creds.api_key[:12]}...")

    from py_clob_client.clob_types import BalanceAllowanceParams, AssetType
    bal = client.get_balance_allowance(
        params=BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
    )
    print(f"Balance: {bal}")
except Exception as e:
    print(f"Direct CLOB failed: {e}")

# Test 2: Check if proxy can relay CLOB auth
print("\n--- Test 2: CLOB via proxy ---")
try:
    import requests
    # The CLOB auth endpoint
    r = requests.get(
        f"{PROXY_BASE}?api=clob&path=/auth/nonce",
        timeout=10
    )
    print(f"Proxy CLOB nonce: {r.status_code} {r.text[:200]}")
except Exception as e:
    print(f"Proxy CLOB failed: {e}")

# Test 3: Check on-chain USDC.e allowance for Polymarket
print("\n--- Test 3: On-chain USDC.e balance + Polymarket allowance ---")
try:
    from web3 import Web3
    import json

    w3 = Web3(Web3.HTTPProvider("https://polygon-mainnet.g.alchemy.com/v2/5hkD1oooDXAhLoCwVT2Gn"))
    wallet = Web3.to_checksum_address("0x32e3924374e00243bAcEcEfA1f8c56e398EFe869")

    usdc_addr = Web3.to_checksum_address("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174")
    erc20_abi = json.loads('[{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]')
    usdc = w3.eth.contract(address=usdc_addr, abi=erc20_abi)

    bal = usdc.functions.balanceOf(wallet).call()
    print(f"USDC.e on-chain: {bal / 10**6:.4f}")

    # Polymarket CTF Exchange on Polygon
    CTF_EXCHANGE = Web3.to_checksum_address("0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E")
    allowance = usdc.functions.allowance(wallet, CTF_EXCHANGE).call()
    print(f"Allowance for CTF Exchange: {allowance / 10**6:.4f}")

    # Polymarket Neg Risk CTF Exchange
    NEG_RISK = Web3.to_checksum_address("0xC5d563A36AE78145C45a50134d48A1215220f80a")
    allowance2 = usdc.functions.allowance(wallet, NEG_RISK).call()
    print(f"Allowance for NegRisk Exchange: {allowance2 / 10**6:.4f}")

    pol_bal = w3.eth.get_balance(wallet)
    print(f"POL: {pol_bal / 10**18:.4f}")

except Exception as e:
    print(f"On-chain check failed: {e}")
