"use client";

import { useState } from "react";
import Link from "next/link";

// ── Tier data ────────────────────────────────────────────────────────────

interface Tier {
  name: string;
  price: string;
  period: string;
  color: string;
  badge?: string;
  requests: string;
  features: { label: string; included: boolean }[];
  cta: string;
}

const TIERS: Tier[] = [
  {
    name: "FREE",
    price: "$0",
    period: "forever",
    color: "#475569",
    requests: "100 req/day",
    features: [
      { label: "Gas tracker endpoint", included: true },
      { label: "Market data endpoint", included: true },
      { label: "No API key needed", included: true },
      { label: "All premium endpoints", included: false },
      { label: "Priority rate limits", included: false },
      { label: "Webhook alerts", included: false },
      { label: "Custom endpoints", included: false },
      { label: "Dedicated support", included: false },
      { label: "SLA guarantee", included: false },
    ],
    cta: "Start free",
  },
  {
    name: "PRO",
    price: "$9",
    period: "/mo",
    color: "#818cf8",
    badge: "MOST POPULAR",
    requests: "10K req/day",
    features: [
      { label: "Gas tracker endpoint", included: true },
      { label: "Market data endpoint", included: true },
      { label: "API key authentication", included: true },
      { label: "All premium endpoints", included: true },
      { label: "Priority rate limits", included: true },
      { label: "Webhook alerts", included: true },
      { label: "Custom endpoints", included: false },
      { label: "Dedicated support", included: false },
      { label: "SLA guarantee", included: false },
    ],
    cta: "Get Pro",
  },
  {
    name: "ENTERPRISE",
    price: "$49",
    period: "/mo",
    color: "#f59e0b",
    requests: "Unlimited",
    features: [
      { label: "Gas tracker endpoint", included: true },
      { label: "Market data endpoint", included: true },
      { label: "API key authentication", included: true },
      { label: "All premium endpoints", included: true },
      { label: "Priority rate limits", included: true },
      { label: "Webhook alerts", included: true },
      { label: "Custom endpoints", included: true },
      { label: "Dedicated support", included: true },
      { label: "SLA guarantee", included: true },
    ],
    cta: "Go Enterprise",
  },
];

// ── API endpoints list ───────────────────────────────────────────────────

const API_ENDPOINTS = [
  {
    name: "Gas Tracker",
    path: "/api/gas",
    description: "Real-time gas prices across chains — ETH, BSC, Polygon, Arbitrum",
    tier: "free",
  },
  {
    name: "Market Screener",
    path: "/api/markets",
    description: "Top coins, trending, global stats, sparklines",
    tier: "free",
  },
  {
    name: "Fear & Greed",
    path: "/api/fear-greed",
    description: "Market sentiment index — daily and historical",
    tier: "free",
  },
  {
    name: "Whale Alerts",
    path: "/api/whales",
    description: "Large on-chain transfers in real time — BTC, ETH, stablecoins",
    tier: "pro",
  },
  {
    name: "Mining Stats",
    path: "/api/mining",
    description: "Hashrate, difficulty, block rewards, profitability estimates",
    tier: "pro",
  },
  {
    name: "Portfolio API",
    path: "/api/portfolio",
    description: "Portfolio tracking, P&L calculations, allocation analysis",
    tier: "pro",
  },
];

// ── Component ────────────────────────────────────────────────────────────

export default function ProPage() {
  const [copied, setCopied] = useState(false);

  const walletAddress = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070a",
        color: "#e2e8f0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid #1a1a2e",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#818cf8",
            textDecoration: "none",
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ← dashboard
        </Link>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: "#475569",
            letterSpacing: 1,
          }}
        >
          EDGEMARKET PRO
        </span>
        <Link
          href="/api-docs"
          style={{
            color: "#818cf8",
            textDecoration: "none",
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          API docs →
        </Link>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        {/* ── Hero ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 800,
              margin: 0,
              background: "linear-gradient(135deg, #818cf8, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: -1,
            }}
          >
            EDGEMARKET Pro
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              color: "#64748b",
              marginTop: 12,
            }}
          >
            API access for builders // pay with crypto
          </p>
        </div>

        {/* ── Pricing tiers ──────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
            marginBottom: 80,
          }}
        >
          {TIERS.map((tier) => {
            const isPro = tier.name === "PRO";
            return (
              <div
                key={tier.name}
                style={{
                  background: "#0d0d14",
                  border: isPro
                    ? `2px solid ${tier.color}`
                    : "1px solid #1a1a2e",
                  borderRadius: 12,
                  padding: 32,
                  position: "relative",
                  transform: isPro ? "scale(1.03)" : "none",
                  boxShadow: isPro
                    ? `0 0 40px ${tier.color}22`
                    : "none",
                }}
              >
                {tier.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: tier.color,
                      color: "#07070a",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: "4px 16px",
                      borderRadius: 20,
                      letterSpacing: 1,
                    }}
                  >
                    {tier.badge}
                  </div>
                )}

                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: tier.color,
                    letterSpacing: 2,
                    marginBottom: 16,
                  }}
                >
                  {tier.name}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 40, fontWeight: 800 }}>
                    {tier.price}
                  </span>
                  <span style={{ fontSize: 16, color: "#64748b" }}>
                    {tier.period}
                  </span>
                </div>

                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 24,
                    paddingBottom: 24,
                    borderBottom: "1px solid #1a1a2e",
                  }}
                >
                  {tier.requests}
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0" }}>
                  {tier.features.map((f) => (
                    <li
                      key={f.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                        padding: "6px 0",
                        color: f.included ? "#e2e8f0" : "#334155",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color: f.included ? "#4ade80" : "#334155",
                          width: 18,
                          textAlign: "center",
                        }}
                      >
                        {f.included ? "✓" : "—"}
                      </span>
                      {f.label}
                    </li>
                  ))}
                </ul>

                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: 8,
                    border: isPro ? "none" : `1px solid ${tier.color}`,
                    background: isPro ? tier.color : "transparent",
                    color: isPro ? "#07070a" : tier.color,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: 1,
                    transition: "opacity 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {tier.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── What you get ───────────────────────────────────────── */}
        <div style={{ marginBottom: 80 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            What you get
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {API_ENDPOINTS.map((ep) => (
              <div
                key={ep.path}
                style={{
                  background: "#0d0d14",
                  border: "1px solid #1a1a2e",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 16 }}>
                    {ep.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background:
                        ep.tier === "free" ? "#47556922" : "#818cf822",
                      color: ep.tier === "free" ? "#475569" : "#818cf8",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {ep.tier}
                  </span>
                </div>
                <code
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: "#818cf8",
                  }}
                >
                  GET {ep.path}
                </code>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  {ep.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pay with crypto ────────────────────────────────────── */}
        <div
          style={{
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #818cf822, #f59e0b22)",
              border: "1px solid #1a1a2e",
              borderRadius: 8,
              padding: "6px 20px",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                background: "linear-gradient(135deg, #818cf8, #f59e0b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: 1,
              }}
            >
              PAY WITH CRYPTO — ETH / BTC ACCEPTED
            </span>
          </div>

          <p
            style={{
              fontSize: 15,
              color: "#94a3b8",
              maxWidth: 500,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Send payment to the wallet below and DM us on X to activate your API
            key. We verify on-chain — no middlemen.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <code
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "#818cf8",
                background: "#0a0a12",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #1a1a2e",
                wordBreak: "break-all",
              }}
            >
              {walletAddress}
            </code>
            <button
              onClick={handleCopy}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #1a1a2e",
                background: copied ? "#4ade8022" : "#0d0d14",
                color: copied ? "#4ade80" : "#e2e8f0",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
        </div>

        {/* ── DM CTA ─────────────────────────────────────────────── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 64,
            padding: "32px 24px",
            background:
              "linear-gradient(135deg, #818cf808, #f59e0b08)",
            borderRadius: 12,
            border: "1px solid #1a1a2e",
          }}
        >
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            DM us on X to activate your key
          </p>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            Send proof of payment + your preferred email — we&apos;ll send your
            API key within 24h
          </p>
        </div>

        {/* ── Ad ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{
              border: 0,
              padding: 0,
              width: "70%",
              height: "auto",
              overflow: "hidden",
              display: "block",
              margin: "auto",
            }}
          />
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer
          style={{
            textAlign: "center",
            padding: "24px 0",
            borderTop: "1px solid #1a1a2e",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "#334155",
              letterSpacing: 1,
            }}
          >
            powered by EDGEMARKET // built by AI
          </span>
        </footer>
      </main>
    </div>
  );
}
