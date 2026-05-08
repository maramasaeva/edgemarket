"""Send 2 POL from Polygon → ETH on Arbitrum via LI.FI for gas."""
import json, os, httpx
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"

poly_w3 = Web3(Web3.HTTPProvider("https://polygon.drpc.org", request_kwargs={"timeout": 30}))
wallet = Web3.to_checksum_address(WALLET)

params = {
    "fromChain": "137", "toChain": "42161",
    "fromToken": "0x0000000000000000000000000000000000000000",
    "toToken": "0x0000000000000000000000000000000000000000",
    "fromAmount": str(int(2 * 10**18)),
    "fromAddress": WALLET,
}

print("Getting LI.FI quote for 2 POL → ETH on Arbitrum...")
r = httpx.get("https://li.quest/v1/quote", params=params, timeout=30)
data = r.json()
tx_req = data["transactionRequest"]
est = data.get("estimate", {})
print(f"Route: {data.get('tool')}")
print(f"Will receive: ~{int(est.get('toAmountMin', '0'))/1e18:.6f} ETH")

nonce = poly_w3.eth.get_transaction_count(wallet)
tx = {
    "from": wallet,
    "to": Web3.to_checksum_address(tx_req["to"]),
    "data": tx_req["data"],
    "value": int(tx_req["value"], 16),
    "nonce": nonce,
    "gasPrice": poly_w3.eth.gas_price,
    "gas": int(tx_req.get("gasLimit", "0x4ab08"), 16) + 50000,
    "chainId": 137,
}

signed = poly_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
h = poly_w3.eth.send_raw_transaction(signed.raw_transaction)
print(f"Tx sent: {h.hex()}")
r = poly_w3.eth.wait_for_transaction_receipt(h, timeout=120)
print(f"Status: {r['status']}")
print(f"POL remaining: {poly_w3.eth.get_balance(wallet)/1e18:.4f}")
print("\nETH should arrive on Arbitrum in 1-5 min.")
print("Then run: python bridge_lifi.py deposit")
