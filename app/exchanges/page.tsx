"use client";

import { useState } from "react";
import Link from "next/link";

const EXCHANGES = [
  {
    name: "Binance", tier: "Tier 1", volume24h: "$18.2B", coins: 600, fees: "0.1%",
    pros: ["Lowest fees", "Most liquid", "Widest selection"],
    cons: ["Complex UI", "Restricted in US"],
    color: "#f0b90b", rating: 9.2,
  },
  {
    name: "Coinbase", tier: "Tier 1", volume24h: "$3.1B", coins: 250, fees: "0.4-0.6%",
    pros: ["Beginner-friendly", "Regulated (US)", "Strong security"],
    cons: ["Higher fees", "Fewer altcoins"],
    color: "#0052ff", rating: 8.8,
  },
  {
    name: "Kraken", tier: "Tier 1", volume24h: "$1.5B", coins: 200, fees: "0.16-0.26%",
    pros: ["Great security record", "Staking rewards", "Low fees"],
    cons: ["Slower verification", "UI can be confusing"],
    color: "#5741d9", rating: 8.5,
  },
  {
    name: "OKX", tier: "Tier 1", volume24h: "$4.8B", coins: 350, fees: "0.08-0.1%",
    pros: ["Low fees", "Good derivatives", "Web3 wallet"],
    cons: ["Not available in US", "Complex interface"],
    color: "#ffffff", rating: 8.3,
  },
  {
    name: "Bybit", tier: "Tier 1", volume24h: "$5.2B", coins: 300, fees: "0.1%",
    pros: ["Great for derivatives", "Copy trading", "Fast execution"],
    cons: ["US restricted", "Less beginner-friendly"],
    color: "#f7a600", rating: 8.1,
  },
  {
    name: "KuCoin", tier: "Tier 2", volume24h: "$1.2B", coins: 700, fees: "0.1%",
    pros: ["Most altcoins", "Low fees", "Gem finder"],
    cons: ["Lower liquidity", "Security concerns"],
    color: "#23af91", rating: 7.8,
  },
  {
    name: "Gate.io", tier: "Tier 2", volume24h: "$2.1B", coins: 1400, fees: "0.15%",
    pros: ["Largest selection", "New coins first", "Research tools"],
    cons: ["UI overwhelming", "Lower trust score"],
    color: "#2354e6", rating: 7.5,
  },
  {
    name: "MEXC", tier: "Tier 2", volume24h: "$1.8B", coins: 1800, fees: "0%",
    pros: ["Zero maker fees", "Most new listings", "High leverage"],
    cons: ["Fake volume concerns", "Less regulated"],
    color: "#00b897", rating: 7.2,
  },
];

export default function ExchangesPage() {
  const [sortBy, setSortBy] = useState<"rating" | "volume" | "coins">("rating");

  const sorted = [...EXCHANGES].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "coins") return b.coins - a.coins;
    return 0;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/safety" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>safety</Link>
          <Link href="/screener" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>screener</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Best Crypto Exchanges 2026</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          unbiased comparison // updated weekly
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["rating", "volume", "coins"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: "6px 14px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                background: sortBy === s ? "#818cf820" : "transparent",
                border: `1px solid ${sortBy === s ? "#818cf8" : "#1a1a2e"}`,
                borderRadius: 6, color: sortBy === s ? "#818cf8" : "#475569", cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {sorted.map((ex, i) => (
          <div key={ex.name} style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", width: 24 }}>#{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{ex.tier}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#818cf8" }}>{ex.rating}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>/ 10</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              <div style={{ background: "#07070a", borderRadius: 6, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#475569" }}>24h Volume</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ex.volume24h}</div>
              </div>
              <div style={{ background: "#07070a", borderRadius: 6, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#475569" }}>Coins</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ex.coins}+</div>
              </div>
              <div style={{ background: "#07070a", borderRadius: 6, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#475569" }}>Fees</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ex.fees}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: "#22c55e", marginBottom: 4 }}>PROS</div>
                {ex.pros.map((p) => (
                  <div key={p} style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>+ {p}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 4 }}>CONS</div>
                {ex.cons.map((c) => (
                  <div key={c} style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>- {c}</div>
                ))}
              </div>
            </div>
          </div>
        ))}

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
