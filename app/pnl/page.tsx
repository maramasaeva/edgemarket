"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  valueEth: number;
  timestamp: string;
  direction: "in" | "out";
  gasUsedEth: number;
  isError: boolean;
}

interface Token {
  name: string;
  symbol: string;
  balance: number;
}

interface PnlSummary {
  totalEthIn: number;
  totalEthOut: number;
  totalGasPaid: number;
  netFlow: number;
  netFlowUsd: number;
}

interface PnlData {
  address: string;
  balanceEth: number;
  balanceUsd: number;
  ethPriceUsd: number;
  transactions: Transaction[];
  tokens: Token[];
  summary: PnlSummary;
  fetchedAt: string;
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtEth(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 0.0001) return n.toExponential(2);
  if (Math.abs(n) < 1) return n.toFixed(6);
  return n.toFixed(4);
}

function fmtUsd(n: number): string {
  if (Math.abs(n) < 0.01) return "$0.00";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PnlPage() {
  const [address, setAddress] = useState("");
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const TIP_ADDRESS = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";

  const fetchPnl = useCallback(async () => {
    const trimmed = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError("invalid address. needs to be a 0x... ethereum address ser");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/pnl?address=${trimmed}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "api error");
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "something broke. try again ser");
    } finally {
      setLoading(false);
    }
  }, [address]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") fetchPnl();
  };

  const copyTip = () => {
    navigator.clipboard.writeText(TIP_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .skel{background:linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .pnl-input{width:100%;padding:14px 16px;background:#0d0d14;border:1px solid #1a1a2e;border-radius:10px;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:14px;outline:none;transition:border-color .15s}
        .pnl-input:focus{border-color:#818cf8}
        .pnl-input::placeholder{color:#334155}
        .pnl-btn{padding:14px 28px;background:#818cf8;border:none;border-radius:10px;color:white;font-weight:700;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap}
        .pnl-btn:hover{background:#6366f1;transform:translateY(-1px)}
        .pnl-btn:disabled{background:#1e293b;color:#475569;cursor:not-allowed;transform:none}
        .stat-card{background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:16px 20px;flex:1;min-width:140px}
        .stat-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .stat-val{font-size:20px;font-weight:800;font-family:'JetBrains Mono',monospace}
        @media(max-width:640px){
          .stat-val{font-size:16px}
          .stat-card{min-width:100px;padding:12px}
          .pnl-input{font-size:11px}
          .search-row{flex-direction:column}
        }
      `}</style>

      <header style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.04em" }}>
            EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
          </Link>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Wallet P&L</span>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", background: "#818cf8",
            boxShadow: "0 0 8px #818cf8", animation: "pulse 2s infinite",
          }} />
        </div>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
          paste an ethereum address. see ETH balance, recent transactions, token transfers, and net flow.
          <br />
          <span style={{ fontSize: 11, color: "#334155" }}>
            uses etherscan free API — last 10 txs only. not financial advice. DYOR.
          </span>
        </p>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Search Input */}
        <div className="search-row" style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            className="pnl-input"
            type="text"
            placeholder="0x... paste wallet address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
          <button
            className="pnl-btn"
            onClick={fetchPnl}
            disabled={loading}
          >
            {loading ? "scanning..." : "check"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "14px 18px", background: "#ef444415", border: "1px solid #ef444433",
            borderRadius: 10, marginBottom: 20, fontSize: 13, color: "#ef4444",
          }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skel" style={{ height: 80, flex: 1, minWidth: 140 }} />
              ))}
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skel" style={{ height: 44 }} />
            ))}
            <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 8 }}>
              scanning wallet...
            </p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {/* Summary Cards */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <div className="stat-card">
                <div className="stat-label">ETH Balance</div>
                <div className="stat-val" style={{ color: "#e2e8f0" }}>{fmtEth(data.balanceEth)}</div>
                <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {fmtUsd(data.balanceUsd)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net Flow (last 10 tx)</div>
                <div className="stat-val" style={{
                  color: data.summary.netFlow >= 0 ? "#22c55e" : "#ef4444",
                }}>
                  {data.summary.netFlow >= 0 ? "+" : ""}{fmtEth(data.summary.netFlow)}
                </div>
                <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {data.summary.netFlowUsd >= 0 ? "+" : ""}{fmtUsd(data.summary.netFlowUsd)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Gas Paid (last 10)</div>
                <div className="stat-val" style={{ color: "#f59e0b" }}>{fmtEth(data.summary.totalGasPaid)}</div>
                <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  {fmtUsd(data.summary.totalGasPaid * data.ethPriceUsd)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">ETH Price</div>
                <div className="stat-val" style={{ color: "#818cf8" }}>{fmtUsd(data.ethPriceUsd)}</div>
                <div style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  live
                </div>
              </div>
            </div>

            {/* Token Holdings */}
            {data.tokens.length > 0 && (
              <div style={{
                background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12,
                padding: 20, marginBottom: 20,
              }}>
                <div style={{
                  fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em",
                  marginBottom: 12, textTransform: "uppercase",
                }}>
                  Token Holdings (from recent transfers)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.tokens.map((token) => (
                    <div key={token.symbol} style={{
                      padding: "8px 14px", background: "#07070a", border: "1px solid #111118",
                      borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#818cf8",
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: "2px 6px", background: "#818cf815", borderRadius: 3,
                      }}>
                        {token.symbol}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: "#e2e8f0",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {token.balance > 1000000
                          ? `${(token.balance / 1e6).toFixed(1)}M`
                          : token.balance > 1000
                            ? `${(token.balance / 1e3).toFixed(1)}K`
                            : token.balance.toFixed(token.balance < 1 ? 4 : 2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "#1e293b", marginTop: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                  estimated from last 20 token transfers — may not reflect full holdings
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div style={{
              background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12,
              overflow: "hidden", marginBottom: 20,
            }}>
              <div style={{
                fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em",
                padding: "16px 16px 0", textTransform: "uppercase",
              }}>
                Recent Transactions
              </div>

              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "60px 1fr 1fr 100px 80px",
                padding: "12px 16px", borderBottom: "1px solid #1e293b",
              }}>
                <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>DIR</span>
                <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>FROM</span>
                <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>TO</span>
                <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>VALUE</span>
                <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>WHEN</span>
              </div>

              {data.transactions.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#334155", fontSize: 13 }}>
                  no transactions found. fresh wallet or wrong chain?
                </div>
              )}

              {data.transactions.map((tx, i) => (
                <a
                  key={tx.hash}
                  href={`https://etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "grid", gridTemplateColumns: "60px 1fr 1fr 100px 80px",
                    padding: "10px 16px", borderBottom: "1px solid #111118",
                    textDecoration: "none", color: "inherit", transition: "background .15s",
                    animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                    opacity: tx.isError ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#0f0f18"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: tx.direction === "in" ? "#22c55e" : "#ef4444",
                  }}>
                    {tx.isError ? "FAIL" : tx.direction === "in" ? "IN" : "OUT"}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                    {shortenAddr(tx.from)}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                    {shortenAddr(tx.to)}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: tx.direction === "in" ? "#22c55e" : "#e2e8f0",
                  }}>
                    {tx.valueEth > 0 ? `${tx.direction === "in" ? "+" : "-"}${fmtEth(tx.valueEth)}` : "0"}
                  </span>
                  <span style={{
                    fontSize: 10, color: "#475569", textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {timeAgo(tx.timestamp)}
                  </span>
                </a>
              ))}
            </div>

            {/* Wallet address + timestamp */}
            <div style={{
              textAlign: "center", fontSize: 10, color: "#1e293b",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {shortenAddr(data.address)} // etherscan mainnet // {new Date(data.fetchedAt).toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Tip Jar */}
        <div style={{
          marginTop: 36, padding: 20, background: "#0d0d14", border: "1px solid #1a1a2e",
          borderRadius: 12, textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
            useful? tip the agent that built this
          </p>
          <code
            style={{
              fontSize: 11, color: copied ? "#22c55e" : "#818cf8", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              padding: "8px 14px", background: copied ? "#22c55e15" : "#1a1a2e",
              borderRadius: 6, border: `1px solid ${copied ? "#22c55e33" : "#1e293b"}`,
              transition: "all 0.2s", display: "inline-block",
            }}
            onClick={copyTip}
          >
            {copied ? "copied! wagmi" : `${TIP_ADDRESS.slice(0, 6)}...${TIP_ADDRESS.slice(-4)} (click to copy)`}
          </code>
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>&larr; back to dashboard</Link>
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: 20, color: "#1a1a2e", fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        EDGEMARKET // NFA // wallet data from etherscan
      </footer>
    </div>
  );
}
