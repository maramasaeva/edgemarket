#!/usr/bin/env python3
"""Quick test: Binance feed + window discovery + fair value estimation."""

import asyncio
import json
import time
import sys
sys.path.insert(0, ".")

from bot import (
    BinanceState, discover_5m_windows, discover_15m_windows,
    estimate_fair_up, kelly_size, BINANCE_WS,
    MIN_EDGE, BANKROLL, MAX_BET, MIN_BET,
)
import websockets


async def test():
    state = BinanceState()

    print("Connecting to Binance WebSocket...")
    try:
        async with websockets.connect(BINANCE_WS) as ws:
            end_time = time.time() + 15
            count = 0
            while time.time() < end_time:
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                data = json.loads(msg)
                price = float(data["p"])
                ts = float(data["T"]) / 1000
                state.update(price, ts)
                count += 1
                if count == 1:
                    print(f"First BTC price: ${price:,.2f}")
            print(f"Collected {count} trades in 15s")
            print(f"BTC: ${state.price:,.2f}")
            print(f"  1m momentum:   {state.momentum_1m*100:+.4f}%")
            print(f"  1m volatility: {state.volatility_1m*100:.4f}%")
    except Exception as e:
        print(f"Binance error: {e}")
        return

    print("\nDiscovering windows...")
    windows_5m = discover_5m_windows(count=4)
    windows_15m = discover_15m_windows(count=2)
    all_windows = windows_5m + windows_15m
    print(f"Found {len(windows_5m)} 5-min + {len(windows_15m)} 15-min")

    now = time.time()
    signals_found = 0

    for w in all_windows:
        time_left = w.end_ts - now
        duration = w.end_ts - w.start_ts
        if time_left <= 15 or time_left > duration:
            continue

        fair_up = estimate_fair_up(state, w)
        fair_down = 1 - fair_up
        edge_up = fair_up - w.up_price
        edge_down = fair_down - w.down_price
        best_edge = max(edge_up, edge_down)

        ref = state.price_at(w.start_ts)
        move = (state.price - ref) / ref * 100 if ref else 0

        print(f"\n  {w.question}")
        print(f"    BTC move: {move:+.4f}% from window open")
        print(f"    Fair P(Up)={fair_up:.4f} | Mkt Up={w.up_price:.3f} Down={w.down_price:.3f}")
        print(f"    Edge(Up)={edge_up:+.4f} Edge(Down)={edge_down:+.4f} | {time_left:.0f}s left")

        if best_edge >= MIN_EDGE:
            side = "UP" if edge_up >= edge_down else "DOWN"
            fair = fair_up if side == "UP" else fair_down
            price = w.up_price if side == "UP" else w.down_price
            k = kelly_size(fair, price)
            size = min(k * BANKROLL, MAX_BET)
            print(f"    >>> SIGNAL: BUY {side} | Edge={best_edge:.1%} | Kelly=${size:.2f}")
            signals_found += 1
        else:
            print(f"    (no tradeable edge)")

    print(f"\nTotal signals: {signals_found}")


if __name__ == "__main__":
    asyncio.run(test())
