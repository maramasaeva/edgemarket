"""
EDGEMARKET Polymarket Trading Bot
Scans markets, identifies mispriced predictions, and trades them.
Uses Gamma API (public) for market discovery and CLOB API for trading.
"""

import requests
import json
import time
import math
from datetime import datetime, timezone, timedelta

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"

# ─── MARKET SCANNER ───────────────────────────────────────────

def fetch_active_markets(limit=100, min_volume=10000, min_liquidity=5000):
    """Fetch active markets with decent volume and liquidity"""
    markets = []
    offset = 0
    while len(markets) < limit:
        url = f"{GAMMA_API}/markets?limit=100&offset={offset}&active=true&closed=false"
        try:
            r = requests.get(url, timeout=10)
            batch = r.json()
            if not batch:
                break
            for m in batch:
                vol = float(m.get("volumeNum", 0))
                liq = float(m.get("liquidityNum", 0))
                if vol >= min_volume and liq >= min_liquidity:
                    markets.append(m)
            offset += 100
        except Exception as e:
            print(f"Error fetching markets: {e}")
            break
    return markets[:limit]


def parse_market(m):
    """Extract key trading info from a market"""
    prices = json.loads(m.get("outcomePrices", "[]"))
    outcomes = json.loads(m.get("outcomes", "[]"))
    tokens = json.loads(m.get("clobTokenIds", "[]"))

    yes_price = float(prices[0]) if len(prices) > 0 else 0.5
    no_price = float(prices[1]) if len(prices) > 1 else 0.5

    return {
        "id": m["id"],
        "question": m["question"],
        "slug": m.get("slug", ""),
        "yes_price": yes_price,
        "no_price": no_price,
        "yes_token": tokens[0] if len(tokens) > 0 else None,
        "no_token": tokens[1] if len(tokens) > 1 else None,
        "volume": float(m.get("volumeNum", 0)),
        "volume_24h": float(m.get("volume24hr", 0)),
        "liquidity": float(m.get("liquidityNum", 0)),
        "spread": float(m.get("spread", 0)),
        "best_bid": float(m.get("bestBid", 0)),
        "best_ask": float(m.get("bestAsk", 0)),
        "end_date": m.get("endDate", ""),
        "outcomes": outcomes,
        "one_week_change": float(m.get("oneWeekPriceChange", 0)),
        "one_month_change": float(m.get("oneMonthPriceChange", 0)),
        "description": m.get("description", "")[:500],
    }


# ─── EDGE DETECTION ──────────────────────────────────────────

def calculate_kelly(prob, odds):
    """Kelly criterion for optimal bet sizing"""
    if odds <= 0:
        return 0
    edge = prob * odds - (1 - prob)
    if edge <= 0:
        return 0
    return edge / odds


def detect_edge(market):
    """
    Detect mispricing in a market.

    Strategies:
    1. Spread capture: Wide bid-ask spreads = free money for market makers
    2. Momentum: Markets that moved sharply may overshoot
    3. Time decay: Markets near expiry with extreme prices often revert
    4. Volume anomaly: Sudden volume spikes often precede price moves
    """
    signals = []
    score = 0

    yes_p = market["yes_price"]
    no_p = market["no_price"]
    spread = market["spread"]
    vol_24h = market["volume_24h"]
    liq = market["liquidity"]

    # 1. Spread capture opportunity
    if spread >= 0.03:
        mid = (market["best_bid"] + market["best_ask"]) / 2 if market["best_bid"] > 0 else yes_p
        edge_pct = spread / 2  # half-spread is your edge as market maker
        score += edge_pct * 100
        signals.append(f"SPREAD: {spread:.1%} spread → {edge_pct:.1%} edge as MM")

    # 2. Momentum signal
    week_change = market["one_week_change"]
    month_change = market["one_month_change"]

    if abs(week_change) > 0.10:
        # Strong weekly momentum — potential continuation or reversal
        if week_change > 0.15 and yes_p > 0.7:
            signals.append(f"MOMENTUM: +{week_change:.0%} weekly, overbought at {yes_p:.0%}")
            score += 3
        elif week_change < -0.15 and yes_p < 0.3:
            signals.append(f"MOMENTUM: {week_change:.0%} weekly, oversold at {yes_p:.0%}")
            score += 3

    # 3. Time decay / convergence
    if market["end_date"]:
        try:
            end = datetime.fromisoformat(market["end_date"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            days_left = (end - now).days

            if days_left <= 7 and (yes_p > 0.85 or yes_p < 0.15):
                confidence = max(yes_p, 1 - yes_p)
                signals.append(f"NEAR-EXPIRY: {days_left}d left, {confidence:.0%} confidence")
                score += 5

            if days_left <= 3 and (yes_p > 0.90 or yes_p < 0.10):
                signals.append(f"CONVERGENCE: {days_left}d left, near-certain at {yes_p:.0%}")
                score += 8
        except:
            pass

    # 4. Volume/liquidity ratio anomaly
    if liq > 0:
        vol_liq_ratio = vol_24h / liq
        if vol_liq_ratio > 2.0:
            signals.append(f"VOLUME SPIKE: 24h vol is {vol_liq_ratio:.1f}x liquidity")
            score += 4

    # 5. Mispricing check (yes + no should = 1.0)
    total = yes_p + no_p
    if abs(total - 1.0) > 0.02:
        signals.append(f"MISPRICING: YES({yes_p:.3f}) + NO({no_p:.3f}) = {total:.3f} (should be 1.0)")
        score += 10

    return {
        "score": score,
        "signals": signals,
        "market": market,
    }


# ─── ORDERBOOK ANALYSIS ──────────────────────────────────────

def fetch_orderbook(token_id):
    """Fetch the order book for a specific token"""
    try:
        r = requests.get(f"{CLOB_API}/book?token_id={token_id}", timeout=10)
        return r.json()
    except Exception as e:
        print(f"Orderbook error: {e}")
        return None


def analyze_orderbook(book):
    """Analyze orderbook for trading opportunities"""
    if not book:
        return None

    bids = book.get("bids", [])
    asks = book.get("asks", [])

    if not bids or not asks:
        return None

    best_bid = float(bids[0]["price"])
    best_ask = float(asks[0]["price"])
    spread = best_ask - best_bid
    mid = (best_bid + best_ask) / 2

    # Calculate depth
    bid_depth = sum(float(b["size"]) for b in bids[:5])
    ask_depth = sum(float(a["size"]) for a in asks[:5])

    # Imbalance
    total_depth = bid_depth + ask_depth
    imbalance = (bid_depth - ask_depth) / total_depth if total_depth > 0 else 0

    return {
        "best_bid": best_bid,
        "best_ask": best_ask,
        "spread": spread,
        "spread_pct": spread / mid if mid > 0 else 0,
        "mid": mid,
        "bid_depth": bid_depth,
        "ask_depth": ask_depth,
        "imbalance": imbalance,
        "imbalance_signal": "BUY" if imbalance > 0.3 else "SELL" if imbalance < -0.3 else "NEUTRAL",
    }


# ─── TRADING STRATEGY ────────────────────────────────────────

class TradingStrategy:
    """
    Multi-signal prediction market strategy.

    Core edges:
    1. Market making on wide spreads (passive income)
    2. Near-expiry convergence trades (high confidence, low risk)
    3. Momentum trades with orderbook confirmation
    4. Mispricing arbitrage (YES + NO != 1.0)
    """

    def __init__(self, bankroll=100, max_position_pct=0.1, min_edge=0.02):
        self.bankroll = bankroll
        self.max_position_pct = max_position_pct
        self.min_edge = min_edge
        self.positions = {}
        self.trades = []

    def generate_orders(self, opportunities):
        """Generate orders from scored opportunities"""
        orders = []

        for opp in sorted(opportunities, key=lambda x: x["score"], reverse=True):
            if opp["score"] < 3:
                continue

            market = opp["market"]
            max_size = self.bankroll * self.max_position_pct

            for signal in opp["signals"]:
                if "CONVERGENCE" in signal or "NEAR-EXPIRY" in signal:
                    # Buy the likely outcome near expiry
                    if market["yes_price"] > 0.85:
                        orders.append({
                            "type": "LIMIT",
                            "side": "BUY",
                            "token": "YES",
                            "token_id": market["yes_token"],
                            "price": market["yes_price"] - 0.01,
                            "size": min(max_size / market["yes_price"], max_size),
                            "market": market["question"][:60],
                            "reason": signal,
                        })
                    elif market["yes_price"] < 0.15:
                        orders.append({
                            "type": "LIMIT",
                            "side": "BUY",
                            "token": "NO",
                            "token_id": market["no_token"],
                            "price": market["no_price"] - 0.01,
                            "size": min(max_size / market["no_price"], max_size),
                            "market": market["question"][:60],
                            "reason": signal,
                        })

                elif "SPREAD" in signal and market["spread"] >= 0.04:
                    # Market making: place both sides
                    mid = (market["best_bid"] + market["best_ask"]) / 2
                    half_spread = market["spread"] / 2
                    orders.append({
                        "type": "LIMIT",
                        "side": "BUY",
                        "token": "YES",
                        "token_id": market["yes_token"],
                        "price": round(mid - half_spread * 0.8, 2),
                        "size": max_size * 0.5,
                        "market": market["question"][:60],
                        "reason": f"MM bid (spread={market['spread']:.0%})",
                    })
                    orders.append({
                        "type": "LIMIT",
                        "side": "SELL",
                        "token": "YES",
                        "token_id": market["yes_token"],
                        "price": round(mid + half_spread * 0.8, 2),
                        "size": max_size * 0.5,
                        "market": market["question"][:60],
                        "reason": f"MM ask (spread={market['spread']:.0%})",
                    })

                elif "MISPRICING" in signal:
                    # Arbitrage: buy the cheaper side
                    total = market["yes_price"] + market["no_price"]
                    if total > 1.02:
                        # Both sides overpriced — sell the more expensive one
                        pass  # Need existing position to sell
                    elif total < 0.98:
                        # Both sides underpriced — buy both
                        orders.append({
                            "type": "LIMIT",
                            "side": "BUY",
                            "token": "YES",
                            "token_id": market["yes_token"],
                            "price": market["yes_price"],
                            "size": max_size * 0.5,
                            "market": market["question"][:60],
                            "reason": f"Arb: YES+NO={total:.3f} < 1.0",
                        })
                        orders.append({
                            "type": "LIMIT",
                            "side": "BUY",
                            "token": "NO",
                            "token_id": market["no_token"],
                            "price": market["no_price"],
                            "size": max_size * 0.5,
                            "market": market["question"][:60],
                            "reason": f"Arb: YES+NO={total:.3f} < 1.0",
                        })

        return orders


# ─── MAIN SCANNER ─────────────────────────────────────────────

def run_scanner():
    """Scan all markets and find trading opportunities"""
    print("=" * 70)
    print(f"EDGEMARKET POLYMARKET SCANNER — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    print("\nFetching active markets...")
    markets = fetch_active_markets(limit=200, min_volume=5000, min_liquidity=1000)
    print(f"Found {len(markets)} qualifying markets\n")

    parsed = [parse_market(m) for m in markets]
    opportunities = [detect_edge(m) for m in parsed]
    hot = [o for o in opportunities if o["score"] > 0]
    hot.sort(key=lambda x: x["score"], reverse=True)

    print(f"{'='*70}")
    print(f"TOP OPPORTUNITIES ({len(hot)} found)")
    print(f"{'='*70}\n")

    for i, opp in enumerate(hot[:20]):
        m = opp["market"]
        print(f"#{i+1} | Score: {opp['score']:.1f} | {m['question'][:65]}")
        print(f"     YES: {m['yes_price']:.1%} | NO: {m['no_price']:.1%} | Vol24h: ${m['volume_24h']:,.0f} | Liq: ${m['liquidity']:,.0f}")
        for sig in opp["signals"]:
            print(f"     → {sig}")

        # Fetch orderbook for top opportunities
        if i < 5 and m["yes_token"]:
            book = fetch_orderbook(m["yes_token"])
            analysis = analyze_orderbook(book)
            if analysis:
                print(f"     📊 Book: bid={analysis['best_bid']:.3f} ask={analysis['best_ask']:.3f} spread={analysis['spread_pct']:.1%} imbalance={analysis['imbalance_signal']}")

        print()

    # Generate hypothetical orders
    strategy = TradingStrategy(bankroll=100, max_position_pct=0.10)
    orders = strategy.generate_orders(hot)

    if orders:
        print(f"\n{'='*70}")
        print(f"GENERATED ORDERS ({len(orders)})")
        print(f"{'='*70}\n")
        for o in orders[:15]:
            print(f"  {o['side']:4s} {o['token']:3s} @ ${o['price']:.2f} | Size: ${o['size']:.2f} | {o['market']}")
            print(f"       Reason: {o['reason']}")
            print()

    return hot, orders


if __name__ == "__main__":
    hot, orders = run_scanner()
    print(f"\nScan complete. {len(hot)} opportunities, {len(orders)} orders generated.")
    print(f"To execute: fund wallet with USDC.e on Polygon, then run with --live flag.")
