"""Test CLOB auth through the Vercel proxy."""
import os
from dotenv import load_dotenv
load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
PROXY_HOST = "https://copyscore-lovat.vercel.app/api/clob"

print("=== Test 1: Raw proxy request to /time ===")
import httpx
try:
    r = httpx.get(f"{PROXY_HOST}/time", timeout=10)
    print(f"  Status: {r.status_code} → {r.text[:200]}")
except Exception as e:
    print(f"  Failed: {e}")

print("\n=== Test 2: ClobClient via proxy ===")
try:
    from py_clob_client.client import ClobClient
    client = ClobClient(
        PROXY_HOST,
        key=PRIVATE_KEY,
        chain_id=137,
        signature_type=0,
    )

    # Test server time (no auth needed)
    server_time = client.get_server_time()
    print(f"  Server time: {server_time}")

    # Test auth (derive API creds)
    print("  Deriving API credentials...")
    creds = client.create_or_derive_api_creds()
    client.set_api_creds(creds)
    print(f"  API key: {creds.api_key[:16]}...")
    print(f"  Passphrase: {creds.api_passphrase[:8]}...")

    # Test balance
    from py_clob_client.clob_types import BalanceAllowanceParams, AssetType
    bal = client.get_balance_allowance(
        params=BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
    )
    print(f"  Balance: {bal}")

    print("\n  SUCCESS — CLOB proxy works!")

except Exception as e:
    print(f"  Failed: {e}")
    import traceback
    traceback.print_exc()

    # Debug: check what headers the client sends
    print("\n=== Debug: Check header forwarding ===")
    try:
        from py_clob_client.headers.headers import create_level_1_headers
        from py_clob_client.signer import Signer
        signer = Signer(PRIVATE_KEY, 137)
        headers = create_level_1_headers(signer)
        print(f"  L1 headers the client sends: {list(headers.keys())}")
        # Test if these headers pass through the proxy
        r = httpx.get(
            f"{PROXY_HOST}/auth/derive-api-key",
            headers=headers,
            timeout=10,
        )
        print(f"  Direct GET /auth/derive-api-key: {r.status_code} → {r.text[:200]}")
    except Exception as e2:
        print(f"  Debug failed: {e2}")
