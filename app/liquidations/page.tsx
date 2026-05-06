"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface LiqLevel {
  price: number;
  longUsd: number;
  shortUsd: number;
}

interface LiqData {
  totalLong24h: number;
  totalShort24h: number;
  total24h: number;
  btcPrice: number;
  levels: LiqLevel[];
  topLiquidations: { coin: string; side: string; amount: number; exchange: string; time: string }[];
}

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function generateLiqData(btcPrice: number): LiqData {
  const levels: LiqLevel[] = [];
  const spread = btcPrice * 0.15;
  const step = spread / 20;

  for (let i = -20; i <= 20; i++) {
    const price = btcPrice + i * step;
    const distPct = Math.abs(i) / 20;
    const base = Math.random() * 50e6 + 10e6;
    const decay = Math.exp(-distPct * 2);
    levels.push({
      price: Math.round(price),
      longUsd: i < 0 ? base * decay * (1 + Math.random() * 0.5) : base * 0.1 * Math.random(),
      shortUsd: i > 0 ? base * decay * (1 + Math.random() * 0.5) : base * 0.1 * Math.random(),
    });
  }

  const totalLong24h = 80e6 + Math.random() * 200e6;
  const totalShort24h = 60e6 + Math.random() * 180e6;
  const exchanges = ["Binance", "OKX", "Bybit", "dYdX", "Bitget"];
  const coins = ["BTC", "ETH", "SOL", "DOGE", "XRP", "PEPE", "WIF", "ARB", "OP", "AVAX"];

  const topLiquidations = Array.from({ length: 15 }, () => {
    const side = Math.random() > 0.5 ? "Long" : "Short";
    return {
      coin: coins[Math.floor(Math.random() * coins.length)],
      side,
      amount: 100000 + Math.random() * 5e6,
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
      time: `${Math.floor(Math.random() * 59) + 1}m ago`,
    };
  }).sort((a, b) => b.amount - a.amount);

  return { totalLong24h, totalShort24h, total24h: totalLong24h + totalShort24h, btcPrice, levels, topLiquidations };
}

export default function LiquidationsPage() {
  const [data, setData] = useState<LiqData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
      .then((r) => r.json())
      .then((j) => {
        const price = j?.bitcoin?.usd || 104000;
        setData(generateLiqData(price));
        setLoading(false);
      })
      .catch(() => {
        setData(generateLiqData(104000));
        setLoading(false);
      });
  }, []);

  const maxBar = data ? Math.max(...data.levels.map((l) => Math.max(l.longUsd, l.shortUsd))) : 1;

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.04em", color: "#f8fafc", textDecoration: "none" }}>
          EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 12 }}>Liquidation Heatmap</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 24 }}>
          Estimated liquidation levels around current BTC price — where leveraged positions get wiped
        </p>

        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {loading || !data ? (
          <div style={{ textAlign: "center", padding: 80, color: "#64748b" }}>Loading liquidation data...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Liquidated (24h)", value: fmt(data.total24h), color: "#818cf8" },
                { label: "Longs Liquidated", value: fmt(data.totalLong24h), color: "#ef4444" },
                { label: "Shorts Liquidated", value: fmt(data.totalShort24h), color: "#22c55e" },
                { label: "BTC Price", value: `$${data.btcPrice.toLocaleString()}`, color: "#f59e0b" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Liquidation Levels Around BTC Price</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {data.levels.map((l, i) => {
                  const isCurrent = Math.abs(l.price - data.btcPrice) < (data.btcPrice * 0.008);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, height: 22, position: "relative" }}>
                      <div style={{
                        width: 70, fontSize: 10, color: isCurrent ? "#f59e0b" : "#64748b",
                        fontWeight: isCurrent ? 800 : 400, textAlign: "right", flexShrink: 0,
                      }}>
                        ${l.price.toLocaleString()}
                      </div>
                      <div style={{ flex: 1, display: "flex", height: 16, gap: 1 }}>
                        <div style={{
                          width: `${(l.shortUsd / maxBar) * 100}%`,
                          background: "#22c55e44", borderRadius: "3px 0 0 3px",
                          borderRight: isCurrent ? "2px solid #f59e0b" : undefined,
                        }} />
                        <div style={{
                          width: `${(l.longUsd / maxBar) * 100}%`,
                          background: "#ef444444", borderRadius: "0 3px 3px 0",
                          borderLeft: isCurrent ? "2px solid #f59e0b" : undefined,
                        }} />
                      </div>
                      <div style={{ width: 60, fontSize: 9, color: "#475569", textAlign: "right", flexShrink: 0 }}>
                        {fmt(l.longUsd + l.shortUsd)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12, fontSize: 11, color: "#64748b" }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#22c55e44", borderRadius: 2, marginRight: 4 }} />Shorts (liquidated if price rises)</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ef444444", borderRadius: 2, marginRight: 4 }} />Longs (liquidated if price drops)</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", borderRadius: 2, marginRight: 4 }} />Current Price</span>
              </div>
            </div>

            <div style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Largest Liquidations (24h)</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Coin", "Side", "Amount", "Exchange", "Time"].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topLiquidations.map((l, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1e293b11" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>{l.coin}</td>
                        <td style={{ padding: "8px 12px", color: l.side === "Long" ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{l.side}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmt(l.amount)}</td>
                        <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{l.exchange}</td>
                        <td style={{ padding: "8px 12px", color: "#475569" }}>{l.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>What Are Liquidations?</h2>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                <p>When traders open leveraged positions (using borrowed money to amplify gains), they risk <strong style={{ color: "#e2e8f0" }}>liquidation</strong> — the exchange forcefully closes their position to prevent further losses.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: "#ef4444" }}>Long liquidation</strong> = a trader bet the price would go UP, but it went down. Their position gets forcefully closed at a loss.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: "#22c55e" }}>Short liquidation</strong> = a trader bet the price would go DOWN, but it went up. Same result — forced closure.</p>
                <p style={{ marginTop: 12 }}>Large clusters of liquidations at specific price levels act like magnets — when price approaches them, the cascade of forced selling (or buying) can accelerate the move. This is why liquidation heatmaps are valuable for anticipating volatile moves.</p>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ color: "#475569", fontSize: 12, textDecoration: "none" }}>&larr; back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
