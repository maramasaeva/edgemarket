#!/usr/bin/env python3.12
"""
EDGEMARKET — Polymarket Latency Arbitrage Bot

Exploits the ~2.7 second lag between Binance BTC price moves
and Polymarket short-duration (5m/15m) BTC contract pricing.

Architecture:
1. Monitor Binance WebSocket for real-time BTC price
2. Fetch Polymarket short-duration BTC contracts via our proxy
3. Calculate fair value based on Binance price movement
4. When Polymarket odds are stale (mispriced vs Binance reality), trade
5. Kelly criterion for position sizing

Uses our Vercel proxy to bypass geo-restriction.
"""

import json
import time
import math
import asyncio
import hashlib
import hmac
import requests
import websockets
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Optional
from dataclasses import dataclass, field

# ─── CONFIG ───────────────────────────────────────────────────

PROXY_BASE = "https://copyscore-lovat.vercel.app/api/polymarket"
BINANCE_WS = "wss://stream.binance.com:9443/ws/btcusdt@trade"
BINANCE_KLINE_WS = "wss://stream.binance.com:9443/ws/btcusdt@kline_1m"

WALLET_KEY = None  # Set to private key to enable live trading
BANKROLL = 100.0   # Starting USDC
MAX_POSITION_PCT = 0.05  # Max 5% per trade
MIN_EDGE = 0.03    # Minimum 3% edge to trade
KELLY_FRACTION = 0.25  # Quarter Kelly for safety


# ─── DATA STRUCTURES ─────────────────────────────────────────

@dataclass
class BinanceState:
    price: float = 0.0
    price_1m_ago: float = 0.0
    price_5m_ago: float = 0.0
    price_15m_ago: float = 0.0
    prices: list = field(default_factory=list)
    timestamps: list = field(default_factory=list)
    volatility_1m: float = 0.0
    momentum_1m: float = 0.0
    momentum_5m: float = 0.0
    last_update: float = 0.0

    def update(self, price: float, ts: float):
        self.price = price
        self.last_update = ts
        self.prices.append(price)
        self.timestamps.append(ts)

        # Keep last 20 minutes of data
        cutoff = ts - 1200
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.pop(0)
            self.prices.pop(0)

        # Calculate momentum and volatility
        now = ts
        prices_1m = [p for p, t in zip(self.prices, self.timestamps) if t > now - 60]
        prices_5m = [p for p, t in zip(self.prices, self.timestamps) if t > now - 300]
        prices_15m = [p for p, t in zip(self.prices, self.timestamps) if t > now - 900]

        if prices_1m and len(prices_1m) > 1:
            self.price_1m_ago = prices_1m[0]
            self.momentum_1m = (price - prices_1m[0]) / prices_1m[0]
            returns = [prices_1m[i] / prices_1m[i-1] - 1 for i in range(1, len(prices_1m))]
            self.volatility_1m = np.std(returns) if returns else 0

        if prices_5m:
            self.price_5m_ago = prices_5m[0]
            self.momentum_5m = (price - prices_5m[0]) / prices_5m[0]

        if prices_15m:
            self.price_15m_ago = prices_15m[0]


@dataclass
class PolymarketContract:
    question: str
    condition_id: str
    yes_token: str
    no_token: str
    yes_price: float
    no_price: float
    end_time: datetime
    volume_24h: float
    liquidity: float
    duration_minutes: int  # 5 or 15
    direction: str  # "up" or "down"
    threshold: Optional[float] = None


@dataclass
class TradeSignal:
    contract: PolymarketContract
    side: str  # BUY_YES or BUY_NO
    edge: float  # Expected edge (our prob - market prob)
    fair_value: float  # Our estimated true probability
    market_price: float  # Current market price
    kelly_size: float  # Kelly-optimal position size in USDC
    confidence: float  # 0-1 confidence in signal
    reason: str


# ─── POLYMARKET FETCHER (via proxy) ──────────────────────────

def fetch_btc_contracts() -> list[PolymarketContract]:
    """Fetch active short-duration BTC contracts from Polymarket"""
    contracts = []

    try:
        # Search for BTC 5-min and 15-min contracts
        for search in ["Bitcoin 5-minute", "Bitcoin 15-minute", "BTC 5 minute", "BTC 15 minute",
                        "Bitcoin higher", "Bitcoin lower", "BTC up", "BTC down"]:
            url = f"{PROXY_BASE}?api=gamma&path=/markets&params=" + \
                  requests.utils.quote(f"limit=20&active=true&closed=false&tag=crypto")
            try:
                r = requests.get(url, timeout=15)
                data = r.json()
                if not isinstance(data, list):
                    continue

                for m in data:
                    q = m.get("question", "").lower()
                    # Filter for short-duration BTC contracts
                    is_btc = "bitcoin" in q or "btc" in q
                    is_short = "5-minute" in q or "15-minute" in q or "5 minute" in q or "15 minute" in q or "5min" in q or "15min" in q
                    is_direction = "higher" in q or "lower" in q or "up" in q or "down" in q or "above" in q or "below" in q

                    if is_btc and (is_short or is_direction):
                        prices = json.loads(m.get("outcomePrices", "[]"))
                        tokens = json.loads(m.get("clobTokenIds", "[]"))
                        end_str = m.get("endDate", "")

                        if len(prices) < 2 or len(tokens) < 2:
                            continue

                        try:
                            end_time = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
                        except:
                            continue

                        # Determine duration
                        duration = 15
                        if "5-minute" in q or "5 minute" in q or "5min" in q:
                            duration = 5

                        # Determine direction
                        direction = "up" if any(w in q for w in ["higher", "up", "above"]) else "down"

                        contracts.append(PolymarketContract(
                            question=m["question"],
                            condition_id=m.get("conditionId", ""),
                            yes_token=tokens[0],
                            no_token=tokens[1],
                            yes_price=float(prices[0]),
                            no_price=float(prices[1]),
                            end_time=end_time,
                            volume_24h=float(m.get("volume24hr", 0)),
                            liquidity=float(m.get("liquidityNum", 0)),
                            duration_minutes=duration,
                            direction=direction,
                        ))
            except Exception as e:
                pass

    except Exception as e:
        print(f"Error fetching contracts: {e}")

    # Deduplicate
    seen = set()
    unique = []
    for c in contracts:
        key = c.condition_id
        if key not in seen:
            seen.add(key)
            unique.append(c)

    return unique


def fetch_orderbook(token_id: str) -> dict:
    """Fetch orderbook for a token via proxy"""
    url = f"{PROXY_BASE}?api=clob&path=/book&params=token_id%3D{token_id}"
    try:
        r = requests.get(url, timeout=10)
        return r.json()
    except:
        return {}


# ─── FAIR VALUE CALCULATOR ────────────────────────────────────

def estimate_fair_value(binance: BinanceState, contract: PolymarketContract) -> float:
    """
    Estimate the true probability of a BTC direction contract
    based on current Binance momentum and volatility.

    This is the core edge: Binance price has already moved,
    but Polymarket hasn't updated yet.
    """
    now = datetime.now(timezone.utc)
    time_left = (contract.end_time - now).total_seconds()

    if time_left <= 0:
        # Contract expired — outcome is known
        if contract.direction == "up":
            return 1.0 if binance.price > binance.price_15m_ago else 0.0
        else:
            return 1.0 if binance.price < binance.price_15m_ago else 0.0

    # Use appropriate historical price based on contract duration
    if contract.duration_minutes == 5:
        ref_price = binance.price_5m_ago if binance.price_5m_ago > 0 else binance.price
        momentum = binance.momentum_1m  # Recent momentum matters more for 5min
    else:
        ref_price = binance.price_15m_ago if binance.price_15m_ago > 0 else binance.price
        momentum = binance.momentum_5m

    if ref_price == 0:
        return 0.5

    # Current move since contract opened
    current_move = (binance.price - ref_price) / ref_price

    # Estimate probability using a simple model:
    # P(BTC higher at expiry) = Phi(z) where z = current_move / expected_volatility
    vol = binance.volatility_1m if binance.volatility_1m > 0 else 0.001
    remaining_vol = vol * math.sqrt(time_left / 60)  # Scale by sqrt(time)

    if remaining_vol == 0:
        remaining_vol = 0.001

    # Z-score: how many standard deviations is the current move
    z = current_move / remaining_vol

    # Convert to probability using normal CDF approximation
    # Phi(z) ≈ 1/(1 + exp(-1.7*z - 0.73*z^3)) for quick computation
    def phi(x):
        return 1.0 / (1.0 + math.exp(-1.7 * x - 0.73 * x**3))

    if contract.direction == "up":
        fair_prob = phi(z)
    else:
        fair_prob = 1 - phi(z)

    # Apply momentum adjustment: if BTC is still moving in one direction,
    # probability should be higher
    momentum_adj = momentum * 10  # Scale momentum to probability adjustment
    if contract.direction == "up":
        fair_prob = min(0.99, max(0.01, fair_prob + momentum_adj))
    else:
        fair_prob = min(0.99, max(0.01, fair_prob - momentum_adj))

    # Time decay: closer to expiry = more certain about outcome
    time_factor = max(0, 1 - time_left / (contract.duration_minutes * 60))
    # Amplify toward 0 or 1 as time runs out
    if fair_prob > 0.5:
        fair_prob = fair_prob + (1 - fair_prob) * time_factor * 0.5
    else:
        fair_prob = fair_prob * (1 - time_factor * 0.5)

    return round(fair_prob, 4)


# ─── SIGNAL GENERATOR ────────────────────────────────────────

def generate_signals(binance: BinanceState, contracts: list[PolymarketContract]) -> list[TradeSignal]:
    """Generate trading signals from fair value vs market price comparison"""
    signals = []

    for contract in contracts:
        fair_value = estimate_fair_value(binance, contract)
        market_price = contract.yes_price

        edge = fair_value - market_price

        if abs(edge) < MIN_EDGE:
            continue

        # Kelly criterion sizing
        if edge > 0:
            # Our fair value > market price → BUY YES
            odds = (1 / market_price) - 1  # Payout odds
            kelly = calculate_kelly_size(fair_value, odds)
            side = "BUY_YES"
            price = market_price
        else:
            # Our fair value < market price → BUY NO (or sell YES)
            odds = (1 / contract.no_price) - 1
            kelly = calculate_kelly_size(1 - fair_value, odds)
            side = "BUY_NO"
            edge = abs(edge)
            price = contract.no_price

        kelly_usd = kelly * BANKROLL * KELLY_FRACTION
        kelly_usd = min(kelly_usd, BANKROLL * MAX_POSITION_PCT)

        if kelly_usd < 1:  # Min $1 trade
            continue

        confidence = min(1.0, edge / 0.15)  # 15% edge = max confidence

        signals.append(TradeSignal(
            contract=contract,
            side=side,
            edge=edge,
            fair_value=fair_value,
            market_price=price,
            kelly_size=kelly_usd,
            confidence=confidence,
            reason=f"BTC {'↑' if binance.momentum_1m > 0 else '↓'} {abs(binance.momentum_1m)*100:.2f}% (1m), fair={fair_value:.1%} vs mkt={price:.1%}, edge={edge:.1%}",
        ))

    # Sort by edge * confidence
    signals.sort(key=lambda s: s.edge * s.confidence, reverse=True)
    return signals


def calculate_kelly_size(prob: float, odds: float) -> float:
    """Kelly criterion for binary outcome"""
    if odds <= 0 or prob <= 0 or prob >= 1:
        return 0
    edge = prob * odds - (1 - prob)
    if edge <= 0:
        return 0
    return edge / odds


# ─── EXECUTION ────────────────────────────────────────────────

class PaperTrader:
    """Paper trading for backtesting and validation"""

    def __init__(self, initial_capital: float = 100):
        self.capital = initial_capital
        self.positions = []
        self.trades = []
        self.pnl = 0.0
        self.wins = 0
        self.losses = 0

    def execute(self, signal: TradeSignal):
        size = min(signal.kelly_size, self.capital * 0.1)
        if size < 1:
            return

        self.capital -= size
        self.positions.append({
            "signal": signal,
            "size": size,
            "entry_price": signal.market_price,
            "entry_time": datetime.now(timezone.utc),
        })

        print(f"  📈 PAPER TRADE: {signal.side} ${size:.2f} on '{signal.contract.question[:50]}'")
        print(f"     Edge: {signal.edge:.1%} | Fair: {signal.fair_value:.1%} | Market: {signal.market_price:.1%}")
        print(f"     Capital: ${self.capital:.2f} | Positions: {len(self.positions)}")

    def summary(self):
        total_trades = self.wins + self.losses
        win_rate = self.wins / total_trades if total_trades > 0 else 0
        print(f"\n{'='*50}")
        print(f"PAPER TRADING SUMMARY")
        print(f"{'='*50}")
        print(f"Capital:    ${self.capital:.2f}")
        print(f"PnL:        ${self.pnl:+.2f}")
        print(f"Trades:     {total_trades}")
        print(f"Win Rate:   {win_rate:.1%}")
        print(f"Positions:  {len(self.positions)} open")


# ─── MAIN BOT LOOP ───────────────────────────────────────────

async def monitor_binance(state: BinanceState):
    """Monitor Binance BTC/USDT trades via WebSocket"""
    print("Connecting to Binance WebSocket...")
    async for ws in websockets.connect(BINANCE_WS):
        try:
            async for msg in ws:
                data = json.loads(msg)
                price = float(data["p"])
                ts = float(data["T"]) / 1000
                state.update(price, ts)
        except websockets.ConnectionClosed:
            print("Binance WS disconnected, reconnecting...")
            await asyncio.sleep(1)


async def trading_loop(state: BinanceState, trader: PaperTrader):
    """Main trading loop — scan and trade every few seconds"""
    print("Starting trading loop...")
    await asyncio.sleep(10)  # Wait for Binance data to accumulate

    scan_interval = 5  # Scan every 5 seconds for latency arb
    last_contract_fetch = 0
    contracts = []

    while True:
        try:
            now = time.time()

            # Refresh contracts every 30 seconds
            if now - last_contract_fetch > 30:
                contracts = fetch_btc_contracts()
                last_contract_fetch = now
                if contracts:
                    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Found {len(contracts)} BTC contracts")
                    for c in contracts[:5]:
                        print(f"  • {c.question[:60]} | YES: {c.yes_price:.1%} | ${c.volume_24h:,.0f}/24h")

            if not contracts:
                # If no short-duration BTC contracts, scan all markets for opportunities
                print(f"[{datetime.now().strftime('%H:%M:%S')}] No short-duration BTC contracts. Scanning all markets...")
                await scan_all_markets(state, trader)
                await asyncio.sleep(30)
                continue

            # Check for signals
            if state.price > 0:
                signals = generate_signals(state, contracts)
                if signals:
                    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] BTC: ${state.price:,.2f} | "
                          f"1m: {state.momentum_1m*100:+.2f}% | Vol: {state.volatility_1m*100:.3f}%")
                    print(f"  {len(signals)} signals found:")

                    for sig in signals[:3]:
                        print(f"  → {sig.side} | Edge: {sig.edge:.1%} | Size: ${sig.kelly_size:.2f} | {sig.reason}")
                        trader.execute(sig)

            await asyncio.sleep(scan_interval)

        except Exception as e:
            print(f"Trading loop error: {e}")
            await asyncio.sleep(5)


async def scan_all_markets(state: BinanceState, trader: PaperTrader):
    """Scan all Polymarket markets for any mispriced opportunities"""
    try:
        url = f"{PROXY_BASE}?api=gamma&path=/markets&params=" + \
              requests.utils.quote("limit=50&active=true&closed=false&order=volume24hr&ascending=false")
        r = requests.get(url, timeout=15)
        markets = r.json()

        if not isinstance(markets, list):
            return

        opportunities = []
        for m in markets:
            prices = json.loads(m.get("outcomePrices", "[]"))
            if len(prices) < 2:
                continue

            yes_p = float(prices[0])
            no_p = float(prices[1])

            # Check for mispricing (yes + no should = 1.0)
            total = yes_p + no_p
            if abs(total - 1.0) > 0.02:
                opportunities.append({
                    "question": m["question"][:60],
                    "yes": yes_p,
                    "no": no_p,
                    "total": total,
                    "volume": float(m.get("volume24hr", 0)),
                    "spread": float(m.get("spread", 0)),
                })

            # Check for wide spreads (market making opportunity)
            spread = float(m.get("spread", 0))
            if spread >= 0.04:
                opportunities.append({
                    "question": m["question"][:60],
                    "yes": yes_p,
                    "no": no_p,
                    "total": total,
                    "volume": float(m.get("volume24hr", 0)),
                    "spread": spread,
                    "type": "spread",
                })

        if opportunities:
            print(f"  Found {len(opportunities)} opportunities across all markets:")
            for opp in opportunities[:5]:
                if opp.get("type") == "spread":
                    print(f"  • SPREAD {opp['spread']:.1%}: {opp['question']} | Vol: ${opp['volume']:,.0f}")
                else:
                    print(f"  • MISPRICE: YES+NO={opp['total']:.3f}: {opp['question']}")

    except Exception as e:
        print(f"Market scan error: {e}")


async def main():
    print("=" * 60)
    print("EDGEMARKET — Polymarket Latency Arbitrage Bot")
    print("=" * 60)
    print(f"Wallet:     {WALLET}")
    print(f"Bankroll:   ${BANKROLL}")
    print(f"Min Edge:   {MIN_EDGE:.0%}")
    print(f"Kelly:      {KELLY_FRACTION:.0%}")
    print(f"Mode:       {'LIVE' if WALLET_KEY else 'PAPER'}")
    print(f"Proxy:      {PROXY_BASE}")
    print("=" * 60)

    state = BinanceState()
    trader = PaperTrader(initial_capital=BANKROLL)

    try:
        await asyncio.gather(
            monitor_binance(state),
            trading_loop(state, trader),
        )
    except KeyboardInterrupt:
        trader.summary()


if __name__ == "__main__":
    asyncio.run(main())
