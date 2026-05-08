#!/usr/bin/env python3
"""
EDGEMARKET — BTC 5-Minute Market Trading Bot

Exploits the latency between Binance BTC price and Polymarket
short-duration BTC UP/DOWN market pricing.

Strategy:
1. Binance WebSocket → real-time BTC price
2. Discover current 5-min window via slug pattern btc-updown-5m-{ts}
3. Calculate fair P(Up) using Brownian motion + momentum
4. When Polymarket is stale vs Binance reality → trade the edge
5. Quarter-Kelly position sizing, maker orders (0% fee)
"""

import os
import sys
import json
import time
import math
import signal
import asyncio
import logging
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote

import requests
import numpy as np
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("edgemarket")

# ─── CONFIG ────────────────────────────────────────────────

CLOB_HOST = os.getenv("CLOB_HOST", "https://clob.polymarket.com")
PROXY_BASE = os.getenv("PROXY_BASE", "https://copyscore-lovat.vercel.app/api/polymarket")
BINANCE_WS = "wss://stream.binance.com:9443/ws/btcusdt@trade"
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
SAFE_ADDRESS = os.getenv("SAFE_ADDRESS")
CHAIN_ID = int(os.getenv("CHAIN_ID", "137"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"
BANKROLL = float(os.getenv("BANKROLL", "100"))
MIN_BET = float(os.getenv("MIN_BET", "1.0"))
MAX_BET = float(os.getenv("MAX_BET", "10.0"))
MIN_EDGE = float(os.getenv("MIN_EDGE", "0.03"))
KELLY_FRACTION = float(os.getenv("KELLY_FRACTION", "0.25"))
SCAN_INTERVAL = int(os.getenv("SCAN_INTERVAL", "3"))

TG_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TG_CHAT = os.getenv("TELEGRAM_CHAT_ID")


# ─── POLYMARKET CLIENT ──────────────────────────────────────

client = None

def init_client():
    global client
    if not PRIVATE_KEY:
        log.warning("No PRIVATE_KEY — read-only / paper mode")
        return

    from py_clob_client.client import ClobClient

    client = ClobClient(
        CLOB_HOST,
        key=PRIVATE_KEY,
        chain_id=CHAIN_ID,
        signature_type=0,
        funder=SAFE_ADDRESS or None,
    )

    creds = client.create_or_derive_api_creds()
    client.set_api_creds(creds)
    log.info(f"CLOB authenticated. API key: {creds.api_key[:8]}...")


def get_balance():
    if not client:
        return 0
    from py_clob_client.clob_types import BalanceAllowanceParams, AssetType
    bal = client.get_balance_allowance(
        params=BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
    )
    return float(bal.get("balance", 0)) if isinstance(bal, dict) else 0


# ─── BINANCE PRICE STATE ────────────────────────────────────

@dataclass
class BinanceState:
    price: float = 0.0
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

        cutoff = ts - 1200
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.pop(0)
            self.prices.pop(0)

        prices_1m = [p for p, t in zip(self.prices, self.timestamps) if t > ts - 60]
        prices_5m = [p for p, t in zip(self.prices, self.timestamps) if t > ts - 300]

        if len(prices_1m) > 1:
            self.momentum_1m = (price - prices_1m[0]) / prices_1m[0]
            returns = [prices_1m[i] / prices_1m[i-1] - 1 for i in range(1, len(prices_1m))]
            self.volatility_1m = float(np.std(returns)) if returns else 0.0

        if prices_5m:
            self.momentum_5m = (price - prices_5m[0]) / prices_5m[0]

    def price_at(self, ts: float) -> float:
        best = self.price
        best_dt = float('inf')
        for p, t in zip(self.prices, self.timestamps):
            dt = abs(t - ts)
            if dt < best_dt:
                best_dt = dt
                best = p
        return best


# ─── MARKET DISCOVERY ───────────────────────────────────────

@dataclass
class BtcWindow:
    slug: str
    question: str
    up_token: str
    down_token: str
    up_price: float
    down_price: float
    start_ts: int
    end_ts: int
    accepting: bool
    condition_id: str


def discover_5m_windows(count: int = 5) -> list[BtcWindow]:
    """Find current and upcoming 5-min BTC UP/DOWN markets by slug pattern."""
    now = int(time.time())
    base_ts = now - (now % 300)
    windows = []

    for offset in range(-1, count):
        ts = base_ts + (offset * 300)
        slug = f"btc-updown-5m-{ts}"
        try:
            params = f"slug={slug}"
            url = f"{PROXY_BASE}?api=gamma&path=/markets&params={quote(params)}"
            r = requests.get(url, timeout=10)
            data = r.json()
            markets = data if isinstance(data, list) else data.get("data", [])
            if not markets:
                continue
            m = markets[0]
            prices = json.loads(m.get("outcomePrices", "[]"))
            tokens = json.loads(m.get("clobTokenIds", "[]"))
            if len(prices) < 2 or len(tokens) < 2:
                continue
            windows.append(BtcWindow(
                slug=slug,
                question=m.get("question", ""),
                up_token=tokens[0],
                down_token=tokens[1],
                up_price=float(prices[0]),
                down_price=float(prices[1]),
                start_ts=ts,
                end_ts=ts + 300,
                accepting=m.get("acceptingOrders", False),
                condition_id=m.get("conditionId", ""),
            ))
        except Exception as e:
            log.debug(f"Slug {slug} fetch failed: {e}")

    return windows


def discover_15m_windows(count: int = 3) -> list[BtcWindow]:
    """Find 15-min BTC UP/DOWN markets."""
    now = int(time.time())
    base_ts = now - (now % 900)
    windows = []

    for offset in range(-1, count):
        ts = base_ts + (offset * 900)
        slug = f"btc-updown-15m-{ts}"
        try:
            params = f"slug={slug}"
            url = f"{PROXY_BASE}?api=gamma&path=/markets&params={quote(params)}"
            r = requests.get(url, timeout=10)
            data = r.json()
            markets = data if isinstance(data, list) else data.get("data", [])
            if not markets:
                continue
            m = markets[0]
            prices = json.loads(m.get("outcomePrices", "[]"))
            tokens = json.loads(m.get("clobTokenIds", "[]"))
            if len(prices) < 2 or len(tokens) < 2:
                continue
            windows.append(BtcWindow(
                slug=slug,
                question=m.get("question", ""),
                up_token=tokens[0],
                down_token=tokens[1],
                up_price=float(prices[0]),
                down_price=float(prices[1]),
                start_ts=ts,
                end_ts=ts + 900,
                accepting=m.get("acceptingOrders", False),
                condition_id=m.get("conditionId", ""),
            ))
        except Exception as e:
            log.debug(f"Slug {slug} fetch failed: {e}")

    return windows


# ─── FAIR VALUE ESTIMATION ──────────────────────────────────

def estimate_fair_up(binance: BinanceState, window: BtcWindow) -> float:
    """
    Estimate P(BTC Up) for a 5-min window using Brownian motion model.

    Core edge: Binance has the real price. Polymarket odds lag by ~2-5 seconds.
    When BTC moves sharply, our fair value diverges from stale Polymarket odds.
    """
    now = time.time()
    time_left = window.end_ts - now
    window_duration = window.end_ts - window.start_ts

    if time_left <= 0:
        return 0.5

    ref_price = binance.price_at(window.start_ts)
    if ref_price == 0:
        return 0.5

    current_move = (binance.price - ref_price) / ref_price

    vol = binance.volatility_1m if binance.volatility_1m > 0 else 0.0005
    remaining_vol = vol * math.sqrt(time_left / 60)

    if remaining_vol < 1e-8:
        return 0.99 if current_move > 0 else 0.01

    z = current_move / remaining_vol

    # Normal CDF approximation (Bowling et al.)
    def phi(x):
        return 1.0 / (1.0 + math.exp(-1.7 * x - 0.73 * x**3))

    fair_up = phi(z)

    # Momentum adjustment: recent trend continues
    mom_adj = binance.momentum_1m * 5
    fair_up = max(0.01, min(0.99, fair_up + mom_adj))

    # Time decay: amplify toward 0 or 1 as window closes
    elapsed_frac = max(0, 1 - time_left / window_duration)
    if fair_up > 0.5:
        fair_up = fair_up + (1 - fair_up) * elapsed_frac * 0.4
    else:
        fair_up = fair_up * (1 - elapsed_frac * 0.4)

    return round(fair_up, 4)


# ─── KELLY CRITERION ────────────────────────────────────────

def kelly_size(prob: float, price: float) -> float:
    """Quarter-Kelly bet size as fraction of bankroll."""
    if price <= 0 or price >= 1 or prob <= 0 or prob >= 1:
        return 0
    odds = (1 / price) - 1
    edge = prob * odds - (1 - prob)
    if edge <= 0:
        return 0
    return (edge / odds) * KELLY_FRACTION


# ─── ORDER EXECUTION ────────────────────────────────────────

@dataclass
class Trade:
    ts: str
    window: str
    side: str
    price: float
    size_usd: float
    edge: float
    fair_value: float
    btc_price: float
    dry_run: bool

trade_log: list[Trade] = []


def place_order(token_id: str, price: float, size_usd: float, side: str) -> dict:
    shares = int(size_usd / price) if price > 0 else 0
    if shares < 1:
        return {"status": "skip", "reason": "too_small"}

    if DRY_RUN:
        log.info(f"  [DRY] {side} {shares} shares @ ${price:.3f} = ${size_usd:.2f}")
        return {"status": "dry_run", "shares": shares}

    if not client:
        log.error("Cannot trade: no CLOB client")
        return {"status": "error", "reason": "no_client"}

    from py_clob_client.clob_types import OrderArgs, OrderType
    from py_clob_client.order_builder.constants import BUY, SELL

    try:
        order_args = OrderArgs(
            token_id=token_id,
            price=price,
            size=shares,
            side=BUY if side == "BUY" else SELL,
        )
        signed = client.create_order(order_args)
        resp = client.post_order(signed, OrderType.GTC)
        log.info(f"  [LIVE] {side} {shares} @ ${price:.3f} → {resp}")
        return resp
    except Exception as e:
        log.error(f"  Order failed: {e}")
        return {"status": "error", "reason": str(e)}


# ─── NOTIFICATIONS ──────────────────────────────────────────

def notify(msg: str):
    if not TG_TOKEN or not TG_CHAT:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHAT, "text": f"EDGEMARKET\n{msg}"},
            timeout=5,
        )
    except:
        pass


# ─── SCAN LOOP (synchronous for scan-only) ──────────────────

def scan_once():
    """Single scan of 5-min + 15-min windows. No Binance data needed for discovery."""
    log.info(f"{'='*60}")
    log.info(f"SCAN @ {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    log.info(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE'} | Bankroll: ${BANKROLL}")
    log.info(f"{'='*60}")

    windows_5m = discover_5m_windows(count=6)
    windows_15m = discover_15m_windows(count=3)
    all_windows = windows_5m + windows_15m

    log.info(f"Found {len(windows_5m)} 5-min + {len(windows_15m)} 15-min windows")

    now = time.time()
    for w in all_windows:
        time_left = w.end_ts - now
        duration = w.end_ts - w.start_ts
        status = "ACTIVE" if w.start_ts <= now < w.end_ts else ("UPCOMING" if now < w.start_ts else "EXPIRED")
        spread = abs(w.up_price + w.down_price - 1.0)

        log.info(f"\n  {w.question}")
        log.info(f"  Up={w.up_price:.3f} Down={w.down_price:.3f} | Spread={spread:.3f}")
        log.info(f"  Status={status} | Time left={time_left:.0f}s | Accepting={w.accepting}")
        log.info(f"  Up token:   {w.up_token[:30]}...")
        log.info(f"  Down token: {w.down_token[:30]}...")

    return all_windows


# ─── ASYNC TRADING BOT ──────────────────────────────────────

async def monitor_binance(state: BinanceState, stop_event: asyncio.Event):
    """Stream BTC/USDT trades from Binance WebSocket."""
    import websockets

    while not stop_event.is_set():
        try:
            log.info("Connecting to Binance WebSocket...")
            async with websockets.connect(BINANCE_WS) as ws:
                log.info(f"Binance connected. Streaming BTC/USDT trades...")
                async for msg in ws:
                    if stop_event.is_set():
                        break
                    data = json.loads(msg)
                    price = float(data["p"])
                    ts = float(data["T"]) / 1000
                    state.update(price, ts)
        except Exception as e:
            log.warning(f"Binance WS error: {e}. Reconnecting in 2s...")
            await asyncio.sleep(2)


async def trading_loop(state: BinanceState, stop_event: asyncio.Event):
    """Main loop: discover windows, estimate fair value, trade edges."""
    log.info("Warming up Binance price feed (10s)...")
    await asyncio.sleep(10)

    if state.price == 0:
        log.error("No Binance data after warmup. Check connection.")
        return

    log.info(f"BTC price: ${state.price:,.2f}. Starting trading loop.")

    last_window_refresh = 0
    windows: list[BtcWindow] = []
    traded_windows: set[str] = set()

    while not stop_event.is_set():
        try:
            now = time.time()

            # Refresh windows every 30 seconds
            if now - last_window_refresh > 30:
                windows = discover_5m_windows(count=4) + discover_15m_windows(count=2)
                last_window_refresh = now
                if windows:
                    active = [w for w in windows if w.start_ts <= now < w.end_ts and w.accepting]
                    upcoming = [w for w in windows if now < w.start_ts]
                    log.info(f"Windows: {len(active)} active, {len(upcoming)} upcoming")

            # Evaluate each active window
            for w in windows:
                if not w.accepting or w.slug in traded_windows:
                    continue

                time_left = w.end_ts - now
                if time_left <= 0 or time_left > (w.end_ts - w.start_ts):
                    continue

                # Don't trade in last 15 seconds (resolution risk)
                if time_left < 15:
                    continue

                # Need Binance data covering the window start
                if state.last_update < w.start_ts:
                    continue

                fair_up = estimate_fair_up(state, w)
                fair_down = 1 - fair_up

                edge_up = fair_up - w.up_price
                edge_down = fair_down - w.down_price

                best_edge = max(edge_up, edge_down)
                if best_edge < MIN_EDGE:
                    continue

                # Determine trade direction
                if edge_up >= edge_down:
                    side = "UP"
                    token = w.up_token
                    price = w.up_price
                    fair = fair_up
                    edge = edge_up
                else:
                    side = "DOWN"
                    token = w.down_token
                    price = w.down_price
                    fair = fair_down
                    edge = edge_down

                k = kelly_size(fair, price)
                size_usd = min(k * BANKROLL, MAX_BET)
                if size_usd < MIN_BET:
                    continue

                ref_price = state.price_at(w.start_ts)
                move_pct = (state.price - ref_price) / ref_price * 100 if ref_price else 0

                log.info(f"\n{'='*50}")
                log.info(f"SIGNAL: {w.question}")
                log.info(f"  BTC ${state.price:,.2f} | Move: {move_pct:+.3f}% from window open")
                log.info(f"  Fair P(Up)={fair_up:.3f} | Market Up={w.up_price:.3f} Down={w.down_price:.3f}")
                log.info(f"  → BUY {side} | Edge={edge:.1%} | Size=${size_usd:.2f} | Kelly={k:.3f}")
                log.info(f"  Time left: {time_left:.0f}s")

                notify(f"BTC {side} | Edge {edge:.1%} | ${size_usd:.2f}\n"
                       f"BTC ${state.price:,.0f} ({move_pct:+.2f}%)\n"
                       f"Fair={fair:.3f} vs Mkt={price:.3f}")

                result = place_order(token, price, size_usd, "BUY")

                trade_log.append(Trade(
                    ts=datetime.now(timezone.utc).isoformat(),
                    window=w.slug,
                    side=f"BUY_{side}",
                    price=price,
                    size_usd=size_usd,
                    edge=edge,
                    fair_value=fair,
                    btc_price=state.price,
                    dry_run=DRY_RUN,
                ))

                try:
                    with open("trades.jsonl", "a") as f:
                        f.write(json.dumps({
                            "ts": trade_log[-1].ts,
                            "window": w.slug,
                            "side": f"BUY_{side}",
                            "price": price,
                            "size": size_usd,
                            "edge": edge,
                            "fair": fair,
                            "btc": state.price,
                            "ref_btc": ref_price,
                            "time_left": time_left,
                            "dry_run": DRY_RUN,
                        }) + "\n")
                except:
                    pass

                # Only trade each window once per cycle
                traded_windows.add(w.slug)

            # Clean up old traded windows
            traded_windows = {s for s in traded_windows if any(w.slug == s for w in windows)}

            await asyncio.sleep(SCAN_INTERVAL)

        except Exception as e:
            log.error(f"Trading loop error: {e}")
            await asyncio.sleep(5)


async def run_bot():
    """Start Binance monitor + trading loop concurrently."""
    log.info(f"{'='*60}")
    log.info(f"EDGEMARKET — BTC 5-Min Momentum Bot")
    log.info(f"{'='*60}")
    log.info(f"Mode:       {'DRY RUN' if DRY_RUN else 'LIVE'}")
    log.info(f"Bankroll:   ${BANKROLL}")
    log.info(f"Min Edge:   {MIN_EDGE:.0%}")
    log.info(f"Kelly:      {KELLY_FRACTION:.0%}")
    log.info(f"Bet Range:  ${MIN_BET}-${MAX_BET}")
    log.info(f"Scan:       Every {SCAN_INTERVAL}s")
    log.info(f"Proxy:      {PROXY_BASE}")
    log.info(f"{'='*60}")

    if client and not DRY_RUN:
        bal = get_balance()
        log.info(f"Wallet balance: ${bal:.2f} USDC")

    state = BinanceState()
    stop_event = asyncio.Event()

    def handle_sig():
        log.info("Shutting down...")
        stop_event.set()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, handle_sig)

    try:
        await asyncio.gather(
            monitor_binance(state, stop_event),
            trading_loop(state, stop_event),
        )
    except asyncio.CancelledError:
        pass

    log.info(f"Session done. {len(trade_log)} trades logged.")
    if trade_log:
        total_size = sum(t.size_usd for t in trade_log)
        avg_edge = np.mean([t.edge for t in trade_log])
        log.info(f"Total deployed: ${total_size:.2f} | Avg edge: {avg_edge:.1%}")


# ─── CLI ────────────────────────────────────────────────────

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "scan"

    if mode in ("run", "balance"):
        try:
            init_client()
        except Exception as e:
            log.warning(f"Client init failed: {e}")

    if mode == "scan":
        scan_once()
    elif mode == "run":
        asyncio.run(run_bot())
    elif mode == "balance":
        print(f"Balance: ${get_balance():.2f}")
    else:
        print("Usage: python bot.py [scan|run|balance]")
        print("  scan    — discover current BTC 5-min windows (no auth needed)")
        print("  run     — start Binance feed + trading loop")
        print("  balance — check USDC balance on Polygon")


if __name__ == "__main__":
    main()
