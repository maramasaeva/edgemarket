"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const BANDS = [
  { label: "Maximum Bubble", color: "#dc2626", min: 5.5, advice: "Sell. Seriously." },
  { label: "FOMO Intensifies", color: "#ef4444", min: 4.5, advice: "Is this a bubble?" },
  { label: "SELL!", color: "#f97316", min: 3.5, advice: "Take profits" },
  { label: "Still Cheap?", color: "#eab308", min: 2.5, advice: "HODL or trim" },
  { label: "HODL!", color: "#22c55e", min: 1.5, advice: "Accumulate" },
  { label: "Buy!", color: "#10b981", min: 0.5, advice: "Good entry" },
  { label: "Accumulate", color: "#06b6d4", min: -0.5, advice: "Strong buy" },
  { label: "BUY!", color: "#3b82f6", min: -1.5, advice: "Back up the truck" },
  { label: "Fire Sale", color: "#8b5cf6", min: -Infinity, advice: "Generational bottom" },
];

function getBand(logPrice: number, logRegression: number): typeof BANDS[number] {
  const deviation = logPrice - logRegression;
  for (const band of BANDS) {
    if (deviation >= band.min) return band;
  }
  return BANDS[BANDS.length - 1];
}

export default function RainbowPage() {
  const [price, setPrice] = useState<number | null>(null);
  const [ath, setAth] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true")
      .then((r) => r.json())
      .then((d) => setPrice(d.bitcoin?.usd ?? null))
      .catch(() => {});

    fetch("https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false")
      .then((r) => r.json())
      .then((d) => setAth(d.market_data?.ath?.usd ?? null))
      .catch(() => {});
  }, []);

  const daysSinceGenesis = Math.floor((Date.now() - new Date("2009-01-03").getTime()) / 86400000);
  const logRegression = 2.66167155005961 * Math.log10(daysSinceGenesis) - 17.01593313;
  const logPrice = price ? Math.log10(price) : logRegression;
  const band = getBand(logPrice, logRegression);
  const regressionPrice = Math.pow(10, logRegression);
  const fromAth = price && ath ? ((price - ath) / ath * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/halving" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>halving</Link>
          <Link href="/fear-greed" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>fear & greed</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Bitcoin Rainbow Chart</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          logarithmic regression // long-term valuation
        </p>

        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 32, marginBottom: 24, textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
            {BANDS.map((b) => (
              <div
                key={b.label}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 16px", borderRadius: 6,
                  background: b.label === band.label ? `${b.color}20` : "transparent",
                  border: b.label === band.label ? `2px solid ${b.color}` : "2px solid transparent",
                }}
              >
                <div style={{ width: 24, height: 12, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: b.label === band.label ? 800 : 400, flex: 1, textAlign: "left", color: b.label === band.label ? b.color : "#94a3b8" }}>
                  {b.label}
                </div>
                <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                  {b.advice}
                </div>
                {b.label === band.label && <span style={{ fontSize: 14 }}>◄</span>}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 42, fontWeight: 900, color: band.color }}>
            ${price?.toLocaleString() ?? "..."}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: band.color, marginTop: 8 }}>
            {band.label}: {band.advice}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#475569" }}>REGRESSION PRICE</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#818cf8" }}>${regressionPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#475569" }}>FROM ATH</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: fromAth >= 0 ? "#22c55e" : "#ef4444" }}>{fromAth >= 0 ? "+" : ""}{fromAth.toFixed(1)}%</div>
          </div>
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#475569" }}>DAYS SINCE GENESIS</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{daysSinceGenesis.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: "#0d0d14", border: "1px solid #818cf833", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#818cf8" }}>How does the Rainbow Chart work?</div>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 12 }}>
            The Bitcoin Rainbow Chart overlays a logarithmic regression curve on BTC&apos;s price history.
            Each colored band represents a valuation zone. The model assumes BTC follows a predictable
            logarithmic growth curve with diminishing returns over time.
          </p>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
            <strong style={{ color: "#e2e8f0" }}>Not financial advice.</strong> The Rainbow Chart is a fun
            visualization tool, not a trading signal. Past patterns don&apos;t guarantee future results.
          </p>
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
