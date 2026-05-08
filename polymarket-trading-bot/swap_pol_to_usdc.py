"""
Swap POL → USDC.e via QuickSwap V3 (Algebra) SwapRouter on Polygon.
"""
import json
import os
import sys
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC = "https://polygon-mainnet.g.alchemy.com/v2/5hkD1oooDXAhLoCwVT2Gn"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"

WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

# QuickSwap V3 (Algebra) SwapRouter
SWAP_ROUTER = "0xf5b509bB0909a69B1c207E495f687a596C168E12"

SWAP_ROUTER_ABI = json.loads("""[
    {
        "inputs": [
            {
                "components": [
                    {"internalType": "address", "name": "tokenIn", "type": "address"},
                    {"internalType": "address", "name": "tokenOut", "type": "address"},
                    {"internalType": "address", "name": "recipient", "type": "address"},
                    {"internalType": "uint256", "name": "deadline", "type": "uint256"},
                    {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                    {"internalType": "uint256", "name": "amountOutMinimum", "type": "uint256"},
                    {"internalType": "uint160", "name": "limitSqrtPrice", "type": "uint160"}
                ],
                "internalType": "struct ISwapRouter.ExactInputSingleParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "exactInputSingle",
        "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
    }
]""")

QUOTER_ADDR = "0xa15F0D7377B2A0C0c10db057f641beD21028FC89"
QUOTER_ABI = json.loads("""[
    {
        "inputs": [
            {"internalType": "address", "name": "tokenIn", "type": "address"},
            {"internalType": "address", "name": "tokenOut", "type": "address"},
            {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
            {"internalType": "uint160", "name": "limitSqrtPrice", "type": "uint160"}
        ],
        "name": "quoteExactInputSingle",
        "outputs": [
            {"internalType": "uint256", "name": "amountOut", "type": "uint256"},
            {"internalType": "uint16", "name": "fee", "type": "uint16"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]""")

def main():
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 30}))
    assert w3.is_connected(), "Not connected to Polygon"

    wallet = Web3.to_checksum_address(WALLET)
    bal = w3.eth.get_balance(wallet)
    pol_balance = bal / 10**18
    print(f"POL balance: {pol_balance:.4f}")

    # Keep 12 POL for gas, swap the rest
    gas_reserve = 12 * 10**18
    swap_amount = bal - gas_reserve
    if swap_amount <= 0:
        print("Not enough POL to swap after gas reserve")
        sys.exit(1)

    swap_pol = swap_amount / 10**18
    print(f"Swapping {swap_pol:.4f} POL → USDC.e (keeping 12 POL for gas)")

    # Step 1: Wrap POL → WMATIC
    wmatic = w3.eth.contract(
        address=Web3.to_checksum_address(WMATIC),
        abi=json.loads('[{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}]')
    )

    nonce = w3.eth.get_transaction_count(wallet)

    # Wrap POL
    print("Wrapping POL → WMATIC...")
    wrap_tx = wmatic.functions.deposit().build_transaction({
        "from": wallet,
        "value": swap_amount,
        "nonce": nonce,
        "gasPrice": w3.eth.gas_price,
        "gas": 50000,
    })
    signed_wrap = w3.eth.account.sign_transaction(wrap_tx, PRIVATE_KEY)
    wrap_hash = w3.eth.send_raw_transaction(signed_wrap.raw_transaction)
    wrap_receipt = w3.eth.wait_for_transaction_receipt(wrap_hash, timeout=120)
    print(f"  Wrap tx: {wrap_hash.hex()} (status: {wrap_receipt['status']})")
    if wrap_receipt["status"] != 1:
        print("Wrap failed!")
        sys.exit(1)
    nonce += 1

    # Approve WMATIC spend by SwapRouter
    print("Approving WMATIC for SwapRouter...")
    approve_tx = wmatic.functions.approve(
        Web3.to_checksum_address(SWAP_ROUTER),
        swap_amount
    ).build_transaction({
        "from": wallet,
        "nonce": nonce,
        "gasPrice": w3.eth.gas_price,
        "gas": 60000,
    })
    signed_approve = w3.eth.account.sign_transaction(approve_tx, PRIVATE_KEY)
    approve_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
    approve_receipt = w3.eth.wait_for_transaction_receipt(approve_hash, timeout=120)
    print(f"  Approve tx: {approve_hash.hex()} (status: {approve_receipt['status']})")
    if approve_receipt["status"] != 1:
        print("Approve failed!")
        sys.exit(1)
    nonce += 1

    # Get quote first
    quoter = w3.eth.contract(
        address=Web3.to_checksum_address(QUOTER_ADDR),
        abi=QUOTER_ABI,
    )
    try:
        quote_result = quoter.functions.quoteExactInputSingle(
            Web3.to_checksum_address(WMATIC),
            Web3.to_checksum_address(USDC_E),
            swap_amount,
            0,
        ).call()
        expected_out = quote_result[0] if isinstance(quote_result, (list, tuple)) else quote_result
        print(f"  Quote: {swap_pol:.4f} WMATIC → {expected_out / 10**6:.4f} USDC.e")
        min_out = int(expected_out * 95 // 100)  # 5% slippage tolerance
    except Exception as e:
        print(f"  Quote failed ({e}), using 0 min output (risky)")
        min_out = 0

    # Swap WMATIC → USDC.e
    print("Swapping WMATIC → USDC.e via QuickSwap V3...")
    router = w3.eth.contract(
        address=Web3.to_checksum_address(SWAP_ROUTER),
        abi=SWAP_ROUTER_ABI,
    )

    import time
    deadline = int(time.time()) + 600  # 10 minutes

    swap_tx = router.functions.exactInputSingle((
        Web3.to_checksum_address(WMATIC),   # tokenIn
        Web3.to_checksum_address(USDC_E),   # tokenOut
        wallet,                              # recipient
        deadline,                            # deadline
        swap_amount,                         # amountIn
        min_out,                             # amountOutMinimum
        0,                                   # limitSqrtPrice (0 = no limit)
    )).build_transaction({
        "from": wallet,
        "nonce": nonce,
        "gasPrice": w3.eth.gas_price,
        "gas": 300000,
    })
    signed_swap = w3.eth.account.sign_transaction(swap_tx, PRIVATE_KEY)
    swap_hash = w3.eth.send_raw_transaction(signed_swap.raw_transaction)
    swap_receipt = w3.eth.wait_for_transaction_receipt(swap_hash, timeout=120)
    print(f"  Swap tx: {swap_hash.hex()} (status: {swap_receipt['status']})")

    if swap_receipt["status"] != 1:
        print("Swap FAILED! Check tx on polygonscan.")
        sys.exit(1)

    # Check final balances
    usdc_contract = w3.eth.contract(
        address=Web3.to_checksum_address(USDC_E),
        abi=json.loads('[{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]')
    )
    usdc_bal = usdc_contract.functions.balanceOf(wallet).call()
    pol_bal = w3.eth.get_balance(wallet)

    print(f"\n{'='*50}")
    print(f"  SWAP COMPLETE")
    print(f"  USDC.e balance: {usdc_bal / 10**6:.4f}")
    print(f"  POL balance: {pol_bal / 10**18:.4f}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
