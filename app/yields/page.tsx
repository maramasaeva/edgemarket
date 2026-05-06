"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────
interface YieldEntry {
  protocol: string;
  chain: string;
  asset: string;
  apy: number;
  apyDisplay: string;
  type: string;
  tvl: number;
  tvlDisplay: string;
  risk: "Low" | "Medium" | "High";
}

// ── Static yield data ──────────────────────────────────────────────
const YIELDS: YieldEntry[] = [
  { protocol: "Lido", chain: "Ethereum", asset: "stETH", apy: 3.4, apyDisplay: "3.4%", type: "Liquid Staking", tvl: 14e9, tvlDisplay: "$14B", risk: "Low" },
  { protocol: "Rocket Pool", chain: "Ethereum", asset: "rETH", apy: 3.1, apyDisplay: "3.1%", type: "Liquid Staking", tvl: 3.5e9, tvlDisplay: "$3.5B", risk: "Low" },
  { protocol: "Aave V3", chain: "Ethereum", asset: "USDC", apy: 4.2, apyDisplay: "4.2%", type: "Lending", tvl: 8e9, tvlDisplay: "$8B", risk: "Medium" },
  { protocol: "Aave V3", chain: "Ethereum", asset: "USDT", apy: 3.8, apyDisplay: "3.8%", type: "Lending", tvl: 8e9, tvlDisplay: "$8B", risk: "Medium" },
  { protocol: "Compound V3", chain: "Ethereum", asset: "USDC", apy: 3.9, apyDisplay: "3.9%", type: "Lending", tvl: 2.5e9, tvlDisplay: "$2.5B", risk: "Medium" },
  { protocol: "MakerDAO", chain: "Ethereum", asset: "DAI (sDAI)", apy: 5.0, apyDisplay: "5.0%", type: "Savings", tvl: 5e9, tvlDisplay: "$5B", risk: "Low" },
  { protocol: "Jito", chain: "Solana", asset: "jitoSOL", apy: 7.2, apyDisplay: "7.2%", type: "Liquid Staking", tvl: 2e9, tvlDisplay: "$2B", risk: "Low" },
  { protocol: "Marinade", chain: "Solana", asset: "mSOL", apy: 6.8, apyDisplay: "6.8%", type: "Liquid Staking", tvl: 1.5e9, tvlDisplay: "$1.5B", risk: "Low" },
  { protocol: "Convex", chain: "Ethereum", asset: "Various", apy: 10, apyDisplay: "5-15%", type: "Curve LP", tvl: 3e9, tvlDisplay: "$3B", risk: "High" },
  { protocol: "Pendle", chain: "Multi", asset: "Various", apy: 16.5, apyDisplay: "8-25%", type: "Yield Trading", tvl: 2e9, tvlDisplay: "$2B", risk: "High" },
  { protocol: "Ethena", chain: "Ethereum", asset: "USDe", apy: 15, apyDisplay: "15%", type: "Synthetic Dollar", tvl: 3e9, tvlDisplay: "$3B", risk: "High" },
  { protocol: "Morpho", chain: "Ethereum", asset: "USDC", apy: 5.5, apyDisplay: "5.5%", type: "Lending", tvl: 1.5e9, tvlDisplay: "$1.5B", risk: "Medium" },
];

// ── Filter definitions ─────────────────────────────────────────────
type FilterKey = "all" | "staking" | "lending" | "stablecoins" | "high";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "staking", label: "Staking" },
  { key: "lending", label: "Lending" },
  { key: "stablecoins", label: "Stablecoins" },
  { key: "high", label: "High APY (>10%)" },
];

// ── Sort definitions ───────────────────────────────────────────────
type SortKey = "apy" | "tvl" | "protocol";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "apy", label: "APY" },
  { key: "tvl", label: "TVL" },
  { key: "protocol", label: "Protocol" },
];

// ── Risk badge component ───────────────────────────────────────────
function RiskBadge({ risk }: { risk: "Low" | "Medium" | "High" }) {
  const config = {
    Low: { color: "#22c55e", bg: "#22c55e15", border: "#22c55e33" },
    Medium: { color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b33" },
    High: { color: "#ef4444", bg: "#ef444415", border: "#ef444433" },
  }[risk];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.04em",
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      {risk}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function YieldsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("apy");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  const filtered = useMemo(() => {
    let items = [...YIELDS];

    // Apply filter
    switch (activeFilter) {
      case "staking":
        items = items.filter((y) => y.type.toLowerCase().includes("staking"));
        break;
      case "lending":
        items = items.filter((y) => y.type === "Lending" || y.type === "Savings");
        break;
      case "stablecoins":
        items = items.filter((y) =>
          ["USDC", "USDT", "DAI (sDAI)", "USDe"].includes(y.asset)
        );
        break;
      case "high":
        items = items.filter((y) => y.apy > 10);
        break;
    }

    // Apply sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "apy":
          cmp = a.apy - b.apy;
          break;
        case "tvl":
          cmp = a.tvl - b.tvl;
          break;
        case "protocol":
          cmp = a.protocol.localeCompare(b.protocol);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return items;
  }, [activeFilter, sortBy, sortAsc]);

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
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .nav-link{
          font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;
          text-decoration:none;padding:4px 8px;border-radius:4px;border:1px solid #1a1a2e;
        }
        .nav-link:hover{border-color:#475569;color:#94a3b8;text-decoration:none}
        .filter-chip{
          padding:6px 14px;border-radius:20px;border:1px solid #1a1a2e;background:transparent;
          color:#64748b;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;
          font-family:'Inter',sans-serif;
        }
        .filter-chip:hover{border-color:#475569;color:#94a3b8}
        .filter-chip.active{background:#818cf8;border-color:#818cf8;color:white}
        .sort-btn{
          padding:5px 12px;border-radius:6px;border:1px solid #1a1a2e;background:transparent;
          color:#64748b;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;
          font-family:'JetBrains Mono',monospace;display:inline-flex;align-items:center;gap:4px;
        }
        .sort-btn:hover{border-color:#475569;color:#94a3b8}
        .sort-btn.active{border-color:#818cf8;color:#818cf8}
        .yield-row{
          display:grid;
          grid-template-columns:1.4fr 0.8fr 0.8fr 0.7fr 1fr 0.7fr 0.6fr;
          gap:12px;align-items:center;padding:14px 20px;
          border-bottom:1px solid #111118;transition:background .15s;
        }
        .yield-row:hover{background:#0f0f18}
        .yield-header{
          display:grid;
          grid-template-columns:1.4fr 0.8fr 0.8fr 0.7fr 1fr 0.7fr 0.6fr;
          gap:12px;align-items:center;padding:10px 20px;
          border-bottom:1px solid #1e293b;cursor:default;
        }
        @media(max-width:768px){
          .yield-row,.yield-header{
            grid-template-columns:1.2fr 0.8fr 0.7fr 0.6fr;
          }
          .hide-mobile{display:none!important}
          .filter-chips{flex-wrap:wrap}
        }
      `}</style>

      {/* Header */}
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
              defi yield comparison // staking, lending, farming APYs across protocols
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
            <Link href="/tip" className="nav-link" style={{ color: "#f59e0b", borderColor: "#f59e0b33" }}>
              Tip
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Page Title Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #0d0d14 0%, #12101f 40%, #0d0d14 100%)",
            borderRadius: 16,
            border: "1px solid #1a1a2e",
            padding: "28px 24px",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
            animation: "fadeUp 0.4s ease both",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, #22c55e, #818cf8, #f59e0b)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  background: "#22c55e15",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#22c55e",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                DEFI YIELDS
              </div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  marginBottom: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                Yield Comparison
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  lineHeight: 1.6,
                  maxWidth: 500,
                }}
              >
                Compare staking, lending, and farming yields across top DeFi protocols.
                Sort by APY, TVL, or protocol to find the best risk-adjusted returns.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {/* Summary Stats */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "#07070a",
                  borderRadius: 10,
                  border: "1px solid #111118",
                  textAlign: "center",
                  minWidth: 90,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#475569",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  PROTOCOLS
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#818cf8",
                  }}
                >
                  {new Set(YIELDS.map((y) => y.protocol)).size}
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#07070a",
                  borderRadius: 10,
                  border: "1px solid #111118",
                  textAlign: "center",
                  minWidth: 90,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#475569",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  AVG APY
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#22c55e",
                  }}
                >
                  {(YIELDS.reduce((s, y) => s + y.apy, 0) / YIELDS.length).toFixed(1)}%
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#07070a",
                  borderRadius: 10,
                  border: "1px solid #111118",
                  textAlign: "center",
                  minWidth: 90,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#475569",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  MAX APY
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#f59e0b",
                  }}
                >
                  {Math.max(...YIELDS.map((y) => y.apy))}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
            animation: "fadeUp 0.4s ease 0.05s both",
          }}
        >
          <div className="filter-chips" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              style={{
                fontSize: 10,
                color: "#334155",
                fontFamily: "'JetBrains Mono', monospace",
                marginRight: 4,
              }}
            >
              SORT:
            </span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                className={`sort-btn ${sortBy === s.key ? "active" : ""}`}
                onClick={() => handleSort(s.key)}
              >
                {s.label}
                {sortBy === s.key && (
                  <span style={{ fontSize: 10 }}>{sortAsc ? "↑" : "↓"}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Yields Table */}
        <div
          style={{
            background: "#0d0d14",
            borderRadius: 12,
            border: "1px solid #1a1a2e",
            overflow: "hidden",
            animation: "fadeUp 0.4s ease 0.1s both",
          }}
        >
          {/* Table Header */}
          <div className="yield-header">
            <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.08em" }}>
              PROTOCOL
            </span>
            <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.08em" }}>
              CHAIN
            </span>
            <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.08em" }}>
              ASSET
            </span>
            <span style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.08em", textAlign: "right" }}>
              APY
            </span>
            <span className="hide-mobile" style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.08em" }}>
              TYPE
            </span>
            <span className="hide-mobile" style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.08em", textAlign: "right" }}>
              TVL
            </span>
            <span className="hide-mobile" style={{ fontSize: 9, color: "#334155", fontWeight: 700, letterSpacing: "0.08em", textAlign: "center" }}>
              RISK
            </span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#334155",
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              no yields match this filter
            </div>
          ) : (
            filtered.map((y, i) => {
              const apyColor =
                y.apy >= 10 ? "#f59e0b" : y.apy >= 5 ? "#22c55e" : "#818cf8";

              return (
                <div
                  key={`${y.protocol}-${y.asset}`}
                  className="yield-row"
                  style={{
                    animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                  }}
                >
                  {/* Protocol */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#e2e8f0",
                      }}
                    >
                      {y.protocol}
                    </span>
                  </div>

                  {/* Chain */}
                  <span
                    style={{
                      fontSize: 12,
                      color: y.chain === "Solana" ? "#9945ff" : y.chain === "Multi" ? "#818cf8" : "#627eea",
                      fontWeight: 600,
                    }}
                  >
                    {y.chain}
                  </span>

                  {/* Asset */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 6px",
                      background: "#22c55e15",
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#22c55e",
                      fontFamily: "'JetBrains Mono', monospace",
                      width: "fit-content",
                    }}
                  >
                    {y.asset}
                  </span>

                  {/* APY */}
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: apyColor,
                      }}
                    >
                      {y.apyDisplay}
                    </span>
                  </div>

                  {/* Type */}
                  <span
                    className="hide-mobile"
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    {y.type}
                  </span>

                  {/* TVL */}
                  <span
                    className="hide-mobile"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "#94a3b8",
                      textAlign: "right",
                    }}
                  >
                    {y.tvlDisplay}
                  </span>

                  {/* Risk */}
                  <span className="hide-mobile" style={{ textAlign: "center" }}>
                    <RiskBadge risk={y.risk} />
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Risk Legend */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 16,
            flexWrap: "wrap",
            alignItems: "center",
            animation: "fadeUp 0.4s ease 0.15s both",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#334155",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.08em",
            }}
          >
            RISK LEGEND:
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <RiskBadge risk="Low" />
            <span style={{ fontSize: 10, color: "#475569" }}>Staking / Savings</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <RiskBadge risk="Medium" />
            <span style={{ fontSize: 10, color: "#475569" }}>Lending</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <RiskBadge risk="High" />
            <span style={{ fontSize: 10, color: "#475569" }}>Yield Farming / Synthetic</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          style={{
            marginTop: 24,
            padding: "14px 20px",
            background: "#0d0d14",
            borderRadius: 10,
            border: "1px solid #1a1a2e",
            animation: "fadeUp 0.4s ease 0.2s both",
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "#475569",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            rates are approximate and change constantly. always verify current APYs on the protocol
            directly before depositing. higher APY = higher risk. this is not financial advice. NFA // DYOR.
          </p>
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
        <div style={{ textAlign: "center", marginTop: 16, padding: "16px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              background: "#0d0d14",
              border: "1px solid #1a1a2e",
              borderRadius: 20,
              fontSize: 11,
              color: "#475569",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
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
        EDGEMARKET v0.1 // NFA // DYOR // data: approximate rates //{" "}
        <Link href="/">dashboard</Link> //{" "}
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
