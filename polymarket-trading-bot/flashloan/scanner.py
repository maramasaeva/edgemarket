"""
Flash Loan Arbitrage Scanner
Checks price discrepancies between QuickSwap V3 and SushiSwap V2 on Polygon.
"""

import json
import time
import sys
from typing import Optional
from dataclasses import dataclass
from web3 import Web3

# =============================================================================
# Configuration
# =============================================================================

# Public Polygon RPCs (rotate if rate-limited)
RPC_URLS = [
    "https://polygon-rpc.com",
    "https://rpc-mainnet.matic.quiknode.pro",
    "https://polygon.llamarpc.com",
]

# Token addresses (Polygon)
TOKENS = {
    "USDC.e": {
        "address": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        "decimals": 6,
    },
    "WMATIC": {
        "address": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        "decimals": 18,
    },
    "WETH": {
        "address": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f8d6",
        "decimals": 18,
    },
    "WBTC": {
        "address": "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
        "decimals": 8,
    },
}

# DEX contract addresses
SUSHI_V2_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
QUICKSWAP_V3_QUOTER = "0xa15F0D7377B2A0C0c10db057f641beD21028FC89"

# Aave flash loan fee
AAVE_FEE_BPS = 5  # 0.05%

# Gas cost estimate in MATIC (conservative)
ESTIMATED_GAS_MATIC = 0.05
# Rough MATIC price in USD for profit calc
MATIC_PRICE_USD = 0.50

# Pairs to scan: (base_token, quote_token, borrow_amount_in_base_units)
# We borrow the base token, buy the quote, then sell it back
SCAN_PAIRS = [
    ("USDC.e", "WMATIC", 1000 * 10**6),    # Borrow 1000 USDC.e
    ("USDC.e", "WETH",   1000 * 10**6),     # Borrow 1000 USDC.e
    ("USDC.e", "WBTC",   1000 * 10**6),     # Borrow 1000 USDC.e
]

# =============================================================================
# ABIs (minimal)
# =============================================================================

# SushiSwap V2 Router — getAmountsOut
SUSHI_ROUTER_ABI = json.loads("""[
    {
        "inputs": [
            {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
            {"internalType": "address[]", "name": "path", "type": "address[]"}
        ],
        "name": "getAmountsOut",
        "outputs": [
            {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]""")

# QuickSwap V3 Quoter (Algebra) — quoteExactInputSingle
# Algebra's quoter uses a slightly different signature than Uniswap V3
QUICKSWAP_QUOTER_ABI = json.loads("""[
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


# =============================================================================
# Data classes
# =============================================================================

@dataclass
class ArbOpportunity:
    pair: str
    direction: str          # "sushi_then_quick" or "quick_then_sushi"
    borrow_amount: int      # in base token smallest units
    borrow_decimals: int
    step1_out: int          # intermediate token amount
    step2_out: int          # final base token amount back
    aave_fee: int           # fee owed to Aave
    gross_profit: int       # step2_out - borrow_amount - aave_fee
    gas_cost_usd: float
    net_profit_usd: float

    def is_profitable(self) -> bool:
        return self.net_profit_usd > 0

    def __str__(self) -> str:
        borrow_human = self.borrow_amount / (10 ** self.borrow_decimals)
        profit_human = self.gross_profit / (10 ** self.borrow_decimals)
        return (
            f"  Pair: {self.pair} | Direction: {self.direction}\n"
            f"  Borrow: {borrow_human:.2f} USDC.e\n"
            f"  Step1 out: {self.step1_out} | Step2 out: {self.step2_out}\n"
            f"  Aave fee: {self.aave_fee / (10 ** self.borrow_decimals):.4f} USDC.e\n"
            f"  Gross profit: {profit_human:.4f} USDC.e\n"
            f"  Gas cost: ~${self.gas_cost_usd:.4f}\n"
            f"  Net profit: ${self.net_profit_usd:.4f}\n"
            f"  Profitable: {'YES' if self.is_profitable() else 'no'}"
        )


# =============================================================================
# Scanner
# =============================================================================

class ArbScanner:
    def __init__(self, rpc_url: Optional[str] = None):
        url = rpc_url or RPC_URLS[0]
        self.w3 = Web3(Web3.HTTPProvider(url, request_kwargs={"timeout": 30}))
        if not self.w3.is_connected():
            raise ConnectionError(f"Cannot connect to {url}")

        self.sushi_router = self.w3.eth.contract(
            address=Web3.to_checksum_address(SUSHI_V2_ROUTER),
            abi=SUSHI_ROUTER_ABI,
        )
        self.quick_quoter = self.w3.eth.contract(
            address=Web3.to_checksum_address(QUICKSWAP_V3_QUOTER),
            abi=QUICKSWAP_QUOTER_ABI,
        )

    def get_sushi_quote(self, token_in: str, token_out: str, amount_in: int) -> Optional[int]:
        """Get output amount from SushiSwap V2 router."""
        try:
            path = [
                Web3.to_checksum_address(token_in),
                Web3.to_checksum_address(token_out),
            ]
            amounts = self.sushi_router.functions.getAmountsOut(amount_in, path).call()
            return amounts[-1]
        except Exception as e:
            print(f"    [SushiV2] Quote failed: {e}")
            return None

    def get_quickswap_quote(self, token_in: str, token_out: str, amount_in: int) -> Optional[int]:
        """Get output amount from QuickSwap V3 (Algebra) quoter via eth_call."""
        try:
            result = self.quick_quoter.functions.quoteExactInputSingle(
                Web3.to_checksum_address(token_in),
                Web3.to_checksum_address(token_out),
                amount_in,
                0,  # limitSqrtPrice = 0 means no limit
            ).call()
            # Result is (amountOut, fee) tuple
            if isinstance(result, (list, tuple)):
                return result[0]
            return result
        except Exception as e:
            print(f"    [QuickV3] Quote failed: {e}")
            return None

    def check_pair(
        self,
        base_name: str,
        quote_name: str,
        borrow_amount: int,
    ) -> list[ArbOpportunity]:
        """Check both arb directions for a given pair."""
        base = TOKENS[base_name]
        quote = TOKENS[quote_name]
        pair_label = f"{base_name}/{quote_name}"
        opportunities = []

        aave_fee = (borrow_amount * AAVE_FEE_BPS) // 10_000
        gas_cost_usd = ESTIMATED_GAS_MATIC * MATIC_PRICE_USD

        # Direction 1: Buy on SushiSwap V2, sell on QuickSwap V3
        print(f"  Checking {pair_label}: Sushi buy -> Quick sell ...")
        sushi_out = self.get_sushi_quote(base["address"], quote["address"], borrow_amount)
        if sushi_out and sushi_out > 0:
            quick_back = self.get_quickswap_quote(quote["address"], base["address"], sushi_out)
            if quick_back and quick_back > 0:
                gross = quick_back - borrow_amount - aave_fee
                net_usd = (gross / (10 ** base["decimals"])) - gas_cost_usd
                opp = ArbOpportunity(
                    pair=pair_label,
                    direction="sushi_then_quick",
                    borrow_amount=borrow_amount,
                    borrow_decimals=base["decimals"],
                    step1_out=sushi_out,
                    step2_out=quick_back,
                    aave_fee=aave_fee,
                    gross_profit=gross,
                    gas_cost_usd=gas_cost_usd,
                    net_profit_usd=net_usd,
                )
                opportunities.append(opp)

        # Direction 2: Buy on QuickSwap V3, sell on SushiSwap V2
        print(f"  Checking {pair_label}: Quick buy -> Sushi sell ...")
        quick_out = self.get_quickswap_quote(base["address"], quote["address"], borrow_amount)
        if quick_out and quick_out > 0:
            sushi_back = self.get_sushi_quote(quote["address"], base["address"], quick_out)
            if sushi_back and sushi_back > 0:
                gross = sushi_back - borrow_amount - aave_fee
                net_usd = (gross / (10 ** base["decimals"])) - gas_cost_usd
                opp = ArbOpportunity(
                    pair=pair_label,
                    direction="quick_then_sushi",
                    borrow_amount=borrow_amount,
                    borrow_decimals=base["decimals"],
                    step1_out=quick_out,
                    step2_out=sushi_back,
                    aave_fee=aave_fee,
                    gross_profit=gross,
                    gas_cost_usd=gas_cost_usd,
                    net_profit_usd=net_usd,
                )
                opportunities.append(opp)

        return opportunities

    def scan_all(self) -> list[ArbOpportunity]:
        """Scan all configured pairs."""
        all_opps: list[ArbOpportunity] = []
        print(f"\n{'='*60}")
        print(f"  Flash Loan Arb Scanner — Polygon")
        print(f"  Aave fee: {AAVE_FEE_BPS/100:.2f}% | Est gas: ~${ESTIMATED_GAS_MATIC * MATIC_PRICE_USD:.3f}")
        print(f"{'='*60}\n")

        for base_name, quote_name, borrow_amount in SCAN_PAIRS:
            opps = self.check_pair(base_name, quote_name, borrow_amount)
            all_opps.extend(opps)
            time.sleep(0.5)  # be gentle with public RPCs

        return all_opps


# =============================================================================
# Main
# =============================================================================

def main():
    rpc_url = sys.argv[1] if len(sys.argv) > 1 else None

    try:
        scanner = ArbScanner(rpc_url=rpc_url)
    except ConnectionError as e:
        print(f"Connection failed: {e}")
        print("Usage: python scanner.py [RPC_URL]")
        sys.exit(1)

    print(f"Connected to Polygon (chain {scanner.w3.eth.chain_id})")
    block = scanner.w3.eth.block_number
    print(f"Current block: {block}")

    opportunities = scanner.scan_all()

    # Report
    profitable = [o for o in opportunities if o.is_profitable()]

    print(f"\n{'='*60}")
    print(f"  RESULTS: {len(opportunities)} quotes, {len(profitable)} profitable")
    print(f"{'='*60}\n")

    if not opportunities:
        print("No quotes returned. RPC may be rate-limiting or pools may lack liquidity.")
        return

    for opp in opportunities:
        print(opp)
        print()

    if profitable:
        best = max(profitable, key=lambda o: o.net_profit_usd)
        print(f"{'='*60}")
        print(f"  BEST OPPORTUNITY:")
        print(f"{'='*60}")
        print(best)
        print()
        print(f"  To execute: call executeArb() on your FlashArb contract with:")
        print(f"    borrowAmount = {best.borrow_amount}")
        token_name = best.pair.split("/")[1]
        print(f"    intermediateToken = {TOKENS[token_name]['address']}")
        print(f"    minProfit = {max(0, best.gross_profit)}")
        print(f"    buyOnSushi = {best.direction == 'sushi_then_quick'}")
    else:
        print("No profitable opportunities found at current prices.")
        print("This is normal — arb windows are brief and competitive.")


if __name__ == "__main__":
    main()
