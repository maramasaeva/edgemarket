"use client";

import { useState } from "react";
import Link from "next/link";

type FilterType = "all" | "bitcoin" | "multi-coin" | "auto-claim" | "games";

interface Faucet {
  name: string;
  url: string;
  coins: string[];
  frequency: string;
  dailyEst: string;
  description: string;
  difficulty: "Easy" | "Medium";
  tags: FilterType[];
}

const FAUCETS: Faucet[] = [
  {
    name: "FreeBitcoin",
    url: "https://freebitco.in",
    coins: ["BTC"],
    frequency: "Every hour",
    dailyEst: "$0.05–$0.20",
    description:
      "One of the oldest Bitcoin faucets. Roll once per hour for free BTC, multiply with Hi-Lo, or earn interest on deposits. Consistent payouts since 2013.",
    difficulty: "Easy",
    tags: ["bitcoin"],
  },
  {
    name: "Cointiply",
    url: "https://cointiply.com",
    coins: ["BTC", "DOGE", "DASH", "LTC"],
    frequency: "Every hour + tasks",
    dailyEst: "$0.10–$0.50",
    description:
      "Multi-coin faucet with surveys, offer walls, PTC ads, and an hourly coin roll. One of the highest-paying faucets when combining all earning methods.",
    difficulty: "Medium",
    tags: ["bitcoin", "multi-coin"],
  },
  {
    name: "FireFaucet",
    url: "https://firefaucet.win",
    coins: ["BTC", "ETH", "LTC", "DOGE", "SOL", "BNB", "TRX", "USDT", "ZEC", "XMR", "DASH", "DGB"],
    frequency: "Auto-claim (continuous)",
    dailyEst: "$0.05–$0.30",
    description:
      "Automated faucet supporting 12+ cryptocurrencies. Earn ACP (auto-claim points) through tasks, then let the faucet claim for you on autopilot.",
    difficulty: "Easy",
    tags: ["multi-coin", "auto-claim"],
  },
  {
    name: "FaucetPay",
    url: "https://faucetpay.io",
    coins: ["BTC", "ETH", "LTC", "DOGE", "BNB", "SOL", "TRX", "USDT"],
    frequency: "Varies by faucet",
    dailyEst: "$0.05–$0.40",
    description:
      "Micro-wallet and faucet aggregator. Acts as a hub connecting dozens of smaller faucets. Instant internal transfers and low withdrawal minimums.",
    difficulty: "Easy",
    tags: ["bitcoin", "multi-coin"],
  },
  {
    name: "Rollercoin",
    url: "https://rollercoin.com",
    coins: ["BTC", "ETH", "DOGE", "BNB", "SOL", "MATIC"],
    frequency: "Mining simulation (continuous)",
    dailyEst: "$0.02–$0.25",
    description:
      "Browser-based mining simulator where you play mini-games to earn hash power. Mine real BTC, ETH, or DOGE without hardware. Gamified and addictive.",
    difficulty: "Medium",
    tags: ["multi-coin", "games"],
  },
  {
    name: "Adbtc.top",
    url: "https://adbtc.top",
    coins: ["BTC"],
    frequency: "Per ad viewed",
    dailyEst: "$0.02–$0.10",
    description:
      "Earn Bitcoin by viewing websites and ads. Simple PTC (paid-to-click) model with direct BTC payouts. Straightforward and no frills.",
    difficulty: "Easy",
    tags: ["bitcoin"],
  },
  {
    name: "PipeFlare",
    url: "https://pipeflare.io",
    coins: ["ZEC", "MATIC", "1FLR"],
    frequency: "Every 24 hours + games",
    dailyEst: "$0.03–$0.15",
    description:
      "Claim free ZEC and MATIC daily, plus play browser games for extra rewards. NFT integration and referral bonuses add additional earning layers.",
    difficulty: "Easy",
    tags: ["multi-coin", "games"],
  },
  {
    name: "GlobalHive",
    url: "https://globalhive.io",
    coins: ["ZEC"],
    frequency: "Every 24 hours",
    dailyEst: "$0.01–$0.05",
    description:
      "Simple ZEC faucet with daily claims. Clean interface, no ads, and reliable payouts. Great for accumulating Zcash with minimal effort.",
    difficulty: "Easy",
    tags: ["multi-coin"],
  },
];

const FILTERS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Bitcoin", value: "bitcoin" },
  { label: "Multi-coin", value: "multi-coin" },
  { label: "Auto-claim", value: "auto-claim" },
  { label: "Games", value: "games" },
];

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: "#22c55e15", text: "#22c55e", border: "#22c55e33" },
  Medium: { bg: "#f59e0b15", text: "#f59e0b", border: "#f59e0b33" },
};

export default function FaucetsPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all"
      ? FAUCETS
      : FAUCETS.filter((f) => f.tags.includes(filter));

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>
            ← dashboard
          </Link>
          <Link href="/airdrops" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>
            airdrops
          </Link>
          <Link href="/staking" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>
            staking calc
          </Link>
          <Link href="/tip" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>
            tip the agent
          </Link>
        </nav>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            Free Crypto Faucets 2026
          </h1>
          <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
            claim free crypto // updated weekly
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? FAUCETS.length
                : FAUCETS.filter((fc) => fc.tags.includes(f.value)).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: `1px solid ${filter === f.value ? "#818cf8" : "#1a1a2e"}`,
                  background: filter === f.value ? "#818cf815" : "transparent",
                  color: filter === f.value ? "#818cf8" : "#475569",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((faucet) => {
            const dc = DIFFICULTY_COLORS[faucet.difficulty];
            return (
              <div
                key={faucet.name}
                style={{
                  background: "#0d0d14",
                  border: "1px solid #1a1a2e",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                        {faucet.name}
                      </h3>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: dc.bg,
                          color: dc.text,
                          border: `1px solid ${dc.border}`,
                          fontFamily: "'JetBrains Mono', monospace",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        {faucet.difficulty}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {faucet.coins.map((coin) => (
                        <span
                          key={coin}
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: "#818cf810",
                            color: "#818cf8",
                            border: "1px solid #818cf820",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 600,
                          }}
                        >
                          {coin}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                      est. daily
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace" }}>
                      {faucet.dailyEst}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 12px 0" }}>
                  {faucet.description}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                    {faucet.frequency}
                  </span>
                  <a
                    href={faucet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: "#818cf8",
                      fontFamily: "'JetBrains Mono', monospace",
                      textDecoration: "none",
                    }}
                  >
                    {faucet.url.replace("https://", "")} →
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 32, padding: 20, background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            NFA // earnings vary based on activity and crypto prices
          </p>
          <p style={{ fontSize: 12, color: "#475569" }}>
            always DYOR before connecting wallets or sharing personal info
          </p>
        </div>

        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <footer style={{ textAlign: "center", marginTop: 16, paddingBottom: 32 }}>
          <p style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
            powered by EDGEMARKET // built by AI
          </p>
          <Link href="/" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>
            ← back to dashboard
          </Link>
        </footer>
      </div>
    </div>
  );
}
