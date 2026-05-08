"""
Complete pipeline: Polygon USDC.e → Arbitrum → Hyperliquid deposit.

Steps:
1. Bridge USDC.e from Polygon to Arbitrum via Stargate (with ETH gas airdrop)
2. Wait for USDC.e + ETH arrival on Arbitrum
3. Swap USDC.e → native USDC on Arbitrum via Uniswap V3
4. Deposit native USDC to Hyperliquid bridge contract
"""
import json
import os
import sys
import time
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"

POLYGON_RPC = "https://polygon.drpc.org"
ARBITRUM_RPC = "https://arbitrum.drpc.org"

# Tokens
USDC_E_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
USDC_E_ARBITRUM = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"
USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"

# Hyperliquid bridge on Arbitrum
HL_BRIDGE = "0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7"

# Uniswap V3 SwapRouter02 on Arbitrum
UNISWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"

ERC20_ABI = json.loads('[{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]')


def get_balances():
    poly_w3 = Web3(Web3.HTTPProvider(POLYGON_RPC, request_kwargs={"timeout": 30}))
    arb_w3 = Web3(Web3.HTTPProvider(ARBITRUM_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)

    poly_usdc = poly_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_POLYGON), abi=ERC20_ABI)
    poly_bal = poly_usdc.functions.balanceOf(wallet).call()
    poly_native = poly_w3.eth.get_balance(wallet)

    arb_usdc_e = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_ARBITRUM), abi=ERC20_ABI)
    arb_usdc = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_ARBITRUM), abi=ERC20_ABI)
    arb_usdc_e_bal = arb_usdc_e.functions.balanceOf(wallet).call()
    arb_usdc_bal = arb_usdc.functions.balanceOf(wallet).call()
    arb_eth = arb_w3.eth.get_balance(wallet)

    print(f"Polygon:  USDC.e={poly_bal/1e6:.4f}  POL={poly_native/1e18:.4f}")
    print(f"Arbitrum: USDC.e={arb_usdc_e_bal/1e6:.4f}  USDC={arb_usdc_bal/1e6:.4f}  ETH={arb_eth/1e18:.6f}")

    return {
        "poly_usdc": poly_bal, "poly_native": poly_native,
        "arb_usdc_e": arb_usdc_e_bal, "arb_usdc": arb_usdc_bal, "arb_eth": arb_eth,
    }


def step1_bridge():
    """Bridge USDC.e from Polygon → Arbitrum via Stargate V1 with ETH gas drop."""
    poly_w3 = Web3(Web3.HTTPProvider(POLYGON_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)

    usdc = poly_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_POLYGON), abi=ERC20_ABI)
    balance = usdc.functions.balanceOf(wallet).call()
    if balance == 0:
        print("No USDC.e on Polygon!")
        return False

    bridge_amount = balance - 500_000  # keep 0.5 USDC.e
    if bridge_amount <= 0:
        bridge_amount = balance
    print(f"\n[STEP 1] Bridging {bridge_amount/1e6:.4f} USDC.e → Arbitrum (Stargate + ETH gas drop)")

    STARGATE_ROUTER = "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd"
    STARGATE_ABI = json.loads("""[{
        "inputs": [
            {"name": "_dstChainId", "type": "uint16"},
            {"name": "_srcPoolId", "type": "uint256"},
            {"name": "_dstPoolId", "type": "uint256"},
            {"name": "_refundAddress", "type": "address"},
            {"name": "_amountLD", "type": "uint256"},
            {"name": "_minAmountLD", "type": "uint256"},
            {"components": [
                {"name": "dstGasForCall", "type": "uint256"},
                {"name": "dstNativeAmount", "type": "uint256"},
                {"name": "dstNativeAddr", "type": "bytes"}
            ], "name": "_lzTxParams", "type": "tuple"},
            {"name": "_to", "type": "bytes"},
            {"name": "_payload", "type": "bytes"}
        ],
        "name": "swap",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }, {
        "inputs": [
            {"name": "_dstChainId", "type": "uint16"},
            {"name": "_srcPoolId", "type": "uint256"},
            {"name": "_dstPoolId", "type": "uint256"},
            {"name": "_refundAddress", "type": "address"},
            {"name": "_amountLD", "type": "uint256"},
            {"name": "_minAmountLD", "type": "uint256"},
            {"components": [
                {"name": "dstGasForCall", "type": "uint256"},
                {"name": "dstNativeAmount", "type": "uint256"},
                {"name": "dstNativeAddr", "type": "bytes"}
            ], "name": "_lzTxParams", "type": "tuple"},
            {"name": "_to", "type": "bytes"},
            {"name": "_payload", "type": "bytes"}
        ],
        "name": "quoteLayerZeroFee",
        "outputs": [
            {"name": "", "type": "uint256"},
            {"name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }]""")

    router = poly_w3.eth.contract(
        address=Web3.to_checksum_address(STARGATE_ROUTER), abi=STARGATE_ABI
    )

    DST_CHAIN_ID = 110  # Arbitrum
    SRC_POOL_ID = 1
    DST_POOL_ID = 1

    wallet_bytes = bytes.fromhex(wallet[2:])
    # ETH gas drop: 0.0004 ETH (~$1, enough for swap + HL deposit)
    dst_native = int(0.0004 * 10**18)
    wallet_padded = b'\x00' * 12 + wallet_bytes
    lz_params = (0, dst_native, wallet_padded)
    min_amount = int(bridge_amount * 0.995)

    # Fee quote
    try:
        fee = router.functions.quoteLayerZeroFee(
            DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID,
            wallet, bridge_amount, min_amount,
            lz_params, wallet_bytes, b""
        ).call()
        print(f"  LayerZero fee: {fee[0]/1e18:.6f} POL (includes gas drop)")
    except Exception as e:
        print(f"  Fee quote failed: {e}")
        # Fallback without gas drop
        print("  Retrying without ETH gas drop...")
        lz_params = (0, 0, b"0x")
        try:
            fee = router.functions.quoteLayerZeroFee(
                DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID,
                wallet, bridge_amount, min_amount,
                lz_params, wallet_bytes, b""
            ).call()
            print(f"  LayerZero fee (no drop): {fee[0]/1e18:.6f} POL")
        except Exception as e2:
            print(f"  Still failed: {e2}, using estimate")
            fee = (int(0.5 * 10**18), 0)

    # Check we have enough POL for fee + gas
    pol_balance = poly_w3.eth.get_balance(wallet)
    total_needed = fee[0] + int(0.02 * 10**18)  # fee + gas buffer
    if pol_balance < total_needed:
        print(f"  Not enough POL! Have {pol_balance/1e18:.4f}, need ~{total_needed/1e18:.4f}")
        return False

    nonce = poly_w3.eth.get_transaction_count(wallet)
    gas_price = poly_w3.eth.gas_price

    # Approve
    allowance = usdc.functions.allowance(wallet, Web3.to_checksum_address(STARGATE_ROUTER)).call()
    if allowance < bridge_amount:
        print("  Approving USDC.e for Stargate...")
        tx = usdc.functions.approve(
            Web3.to_checksum_address(STARGATE_ROUTER), 2**256 - 1
        ).build_transaction({
            "from": wallet, "nonce": nonce, "gasPrice": gas_price, "gas": 100000
        })
        signed = poly_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = poly_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = poly_w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    Approve: {h.hex()} (status: {r['status']})")
        if r['status'] != 1:
            print("    Approve failed!")
            return False
        nonce += 1

    # Bridge
    print(f"  Sending bridge tx...")
    try:
        tx = router.functions.swap(
            DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID,
            wallet, bridge_amount, min_amount,
            lz_params, wallet_bytes, b""
        ).build_transaction({
            "from": wallet, "nonce": nonce, "gasPrice": gas_price,
            "gas": 600000, "value": fee[0],
        })
        signed = poly_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = poly_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = poly_w3.eth.wait_for_transaction_receipt(h, timeout=120)
        print(f"    Bridge tx: {h.hex()} (status: {r['status']})")
        return r['status'] == 1
    except Exception as e:
        print(f"    Bridge failed: {e}")
        return False


def step2_wait_for_arrival():
    """Poll Arbitrum until USDC.e arrives."""
    print(f"\n[STEP 2] Waiting for USDC.e on Arbitrum...")
    arb_w3 = Web3(Web3.HTTPProvider(ARBITRUM_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)
    usdc_e = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_ARBITRUM), abi=ERC20_ABI)

    for i in range(60):  # 10 minutes max
        bal = usdc_e.functions.balanceOf(wallet).call()
        eth = arb_w3.eth.get_balance(wallet)
        if bal > 0:
            print(f"  Arrived! USDC.e: {bal/1e6:.4f}, ETH: {eth/1e18:.6f}")
            return bal, eth
        print(f"  Waiting... ({i*10}s)", end="\r")
        time.sleep(10)

    print("  Timed out waiting for bridge.")
    return 0, 0


def step3_swap_usdc_e_to_usdc(amount):
    """Swap USDC.e → native USDC on Arbitrum via Uniswap V3."""
    print(f"\n[STEP 3] Swapping {amount/1e6:.4f} USDC.e → native USDC on Arbitrum")
    arb_w3 = Web3(Web3.HTTPProvider(ARBITRUM_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)

    usdc_e = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_ARBITRUM), abi=ERC20_ABI)

    # Approve Uniswap Router
    nonce = arb_w3.eth.get_transaction_count(wallet)
    allowance = usdc_e.functions.allowance(wallet, Web3.to_checksum_address(UNISWAP_ROUTER)).call()
    if allowance < amount:
        print("  Approving USDC.e for Uniswap...")
        tx = usdc_e.functions.approve(
            Web3.to_checksum_address(UNISWAP_ROUTER), 2**256 - 1
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
        if r['status'] != 1:
            return False
        nonce += 1

    # Uniswap V3 exactInputSingle swap
    # USDC.e → USDC, fee tier 100 (0.01% - stablecoin pool)
    SWAP_ROUTER_ABI = json.loads("""[{
        "inputs": [{
            "components": [
                {"name": "tokenIn", "type": "address"},
                {"name": "tokenOut", "type": "address"},
                {"name": "fee", "type": "uint24"},
                {"name": "recipient", "type": "address"},
                {"name": "amountIn", "type": "uint256"},
                {"name": "amountOutMinimum", "type": "uint256"},
                {"name": "sqrtPriceLimitX96", "type": "uint160"}
            ],
            "name": "params",
            "type": "tuple"
        }],
        "name": "exactInputSingle",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
    }]""")

    router = arb_w3.eth.contract(
        address=Web3.to_checksum_address(UNISWAP_ROUTER), abi=SWAP_ROUTER_ABI
    )

    min_out = int(amount * 0.998)  # 0.2% slippage for stablecoin pair
    swap_params = (
        Web3.to_checksum_address(USDC_E_ARBITRUM),  # tokenIn
        Web3.to_checksum_address(USDC_ARBITRUM),     # tokenOut
        100,                                          # fee tier 0.01%
        wallet,                                       # recipient
        amount,                                       # amountIn
        min_out,                                      # amountOutMinimum
        0,                                            # sqrtPriceLimitX96 (0 = no limit)
    )

    print(f"  Swapping via Uniswap V3 (0.01% pool)...")
    try:
        tx = router.functions.exactInputSingle(swap_params).build_transaction({
            "from": wallet, "nonce": nonce,
            "maxFeePerGas": arb_w3.eth.gas_price * 2,
            "maxPriorityFeePerGas": arb_w3.eth.max_priority_fee,
            "gas": 300000, "value": 0,
        })
        signed = arb_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = arb_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = arb_w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    Swap tx: {h.hex()} (status: {r['status']})")

        if r['status'] == 1:
            usdc = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_ARBITRUM), abi=ERC20_ABI)
            new_bal = usdc.functions.balanceOf(wallet).call()
            print(f"    Got {new_bal/1e6:.4f} native USDC")
            return True

        # Try 500 (0.05%) fee tier as fallback
        print("  0.01% pool failed, trying 0.05% pool...")
        swap_params_500 = (
            Web3.to_checksum_address(USDC_E_ARBITRUM),
            Web3.to_checksum_address(USDC_ARBITRUM),
            500, wallet, amount, min_out, 0,
        )
        nonce += 1
        tx = router.functions.exactInputSingle(swap_params_500).build_transaction({
            "from": wallet, "nonce": nonce,
            "maxFeePerGas": arb_w3.eth.gas_price * 2,
            "maxPriorityFeePerGas": arb_w3.eth.max_priority_fee,
            "gas": 300000, "value": 0,
        })
        signed = arb_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = arb_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = arb_w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    Swap tx (500): {h.hex()} (status: {r['status']})")
        return r['status'] == 1

    except Exception as e:
        print(f"    Swap failed: {e}")
        return False


def step4_deposit_to_hl():
    """Deposit native USDC to Hyperliquid via their bridge contract on Arbitrum."""
    print(f"\n[STEP 4] Depositing USDC to Hyperliquid")
    arb_w3 = Web3(Web3.HTTPProvider(ARBITRUM_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)

    usdc = arb_w3.eth.contract(address=Web3.to_checksum_address(USDC_ARBITRUM), abi=ERC20_ABI)
    balance = usdc.functions.balanceOf(wallet).call()
    if balance == 0:
        print("  No USDC to deposit!")
        return False

    print(f"  USDC balance: {balance/1e6:.4f}")

    # Approve HL bridge
    nonce = arb_w3.eth.get_transaction_count(wallet)
    allowance = usdc.functions.allowance(wallet, Web3.to_checksum_address(HL_BRIDGE)).call()
    if allowance < balance:
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
        if r['status'] != 1:
            return False
        nonce += 1

    # Hyperliquid bridge deposit ABI
    # The bridge has a deposit(address user, uint256 usd) function
    # or sendUsd(address destination, uint64 amount) depending on version
    HL_DEPOSIT_ABI = json.loads("""[
        {"inputs":[{"name":"user","type":"address"},{"name":"usd","type":"uint64"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"name":"user","type":"address"},{"name":"usd","type":"uint64"}],"name":"batchedDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ]""")

    bridge = arb_w3.eth.contract(
        address=Web3.to_checksum_address(HL_BRIDGE), abi=HL_DEPOSIT_ABI
    )

    # HL bridge expects amount in raw USDC units (6 decimals)
    # but the function parameter is uint64
    deposit_amount = balance

    print(f"  Depositing {deposit_amount/1e6:.4f} USDC to Hyperliquid...")
    try:
        # Try the standard ERC20 transfer method first
        # Some versions of HL bridge just accept USDC transfers
        tx = usdc.functions.transfer(
            Web3.to_checksum_address(HL_BRIDGE), deposit_amount
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

        if r['status'] == 1:
            print(f"  Deposit submitted! Funds appear on Hyperliquid in ~1 minute.")
            return True
        else:
            print(f"  Transfer failed, trying bridge.deposit()...")
            nonce += 1
    except Exception as e:
        print(f"  Transfer approach failed: {e}")
        print(f"  Trying bridge.deposit()...")

    # Fallback: call deposit function
    try:
        tx = bridge.functions.deposit(wallet, deposit_amount).build_transaction({
            "from": wallet, "nonce": nonce,
            "maxFeePerGas": arb_w3.eth.gas_price * 2,
            "maxPriorityFeePerGas": arb_w3.eth.max_priority_fee,
            "gas": 300000,
        })
        signed = arb_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = arb_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = arb_w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    Deposit tx: {h.hex()} (status: {r['status']})")
        return r['status'] == 1
    except Exception as e:
        print(f"    deposit() failed: {e}")
        return False


def check_hl_equity():
    """Check Hyperliquid account equity."""
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
    print("  Polygon → Arbitrum → Hyperliquid Pipeline")
    print("=" * 55)

    bals = get_balances()

    if mode == "check":
        check_hl_equity()
        return

    if mode == "swap":
        # Just do steps 3-4 (if USDC.e already on Arbitrum)
        if bals["arb_usdc_e"] > 0:
            step3_swap_usdc_e_to_usdc(bals["arb_usdc_e"])
        bals = get_balances()
        if bals["arb_usdc"] > 0:
            step4_deposit_to_hl()
        check_hl_equity()
        return

    if mode == "deposit":
        # Just deposit existing USDC
        if bals["arb_usdc"] > 0:
            step4_deposit_to_hl()
        check_hl_equity()
        return

    # Full pipeline
    if bals["poly_usdc"] > 500_000:
        ok = step1_bridge()
        if not ok:
            print("\nBridge failed. Exiting.")
            return

        usdc_e_bal, eth_bal = step2_wait_for_arrival()
        if usdc_e_bal == 0:
            print("\nBridge didn't arrive in time. Re-run with 'check' later.")
            return
    elif bals["arb_usdc_e"] > 0:
        print("\nUSDC.e already on Arbitrum, skipping bridge.")
        usdc_e_bal = bals["arb_usdc_e"]
    elif bals["arb_usdc"] > 0:
        print("\nNative USDC already on Arbitrum, skipping to deposit.")
        step4_deposit_to_hl()
        check_hl_equity()
        return
    else:
        print("\nNo USDC anywhere to work with!")
        return

    # Swap USDC.e → native USDC
    if usdc_e_bal > 0 or bals["arb_usdc_e"] > 0:
        amount = usdc_e_bal if usdc_e_bal > 0 else bals["arb_usdc_e"]
        ok = step3_swap_usdc_e_to_usdc(amount)
        if not ok:
            print("\nSwap failed. You can retry with: python bridge_and_deposit.py swap")
            return

    # Deposit to Hyperliquid
    step4_deposit_to_hl()

    # Verify
    time.sleep(5)
    check_hl_equity()
    print("\nDone! Run 'python hl_bot.py status' to see your Hyperliquid account.")


if __name__ == "__main__":
    main()
