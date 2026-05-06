"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
];

const FREQUENCIES = [
  { label: "Daily", days: 1 },
  { label: "Weekly", days: 7 },
  { label: "Bi-weekly", days: 14 },
  { label: "Monthly", days: 30 },
];

export default function DCAPage() {
  const [coin, setCoin] = useState(COINS[0]);
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState(FREQUENCIES[2]);
  const [months, setMonths] = useState("12");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`)
      .then((r) => r.json())
      .then((d) => setCurrentPrice(d[coin.id]?.usd ?? null))
      .catch(() => {});
  }, [coin.id]);

  const calc = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const mo = parseInt(months) || 0;
    const totalDays = mo * 30;
    const purchases = Math.floor(totalDays / frequency.days);
    const totalInvested = purchases * amt;

    const scenarios = [
      { label: "Bear (-40%)", mult: 0.6, color: "#ef4444" },
      { label: "Flat (0%)", mult: 1.0, color: "#eab308" },
      { label: "Moderate (+50%)", mult: 1.5, color: "#22c55e" },
      { label: "Bull (+150%)", mult: 2.5, color: "#10b981" },
      { label: "Moon (+500%)", mult: 6.0, color: "#818cf8" },
    ];

    return {
      purchases,
      totalInvested,
      avgPerMonth: mo > 0 ? totalInvested / mo : 0,
      scenarios: scenarios.map((s) => {
        const avgPrice = currentPrice ? currentPrice * (1 + (s.mult - 1) / 2) : 0;
        const totalCoins = currentPrice ? purchases * (amt / avgPrice) : 0;
        const finalValue = totalCoins * (currentPrice ? currentPrice * s.mult : 0);
        const pnl = finalValue - totalInvested;
        const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
        return { ...s, finalValue, pnl, pnlPct, totalCoins };
      }),
    };
  }, [amount, months, frequency, currentPrice]);

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/staking" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>staking</Link>
          <Link href="/il" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>IL calc</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>DCA Calculator</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          dollar cost averaging // simulate your strategy
        </p>

        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: 6 }}>COIN</label>
              <select
                value={coin.id}
                onChange={(e) => setCoin(COINS.find((c) => c.id === e.target.value) || COINS[0])}
                style={{
                  width: "100%", padding: "12px", background: "#07070a", border: "1px solid #1a1a2e",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {COINS.map((c) => (
                  <option key={c.id} value={c.id}>{c.symbol} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: 6 }}>AMOUNT (USD)</label>
              <input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: "100%", padding: "12px", background: "#07070a", border: "1px solid #1a1a2e",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: 6 }}>FREQUENCY</label>
              <select
                value={frequency.days}
                onChange={(e) => setFrequency(FREQUENCIES.find((f) => f.days === Number(e.target.value)) || FREQUENCIES[2])}
                style={{
                  width: "100%", padding: "12px", background: "#07070a", border: "1px solid #1a1a2e",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.days} value={f.days}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: 6 }}>DURATION (MONTHS)</label>
              <input
                type="number" value={months} onChange={(e) => setMonths(e.target.value)}
                style={{
                  width: "100%", padding: "12px", background: "#07070a", border: "1px solid #1a1a2e",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            </div>
          </div>

          {currentPrice && (
            <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
              current {coin.symbol} price: ${currentPrice.toLocaleString()}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#07070a", border: "1px solid #1a1a2e", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>TOTAL INVESTED</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#818cf8" }}>${calc.totalInvested.toLocaleString()}</div>
            </div>
            <div style={{ background: "#07070a", border: "1px solid #1a1a2e", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>PURCHASES</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{calc.purchases}</div>
            </div>
            <div style={{ background: "#07070a", border: "1px solid #1a1a2e", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>PER MONTH</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>${calc.avgPerMonth.toFixed(0)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Scenario Analysis</div>
          {calc.scenarios.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: 12, background: "#07070a", borderRadius: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  {s.totalCoins.toFixed(4)} {coin.symbol}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>${s.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div style={{ fontSize: 11, color: s.pnl >= 0 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.pnl >= 0 ? "+" : ""}{s.pnlPct.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0d0d14", border: "1px solid #818cf833", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#818cf8" }}>Why DCA?</div>
          <ul style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Removes emotion from investing — buy on schedule, not on hype</li>
            <li>Averages out volatility — you buy more coins when prices are low</li>
            <li>No need to time the market — time in the market beats timing</li>
            <li>Works best with consistent contributions over long periods</li>
          </ul>
        </div>

        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
          powered by EDGEMARKET // built by AI
          <br />
          <Link href="/" style={{ color: "#475569", textDecoration: "none" }}>← dashboard</Link>
        </div>
      </div>
    </div>
  );
}
