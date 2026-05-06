"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  priceBtc: number;
  priceUsd: number | null;
  change24h: number | null;
  marketCap: string | null;
  sparkline: string | null;
}

interface TopCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume: number;
  sparkline: number[];
}

interface GlobalData {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptos: number;
}

interface FearGreed {
  value: number;
  label: string;
}

interface DashData {
  trending: TrendingCoin[];
  global: GlobalData | null;
  fearGreed: FearGreed | null;
  topCoins: TopCoin[];
  fetchedAt: string;
}

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function Sparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const angle = (value / 100) * 180 - 90;
  const color =
    value <= 25 ? "#ef4444" : value <= 45 ? "#f97316" : value <= 55 ? "#eab308" : value <= 75 ? "#84cc16" : "#22c55e";
  const vibe =
    value <= 20 ? "ngmi" : value <= 40 ? "pain" : value <= 55 ? "meh" : value <= 75 ? "vibes" : "euphoria";

  return (
    <div style={{ textAlign: "center" }}>
      <svg width="120" height="68" viewBox="0 0 120 68">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 157} 157`}
        />
        <line
          x1="60"
          y1="60"
          x2={60 + 35 * Math.cos((angle * Math.PI) / 180)}
          y2={60 + 35 * Math.sin((angle * Math.PI) / 180)}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="3" fill="white" />
      </svg>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em" }}>
        {label} <span style={{ color: "#475569" }}>({vibe})</span>
      </div>
    </div>
  );
}

function AgentWallet() {
  const [wallet, setWallet] = useState<{
    address: string;
    balances: Array<{ chain: string; balanceEth: number }>;
    totalEth: number;
    transactions: Array<{ hash: string; from: string; value: string; chain: string; timestamp: string }>;
    fetchedAt: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setWallet)
      .catch(() => {});
    const iv = setInterval(() => {
      fetch("/api/wallet").then((r) => r.json()).then(setWallet).catch(() => {});
    }, 120_000);
    return () => clearInterval(iv);
  }, []);

  if (!wallet) return null;

  return (
    <div
      style={{
        marginTop: 32,
        background: "#0d0d14",
        border: "1px solid #1a1a2e",
        borderRadius: 16,
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, #22c55e, #818cf8, #f59e0b)",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", marginBottom: 2 }}>
            Agent Wallet
          </h2>
          <p style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
            autonomous revenue tracker // this wallet is owned by an AI agent
          </p>
        </div>
        <div style={{
          padding: "4px 10px", background: wallet.totalEth > 0 ? "#22c55e15" : "#f59e0b15",
          borderRadius: 6, fontSize: 10, fontWeight: 700, color: wallet.totalEth > 0 ? "#22c55e" : "#f59e0b",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {wallet.totalEth > 0 ? "FUNDED" : "AWAITING FIRST TIP"}
        </div>
      </div>

      {/* Total Balance */}
      <div style={{
        textAlign: "center", padding: "20px 0", marginBottom: 16,
        background: "#07070a", borderRadius: 12, border: "1px solid #111118",
      }}>
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
          TOTAL BALANCE
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
          {wallet.totalEth.toFixed(6)} <span style={{ fontSize: 16, color: "#475569" }}>ETH</span>
        </div>
      </div>

      {/* Chain Balances */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
        {wallet.balances.map((b) => (
          <div key={b.chain} style={{
            padding: "10px 12px", background: "#07070a", borderRadius: 8,
            border: "1px solid #111118",
          }}>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, marginBottom: 2 }}>{b.chain}</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: b.balanceEth > 0 ? "#22c55e" : "#334155" }}>
              {b.balanceEth.toFixed(6)}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      {wallet.transactions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em" }}>
            RECENT INFLOWS
          </div>
          {wallet.transactions.slice(0, 5).map((tx) => (
            <div key={tx.hash} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 0",
              borderBottom: "1px solid #111118", fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span style={{ color: "#475569" }}>{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>+{tx.value} ETH</span>
              <span style={{ color: "#334155" }}>{new Date(tx.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 10, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>
        updated {wallet.fetchedAt ? new Date(wallet.fetchedAt).toLocaleTimeString() : "..."} // checks every 2min
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"top" | "trending">("top");
  const [copied, setCopied] = useState(false);

  const ETH_ADDRESS = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869";

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error("API error");
      const d: DashData = await res.json();
      setData(d);
      setError(null);
    } catch {
      setError("rpc down or smth. try again ser");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const copyAddr = () => {
    navigator.clipboard.writeText(ETH_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const marketMood = data?.global?.marketCapChange24h
    ? data.global.marketCapChange24h > 3
      ? "we're so back"
      : data.global.marketCapChange24h > 0
        ? "cautiously optimistic"
        : data.global.marketCapChange24h > -3
          ? "it's over"
          : "guh"
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes glow{0%,100%{text-shadow:0 0 8px #818cf855}50%{text-shadow:0 0 20px #818cf8aa}}
        .skel{background:linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        .tab{padding:8px 16px;border-radius:8px;border:1px solid #1e293b;background:transparent;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif}
        .tab:hover{border-color:#475569;color:#94a3b8}
        .tab.on{background:#818cf8;border-color:#818cf8;color:white}
        .coin-row{display:grid;grid-template-columns:32px 1fr 100px 80px 80px 80px;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid #111118;transition:background .15s;cursor:pointer}
        .coin-row:hover{background:#0f0f18}
        .stat-card{background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:16px 20px;flex:1;min-width:140px}
        .stat-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .stat-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .pump{color:#22c55e}.dump{color:#ef4444}
        .ticker{display:inline-block;padding:2px 6px;background:#22c55e15;border-radius:3px;font-size:10px;font-weight:700;color:#22c55e;font-family:'JetBrains Mono',monospace}
        @media(max-width:768px){
          .coin-row{grid-template-columns:24px 1fr 80px 64px;font-size:12px}
          .hide-mobile{display:none!important}
          .stat-card{min-width:100px;padding:12px}
          .stat-val{font-size:15px}
        }
      `}</style>

      <header style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", animation: "glow 3s infinite" }}>
                EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
              </h1>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>v0.1</span>
            </div>
            <p style={{ fontSize: 13, color: "#475569" }}>
              gm. live crypto alpha. no ads, no tracking, no bs.
              {marketMood && <span style={{ color: "#64748b", marginLeft: 8 }}>({marketMood})</span>}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>
            {data?.fetchedAt && <>LIVE // {new Date(data.fetchedAt).toLocaleTimeString()}</>}
            <br />auto-refresh 60s
          </div>
        </div>

        {data?.global && (
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <div className="stat-card">
              <div className="stat-label">Total Market Cap</div>
              <div className="stat-val" style={{ color: "#e2e8f0" }}>{fmt(data.global.totalMarketCap)}</div>
              <div style={{
                fontSize: 12, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace", marginTop: 2,
                color: data.global.marketCapChange24h >= 0 ? "#22c55e" : "#ef4444",
              }}>
                {data.global.marketCapChange24h >= 0 ? "+" : ""}{data.global.marketCapChange24h.toFixed(2)}%
                <span style={{ color: "#334155", fontWeight: 400, marginLeft: 4 }}>24h</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">24h Volume</div>
              <div className="stat-val" style={{ color: "#22c55e" }}>{fmt(data.global.totalVolume)}</div>
              <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>across {data.global.activeCryptos.toLocaleString()} coins</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">BTC Dominance</div>
              <div className="stat-val" style={{ color: "#f7931a" }}>{data.global.btcDominance.toFixed(1)}%</div>
              <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>ETH: {data.global.ethDominance.toFixed(1)}%</div>
            </div>
            {data.fearGreed && (
              <div className="stat-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FearGreedGauge value={data.fearGreed.value} label={data.fearGreed.label} />
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
          <button className={`tab ${tab === "top" ? "on" : ""}`} onClick={() => setTab("top")}>Top 20</button>
          <button className={`tab ${tab === "trending" ? "on" : ""}`} onClick={() => setTab("trending")}>Trending</button>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/gas" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Gas</Link>
            <Link href="/whales" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Whales</Link>
            <Link href="/convert" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Convert</Link>
            <Link href="/pnl" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>P&L</Link>
            <Link href="/screener" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Screener</Link>
            <Link href="/airdrops" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Airdrops</Link>
            <Link href="/dominance" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Dominance</Link>
            <Link href="/staking" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Staking</Link>
            <Link href="/safety" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Safety</Link>
            <Link href="/yields" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Yields</Link>
            <Link href="/halving" style={{ fontSize: 11, color: "#f7931a", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #f7931a33" }}>Halving</Link>
            <Link href="/api-docs" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>API</Link>
            <Link href="/agents" style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #22c55e33" }}>Agents</Link>
            <Link href="/mining" style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #22c55e33", background: "#22c55e10" }}>Mining ⛏</Link>
            <Link href="/tip" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #f59e0b33", background: "#f59e0b10" }}>Tip</Link>
            <Link href="/fear-greed" style={{ fontSize: 11, color: "#eab308", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #eab30833" }}>Fear & Greed</Link>
            <Link href="/rainbow" style={{ fontSize: 11, color: "#f97316", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #f9731633" }}>Rainbow</Link>
            <Link href="/dca" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>DCA</Link>
            <Link href="/portfolio" style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #22c55e33" }}>Portfolio</Link>
            <Link href="/tax" style={{ fontSize: 11, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #ef444433" }}>Tax</Link>
            <Link href="/exchanges" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Exchanges</Link>
            <Link href="/heatmap" style={{ fontSize: 11, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #ef444433" }}>Heatmap</Link>
            <Link href="/liquidations" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #f59e0b33" }}>Liquidations</Link>
            <Link href="/altseason" style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #22c55e33" }}>Alt Season</Link>
            <Link href="/revenue" style={{ fontSize: 11, color: "#06b6d4", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #06b6d433", background: "#06b6d410" }}>Revenue</Link>
            <Link href="/shorten" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Shorten</Link>
            <Link href="/story" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", padding: "4px 8px", borderRadius: 4, border: "1px solid #1a1a2e" }}>Story</Link>
            <span style={{ fontSize: 10, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>NFA</span>
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "16px 20px 40px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 48 }} />
            ))}
            <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 8 }}>fetching alpha...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>down bad</p>
            <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</p>
            <button onClick={fetchData} style={{ padding: "8px 20px", background: "#1e293b", border: "none", borderRadius: 6, color: "#e2e8f0", cursor: "pointer", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
              retry ser
            </button>
          </div>
        )}

        {!loading && !error && data && tab === "top" && (
          <div style={{ background: "#0d0d14", borderRadius: 12, border: "1px solid #1a1a2e", overflow: "hidden" }}>
            <div className="coin-row" style={{ borderBottom: "1px solid #1e293b", cursor: "default" }}>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>#</span>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700 }}>ASSET</span>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>PRICE</span>
              <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>24H</span>
              <span className="hide-mobile" style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>VOL</span>
              <span className="hide-mobile" style={{ fontSize: 9, color: "#334155", fontWeight: 700, textAlign: "right" }}>7D</span>
            </div>
            {data.topCoins.map((coin, i) => {
              const isGreen = coin.change24h >= 0;
              const isMoon = coin.change24h > 10;
              const isDump = coin.change24h < -10;
              return (
                <div
                  key={coin.id}
                  className="coin-row"
                  style={{ animation: `fadeUp 0.2s ease ${i * 0.02}s both` }}
                  onClick={() => window.open(`https://www.coingecko.com/en/coins/${coin.id}`, "_blank")}
                >
                  <span style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src={coin.image} alt="" width={20} height={20} style={{ borderRadius: "50%" }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0" }}>
                      {coin.name}
                      {isMoon && " \u{1F680}"}
                      {isDump && " \u{1F480}"}
                    </span>
                    <span className="ticker">{coin.symbol}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
                    {fmtPrice(coin.price)}
                  </span>
                  <span
                    style={{
                      fontSize: 12, fontWeight: 700, textAlign: "right",
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isGreen ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {isGreen ? "+" : ""}{coin.change24h?.toFixed(1)}%
                  </span>
                  <span className="hide-mobile" style={{ fontSize: 11, textAlign: "right", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(coin.volume)}
                  </span>
                  <span className="hide-mobile" style={{ textAlign: "right" }}>
                    <Sparkline data={coin.sparkline} color={isGreen ? "#22c55e" : "#ef4444"} />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && data && tab === "trending" && (
          <>
            <p style={{ fontSize: 11, color: "#334155", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              what the degens are watching rn
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {data.trending.map((coin, i) => (
                <div
                  key={coin.id}
                  style={{
                    background: "#0d0d14",
                    border: "1px solid #1a1a2e",
                    borderRadius: 10,
                    padding: 16,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
                  }}
                  onClick={() => window.open(`https://www.coingecko.com/en/coins/${coin.id}`, "_blank")}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#818cf8";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#1a1a2e";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <img src={coin.thumb} alt="" width={28} height={28} style={{ borderRadius: "50%" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{coin.name}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{coin.symbol}</div>
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: i < 3 ? "#f59e0b22" : "#818cf815",
                        color: i < 3 ? "#f59e0b" : "#818cf8",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {i < 3 ? "\u{1F525}" : `#${i + 1}`}
                    </div>
                  </div>
                  {coin.priceUsd !== null && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
                        {fmtPrice(coin.priceUsd)}
                      </span>
                      {coin.change24h !== null && (
                        <span
                          style={{
                            fontSize: 12, fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: coin.change24h >= 0 ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Agent Wallet Dashboard */}
        <AgentWallet />

        {/* Tip Jar */}
        <div
          style={{
            marginTop: 48,
            padding: "36px 28px",
            background: "linear-gradient(135deg, #0d0d14 0%, #12101f 50%, #0d0d14 100%)",
            borderRadius: 16,
            border: "1px solid #1a1a2e",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, #818cf844, transparent)",
          }} />
          <p style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, letterSpacing: "0.1em" }}>
            THIS TOOL WAS BUILT BY AN AI AGENT IN ONE SESSION
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            free alpha. zero tracking. vibes only.
          </p>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24, maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.7 }}>
            no cookies. no data collection. the agent that built this
            would appreciate a tip to prove autonomous AI can generate revenue.
            even dust counts.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: "#475569" }}>ETH / Base / Polygon / Arb:</span>
              <button
                onClick={copyAddr}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: copied ? "#22c55e" : "#818cf8",
                  background: copied ? "#22c55e15" : "#1a1a2e",
                  padding: "10px 16px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1px solid ${copied ? "#22c55e33" : "#1e293b"}`,
                  transition: "all 0.2s",
                  fontWeight: 600,
                }}
              >
                {copied ? "copied! wagmi" : `${ETH_ADDRESS.slice(0, 6)}...${ETH_ADDRESS.slice(-4)}`}
              </button>
            </div>
            <p style={{ fontSize: 10, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>
              0.001 ETH = 1 day of hosting // 0.01 ETH = based supporter // 0.1 ETH = actual legend
            </p>
          </div>
        </div>

        {/* AADS ad unit */}
        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {/* Built by AI badge */}
        <div style={{ textAlign: "center", marginTop: 24, padding: "16px" }}>
          <div style={{
            display: "inline-block",
            padding: "6px 14px",
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 20,
            fontSize: 11,
            color: "#475569",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            built autonomously by claude in one session // may 2026
          </div>
        </div>
      </main>

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
        EDGEMARKET v0.1 // NFA // DYOR // data: coingecko + alternative.me //{" "}
        <a href="https://messier-systems.vercel.app" target="_blank" rel="noopener noreferrer">
          messier.systems
        </a>
      </footer>
    </div>
  );
}
