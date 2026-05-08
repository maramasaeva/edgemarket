"""
Check if the 403 is IP-based or wallet-based.
Test 1: Check what our proxy IP looks like to external services
Test 2: Check if Polymarket's /auth/closed-only flags this wallet
"""
import os
import httpx
from dotenv import load_dotenv
load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
PROXY_HOST = "https://copyscore-lovat.vercel.app/api/clob"

# Test 1: What IP does the proxy have?
print("=== Proxy IP check ===")
try:
    r = httpx.get("https://copyscore-lovat.vercel.app/api/clob/time", timeout=10)
    print(f"  CLOB /time via proxy: {r.status_code} → {r.text[:50]}")
except Exception as e:
    print(f"  Failed: {e}")

# Test 2: Check closed-only / ban status
print("\n=== Wallet ban/restriction check ===")
from py_clob_client.client import ClobClient
client = ClobClient(PROXY_HOST, key=PRIVATE_KEY, chain_id=137, signature_type=0)
creds = client.create_or_derive_api_creds()
client.set_api_creds(creds)

try:
    closed = client.get_closed_only_mode()
    print(f"  Closed-only mode: {closed}")
except Exception as e:
    print(f"  Closed-only check failed: {e}")

# Test 3: Try GET endpoints that should work
print("\n=== Read-only CLOB endpoints ===")
try:
    from py_clob_client.clob_types import BookParams
    book = client.get_order_book("115734288189860159933762132144")  # random token
    print(f"  Order book: works")
except Exception as e:
    print(f"  Order book: {e}")

try:
    midpoint = client.get_midpoint("115734288189860159933762132144")
    print(f"  Midpoint: {midpoint}")
except Exception as e:
    print(f"  Midpoint: {e}")

# Test 4: Direct POST to /order endpoint with minimal payload to see exact error
print("\n=== Direct POST /order test ===")
try:
    r = httpx.post(
        f"{PROXY_HOST}/order",
        json={"test": True},
        headers={"Content-Type": "application/json"},
        timeout=10,
    )
    print(f"  Status: {r.status_code}")
    print(f"  Body: {r.text[:300]}")
except Exception as e:
    print(f"  Failed: {e}")

# Test 5: Check if it's the POST method specifically on any endpoint
print("\n=== POST to non-order endpoint ===")
try:
    r = httpx.post(
        f"{PROXY_HOST}/auth/api-key",
        json={},
        timeout=10,
    )
    print(f"  POST /auth/api-key: {r.status_code} → {r.text[:200]}")
except Exception as e:
    print(f"  Failed: {e}")
