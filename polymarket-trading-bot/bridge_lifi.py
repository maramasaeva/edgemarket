"""
Bridge USDC.e from Polygon → native USDC on Arbitrum via LI.FI (Across Protocol).
Then deposit to Hyperliquid.
"""
import json
import os
import sys
import time
import httpx
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"

POLYGON_RPC = "https://polygon.drpc.org"
ARBITRUM_RPC = "https://arbitrum.drpc.org"

USDC_E_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
HL_BRIDGE = "0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7"

ERC20_ABI = json.loads('[{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]')


def get_lifi_quote(amount):
    """Get bridge quote from LI.FI aggregator."""
    params = {
        "fromChain": "137",
        "toChain": "42161",
        "fromToken": USDC_E_POLYGON,
        "toToken": USDC_ARBITRUM,
        "fromAmount": str(amount),
        "fromAddress": WALLET,
    }
    r = httpx.get("https://li.quest/v1/quote", params=params, timeout=30)
    if r.status_code != 200:
        print(f"  Quote failed: {r.status_code} {r.text[:200]}")
        return None
    return r.json()


def step1_bridge(poly_w3, wallet):
    """Bridge USDC.e from Polygon → Arbitrum via LI.FI."""
    usdc = poly_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_POLYGON), abi=ERC20_ABI)
    balance = usdc.functions.balanceOf(wallet).call()
    if balance == 0:
        print("No USDC.e on Polygon!")
        return False

    bridge_amount = balance - 500_000  # keep 0.5 USDC.e
    if bridge_amount <= 500_000:
        bridge_amount = balance

    print(f"\n[STEP 1] Getting LI.FI quote for {bridge_amount/1e6:.4f} USDC.e...")
    quote = get_lifi_quote(bridge_amount)
    if not quote:
        return False

    tool = quote.get("tool", "unknown")
    estimate = quote.get("estimate", {})
    to_amount = estimate.get("toAmountMin", "0")
    print(f"  Route: {tool}")
    print(f"  Will receive: ~{int(to_amount)/1e6:.4f} native USDC on Arbitrum")

    tx_req = quote.get("transactionRequest", {})
    approval_addr = estimate.get("approvalAddress", tx_req.get("to", ""))

    nonce = poly_w3.eth.get_transaction_count(wallet)

    # Approve USDC.e for LI.FI
    if approval_addr:
        allowance = usdc.functions.allowance(wallet, Web3.to_checksum_address(approval_addr)).call()
        if allowance < bridge_amount:
            print(f"  Approving USDC.e for {approval_addr[:10]}...")
            gas_price = poly_w3.eth.gas_price
            tx = usdc.functions.approve(
                Web3.to_checksum_address(approval_addr), 2**256 - 1
            ).build_transaction({
                "from": wallet, "nonce": nonce, "gasPrice": gas_price, "gas": 100000,
            })
            signed = poly_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            h = poly_w3.eth.send_raw_transaction(signed.raw_transaction)
            r = poly_w3.eth.wait_for_transaction_receipt(h, timeout=60)
            print(f"    Approve: {h.hex()} (status: {r['status']})")
            if r["status"] != 1:
                return False
            nonce += 1

    # Re-fetch quote with fresh nonce/gasPrice (quotes expire)
    print("  Refreshing quote...")
    quote = get_lifi_quote(bridge_amount)
    if not quote:
        return False
    tx_req = quote["transactionRequest"]

    # Execute the bridge transaction
    print("  Sending bridge tx...")
    tx = {
        "from": wallet,
        "to": Web3.to_checksum_address(tx_req["to"]),
        "data": tx_req["data"],
        "value": int(tx_req.get("value", "0x0"), 16),
        "nonce": nonce,
        "gasPrice": poly_w3.eth.gas_price,
        "gas": int(tx_req.get("gasLimit", "0xe9355"), 16) + 50000,
        "chainId": 137,
    }

    try:
        signed = poly_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = poly_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = poly_w3.eth.wait_for_transaction_receipt(h, timeout=120)
        print(f"    Bridge tx: {h.hex()} (status: {r['status']})")
        return r["status"] == 1
    except Exception as e:
        print(f"    Failed: {e}")
        return False


def step2_wait():
    """Wait for native USDC to arrive on Arbitrum."""
    print(f"\n[STEP 2] Waiting for USDC on Arbitrum (Across fills in ~1-2 min)...")
    arb_w3 = Web3(Web3.HTTPProvider(ARBITRUM_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)
    usdc = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_ARBITRUM), abi=ERC20_ABI)

    for i in range(60):
        bal = usdc.functions.balanceOf(wallet).call()
        if bal > 0:
            eth = arb_w3.eth.get_balance(wallet)
            print(f"  Arrived! USDC: {bal/1e6:.4f}, ETH: {eth/1e18:.6f}")
            return bal
        print(f"  Waiting... ({i*10}s)", end="\r")
        time.sleep(10)

    print("\n  Timed out. Across usually takes 1-5 min, check again later.")
    return 0


def step3_deposit(arb_w3, wallet, usdc_bal):
    """Deposit native USDC to Hyperliquid bridge."""
    print(f"\n[STEP 3] Depositing {usdc_bal/1e6:.4f} USDC to Hyperliquid")

    eth_bal = arb_w3.eth.get_balance(wallet)
    if eth_bal == 0:
        print("  WARNING: No ETH on Arbitrum for gas!")
        print("  Across delivers USDC without ETH. Need ~0.0001 ETH for deposit tx.")
        print("  Options: send ETH from another wallet, or use a faucet.")
        return False

    usdc = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_ARBITRUM), abi=ERC20_ABI)
    nonce = arb_w3.eth.get_transaction_count(wallet)

    # Approve HL bridge
    allowance = usdc.functions.allowance(wallet, Web3.to_checksum_address(HL_BRIDGE)).call()
    if allowance < usdc_bal:
        print("  Approving USDC for Hyperliquid bridge...")
        tx = usdc.functions.approve(
            Web3.to_checksum_address(HL_BRIDGE), 2**256 - 1
        ).build_transaction({
            "from": wallet, "nonce": nonce,
            "maxFeePerGas": arb_w3.eth.gas_price * 2,
            "maxPriorityFeePerGas": arb_w3.eth.max_priority_fee,
            "gas": 100000,
        })
        signed = arb_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = arb_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = arb_w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    Approve: {h.hex()} (status: {r['status']})")
        if r["status"] != 1:
            return False
        nonce += 1

    # Transfer USDC to HL bridge contract
    print(f"  Sending USDC to HL bridge...")
    tx = usdc.functions.transfer(
        Web3.to_checksum_address(HL_BRIDGE), usdc_bal
    ).build_transaction({
        "from": wallet, "nonce": nonce,
        "maxFeePerGas": arb_w3.eth.gas_price * 2,
        "maxPriorityFeePerGas": arb_w3.eth.max_priority_fee,
        "gas": 200000,
    })
    signed = arb_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    h = arb_w3.eth.send_raw_transaction(signed.raw_transaction)
    r = arb_w3.eth.wait_for_transaction_receipt(h, timeout=60)
    print(f"    Deposit tx: {h.hex()} (status: {r['status']})")
    return r["status"] == 1


def check_hl():
    from hyperliquid.utils import constants
    from hyperliquid.info import Info
    info = Info(constants.MAINNET_API_URL)
    account = Account.from_key(PRIVATE_KEY)
    user = info.user_state(account.address)
    equity = float(user.get("marginSummary", {}).get("accountValue", "0"))
    print(f"\nHyperliquid equity: ${equity:.2f}")
    return equity


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"

    print("=" * 55)
    print("  USDC.e → Arbitrum → Hyperliquid (via LI.FI/Across)")
    print("=" * 55)

    poly_w3 = Web3(Web3.HTTPProvider(POLYGON_RPC, request_kwargs={"timeout": 30}))
    arb_w3 = Web3(Web3.HTTPProvider(ARBITRUM_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)

    # Show balances
    poly_usdc = poly_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_POLYGON), abi=ERC20_ABI)
    arb_usdc = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_ARBITRUM), abi=ERC20_ABI)
    poly_bal = poly_usdc.functions.balanceOf(wallet).call()
    arb_bal = arb_usdc.functions.balanceOf(wallet).call()
    arb_eth = arb_w3.eth.get_balance(wallet)
    poly_native = poly_w3.eth.get_balance(wallet)

    print(f"Polygon:  USDC.e={poly_bal/1e6:.4f}  POL={poly_native/1e18:.4f}")
    print(f"Arbitrum: USDC={arb_bal/1e6:.4f}  ETH={arb_eth/1e18:.6f}")

    if mode == "check":
        check_hl()
        return

    if mode == "deposit":
        if arb_bal > 0:
            step3_deposit(arb_w3, wallet, arb_bal)
        check_hl()
        return

    if mode == "wait":
        usdc = step2_wait()
        if usdc > 0 and arb_eth > 0:
            step3_deposit(arb_w3, wallet, usdc)
            time.sleep(5)
            check_hl()
        return

    # Full pipeline
    if poly_bal > 500_000:
        ok = step1_bridge(poly_w3, wallet)
        if not ok:
            print("\nBridge failed!")
            return
        usdc = step2_wait()
    elif arb_bal > 0:
        usdc = arb_bal
        print("\nUSDC already on Arbitrum!")
    else:
        print("\nNo USDC.e on Polygon or USDC on Arbitrum.")
        return

    if usdc > 0:
        arb_eth = arb_w3.eth.get_balance(wallet)
        if arb_eth > 0:
            step3_deposit(arb_w3, wallet, usdc)
            time.sleep(5)
            check_hl()
        else:
            print("\nUSDC arrived but no ETH for gas on Arbitrum.")
            print("Send ~0.0002 ETH to the wallet on Arbitrum, then run:")
            print("  python bridge_lifi.py deposit")
    else:
        print("\nBridge didn't complete. Re-run with 'wait' to check again.")


if __name__ == "__main__":
    main()
