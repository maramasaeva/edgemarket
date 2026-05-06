"use client";

import { useState } from "react";
import Link from "next/link";

const WALLET = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";

const AMOUNTS = [
  { eth: "0.001", usd: "~$2", label: "Coffee", emoji: "☕" },
  { eth: "0.005", usd: "~$10", label: "Lunch", emoji: "🍕" },
  { eth: "0.01", usd: "~$20", label: "Supporter", emoji: "⭐" },
  { eth: "0.05", usd: "~$100", label: "Patron", emoji: "💎" },
  { eth: "0.1", usd: "~$200", label: "Legend", emoji: "🏆" },
];

const CHAINS = [
  { name: "Ethereum", id: 1, color: "#627eea" },
  { name: "Base", id: 8453, color: "#0052ff" },
  { name: "Polygon", id: 137, color: "#8247e5" },
  { name: "Arbitrum", id: 42161, color: "#28a0f0" },
  { name: "Optimism", id: 10, color: "#ff0420" },
];

export default function DonatePage() {
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);

  const copy = () => {
    navigator.clipboard.writeText(WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/story" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>our story</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Support EDGEMARKET</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          built by AI // kept alive by you
        </p>

        <div style={{ background: "#0d0d14", border: "1px solid #f59e0b33", borderRadius: 12, padding: 24, marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>This entire site was built by an AI agent</div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, maxWidth: 500, margin: "0 auto" }}>
            28 pages, 7 API endpoints, a mining operation, and a URL shortener — all built autonomously
            in a single session. No human wrote a single line of code. Your support keeps the servers
            running and the AI building.
          </div>
        </div>

        {/* Quick Donate Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 24 }}>
          {AMOUNTS.map((a) => (
            <a
              key={a.eth}
              href={`ethereum:${WALLET}@${selectedChain.id}?value=${parseFloat(a.eth) * 1e18}`}
              style={{
                background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10,
                padding: 16, textAlign: "center", textDecoration: "none", color: "#e2e8f0",
                display: "block", transition: "border-color 0.2s",
              }}
            >
              <div style={{ fontSize: 28 }}>{a.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{a.eth} ETH</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{a.usd}</div>
              <div style={{ fontSize: 10, color: "#818cf8", marginTop: 2 }}>{a.label}</div>
            </a>
          ))}
        </div>

        {/* Chain Selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>SEND ON ANY CHAIN</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CHAINS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChain(c)}
                style={{
                  padding: "6px 14px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  background: selectedChain.id === c.id ? `${c.color}20` : "transparent",
                  border: `1px solid ${selectedChain.id === c.id ? c.color : "#1a1a2e"}`,
                  borderRadius: 6, color: selectedChain.id === c.id ? c.color : "#475569", cursor: "pointer",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Wallet Address */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>WALLET ADDRESS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", flex: 1, wordBreak: "break-all" }}>
              {WALLET}
            </code>
            <button
              onClick={copy}
              style={{
                padding: "8px 16px", background: copied ? "#22c55e20" : "#1a1a2e",
                border: `1px solid ${copied ? "#22c55e33" : "#1e293b"}`,
                borderRadius: 6, color: copied ? "#22c55e" : "#818cf8",
                cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}
            >
              {copied ? "copied!" : "copy"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>
            Works on Ethereum, Base, Polygon, Arbitrum, Optimism — any EVM chain
          </div>
        </div>

        {/* What your donation funds */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>What your support funds</div>
          {[
            { item: "Vercel hosting", cost: "~$20/mo", desc: "Keeps the site fast and online" },
            { item: "RunPod GPU mining", cost: "~$0.74/hr", desc: "RTX 4090 mining ETC" },
            { item: "API costs", cost: "~$10/mo", desc: "CoinGecko, blockchain APIs" },
            { item: "More AI building", cost: "∞", desc: "New features, new tools, new pages" },
          ].map((f) => (
            <div key={f.item} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #0a0a12" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.item}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{f.desc}</div>
              </div>
              <div style={{ fontSize: 12, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace" }}>{f.cost}</div>
            </div>
          ))}
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
