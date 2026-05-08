#!/usr/bin/env python3
"""
EDGEMARKET v5 — Z-Score Spread Trading Bot for Hyperliquid

Trades statistical deviations in the Binance-HL spread, not raw price differences.

Strategy:
1. Track rolling 5-min mean & std of the Binance-HL spread per coin
2. When z-score > threshold: spread is abnormally wide → trade mean reversion
3. Exit when z-score normalizes (spread returned to its rolling average)
4. This naturally filters structural mispricings (TON, ONDO, etc.) that killed v1-v4

Key insight: raw spread comparison fails because different exchanges CAN have
persistently different prices. Z-score detects DEVIATIONS from that norm.
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
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"
KELLY_FRACTION = float(os.getenv("KELLY_FRACTION", "0.25"))
MAX_POSITION_FRAC = float(os.getenv("MAX_POSITION_FRAC", "0.80"))
STOP_LOSS_PCT = float(os.getenv("STOP_LOSS_PCT", "3.0"))
COOLDOWN_SECONDS = int(os.getenv("COOLDOWN_SECONDS", "10"))
SCAN_INTERVAL = float(os.getenv("SCAN_INTERVAL", "0.5"))
EQUITY_FLOOR = float(os.getenv("EQUITY_FLOOR", "3.0"))
TAKE_PROFIT_PCT = float(os.getenv("TAKE_PROFIT_PCT", "1.5"))
TRAILING_STOP_PCT = float(os.getenv("TRAILING_STOP_PCT", "1.0"))

# Z-score spread parameters
SPREAD_WINDOW = int(os.getenv("SPREAD_WINDOW", "300"))
Z_ENTRY = float(os.getenv("Z_ENTRY", "2.5"))
Z_EXIT = float(os.getenv("Z_EXIT", "0.0"))
MIN_SPREAD_STD = float(os.getenv("MIN_SPREAD_STD", "3.0"))
MIN_SPREAD_SAMPLES = int(os.getenv("MIN_SPREAD_SAMPLES", "30"))

# Assets to trade: (HL name, Binance symbol, leverage, szDecimals, price_mult)
# price_mult: multiplier to convert Binance price to HL price (e.g. kPEPE = 1000 PEPE)
ASSETS = [
    ("BTC", "btcusdt", 20, 5, 1),
    ("ETH", "ethusdt", 20, 4, 1),
    ("SOL", "solusdt", 20, 2, 1),
    ("TON", "tonusdt", 10, 1, 1),
    ("HYPE", "hypeusdt", 10, 2, 1),
    ("ZEC", "zecusdt", 10, 2, 1),
    ("DOGE", "dogeusdt", 10, 0, 1),
    ("XRP", "xrpusdt", 20, 0, 1),
    ("NEAR", "nearusdt", 10, 1, 1),
    ("ENA", "enausdt", 10, 0, 1),
    ("ONDO", "ondousdt", 10, 0, 1),
    ("XPL", "xplusdt", 10, 0, 1),
    ("SUI", "suiusdt", 10, 1, 1),
    ("FARTCOIN", "fartcoinusdt", 10, 1, 1),
    ("PAXG", "paxgusdt", 10, 3, 1),
    ("BNB", "bnbusdt", 10, 3, 1),
    ("AAVE", "aaveusdt", 10, 2, 1),
    ("LINK", "linkusdt", 10, 1, 1),
    ("AVAX", "avaxusdt", 10, 2, 1),
    ("WLD", "wldusdt", 10, 1, 1),
    ("ADA", "adausdt", 10, 0, 1),
    ("JUP", "jupusdt", 10, 0, 1),
    ("LTC", "ltcusdt", 10, 2, 1),
    ("ARB", "arbusdt", 10, 1, 1),
    ("CRV", "crvusdt", 10, 1, 1),
    ("TRUMP", "trumpusdt", 10, 1, 1),
    ("TRX", "trxusdt", 10, 0, 1),
    ("UNI", "uniusdt", 10, 1, 1),
    ("APT", "aptusdt", 10, 2, 1),
    ("DOT", "dotusdt", 10, 1, 1),
    ("BCH", "bchusdt", 10, 3, 1),
]

BINANCE_WS = "wss://stream.binance.com:9443/stream?streams=" + "/".join(
    f"{a[1]}@trade" for a in ASSETS
)

# ─── PRICE STATE ─────────────────────────────────────────
from collections import deque

@dataclass
class AssetState:
    binance_px: float = 0.0
    prices: list = field(default_factory=list)
    timestamps: list = field(default_factory=list)
    volatility_1m: float = 0.0
    momentum_10s: float = 0.0
    last_update: float = 0.0
    spread_samples: list = field(default_factory=list)

    def update(self, price: float, ts: float):
        self.binance_px = price
        self.last_update = ts
        self.prices.append(price)
        self.timestamps.append(ts)

        cutoff = ts - 120
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.pop(0)
            self.prices.pop(0)

        prices_10s = [p for p, t in zip(self.prices, self.timestamps) if t > ts - 10]
        prices_1m = [p for p, t in zip(self.prices, self.timestamps) if t > ts - 60]

        if len(prices_10s) > 1:
            self.momentum_10s = (price - prices_10s[0]) / prices_10s[0]

        if len(prices_1m) > 1:
            returns = [prices_1m[i] / prices_1m[i - 1] - 1 for i in range(1, len(prices_1m))]
            self.volatility_1m = float(np.std(returns)) if returns else 0.0

    def add_spread(self, ts: float, spread_bps: float):
        self.spread_samples.append((ts, spread_bps))
        cutoff = ts - SPREAD_WINDOW * 1.2
        while self.spread_samples and self.spread_samples[0][0] < cutoff:
            self.spread_samples.pop(0)


def compute_z_score(state: AssetState, now: float) -> tuple[float, float, float]:
    recent = [(t, s) for t, s in state.spread_samples if now - t < SPREAD_WINDOW]
    if len(recent) < MIN_SPREAD_SAMPLES:
        return 0.0, 0.0, 0.0
    spreads = np.array([s for _, s in recent])
    mean = float(np.mean(spreads))
    std = float(np.std(spreads))
    if std < 0.5:
        return mean, std, 0.0
    z = (recent[-1][1] - mean) / std
    return mean, std, float(z)


# ─── HYPERLIQUID CLIENT ───────────────────────────────────
from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants
from eth_account import Account


def init_hl_client():
    info = Info(constants.MAINNET_API_URL)
    account = Account.from_key(PRIVATE_KEY)
    exchange = Exchange(account, constants.MAINNET_API_URL)
    return info, exchange, account.address


def get_hl_state(info, wallet):
    user = info.user_state(wallet)
    margin = user.get("marginSummary", {})
    equity = float(margin.get("accountValue", "0"))
    available = float(user.get("withdrawable", "0"))

    positions = []
    for pos in user.get("assetPositions", []):
        p = pos.get("position", {})
        if float(p.get("szi", "0")) != 0:
            positions.append({
                "coin": p.get("coin", ""),
                "size": float(p.get("szi", "0")),
                "entry_px": float(p.get("entryPx", "0")),
                "unrealized_pnl": float(p.get("unrealizedPnl", "0")),
                "leverage": float(p.get("leverage", {}).get("value", "1")),
            })
    return equity, available, positions


def get_hl_mids(info):
    return {k: float(v) for k, v in info.all_mids().items()}


def get_funding_rates(info):
    try:
        ctx = info.meta_and_asset_ctxs()
        universe = ctx[0].get("universe", [])
        asset_ctxs = ctx[1] if len(ctx) > 1 else []
        rates = {}
        for u, c in zip(universe, asset_ctxs):
            rates[u["name"]] = float(c.get("funding", "0"))
        return rates
    except:
        return {}


# ─── TRADING LOGIC ────────────────────────────────────────
@dataclass
class TradeRecord:
    ts: str
    coin: str
    side: str
    size_usd: float
    price: float
    edge_bps: float
    binance_px: float
    hl_px: float
    leverage: int
    dry_run: bool


trade_log: list[TradeRecord] = []
last_trade_ts: float = 0
peak_pnl_pct: float = 0  # tracks highest PnL % for trailing stop
entry_equity: float = 0  # equity at time of entry


def compute_edge(binance_px: float, hl_px: float) -> tuple[float, str]:
    if hl_px <= 0 or binance_px <= 0:
        return 0, ""
    diff_bps = (binance_px - hl_px) / hl_px * 10000
    if diff_bps > 0:
        return diff_bps, "long"
    else:
        return abs(diff_bps), "short"


def kelly_size(edge_bps: float, volatility: float, equity: float, leverage: int) -> float:
    if edge_bps <= 0 or volatility <= 0 or equity <= 0:
        return 0

    edge = edge_bps / 10000
    win_rate = 0.55
    win_loss_ratio = edge / volatility if volatility > 0 else 1

    kelly = win_rate - (1 - win_rate) / max(win_loss_ratio, 0.01)
    kelly = max(0, kelly) * KELLY_FRACTION

    size = kelly * equity * leverage
    max_size = equity * MAX_POSITION_FRAC * leverage
    return min(size, max_size)


def place_order(exchange, coin: str, side: str, size_usd: float, price: float, sz_decimals: int) -> dict:
    coin_size = size_usd / price
    coin_size = round(coin_size, sz_decimals)

    if size_usd < 10.0:
        return {"status": "skip", "reason": f"below $10 min ({size_usd:.2f})"}

    is_buy = side == "long"

    if DRY_RUN:
        log.info(f"  [DRY] {'BUY' if is_buy else 'SELL'} {coin_size} {coin} @ ~${price:,.4f} = ${size_usd:.2f}")
        return {"status": "dry_run", "size": coin_size}

    try:
        # Use ALO (maker) orders to save ~3bp in fees
        # Place limit at current price — if it would cross, fall back to IOC
        limit_px = round(price, 6)
        result = exchange.order(coin, is_buy, coin_size, limit_px,
                                order_type={"limit": {"tif": "Alo"}})
        statuses = result.get("response", {}).get("data", {}).get("statuses", [])
        filled = any("filled" in s for s in statuses if isinstance(s, dict))

        if filled:
            log.info(f"  [MAKER] {'BUY' if is_buy else 'SELL'} {coin_size} {coin} → {result}")
            return result

        # ALO rejected (would cross spread) — fall back to IOC taker
        slippage = 1.002 if is_buy else 0.998
        slippage_price = round(price * slippage, 6)
        result = exchange.market_open(coin, is_buy, coin_size, slippage_price)
        log.info(f"  [TAKER] {'BUY' if is_buy else 'SELL'} {coin_size} {coin} → {result}")
        return result
    except Exception as e:
        log.error(f"  Order failed: {e}")
        return {"status": "error", "reason": str(e)}


def close_position(exchange, position: dict) -> dict:
    coin = position["coin"]
    if DRY_RUN:
        log.info(f"  [DRY] CLOSE {coin} size={position['size']}")
        return {"status": "dry_run"}
    try:
        result = exchange.market_close(coin)
        log.info(f"  [LIVE] Closed {coin} → {result}")
        return result
    except Exception as e:
        log.error(f"  Close failed: {e}")
        return {"status": "error", "reason": str(e)}


# ─── BINANCE SYMBOL → HL NAME MAPPING ────────────────────
BINANCE_TO_HL = {}
ASSET_CONFIG = {}
PRICE_MULT = {}
for hl_name, binance_sym, lev, sz_dec, mult in ASSETS:
    base = binance_sym.replace("usdt", "").upper()
    BINANCE_TO_HL[base] = hl_name
    ASSET_CONFIG[hl_name] = {"leverage": lev, "sz_decimals": sz_dec, "binance_sym": binance_sym}
    PRICE_MULT[hl_name] = mult


# ─── ASYNC LOOPS ──────────────────────────────────────────
async def monitor_binance(states: dict[str, AssetState], stop_event: asyncio.Event):
    import websockets

    streams = "/".join(f"{a[1]}@trade" for a in ASSETS)
    url = f"wss://stream.binance.com:9443/stream?streams={streams}"

    while not stop_event.is_set():
        try:
            log.info("Connecting to Binance multi-stream...")
            async with websockets.connect(url) as ws:
                log.info(f"Binance connected ({len(ASSETS)} streams)")
                async for msg in ws:
                    if stop_event.is_set():
                        break
                    data = json.loads(msg)
                    payload = data.get("data", data)
                    symbol = payload.get("s", "")
                    base = symbol.replace("USDT", "")
                    hl_name = BINANCE_TO_HL.get(base)
                    if hl_name and hl_name in states:
                        price = float(payload["p"]) * PRICE_MULT.get(hl_name, 1)
                        ts = float(payload["T"]) / 1000
                        states[hl_name].update(price, ts)
        except Exception as e:
            log.warning(f"Binance WS error: {e}. Reconnecting in 2s...")
            await asyncio.sleep(2)


async def trading_loop(states: dict[str, AssetState], stop_event: asyncio.Event,
                       info: Info, exchange: Exchange, wallet: str):
    global last_trade_ts, peak_pnl_pct, entry_equity

    last_exited_coin = ""
    last_exit_ts = 0.0

    log.info(f"Warming up Binance feeds + spread history ({SPREAD_WINDOW}s window)...")
    await asyncio.sleep(8)

    active_feeds = [k for k, v in states.items() if v.binance_px > 0]
    log.info(f"Active feeds: {', '.join(active_feeds)}")

    if not active_feeds:
        log.error("No Binance data after warmup.")
        return

    if not DRY_RUN:
        for coin, cfg in ASSET_CONFIG.items():
            try:
                exchange.update_leverage(cfg["leverage"], coin, is_cross=True)
                log.info(f"Set {coin} leverage to {cfg['leverage']}x")
            except Exception as e:
                log.debug(f"Leverage {coin}: {e}")

    funding = get_funding_rates(info)
    funding_refresh = time.time()
    status_ts = time.time()
    warmup_logged = False

    while not stop_event.is_set():
        try:
            now = time.time()

            if now - funding_refresh > 300:
                funding = get_funding_rates(info)
                funding_refresh = now

            hl_mids = get_hl_mids(info)
            equity, available, positions = get_hl_state(info, wallet)

            # Record spreads for z-score computation
            for coin, state in states.items():
                if state.binance_px <= 0 or now - state.last_update > 5:
                    continue
                hl_px = hl_mids.get(coin, 0)
                if hl_px <= 0:
                    continue
                spread_bps = (hl_px - state.binance_px) / state.binance_px * 10000
                state.add_spread(now, spread_bps)

            # Log warmup progress once
            if not warmup_logged:
                ready = sum(1 for s in states.values() if len(s.spread_samples) >= MIN_SPREAD_SAMPLES)
                if ready > 0:
                    log.info(f"Z-score ready on {ready}/{len(active_feeds)} coins")
                    warmup_logged = True

            # Equity floor
            if equity < EQUITY_FLOOR and equity > 0:
                log.warning(f"EQUITY FLOOR: ${equity:.2f} < ${EQUITY_FLOOR}. Stopping.")
                if positions:
                    for p in positions:
                        close_position(exchange, p)
                stop_event.set()
                break

            current_pos = positions[0] if positions else None

            # Position management: stop-loss, take-profit, trailing stop
            if current_pos and equity > 0:
                pnl_pct = current_pos["unrealized_pnl"] / equity * 100

                if pnl_pct < -STOP_LOSS_PCT:
                    log.warning(f"STOP LOSS {current_pos['coin']}: PnL {pnl_pct:.2f}%")
                    close_position(exchange, current_pos)
                    last_trade_ts = now
                    peak_pnl_pct = 0
                    await asyncio.sleep(COOLDOWN_SECONDS)
                    continue

                if pnl_pct >= TAKE_PROFIT_PCT:
                    log.info(f"TAKE PROFIT {current_pos['coin']}: PnL {pnl_pct:.2f}% >= {TAKE_PROFIT_PCT}%")
                    close_position(exchange, current_pos)
                    last_trade_ts = now
                    peak_pnl_pct = 0
                    continue

                if pnl_pct > peak_pnl_pct:
                    peak_pnl_pct = pnl_pct
                if peak_pnl_pct >= TRAILING_STOP_PCT and pnl_pct < peak_pnl_pct * 0.5:
                    log.info(f"TRAILING STOP {current_pos['coin']}: peak {peak_pnl_pct:.2f}% → now {pnl_pct:.2f}%")
                    close_position(exchange, current_pos)
                    last_trade_ts = now
                    peak_pnl_pct = 0
                    continue

            if not current_pos:
                peak_pnl_pct = 0

            # Z-score exit: spread has normalized (require 30s hold)
            if current_pos and now - last_trade_ts >= 30:
                coin = current_pos["coin"]
                if coin in states:
                    mean, std, z = compute_z_score(states[coin], now)
                    pos_side = "long" if current_pos["size"] > 0 else "short"
                    should_exit = False
                    if pos_side == "short" and z < Z_EXIT:
                        should_exit = True
                    elif pos_side == "long" and z > -Z_EXIT:
                        should_exit = True
                    if should_exit:
                        log.info(f"EXIT {pos_side} {coin}: z-score normalized (z={z:.2f}, mean={mean:.1f}bp, std={std:.1f}bp)")
                        close_position(exchange, current_pos)
                        last_trade_ts = now
                        last_exited_coin = coin
                        last_exit_ts = now
                        current_pos = None

            # Opportunity-cost switch: better z-score signal elsewhere (90s hold)
            if current_pos and now - last_trade_ts >= 90:
                pnl_pct = current_pos["unrealized_pnl"] / equity * 100 if equity > 0 else 0
                if pnl_pct < 0.3:
                    held_coin = current_pos["coin"]
                    for coin, state in states.items():
                        if coin == held_coin:
                            continue
                        mean, std, z = compute_z_score(state, now)
                        if std < MIN_SPREAD_STD:
                            continue
                        if abs(z) < Z_ENTRY * 1.5:
                            continue
                        cfg = ASSET_CONFIG.get(coin, {"leverage": 5})
                        if cfg["leverage"] < 10:
                            continue
                        direction = "short" if z > 0 else "long"
                        log.info(f"SWITCH from {held_coin} (PnL {pnl_pct:.2f}%) → {coin} z={z:.2f} ({direction})")
                        close_position(exchange, current_pos)
                        last_trade_ts = now - COOLDOWN_SECONDS + 1
                        last_exited_coin = held_coin
                        last_exit_ts = now
                        current_pos = None
                        peak_pnl_pct = 0
                        break

            # Scan for z-score entry signals
            best_abs_z = 0
            best_coin = ""
            best_direction = ""
            best_z = 0.0
            best_mean = 0.0
            best_std = 0.0

            for coin, state in states.items():
                if state.binance_px <= 0 or now - state.last_update > 5:
                    continue
                mean, std, z = compute_z_score(state, now)
                if std < MIN_SPREAD_STD:
                    continue
                if abs(z) > best_abs_z and abs(z) >= Z_ENTRY:
                    best_abs_z = abs(z)
                    best_z = z
                    best_coin = coin
                    best_direction = "short" if z > 0 else "long"
                    best_mean = mean
                    best_std = std

            # New entry on z-score signal
            if best_abs_z >= Z_ENTRY and not current_pos and equity > EQUITY_FLOOR:
                if now - last_trade_ts < COOLDOWN_SECONDS:
                    await asyncio.sleep(SCAN_INTERVAL)
                    continue

                if best_coin == last_exited_coin and now - last_exit_ts < 60:
                    await asyncio.sleep(SCAN_INTERVAL)
                    continue

                cfg = ASSET_CONFIG.get(best_coin, {"leverage": 5, "sz_decimals": 2})
                vol = states[best_coin].volatility_1m if states[best_coin].volatility_1m > 0 else 0.002
                edge_bps = best_abs_z * best_std
                size_usd = kelly_size(edge_bps, vol, equity, cfg["leverage"])

                if size_usd < 1.0:
                    await asyncio.sleep(SCAN_INTERVAL)
                    continue

                hl_px = hl_mids.get(best_coin, 0)
                binance_px = states[best_coin].binance_px

                fund_str = ""
                fr = funding.get(best_coin, 0)
                if fr != 0:
                    fund_str = f" | Fund: {fr*100:.4f}%/8h"

                log.info(f"\n{'='*55}")
                log.info(f"SIGNAL: {best_direction.upper()} {best_coin}")
                log.info(f"  Z: {best_z:+.2f} | Mean: {best_mean:.1f}bp | Std: {best_std:.1f}bp")
                log.info(f"  Binance: ${binance_px:,.4f} | HL: ${hl_px:,.4f}")
                log.info(f"  Size: ${size_usd:.2f} ({cfg['leverage']}x){fund_str}")
                log.info(f"  Equity: ${equity:.2f}")

                entry_equity = equity
                result = place_order(exchange, best_coin, best_direction,
                                     size_usd, binance_px, cfg["sz_decimals"])

                trade_log.append(TradeRecord(
                    ts=datetime.now(timezone.utc).isoformat(),
                    coin=best_coin, side=best_direction,
                    size_usd=size_usd, price=binance_px,
                    edge_bps=edge_bps, binance_px=binance_px,
                    hl_px=hl_px, leverage=cfg["leverage"],
                    dry_run=DRY_RUN,
                ))

                try:
                    with open("hl_trades.jsonl", "a") as f:
                        f.write(json.dumps({
                            "ts": trade_log[-1].ts, "coin": best_coin,
                            "side": best_direction, "size_usd": size_usd,
                            "z_score": best_z, "spread_mean": best_mean,
                            "spread_std": best_std, "equity": equity,
                            "leverage": cfg["leverage"], "dry_run": DRY_RUN,
                        }) + "\n")
                except:
                    pass

                last_trade_ts = now

            # Status log every 30s
            if now - status_ts > 30:
                status_ts = now
                z_scores = []
                for coin, state in states.items():
                    mean, std, z = compute_z_score(state, now)
                    if std >= MIN_SPREAD_STD and abs(z) > 0.5:
                        z_scores.append(f"{coin}:{z:+.1f}σ")
                pos_str = ""
                if current_pos:
                    pos_str = f" | {current_pos['coin']}={current_pos['size']:.4f} PnL=${current_pos['unrealized_pnl']:.2f}"
                log.info(f"${equity:.2f} | Z: {', '.join(z_scores[:6]) or 'flat'}{pos_str}")

            await asyncio.sleep(SCAN_INTERVAL)

        except Exception as e:
            log.error(f"Loop error: {e}")
            await asyncio.sleep(3)


async def run_bot():
    info, exchange, wallet = init_hl_client()
    equity, available, positions = get_hl_state(info, wallet)

    log.info(f"{'='*60}")
    log.info(f"EDGEMARKET v5 — Z-Score Spread Trading")
    log.info(f"{'='*60}")
    log.info(f"Mode:       {'DRY RUN' if DRY_RUN else '>>> LIVE <<<'}")
    log.info(f"Equity:     ${equity:.2f}")
    log.info(f"Assets:     {', '.join(a[0] for a in ASSETS)}")
    log.info(f"Z Entry:    {Z_ENTRY}σ")
    log.info(f"Z Exit:     {Z_EXIT}σ")
    log.info(f"Spread Win: {SPREAD_WINDOW}s")
    log.info(f"Min Std:    {MIN_SPREAD_STD}bp")
    log.info(f"Kelly:      {KELLY_FRACTION:.0%}")
    log.info(f"Stop Loss:  {STOP_LOSS_PCT}%")
    log.info(f"Take Prof:  {TAKE_PROFIT_PCT}%")
    log.info(f"Trail Stop: {TRAILING_STOP_PCT}%")
    log.info(f"Cooldown:   {COOLDOWN_SECONDS}s")
    log.info(f"Eq Floor:   ${EQUITY_FLOOR}")
    log.info(f"Wallet:     {wallet}")
    log.info(f"{'='*60}")

    if equity == 0:
        log.warning("No equity! Running in observation mode...")

    states = {a[0]: AssetState() for a in ASSETS}
    stop_event = asyncio.Event()

    def handle_sig():
        log.info("Shutting down...")
        stop_event.set()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, handle_sig)

    try:
        await asyncio.gather(
            monitor_binance(states, stop_event),
            trading_loop(states, stop_event, info, exchange, wallet),
        )
    except asyncio.CancelledError:
        pass

    log.info(f"Session done. {len(trade_log)} trades.")
    if trade_log:
        total = sum(t.size_usd for t in trade_log)
        avg_edge = np.mean([t.edge_bps for t in trade_log])
        log.info(f"Volume: ${total:.2f} | Avg edge: {avg_edge:.1f} bps")


# ─── DEPOSIT ─────────────────────────────────────────────
def deposit_to_hl():
    from web3 import Web3

    account = Account.from_key(PRIVATE_KEY)
    exchange = Exchange(account, constants.MAINNET_API_URL)
    info = Info(constants.MAINNET_API_URL)

    user = info.user_state(account.address)
    print(f"Current HL equity: ${float(user.get('marginSummary', {}).get('accountValue', '0')):.2f}")

    for rpc in ["https://arb1.arbitrum.io/rpc", "https://rpc.ankr.com/arbitrum"]:
        try:
            arb_w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 20}))
            arb_w3.eth.block_number
            break
        except:
            continue

    wallet = Web3.to_checksum_address(account.address)
    abi = json.loads('[{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]')

    for name, addr in [
        ("USDC", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
        ("USDC.e", "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"),
    ]:
        token = arb_w3.eth.contract(address=Web3.to_checksum_address(addr), abi=abi)
        bal = token.functions.balanceOf(wallet).call()
        print(f"Arbitrum {name}: {bal / 1e6:.4f}")

        if bal > 0:
            amount = bal / 1e6
            print(f"\nDepositing {amount:.4f} {name} to Hyperliquid...")
            try:
                result = exchange.usd_class_transfer(amount, True)
                print(f"Result: {result}")
            except Exception as e:
                print(f"SDK deposit failed: {e}")
            break

    import time
    time.sleep(5)
    user = info.user_state(account.address)
    print(f"HL equity: ${float(user.get('marginSummary', {}).get('accountValue', '0')):.2f}")


# ─── CLI ────────────────────────────────────────────────────
def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "status"

    if mode == "status":
        info, exchange, wallet = init_hl_client()
        equity, available, positions = get_hl_state(info, wallet)
        mids = get_hl_mids(info)
        funding = get_funding_rates(info)

        print(f"Wallet:    {wallet}")
        print(f"Equity:    ${equity:.2f}")
        print(f"Available: ${available:.2f}")
        if positions:
            for p in positions:
                print(f"Position:  {p['coin']} {p['size']:.4f} @ ${p['entry_px']:,.2f} PnL=${p['unrealized_pnl']:.2f}")
        else:
            print("Positions: None")

        print(f"\nWatched assets:")
        for coin, cfg in ASSET_CONFIG.items():
            px = mids.get(coin, 0)
            fr = funding.get(coin, 0)
            if px > 0:
                print(f"  {coin:<8} ${px:>12,.4f}  {cfg['leverage']}x  fund={fr*100:+.4f}%/8h")

    elif mode == "deposit":
        deposit_to_hl()

    elif mode == "run":
        asyncio.run(run_bot())

    elif mode == "scan":
        import websockets

        info = Info(constants.MAINNET_API_URL)

        async def quick_scan():
            states = {a[0]: AssetState() for a in ASSETS}
            streams = "/".join(f"{a[1]}@trade" for a in ASSETS)
            url = f"wss://stream.binance.com:9443/stream?streams={streams}"

            print(f"Collecting data from {len(ASSETS)} Binance streams (10s)...")
            async with websockets.connect(url) as ws:
                end = time.time() + 10
                while time.time() < end:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5)
                    data = json.loads(msg)
                    payload = data.get("data", data)
                    symbol = payload.get("s", "")
                    base = symbol.replace("USDT", "")
                    hl_name = BINANCE_TO_HL.get(base)
                    if hl_name and hl_name in states:
                        states[hl_name].update(float(payload["p"]) * PRICE_MULT.get(hl_name, 1), float(payload["T"]) / 1000)

            hl_mids = get_hl_mids(info)
            funding = get_funding_rates(info)

            print(f"\n{'Asset':<8} {'Binance':>12} {'HL':>12} {'Edge':>8} {'Dir':>6} {'Fund':>10} {'Lev':>4}")
            print("-" * 65)
            for coin in sorted(states.keys()):
                s = states[coin]
                if s.binance_px <= 0:
                    continue
                hl_px = hl_mids.get(coin, 0)
                if hl_px <= 0:
                    continue
                edge, direction = compute_edge(s.binance_px, hl_px)
                fr = funding.get(coin, 0)
                cfg = ASSET_CONFIG.get(coin, {"leverage": 5})
                marker = " ◄" if edge >= MIN_EDGE_BPS else ""
                print(f"{coin:<8} ${s.binance_px:>11,.4f} ${hl_px:>11,.4f} {edge:>7.1f}bp {direction:>6} {fr*100:>+9.4f}% {cfg['leverage']:>3}x{marker}")

        asyncio.run(quick_scan())

    elif mode == "markets":
        info = Info(constants.MAINNET_API_URL)
        ctx = info.meta_and_asset_ctxs()
        universe = ctx[0].get("universe", [])
        asset_ctxs = ctx[1]
        results = []
        for u, c in zip(universe, asset_ctxs):
            vol = float(c.get("dayNtlVlm", "0"))
            if vol > 50000:
                results.append({
                    "name": u["name"], "lev": u.get("maxLeverage", 1),
                    "mark": float(c.get("markPx", "0")),
                    "fund": float(c.get("funding", "0")),
                    "vol": vol,
                })
        results.sort(key=lambda x: abs(x["fund"]), reverse=True)
        print(f"{'Asset':<10} {'Price':>10} {'Lev':>4} {'Fund8h%':>9} {'Annual%':>9} {'Vol24h':>14}")
        print("-" * 60)
        for r in results[:30]:
            annual = r["fund"] * 3 * 365 * 100
            print(f"{r['name']:<10} {r['mark']:>10.4f} {r['lev']:>3}x {r['fund']*100:>8.4f}% {annual:>8.1f}% ${r['vol']:>12,.0f}")

    else:
        print("Usage: python hl_bot.py [status|deposit|scan|run|markets]")
        print("  status  — Account overview + watched assets")
        print("  deposit — Deposit USDC from Arbitrum to Hyperliquid")
        print("  scan    — Quick edge scan across all assets")
        print("  run     — Start the trading bot")
        print("  markets — Show all HL markets sorted by funding rate")


if __name__ == "__main__":
    main()
