"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  marketCap: number;
  volume: number;
  change1h: number;
  change24h: number;
  change7d: number;
  rank: number;
}

interface ScreenerData {
  coins: Coin[];
  fetchedAt: string;
}

type SortKey = "rank" | "name" | "price" | "change1h" | "change24h" | "change7d" | "marketCap" | "volume";
type SortDir = "asc" | "desc";
type FilterChip = "gainers24h" | "losers24h" | "highVolume" | "under1" | "under001" | null;

function fmtPrice(n: number): string {
  if (n >= 1) return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

function fmtCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pctColor(n: number): string {
  if (n > 0) return "#22c55e";
  if (n < 0) return "#ef4444";
  return "#64748b";
}

const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: "gainers24h", label: "Top Gainers 24h" },
  { key: "losers24h", label: "Top Losers 24h" },
  { key: "highVolume", label: "High Volume" },
  { key: "under1", label: "Under $1" },
  { key: "under001", label: "Under $0.01" },
];

const SORT_COLUMNS: { key: SortKey; label: string; mobileHide?: boolean }[] = [
  { key: "rank", label: "#" },
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
  { key: "change1h", label: "1h%", mobileHide: true },
  { key: "change24h", label: "24h%" },
  { key: "change7d", label: "7d%", mobileHide: true },
  { key: "marketCap", label: "Market Cap", mobileHide: true },
  { key: "volume", label: "Volume", mobileHide: true },
];

export default function ScreenerPage() {
  const [data, setData] = useState<ScreenerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeFilter, setActiveFilter] = useState<FilterChip>(null);
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/screener");
      if (!res.ok) throw new Error("API error");
      const d: ScreenerData = await res.json();
      setData(d);
      setError(null);
      setCountdown(60);
    } catch {
      setError("market data unavailable. try again ser");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 60 : c - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const handleFilter = (key: FilterChip) => {
    setActiveFilter((prev) => (prev === key ? null : key));
  };

  const filteredCoins = useMemo(() => {
    if (!data) return [];
    let coins = [...data.coins];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      coins = coins.filter(
        (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      );
    }

    // Chip filters
    if (activeFilter === "gainers24h") {
      coins = coins.filter((c) => c.change24h > 0).sort((a, b) => b.change24h - a.change24h);
    } else if (activeFilter === "losers24h") {
      coins = coins.filter((c) => c.change24h < 0).sort((a, b) => a.change24h - b.change24h);
    } else if (activeFilter === "highVolume") {
      coins = coins.sort((a, b) => b.volume - a.volume);
    } else if (activeFilter === "under1") {
      coins = coins.filter((c) => c.price < 1);
    } else if (activeFilter === "under001") {
      coins = coins.filter((c) => c.price < 0.01);
    }

    // Sort
    coins.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case "rank": aVal = a.rank; bVal = b.rank; break;
        case "name": aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case "price": aVal = a.price; bVal = b.price; break;
        case "change1h": aVal = a.change1h; bVal = b.change1h; break;
        case "change24h": aVal = a.change24h; bVal = b.change24h; break;
        case "change7d": aVal = a.change7d; bVal = b.change7d; break;
        case "marketCap": aVal = a.marketCap; bVal = b.marketCap; break;
        case "volume": aVal = a.volume; bVal = b.volume; break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return coins;
  }, [data, search, sortKey, sortDir, activeFilter]);

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .skel{background:linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        .screener-row{
          display:grid;
          grid-template-columns:40px 1.8fr 100px 72px 72px 72px 110px 100px;
          gap:8px;align-items:center;padding:12px 16px;
          border-bottom:1px solid #111118;transition:background .15s;cursor:pointer;
          text-decoration:none;color:inherit;
        }
        .screener-row:hover{background:#0f0f18;text-decoration:none}
        .screener-header{cursor:pointer;user-select:none}
        .screener-header:hover{color:#e2e8f0}
        .chip{
          padding:6px 14px;border-radius:20px;border:1px solid #1a1a2e;
          background:transparent;color:#64748b;font-size:12px;font-weight:600;
          cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;
          white-space:nowrap;
        }
        .chip:hover{border-color:#475569;color:#94a3b8}
        .chip.active{border-color:#818cf8;color:#818cf8;background:#818cf815}
        .search-input{
          width:100%;padding:10px 16px 10px 40px;background:#0d0d14;
          border:1px solid #1a1a2e;border-radius:10px;color:#e2e8f0;
          font-size:14px;font-family:'Inter',sans-serif;outline:none;
          transition:border-color .15s;
        }
        .search-input:focus{border-color:#818cf8}
        .search-input::placeholder{color:#334155}
        .nav-link{
          font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;
          text-decoration:none;padding:4px 8px;border-radius:4px;border:1px solid #1a1a2e;
        }
        .nav-link:hover{border-color:#475569;color:#94a3b8;text-decoration:none}
        @media(max-width:768px){
          .screener-row{grid-template-columns:32px 1.4fr 80px 64px;font-size:12px}
          .hide-mobile{display:none!important}
          .chip{font-size:11px;padding:5px 10px}
        }
      `}</style>

      <header style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.04em", textDecoration: "none" }}>
              EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Screener</span>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
              refresh in {countdown}s
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/gas" className="nav-link">Gas</Link>
            <Link href="/whales" className="nav-link">Whales</Link>
            <Link href="/tip" className="nav-link">Tip</Link>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#475569" }}>
          top 100 coins by market cap. filter, sort, find your next play ser.
        </p>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 16, color: "#334155", pointerEvents: "none",
          }}>
            {"\u{1F50D}"}
          </div>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              className={`chip ${activeFilter === chip.key ? "active" : ""}`}
              onClick={() => handleFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
          {(activeFilter || search) && (
            <button
              className="chip"
              style={{ color: "#ef4444", borderColor: "#ef444433" }}
              onClick={() => { setActiveFilter(null); setSearch(""); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats bar */}
        {data && (
          <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#475569" }}>
            <span>Showing {filteredCoins.length} of {data.coins.length} coins</span>
            <span>Updated: {new Date(data.fetchedAt).toLocaleTimeString()}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="skel" style={{ height: 44 }} />
            ))}
            <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 8 }}>loading market data...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F4C9}"}</p>
            <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</p>
            <button
              onClick={fetchData}
              style={{
                padding: "8px 20px", background: "#1e293b", border: "none", borderRadius: 6,
                color: "#e2e8f0", cursor: "pointer", fontSize: 13, fontFamily: "'Inter', sans-serif",
              }}
            >
              retry ser
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && data && (
          <div style={{ background: "#0d0d14", borderRadius: 12, border: "1px solid #1a1a2e", overflow: "hidden" }}>
            {/* Header */}
            <div className="screener-row" style={{ borderBottom: "1px solid #1e293b", cursor: "default" }}>
              {SORT_COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={`screener-header ${col.mobileHide ? "hide-mobile" : ""}`}
                  style={{
                    fontSize: 10, color: sortKey === col.key ? "#818cf8" : "#334155",
                    fontWeight: 700, textAlign: col.key === "name" ? "left" : "right",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{sortArrow(col.key)}
                </div>
              ))}
            </div>

            {/* Rows */}
            {filteredCoins.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: "#475569", fontSize: 13 }}>
                no coins match your filters
              </div>
            )}

            {filteredCoins.map((coin) => (
              <a
                key={coin.id}
                href={`https://www.coingecko.com/en/coins/${coin.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="screener-row"
              >
                {/* Rank */}
                <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
                  {coin.rank}
                </div>

                {/* Name + Symbol */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coin.image}
                    alt={coin.symbol}
                    width={24}
                    height={24}
                    style={{ borderRadius: "50%", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {coin.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                      {coin.symbol}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                  {fmtPrice(coin.price)}
                </div>

                {/* 1h% */}
                <div className="hide-mobile" style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: pctColor(coin.change1h) }}>
                  {fmtPct(coin.change1h)}
                </div>

                {/* 24h% */}
                <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: pctColor(coin.change24h) }}>
                  {fmtPct(coin.change24h)}
                </div>

                {/* 7d% */}
                <div className="hide-mobile" style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: pctColor(coin.change7d) }}>
                  {fmtPct(coin.change7d)}
                </div>

                {/* Market Cap */}
                <div className="hide-mobile" style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#94a3b8" }}>
                  {fmtCompact(coin.marketCap)}
                </div>

                {/* Volume */}
                <div className="hide-mobile" style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748b" }}>
                  {fmtCompact(coin.volume)}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* AADS Ad Unit */}
        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {/* Navigation */}
        <div style={{ textAlign: "center", marginTop: 24, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>&larr; back to dashboard</Link>
          <Link href="/gas" style={{ fontSize: 12, color: "#475569" }}>gas tracker</Link>
          <Link href="/whales" style={{ fontSize: 12, color: "#475569" }}>whale alerts</Link>
          <Link href="/tip" style={{ fontSize: 12, color: "#475569" }}>tip the agent</Link>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: 20, color: "#1a1a2e", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        EDGEMARKET // NFA // market data from coingecko
      </footer>
    </div>
  );
}
