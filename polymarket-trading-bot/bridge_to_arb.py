"""
Bridge USDC.e from Polygon to Arbitrum for Hyperliquid deposit.
Uses Synapse bridge (reliable, low fees for stablecoins).

Flow: USDC.e (Polygon) → Synapse Bridge → USDC (Arbitrum) → Hyperliquid deposit
"""
import json
import os
import time
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"

# RPCs
POLYGON_RPC = "https://polygon.drpc.org"
ARBITRUM_RPC = "https://arbitrum.drpc.org"

# Token addresses
USDC_E_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"  # USDC.e on Polygon
USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"    # native USDC on Arbitrum
USDC_E_ARBITRUM = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"  # bridged USDC.e on Arbitrum

ERC20_ABI = json.loads('[{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]')


def check_balances():
    """Check USDC balances on both chains."""
    poly_w3 = Web3(Web3.HTTPProvider(POLYGON_RPC, request_kwargs={"timeout": 30}))
    arb_w3 = Web3(Web3.HTTPProvider(ARBITRUM_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)

    # Polygon
    usdc_poly = poly_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_POLYGON), abi=ERC20_ABI)
    poly_usdc_bal = usdc_poly.functions.balanceOf(wallet).call()
    poly_native = poly_w3.eth.get_balance(wallet)

    print(f"Polygon:")
    print(f"  USDC.e: {poly_usdc_bal / 10**6:.4f}")
    print(f"  POL: {poly_native / 10**18:.4f}")

    # Arbitrum
    for name, addr, dec in [
        ("USDC", USDC_ARBITRUM, 6),
        ("USDC.e", USDC_E_ARBITRUM, 6),
    ]:
        try:
            token = arb_w3.eth.contract(address=Web3.to_checksum_address(addr), abi=ERC20_ABI)
            bal = token.functions.balanceOf(wallet).call()
            print(f"Arbitrum {name}: {bal / 10**dec:.4f}")
        except:
            print(f"Arbitrum {name}: error reading")

    arb_eth = arb_w3.eth.get_balance(wallet)
    print(f"Arbitrum ETH: {arb_eth / 10**18:.6f}")

    return poly_usdc_bal, arb_eth


def bridge_via_stargate():
    """
    Use Stargate V2 to bridge USDC.e from Polygon to Arbitrum.
    Stargate is the most reliable for stablecoin cross-chain transfers.
    """
    poly_w3 = Web3(Web3.HTTPProvider(POLYGON_RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)

    usdc_poly = poly_w3.eth.contract(address=Web3.to_checksum_address(USDC_E_POLYGON), abi=ERC20_ABI)
    balance = usdc_poly.functions.balanceOf(wallet).call()

    if balance == 0:
        print("No USDC.e to bridge!")
        return

    # Keep $0.50 on Polygon for potential future gas
    bridge_amount = balance - 500_000  # Keep 0.5 USDC.e
    if bridge_amount <= 0:
        bridge_amount = balance

    print(f"\nBridging {bridge_amount / 10**6:.4f} USDC.e from Polygon → Arbitrum")

    # Stargate V2 Router on Polygon
    STARGATE_ROUTER = "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd"

    # Stargate swap function ABI
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
        address=Web3.to_checksum_address(STARGATE_ROUTER),
        abi=STARGATE_ABI,
    )

    # Stargate chain IDs: Polygon=109, Arbitrum=110
    # Pool IDs: USDC=1, USDT=2
    DST_CHAIN_ID = 110  # Arbitrum
    SRC_POOL_ID = 1     # USDC pool on Polygon
    DST_POOL_ID = 1     # USDC pool on Arbitrum

    wallet_bytes = bytes.fromhex(wallet[2:])
    # Request small ETH airdrop on Arbitrum for Hyperliquid deposit gas
    dst_native_amount = int(0.0005 * 10**18)  # 0.0005 ETH (~$1.50, enough for several txs)
    wallet_bytes_padded = b'\x00' * 12 + wallet_bytes  # abi.encodePacked(address) = 32 bytes
    lz_params = (0, dst_native_amount, wallet_bytes_padded)
    min_amount = int(bridge_amount * 0.995)  # 0.5% slippage tolerance

    # Get fee quote
    try:
        fee = router.functions.quoteLayerZeroFee(
            DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID,
            wallet, bridge_amount, min_amount,
            lz_params, wallet_bytes, b""
        ).call()
        print(f"  LayerZero fee: {fee[0] / 10**18:.6f} POL")
    except Exception as e:
        print(f"  Fee quote failed: {e}")
        print("  Trying with estimated fee...")
        fee = (int(0.3 * 10**18), 0)  # Estimate ~0.3 POL

    # Approve Stargate Router
    nonce = poly_w3.eth.get_transaction_count(wallet)
    gas_price = poly_w3.eth.gas_price

    allowance = usdc_poly.functions.allowance(wallet, Web3.to_checksum_address(STARGATE_ROUTER)).call()
    if allowance < bridge_amount:
        print("  Approving USDC.e for Stargate Router...")
        tx = usdc_poly.functions.approve(
            Web3.to_checksum_address(STARGATE_ROUTER),
            2**256 - 1,
        ).build_transaction({
            "from": wallet, "nonce": nonce,
            "gasPrice": gas_price, "gas": 100000,
        })
        signed = poly_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = poly_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = poly_w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    Approve tx: {h.hex()} (status: {r['status']})")
        nonce += 1

    # Execute bridge
    print(f"  Executing bridge: {bridge_amount / 10**6:.4f} USDC.e → Arbitrum...")
    try:
        tx = router.functions.swap(
            DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID,
            wallet, bridge_amount, min_amount,
            lz_params, wallet_bytes, b""
        ).build_transaction({
            "from": wallet,
            "nonce": nonce,
            "gasPrice": gas_price,
            "gas": 600000,
            "value": fee[0],  # LayerZero fee in POL
        })
        signed = poly_w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = poly_w3.eth.send_raw_transaction(signed.raw_transaction)
        r = poly_w3.eth.wait_for_transaction_receipt(h, timeout=120)
        print(f"    Bridge tx: {h.hex()} (status: {r['status']})")

        if r['status'] == 1:
            print(f"\n  Bridge submitted! USDC should arrive on Arbitrum in 1-5 minutes.")
            print(f"  Run this script again to check Arbitrum balance.")
        else:
            print(f"  Bridge tx reverted!")
    except Exception as e:
        print(f"  Bridge failed: {e}")


def main():
    print("=" * 50)
    print("  Polygon → Arbitrum Bridge")
    print("=" * 50)

    poly_bal, arb_eth = check_balances()

    if poly_bal > 0:
        bridge_via_stargate()
    else:
        print("\nNo USDC.e on Polygon to bridge.")

    print("\nDone. Re-run to check updated balances.")


if __name__ == "__main__":
    main()
