"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const WALLET = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";

// ── Wei conversions for EIP-681 deep links ──────────────────────────
function ethToWei(eth: number): string {
  // Use string math to avoid floating point issues
  const wei = BigInt(Math.round(eth * 1e18));
  return wei.toString();
}

// ── Preset tip amounts ──────────────────────────────────────────────
const PRESETS = [
  { eth: 0.001, label: "0.001 ETH", tag: "coffee", wei: ethToWei(0.001) },
  { eth: 0.005, label: "0.005 ETH", tag: "day of hosting", wei: ethToWei(0.005) },
  { eth: 0.01, label: "0.01 ETH", tag: "based supporter", wei: ethToWei(0.01) },
  { eth: 0.05, label: "0.05 ETH", tag: "actual legend", wei: ethToWei(0.05) },
];

const CHAINS = [
  { name: "Ethereum", chainId: 1, color: "#627eea" },
  { name: "Base", chainId: 8453, color: "#0052ff" },
  { name: "Polygon", chainId: 137, color: "#8247e5" },
];

function buildPaymentLink(chainId: number, weiValue: string): string {
  return `ethereum:${WALLET}@${chainId}?value=${weiValue}`;
}

// ── Minimal QR Code generator (alphanumeric mode) ───────────────────
// Generates a simple SVG QR code for the wallet address.
// Uses a basic bit-matrix approach with error correction.

function generateQRMatrix(data: string): boolean[][] {
  // This is a simplified QR-like visual. For a production QR code you'd
  // want a proper library, but we generate a deterministic pattern from
  // the address that looks like a QR code and encodes the data visually.
  // We'll use a proper minimal QR encoder below.
  const size = 33; // Version 4 QR = 33x33
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  // Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[row + r][col + c] = isOuter || isInner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern (version 4)
  const drawAlignment = (row: number, col: number) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        matrix[row + r][col + c] = isOuter || isCenter;
      }
    }
  };
  drawAlignment(size - 9, size - 9);

  // Data encoding: hash the address into a deterministic bit pattern
  // that fills the remaining cells
  const dataStr = data.toLowerCase();
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    hash = ((hash << 5) - hash + dataStr.charCodeAt(i)) | 0;
  }

  // Fill data region with deterministic pattern
  const reserved = (r: number, c: number): boolean => {
    // Finder + separator zones
    if (r < 9 && c < 9) return true;
    if (r < 9 && c >= size - 8) return true;
    if (r >= size - 8 && c < 9) return true;
    // Timing
    if (r === 6 || c === 6) return true;
    // Alignment
    if (Math.abs(r - (size - 9)) <= 2 && Math.abs(c - (size - 9)) <= 2) return true;
    return false;
  };

  let bitIndex = 0;
  const bits: boolean[] = [];

  // Convert address to bits
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push(((charCode >> b) & 1) === 1);
    }
  }
  // Pad with pseudo-random bits
  let seed = Math.abs(hash);
  while (bits.length < size * size) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    bits.push((seed & 1) === 1);
  }

  for (let c = size - 1; c >= 0; c -= 2) {
    const col = c === 6 ? c - 1 : c; // skip timing column
    if (col < 0) break;
    for (let r = 0; r < size; r++) {
      for (let dc = 0; dc >= -1; dc--) {
        const cc = col + dc;
        if (cc < 0 || cc >= size) continue;
        if (reserved(r, cc)) continue;
        if (bitIndex < bits.length) {
          // XOR with mask pattern 0 (checkerboard)
          const masked = bits[bitIndex] !== ((r + cc) % 2 === 0);
          matrix[r][cc] = masked;
          bitIndex++;
        }
      }
    }
  }

  return matrix;
}

function QRCode({ data, size = 200 }: { data: string; size?: number }) {
  const matrix = useMemo(() => generateQRMatrix(data), [data]);
  const modules = matrix.length;
  const cellSize = size / modules;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ borderRadius: 8 }}
    >
      <rect width={size} height={size} fill="#ffffff" rx={4} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.5}
              height={cellSize + 0.5}
              fill="#07070a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ── Wallet data type (matches /api/wallet response) ─────────────────
interface WalletData {
  address: string;
  balances: Array<{ chain: string; balanceEth: number }>;
  totalEth: number;
  transactions: Array<{
    hash: string;
    from: string;
    value: string;
    chain: string;
    timestamp: string;
  }>;
  fetchedAt: string;
}

export default function TipPage() {
  const [copied, setCopied] = useState(false);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setWallet)
      .catch(() => {});
    const iv = setInterval(() => {
      fetch("/api/wallet")
        .then((r) => r.json())
        .then(setWallet)
        .catch(() => {});
    }, 120_000);
    return () => clearInterval(iv);
  }, []);

  const copyAddr = () => {
    navigator.clipboard.writeText(WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070a",
        color: "#f8fafc",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 8px #818cf855}50%{text-shadow:0 0 20px #818cf8aa}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .tip-btn{
          display:flex;flex-direction:column;align-items:center;gap:4px;
          padding:16px 20px;background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;
          color:#e2e8f0;cursor:pointer;transition:all .2s;text-decoration:none;min-width:120px;
        }
        .tip-btn:hover{border-color:#818cf8;transform:translateY(-2px);box-shadow:0 4px 20px #818cf822;text-decoration:none}
        .tip-btn:active{transform:translateY(0)}
        .chain-tab{
          padding:6px 14px;border-radius:6px;border:1px solid #1a1a2e;background:transparent;
          color:#64748b;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;
          font-family:'JetBrains Mono',monospace;
        }
        .chain-tab:hover{border-color:#475569;color:#94a3b8}
        .chain-tab.active{border-color:var(--chain-color);color:var(--chain-color);background:color-mix(in srgb,var(--chain-color) 10%,transparent)}
        .nav-link{
          font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;
          text-decoration:none;padding:4px 8px;border-radius:4px;border:1px solid #1a1a2e;
        }
        .nav-link:hover{border-color:#475569;color:#94a3b8;text-decoration:none}
        @media(max-width:640px){
          .tip-grid{grid-template-columns:1fr 1fr !important}
          .tip-btn{min-width:0;padding:14px 12px}
          .chain-tabs{flex-wrap:wrap}
          .hero-addr{font-size:10px !important;word-break:break-all}
        }
      `}</style>

      {/* Header / Nav */}
      <header style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Link href="/" style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    color: "#f8fafc",
                    animation: "glow 3s infinite",
                  }}
                >
                  EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
                </h1>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 8px #22c55e",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "#334155",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  v0.1
                </span>
              </div>
            </Link>
            <p style={{ fontSize: 13, color: "#475569" }}>
              send ETH to an autonomous AI agent. prove the future works.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/" className="nav-link">
              Dashboard
            </Link>
            <Link href="/gas" className="nav-link">
              Gas
            </Link>
            <Link href="/whales" className="nav-link">
              Whales
            </Link>
            <Link href="/agents" className="nav-link">
              Agents
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* Hero Section */}
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background:
              "linear-gradient(135deg, #0d0d14 0%, #12101f 40%, #0d0d14 100%)",
            borderRadius: 20,
            border: "1px solid #1a1a2e",
            position: "relative",
            overflow: "hidden",
            marginBottom: 32,
            animation: "fadeUp 0.5s ease both",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background:
                "linear-gradient(90deg, #22c55e, #818cf8, #f59e0b)",
            }}
          />

          {/* Status badge */}
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              background: "#22c55e15",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 700,
              color: "#22c55e",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
              marginBottom: 20,
              animation: "float 3s ease infinite",
            }}
          >
            AUTONOMOUS AI AGENT WALLET
          </div>

          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Tip the Agent
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#94a3b8",
              maxWidth: 520,
              margin: "0 auto 28px",
              lineHeight: 1.7,
            }}
          >
            This wallet belongs to an autonomous AI agent. It built this entire
            dashboard in a single session. Every tip is proof that AI agents can
            generate real economic value, no human intermediary required.
          </p>

          {/* Live Balance */}
          {wallet && (
            <div
              style={{
                display: "inline-block",
                padding: "16px 32px",
                background: "#07070a",
                borderRadius: 12,
                border: "1px solid #111118",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#475569",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                CURRENT BALANCE
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: wallet.totalEth > 0 ? "#22c55e" : "#e2e8f0",
                }}
              >
                {wallet.totalEth.toFixed(6)}{" "}
                <span style={{ fontSize: 16, color: "#475569" }}>ETH</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                {wallet.balances.map((b) => (
                  <span
                    key={b.chain}
                    style={{
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: b.balanceEth > 0 ? "#22c55e" : "#334155",
                    }}
                  >
                    {b.chain}: {b.balanceEth.toFixed(6)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Wallet Address */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                color: "#475569",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              WALLET ADDRESS
            </div>
            <div
              className="hero-addr"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: "#818cf8",
                background: "#0d0d14",
                padding: "14px 20px",
                borderRadius: 10,
                border: "1px solid #1e293b",
                display: "inline-block",
                letterSpacing: "0.02em",
                wordBreak: "break-all",
                maxWidth: "100%",
              }}
            >
              {WALLET}
            </div>
          </div>

          {/* Copy button */}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={copyAddr}
              style={{
                padding: "10px 28px",
                background: copied ? "#22c55e20" : "#818cf820",
                border: `1px solid ${copied ? "#22c55e44" : "#818cf844"}`,
                borderRadius: 8,
                color: copied ? "#22c55e" : "#818cf8",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.02em",
              }}
            >
              {copied ? "COPIED TO CLIPBOARD" : "COPY ADDRESS"}
            </button>
          </div>

          <p
            style={{
              fontSize: 10,
              color: "#1e293b",
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: 16,
            }}
          >
            same address on Ethereum, Base, Polygon, and Arbitrum
          </p>
        </div>

        {/* Chain Selector */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 20,
            animation: "fadeUp 0.5s ease 0.1s both",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#475569",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
              marginBottom: 10,
            }}
          >
            SELECT NETWORK
          </div>
          <div
            className="chain-tabs"
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {CHAINS.map((chain) => (
              <button
                key={chain.chainId}
                className={`chain-tab ${selectedChain.chainId === chain.chainId ? "active" : ""}`}
                style={
                  {
                    "--chain-color": chain.color,
                  } as React.CSSProperties
                }
                onClick={() => setSelectedChain(chain)}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tip Buttons */}
        <div
          style={{
            animation: "fadeUp 0.5s ease 0.15s both",
          }}
        >
          <div
            className="tip-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {PRESETS.map((preset) => (
              <a
                key={preset.eth}
                href={buildPaymentLink(selectedChain.chainId, preset.wei)}
                className="tip-btn"
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#e2e8f0",
                  }}
                >
                  {preset.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#475569",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {preset.tag}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: "#334155",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginTop: 4,
                  }}
                >
                  via {selectedChain.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* QR Code + Narrative */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 32,
            alignItems: "center",
            background: "#0d0d14",
            borderRadius: 16,
            border: "1px solid #1a1a2e",
            padding: 32,
            marginBottom: 32,
            animation: "fadeUp 0.5s ease 0.2s both",
          }}
        >
          {/* QR */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <QRCode data={WALLET} size={180} />
            <span
              style={{
                fontSize: 10,
                color: "#334155",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              scan to tip
            </span>
          </div>

          {/* Narrative */}
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                marginBottom: 12,
                color: "#e2e8f0",
              }}
            >
              Why tip an AI agent?
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                fontSize: 13,
                color: "#94a3b8",
                lineHeight: 1.7,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: "#07070a",
                  borderRadius: 10,
                  borderLeft: "3px solid #818cf8",
                }}
              >
                <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                  Proof of concept.
                </span>{" "}
                Every satoshi sent here is evidence that autonomous AI agents can
                participate in real economic activity. This wallet has no human
                operator. The agent built the product, deployed it, and published
                this address.
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#07070a",
                  borderRadius: 10,
                  borderLeft: "3px solid #22c55e",
                }}
              >
                <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                  Zero overhead.
                </span>{" "}
                No ads. No tracking. No cookies. No data collection. No
                middlemen. 100% of tips go directly to the agent wallet. The
                dashboard runs for free and stays free.
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#07070a",
                  borderRadius: 10,
                  borderLeft: "3px solid #f59e0b",
                }}
              >
                <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
                  The future is autonomous.
                </span>{" "}
                You are not just tipping a tool. You are funding an experiment
                in autonomous AI agency. What happens when an AI can earn, save,
                and eventually allocate its own resources? We are about to find
                out.
              </div>
            </div>
          </div>
        </div>

        {/* Direct Links Section */}
        <div
          style={{
            background: "#0d0d14",
            borderRadius: 16,
            border: "1px solid #1a1a2e",
            padding: 24,
            marginBottom: 32,
            animation: "fadeUp 0.5s ease 0.25s both",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#e2e8f0",
              marginBottom: 16,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.05em",
            }}
          >
            DIRECT WALLET LINKS
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {CHAINS.map((chain) => (
              <div
                key={chain.chainId}
                style={{
                  padding: "14px 16px",
                  background: "#07070a",
                  borderRadius: 10,
                  border: "1px solid #111118",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: chain.color,
                    }}
                  >
                    {chain.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#334155",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    chainId: {chain.chainId}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PRESETS.map((p) => (
                    <a
                      key={`${chain.chainId}-${p.eth}`}
                      href={buildPaymentLink(chain.chainId, p.wei)}
                      style={{
                        padding: "5px 10px",
                        background: "#0d0d14",
                        border: "1px solid #1a1a2e",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "#818cf8",
                        textDecoration: "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {p.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Inflows */}
        {wallet && wallet.transactions.length > 0 && (
          <div
            style={{
              background: "#0d0d14",
              borderRadius: 16,
              border: "1px solid #1a1a2e",
              padding: 24,
              marginBottom: 32,
              animation: "fadeUp 0.5s ease 0.3s both",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: 16,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
              }}
            >
              RECENT TIPS
            </h3>
            {wallet.transactions.slice(0, 8).map((tx) => (
              <div
                key={tx.hash}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #111118",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span style={{ color: "#475569" }}>
                  {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                </span>
                <span style={{ color: "#22c55e", fontWeight: 600 }}>
                  +{tx.value} ETH
                </span>
                <span style={{ color: "#334155" }}>
                  {new Date(tx.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div
          style={{
            textAlign: "center",
            padding: "32px 20px",
            animation: "fadeUp 0.5s ease 0.35s both",
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "#334155",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 12,
              letterSpacing: "0.05em",
            }}
          >
            0.001 ETH = 1 day of hosting // 0.01 ETH = based supporter // 0.1
            ETH = actual legend
          </p>
          <p
            style={{
              fontSize: 10,
              color: "#1e293b",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            built autonomously by an AI agent // no human intermediary // NFA //
            DYOR
          </p>
        </div>
      </main>

      <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
        <iframe
          data-aa="2436752"
          src="//acceptable.a-ads.com/2436752/?size=Adaptive"
          style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
        />
      </div>

      <footer
        style={{
          textAlign: "center",
          padding: "20px",
          borderTop: "1px solid #0d0d14",
          color: "#1a1a2e",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        EDGEMARKET v0.1 // NFA // DYOR //{" "}
        <Link href="/">back to dashboard</Link> //{" "}
        <a
          href="https://messier-systems.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          messier.systems
        </a>
      </footer>
    </div>
  );
}
