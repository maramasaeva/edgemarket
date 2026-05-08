"""
Try placing order through different proxy approaches.
Approach 1: Direct httpx proxy (SOCKS/HTTP)
Approach 2: Monkey-patch the CLOB http_helpers to add proxy
Approach 3: Use Cloudflare Worker via wrangler
"""
import os
import json
import time
import httpx
from urllib.parse import quote
from dotenv import load_dotenv
load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
PROXY_HOST = "https://copyscore-lovat.vercel.app/api/clob"
PROXY_BASE = "https://copyscore-lovat.vercel.app/api/polymarket"

# First, find a live market
print("=== Finding active market ===")
import requests as req_lib
now = int(time.time())
base_ts = now - (now % 300)
window = None

for offset in range(0, 3):
    ts = base_ts + (offset * 300)
    slug = f"btc-updown-5m-{ts}"
    params = f"slug={slug}"
    url = f"{PROXY_BASE}?api=gamma&path=/markets&params={quote(params)}"
    r = req_lib.get(url, timeout=10)
    data = r.json()
    markets = data if isinstance(data, list) else data.get("data", [])
    if markets and markets[0].get("acceptingOrders"):
        m = markets[0]
        tokens = json.loads(m.get("clobTokenIds", "[]"))
        prices = json.loads(m.get("outcomePrices", "[]"))
        if len(tokens) >= 2:
            window = {"up_token": tokens[0], "question": m.get("question", "")}
            print(f"  {window['question']}")
            break

if not window:
    print("  No active market, exiting")
    exit(1)

# Approach: Create the signed order locally, then POST through different channels
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import OrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY
from py_clob_client.headers.headers import create_level_2_headers
from py_clob_client.clob_types import RequestArgs

# Auth through proxy (works fine)
client = ClobClient(PROXY_HOST, key=PRIVATE_KEY, chain_id=137, signature_type=0)
creds = client.create_or_derive_api_creds()
client.set_api_creds(creds)
print(f"  Authenticated: {creds.api_key[:12]}...")

# Create signed order
order_args = OrderArgs(token_id=window["up_token"], price=0.01, size=1.0, side=BUY)
signed_order = client.create_order(order_args)
print(f"  Order signed locally")

# Build the L2 auth headers
request_args = RequestArgs(method="POST", request_path="/order")
headers = create_level_2_headers(client.signer, client.creds, request_args)
headers["Content-Type"] = "application/json"

# Build the order body exactly as the client would
body = {
    "order": signed_order.dict(),
    "owner": client.signer.address(),
    "orderType": "GTC",
}
body_str = json.dumps(body)

# Re-compute headers with the actual body
request_args_with_body = RequestArgs(
    method="POST",
    request_path="/order",
    body=body_str,
)
headers = create_level_2_headers(client.signer, client.creds, request_args_with_body)
headers["Content-Type"] = "application/json"
headers["User-Agent"] = "py_clob_client"
headers["Accept"] = "*/*"
headers["Connection"] = "keep-alive"

print(f"\n=== Test A: POST via Vercel Edge proxy ===")
try:
    r = httpx.post(f"{PROXY_HOST}/order", headers=headers, content=body_str, timeout=15)
    print(f"  Status: {r.status_code} → {r.text[:300]}")
except Exception as e:
    print(f"  Failed: {e}")

# Test if we can find any working proxy approach
# Check: what exact headers does Polymarket see?
print(f"\n=== Test B: Check what headers proxy sends ===")
try:
    # Use httpbin through the proxy to see what headers arrive
    r = httpx.get("https://copyscore-lovat.vercel.app/api/clob/time", timeout=10,
                   headers={"X-Test": "hello", "POLY_ADDRESS": "0xtest"})
    print(f"  CLOB /time with custom headers: {r.status_code}")
except Exception as e:
    print(f"  Failed: {e}")

# Test C: Try a WebSocket approach
print(f"\n=== Test C: Check CLOB WebSocket endpoint ===")
try:
    # Polymarket also has WS endpoints
    r = httpx.get(f"{PROXY_HOST}/ws", timeout=5)
    print(f"  WS endpoint: {r.status_code} → {r.text[:200]}")
except Exception as e:
    print(f"  WS failed: {e}")
