"use client";

import { useState } from "react";
import Link from "next/link";

interface Airdrop {
  name: string;
  chain: string;
  status: "live" | "upcoming" | "rumored";
  est: string;
  tasks: string[];
  link: string;
}

const AIRDROPS: Airdrop[] = [
  {
    name: "LayerZero Season 2",
    chain: "Multi-chain",
    status: "rumored",
    est: "$500–$5,000",
    tasks: ["Bridge assets via Stargate", "Use LayerZero OFTs", "Volume across 5+ chains"],
    link: "https://layerzero.network",
  },
  {
    name: "Scroll",
    chain: "Ethereum L2",
    status: "rumored",
    est: "$200–$2,000",
    tasks: ["Bridge to Scroll mainnet", "Interact with 5+ dApps", "Provide liquidity on DEX"],
    link: "https://scroll.io",
  },
  {
    name: "Linea",
    chain: "Ethereum L2",
    status: "rumored",
    est: "$300–$3,000",
    tasks: ["Bridge ETH to Linea", "Use MetaMask portfolio", "Interact with ecosystem dApps"],
    link: "https://linea.build",
  },
  {
    name: "Berachain",
    chain: "Cosmos / EVM",
    status: "live",
    est: "$500–$10,000",
    tasks: ["Testnet participation", "Provide BGT liquidity", "Governance delegation"],
    link: "https://berachain.com",
  },
  {
    name: "Monad",
    chain: "EVM L1",
    status: "upcoming",
    est: "$1,000–$10,000",
    tasks: ["Join Discord", "Testnet when live", "Engage with ecosystem projects"],
    link: "https://monad.xyz",
  },
  {
    name: "Fuel",
    chain: "Modular Execution",
    status: "rumored",
    est: "$200–$2,000",
    tasks: ["Bridge to Fuel", "Swap on Thunder Exchange", "Deploy contracts"],
    link: "https://fuel.network",
  },
  {
    name: "Eclipse",
    chain: "Solana VM on ETH",
    status: "rumored",
    est: "$300–$5,000",
    tasks: ["Bridge to Eclipse mainnet", "Use DEXs", "Provide liquidity"],
    link: "https://eclipse.xyz",
  },
  {
    name: "Hyperlane",
    chain: "Interoperability",
    status: "upcoming",
    est: "$100–$1,000",
    tasks: ["Bridge via Hyperlane", "Use Nexus", "Multi-chain messages"],
    link: "https://hyperlane.xyz",
  },
  {
    name: "Initia",
    chain: "Cosmos Rollup",
    status: "upcoming",
    est: "$500–$5,000",
    tasks: ["Testnet quests", "Join ecosystem", "Stake on testnet"],
    link: "https://initia.xyz",
  },
  {
    name: "Puffer Finance",
    chain: "Ethereum",
    status: "live",
    est: "$100–$2,000",
    tasks: ["Deposit ETH for pufETH", "Restake via EigenLayer", "Hold pufETH"],
    link: "https://puffer.fi",
  },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  live: { bg: "#22c55e15", text: "#22c55e", border: "#22c55e33" },
  upcoming: { bg: "#818cf815", text: "#818cf8", border: "#818cf833" },
  rumored: { bg: "#f59e0b15", text: "#f59e0b", border: "#f59e0b33" },
};

export default function AirdropsPage() {
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "rumored">("all");

  const filtered = filter === "all" ? AIRDROPS : AIRDROPS.filter((a) => a.status === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/screener" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>screener</Link>
          <Link href="/staking" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>staking calc</Link>
          <Link href="/tip" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>tip the agent</Link>
        </nav>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            Airdrop Tracker
          </h1>
          <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
            upcoming airdrops worth farming // NFA, estimates only
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {(["all", "live", "upcoming", "rumored"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: `1px solid ${filter === f ? "#818cf8" : "#1a1a2e"}`,
                background: filter === f ? "#818cf815" : "transparent",
                color: filter === f ? "#818cf8" : "#475569",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {f} {f === "all" ? `(${AIRDROPS.length})` : `(${AIRDROPS.filter((a) => a.status === f).length})`}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((airdrop) => {
            const sc = STATUS_COLORS[airdrop.status];
            return (
              <div
                key={airdrop.name}
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
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f8fafc" }}>{airdrop.name}</h3>
                      <span style={{
                        fontSize: 9,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: sc.bg,
                        color: sc.text,
                        border: `1px solid ${sc.border}`,
                        fontFamily: "'JetBrains Mono', monospace",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}>
                        {airdrop.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>{airdrop.chain}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>est. value</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace" }}>{airdrop.est}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, textTransform: "uppercase" }}>how to qualify:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {airdrop.tasks.map((task, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 8 }}>
                        <span style={{ color: "#818cf8" }}>→</span> {task}
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href={airdrop.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color: "#818cf8",
                    fontFamily: "'JetBrains Mono', monospace",
                    textDecoration: "none",
                  }}
                >
                  {airdrop.link.replace("https://", "")} →
                </a>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 32, padding: 20, background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
            know about an airdrop we missed? tip the agent and we&apos;ll add it
          </p>
          <Link
            href="/tip"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "linear-gradient(135deg, #818cf8, #6366f1)",
              color: "#fff",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Tip the Agent →
          </Link>
        </div>

        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
