"""
Verify on-chain allowances and attempt a small test order.
"""
import json
import os
import time
from web3 import Web3
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

RPC = "https://polygon-mainnet.g.alchemy.com/v2/5hkD1oooDXAhLoCwVT2Gn"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
PROXY_HOST = "https://copyscore-lovat.vercel.app/api/clob"
PROXY_BASE = "https://copyscore-lovat.vercel.app/api/polymarket"

# Addresses from CLOB response
CLOB_ADDRS = [
    "0xE111180000d2663C0091e4f400237545B87B996B",
    "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
    "0xe2222d279d744050d28e00520010520000310F59",
    "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
    "0xC5d563A36AE78145C45a50134d48A1215220f80a",
]

ERC20_ABI = json.loads('[{"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]')

def main():
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)
    usdc = w3.eth.contract(address=Web3.to_checksum_address(USDC_E), abi=ERC20_ABI)

    print("=== On-chain USDC.e allowances ===")
    for addr in CLOB_ADDRS:
        spender = Web3.to_checksum_address(addr)
        allowance = usdc.functions.allowance(wallet, spender).call()
        status = "MAX" if allowance > 10**30 else f"{allowance / 10**6:.2f}"
        print(f"  {addr}: {status}")

    print(f"\n  USDC.e balance: {usdc.functions.balanceOf(wallet).call() / 10**6:.4f}")

    # Find a current active market to test with
    print("\n=== Finding active BTC 5-min market ===")
    import requests
    now = int(time.time())
    base_ts = now - (now % 300)

    window = None
    for offset in range(0, 3):
        ts = base_ts + (offset * 300)
        slug = f"btc-updown-5m-{ts}"
        params = f"slug={slug}"
        url = f"{PROXY_BASE}?api=gamma&path=/markets&params={quote(params)}"
        r = requests.get(url, timeout=10)
        data = r.json()
        markets = data if isinstance(data, list) else data.get("data", [])
        if markets:
            m = markets[0]
            if m.get("acceptingOrders"):
                tokens = json.loads(m.get("clobTokenIds", "[]"))
                prices = json.loads(m.get("outcomePrices", "[]"))
                if len(tokens) >= 2 and len(prices) >= 2:
                    window = {
                        "question": m.get("question", ""),
                        "slug": slug,
                        "up_token": tokens[0],
                        "down_token": tokens[1],
                        "up_price": float(prices[0]),
                        "down_price": float(prices[1]),
                        "condition_id": m.get("conditionId", ""),
                        "neg_risk": m.get("negRisk", False),
                    }
                    print(f"  Found: {window['question']}")
                    print(f"  Up={window['up_price']:.3f} Down={window['down_price']:.3f}")
                    print(f"  neg_risk={window['neg_risk']}")
                    break

    if not window:
        print("  No active market found!")
        return

    # Try placing a small test order
    print("\n=== Attempting test order ===")
    from py_clob_client.client import ClobClient
    from py_clob_client.clob_types import BalanceAllowanceParams, AssetType
    from py_clob_client.order_builder.constants import BUY

    client = ClobClient(
        PROXY_HOST,
        key=PRIVATE_KEY,
        chain_id=137,
        signature_type=0,
    )
    creds = client.create_or_derive_api_creds()
    client.set_api_creds(creds)
    print(f"  Authenticated: {creds.api_key[:12]}...")

    # Check neg_risk for this token
    try:
        neg_risk = client.get_neg_risk(window["up_token"])
        print(f"  Token neg_risk check: {neg_risk}")
    except Exception as e:
        print(f"  neg_risk check failed: {e}")

    # Try to create and post a small order
    # Buy 1 UP share at a low price (unlikely to fill = safe test)
    try:
        from py_clob_client.clob_types import OrderArgs, OrderType

        order_args = OrderArgs(
            token_id=window["up_token"],
            price=0.01,  # Very low price, won't fill
            size=1.0,
            side=BUY,
        )
        print(f"  Creating order: BUY 1 UP @ $0.01...")
        signed_order = client.create_order(order_args)
        print(f"  Order signed. Posting...")
        result = client.post_order(signed_order, OrderType.GTC)
        print(f"  Order result: {result}")
    except Exception as e:
        print(f"  Order failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
