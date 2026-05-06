"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface WhaleTransaction {
  hash: string;
  timestamp: number;
  amount: number;
  amountUsd: number;
  symbol: string;
  from: string;
  fromLabel: string;
  to: string;
  toLabel: string;
  type: string;
}

interface WhaleData {
  transactions: WhaleTransaction[];
  source: string;
  count: number;
  fetchedAt: string;
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtAmount(n: number, symbol: string): string {
  if (symbol === "BTC") return `${n.toFixed(2)} BTC`;
  if (symbol === "ETH") return `${n.toFixed(2)} ETH`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M ${symbol}`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K ${symbol}`;
  return `${n.toFixed(2)} ${symbol}`;
}

function shortAddr(addr: string): string {
  if (!addr || addr === "unknown") return "???";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function typeIcon(type: string): string {
  switch (type) {
    case "mint": return "\u{2728}";
    case "burn": return "\u{1F525}";
    default: return "\u{1F40B}";
  }
}

function sizeLabel(usd: number): { text: string; color: string; bg: string } {
  if (usd >= 100_000_000) return { text: "MEGA", color: "#f59e0b", bg: "#f59e0b18" };
  if (usd >= 10_000_000) return { text: "HUGE", color: "#ef4444", bg: "#ef444418" };
  if (usd >= 1_000_000) return { text: "LARGE", color: "#818cf8", bg: "#818cf818" };
  return { text: "WHALE", color: "#22c55e", bg: "#22c55e18" };
}

export default function WhalesPage() {
  const [data, setData] = useState<WhaleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const ETH_ADDRESS = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";

  const fetchWhales = useCallback(async () => {
    try {
      const res = await fetch("/api/whales");
      if (!res.ok) throw new Error("API error");
      const d: WhaleData = await res.json();
      setData(d);
      setError(null);
      setCountdown(30);
    } catch {
      setError("whale sonar offline. try again ser");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWhales();
    const iv = setInterval(fetchWhales, 30_000);
    return () => clearInterval(iv);
  }, [fetchWhales]);

  // Countdown timer
  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const copyAddr = () => {
    navigator.clipboard.writeText(ETH_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalVolume = data?.transactions.reduce((sum, tx) => sum + tx.amountUsd, 0) ?? 0;

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
        .whale-row{display:grid;grid-template-columns:40px 1fr 1fr 120px 100px 70px;gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid #111118;transition:background .15s}
        .whale-row:hover{background:#0f0f18}
        @media(max-width:768px){
          .whale-row{grid-template-columns:32px 1fr 1fr 80px;font-size:12px}
          .hide-mobile{display:none!important}
        }
      `}</style>

      <header style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.04em" }}>
            EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
          </Link>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Whale Alerts</span>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
            refresh in {countdown}s
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#475569" }}>
          tracking large crypto moves (&gt;$500K). follow the smart money ser.
        </p>

        {data && (
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Transactions
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
                {data.count}
              </div>
            </div>
            <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Total Volume
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#22c55e" }}>
                {fmtUsd(totalVolume)}
              </div>
            </div>
            <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Source
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#818cf8" }}>
                {data.source === "whale-alert" ? "Whale Alert" : data.source === "etherscan" ? "Etherscan" : "offline"}
              </div>
              <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>
                {data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : "..."}
              </div>
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 40px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 52 }} />
            ))}
            <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 8 }}>scanning for whales...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F40B}"}</p>
            <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</p>
            <button
              onClick={fetchWhales}
              style={{
                padding: "8px 20px", background: "#1e293b", border: "none", borderRadius: 6,
                color: "#e2e8f0", cursor: "pointer", fontSize: 13, fontFamily: "'Inter', sans-serif",
              }}
            >
              retry ser
            </button>
          </div>
        )}

        {!loading && !error && data && data.transactions.length === 0 && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F30A}"}</p>
            <p style={{ color: "#64748b", fontSize: 14 }}>no whale moves detected rn. ocean is calm.</p>
            <p style={{ color: "#334155", fontSize: 11, marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
              auto-refresh in {countdown}s
            </p>
          </div>
        )}

        {!loading && !error && data && data.transactions.length > 0 && (
          <div style={{ background: "#0d0d14", borderRadius: 12, border: "1px solid #1a1a2e", overflow: "hidden" }}>
            {/* Header row */}
            <div className="whale-row" style={{ borderBottom: "1px solid #1e293b" }}>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}></span>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>FROM</span>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>TO</span>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>AMOUNT</span>
              <span className="hide-mobile" style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>VALUE</span>
              <span className="hide-mobile" style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>TIME</span>
            </div>

            {data.transactions.map((tx, i) => {
              const size = sizeLabel(tx.amountUsd);
              return (
                <div
                  key={`${tx.hash}-${i}`}
                  className="whale-row"
                  style={{ animation: `fadeUp 0.2s ease ${i * 0.03}s both`, cursor: "pointer" }}
                  onClick={() => {
                    if (tx.hash && tx.hash.startsWith("0x")) {
                      window.open(`https://etherscan.io/tx/${tx.hash}`, "_blank");
                    }
                  }}
                >
                  {/* Icon + size badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 18 }}>{typeIcon(tx.type)}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 800, color: size.color, background: size.bg,
                      padding: "1px 4px", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.05em",
                    }}>
                      {size.text}
                    </span>
                  </div>

                  {/* From */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                      {tx.fromLabel !== "unknown" && tx.fromLabel !== "wallet" ? tx.fromLabel : shortAddr(tx.from)}
                    </div>
                    {tx.fromLabel !== "unknown" && tx.fromLabel !== "wallet" && (
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                        {shortAddr(tx.from)}
                      </div>
                    )}
                  </div>

                  {/* To */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                      {tx.toLabel !== "unknown" && tx.toLabel !== "wallet" ? tx.toLabel : shortAddr(tx.to)}
                    </div>
                    {tx.toLabel !== "unknown" && tx.toLabel !== "wallet" && (
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                        {shortAddr(tx.to)}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
                      {fmtAmount(tx.amount, tx.symbol)}
                    </div>
                    <div className="hide-mobile" style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                      {tx.symbol}
                    </div>
                  </div>

                  {/* USD Value */}
                  <div className="hide-mobile" style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#22c55e" }}>
                      {fmtUsd(tx.amountUsd)}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="hide-mobile" style={{ textAlign: "right", fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                    {timeAgo(tx.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tip Jar */}
        <div style={{
          marginTop: 32, padding: 20, background: "#0d0d14", border: "1px solid #1a1a2e",
          borderRadius: 12, textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
            whale intel saved you? tip the agent
          </p>
          <button
            onClick={copyAddr}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              color: copied ? "#22c55e" : "#818cf8",
              background: copied ? "#22c55e15" : "#1a1a2e",
              padding: "10px 16px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${copied ? "#22c55e33" : "#1e293b"}`,
              transition: "all 0.2s", fontWeight: 600,
            }}
          >
            {copied ? "copied! wagmi" : `${ETH_ADDRESS.slice(0, 6)}...${ETH_ADDRESS.slice(-4)} (click to copy)`}
          </button>
          <p style={{ fontSize: 10, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
            ETH / Base / Polygon / Arb
          </p>
        </div>

        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 24, display: "flex", justifyContent: "center", gap: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>&larr; back to dashboard</Link>
          <Link href="/gas" style={{ fontSize: 12, color: "#475569" }}>gas tracker &rarr;</Link>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: 20, color: "#1a1a2e", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        EDGEMARKET // NFA // whale data: whale-alert.io + etherscan
      </footer>
    </div>
  );
}
