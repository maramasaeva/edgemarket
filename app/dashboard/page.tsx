"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────

interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  leverage: { type: string; value: number };
  liquidationPx: string | null;
  returnOnEquity: string;
}

interface ClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  assetPositions: { position: Position }[];
  crossMaintenanceMarginUsed: string;
}

interface Trade {
  ts: number;
  coin: string;
  side: string;
  size_usd: number;
  price: number;
  fee: number;
  oid: string;
  closedPnl: number;
}

interface AssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string;
  oraclePx: string;
  markPx: string;
}

interface MetaAndAssetCtxs {
  universe: { name: string; szDecimals: number }[];
  assetCtxs?: AssetCtx[];
}

interface EdgeEntry {
  coin: string;
  midPx: number;
  oraclePx: number;
  edgeBps: number;
  funding8h: number;
  dayVolume: number;
}

// ─── Helpers ─────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtUsd(n: number, decimals = 2): string {
  return "$" + fmt(n, decimals);
}

function pnlColor(n: number): string {
  if (n > 0) return "#22c55e";
  if (n < 0) return "#ef4444";
  return "#a1a1aa";
}

function timeSince(ts: number | string): string {
  const diff = Date.now() - (typeof ts === "number" ? ts : new Date(ts).getTime());
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── API helpers ─────────────────────────────────────────

async function fetchHL(type: string) {
  const res = await fetch("/api/hl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) throw new Error(`HL API error: ${res.status}`);
  return res.json();
}

async function fetchTrades(): Promise<Trade[]> {
  const res = await fetch("/api/trades");
  if (!res.ok) return [];
  const data = await res.json();
  return data.trades ?? [];
}

// ─── Tracked assets (match the bot config) ───────────────
const TRACKED = ["SOL", "TON", "DOGE", "PUMP", "kPEPE", "BTC", "ETH", "FARTCOIN", "WIF", "TRUMP", "HYPE", "SUI", "NEAR", "ENA", "ONDO", "PENGU", "VIRTUAL", "XRP"];

// ─── Component ───────────────────────────────────────────

export default function Dashboard() {
  const [state, setState] = useState<ClearinghouseState | null>(null);
  const [mids, setMids] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<MetaAndAssetCtxs | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [edges, setEdges] = useState<EdgeEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [chState, allMids, metaData, tradeData] = await Promise.all([
        fetchHL("clearinghouseState"),
        fetchHL("allMids"),
        fetchHL("metaAndAssetCtxs"),
        fetchTrades(),
      ]);

      setState(chState);
      setMids(allMids);
      setTrades(tradeData);
      setLastUpdate(new Date());
      setError(null);

      // Parse meta — API returns [meta, assetCtxs] as array
      const metaObj: MetaAndAssetCtxs = Array.isArray(metaData)
        ? { universe: metaData[0]?.universe ?? [], assetCtxs: metaData[1] }
        : metaData;
      setMeta(metaObj);

      // Compute edges for tracked assets
      const edgeList: EdgeEntry[] = [];
      if (metaObj.universe && metaObj.assetCtxs) {
        for (let i = 0; i < metaObj.universe.length; i++) {
          const name = metaObj.universe[i].name;
          if (!TRACKED.includes(name)) continue;
          const ctx = metaObj.assetCtxs[i];
          if (!ctx) continue;
          const midStr = allMids[name];
          if (!midStr) continue;

          const midPx = parseFloat(midStr);
          const oraclePx = parseFloat(ctx.oraclePx);
          const edgeBps =
            oraclePx > 0
              ? Math.abs(((midPx - oraclePx) / oraclePx) * 10000)
              : 0;
          const funding8h = parseFloat(ctx.funding) * 100;
          const dayVolume = parseFloat(ctx.dayNtlVlm);

          edgeList.push({ coin: name, midPx, oraclePx, edgeBps, funding8h, dayVolume });
        }
      }
      edgeList.sort((a, b) => b.edgeBps - a.edgeBps);
      setEdges(edgeList);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Derived values
  const equity = state
    ? parseFloat(state.marginSummary.accountValue)
    : 0;
  const totalNtl = state
    ? parseFloat(state.marginSummary.totalNtlPos)
    : 0;
  const marginUsed = state
    ? parseFloat(state.marginSummary.totalMarginUsed)
    : 0;
  const positions = state?.assetPositions?.map((a) => a.position) ?? [];
  const totalUnrealizedPnl = positions.reduce(
    (sum, p) => sum + parseFloat(p.unrealizedPnl),
    0
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/" style={styles.backLink}>
            &larr;
          </Link>
          <h1 style={styles.title}>HYPERLIQUID DASHBOARD</h1>
          <span style={styles.badge}>LIVE</span>
        </div>
        <div style={styles.headerRight}>
          {lastUpdate && (
            <span style={styles.timestamp}>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          {error && <span style={styles.errorBadge}>ERR</span>}
        </div>
      </header>

      {/* Equity Bar */}
      <section style={styles.equityBar}>
        <div style={styles.equityStat}>
          <span style={styles.statLabel}>EQUITY</span>
          <span style={styles.statValueLarge}>{fmtUsd(equity)}</span>
        </div>
        <div style={styles.equityStat}>
          <span style={styles.statLabel}>UNREALIZED P&L</span>
          <span
            style={{
              ...styles.statValueLarge,
              color: pnlColor(totalUnrealizedPnl),
            }}
          >
            {totalUnrealizedPnl >= 0 ? "+" : ""}
            {fmtUsd(totalUnrealizedPnl, 4)}
          </span>
        </div>
        <div style={styles.equityStat}>
          <span style={styles.statLabel}>NOTIONAL</span>
          <span style={styles.statValue}>{fmtUsd(totalNtl)}</span>
        </div>
        <div style={styles.equityStat}>
          <span style={styles.statLabel}>MARGIN USED</span>
          <span style={styles.statValue}>{fmtUsd(marginUsed)}</span>
        </div>
        <div style={styles.equityStat}>
          <span style={styles.statLabel}>POSITIONS</span>
          <span style={styles.statValue}>{positions.length}</span>
        </div>
      </section>

      {/* Main Grid */}
      <div style={styles.grid}>
        {/* Open Positions */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>OPEN POSITIONS</h2>
          {positions.length === 0 ? (
            <p style={styles.empty}>No open positions</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>COIN</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>SIZE</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>ENTRY</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>MARK</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>uPnL</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>ROE</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>LEV</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>LIQ</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const upnl = parseFloat(p.unrealizedPnl);
                    const roe = parseFloat(p.returnOnEquity) * 100;
                    const size = parseFloat(p.szi);
                    const isShort = size < 0;
                    const mid = mids[p.coin]
                      ? parseFloat(mids[p.coin])
                      : null;

                    return (
                      <tr key={p.coin} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.coinName}>{p.coin}</span>
                          <span
                            style={{
                              ...styles.sideBadge,
                              backgroundColor: isShort
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(34,197,94,0.15)",
                              color: isShort ? "#ef4444" : "#22c55e",
                            }}
                          >
                            {isShort ? "SHORT" : "LONG"}
                          </span>
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {fmt(Math.abs(size), 4)}
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {fmtUsd(parseFloat(p.entryPx), 4)}
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {mid !== null ? fmtUsd(mid, 4) : "—"}
                        </td>
                        <td
                          style={{
                            ...styles.tdMono,
                            textAlign: "right",
                            color: pnlColor(upnl),
                          }}
                        >
                          {upnl >= 0 ? "+" : ""}
                          {fmtUsd(upnl, 4)}
                        </td>
                        <td
                          style={{
                            ...styles.tdMono,
                            textAlign: "right",
                            color: pnlColor(roe),
                          }}
                        >
                          {roe >= 0 ? "+" : ""}
                          {fmt(roe, 2)}%
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {p.leverage.value}x
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {p.liquidationPx
                            ? fmtUsd(parseFloat(p.liquidationPx), 2)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Edge Scanner */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>EDGE SCANNER</h2>
          <p style={styles.cardSubtitle}>Mid vs Oracle spread across tracked assets</p>
          {edges.length === 0 ? (
            <p style={styles.empty}>Loading edges...</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>COIN</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>MID</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>ORACLE</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>EDGE (bps)</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>FUNDING (8h)</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>24h VOL</th>
                  </tr>
                </thead>
                <tbody>
                  {edges.map((e) => {
                    const isHot = e.edgeBps >= 12;
                    return (
                      <tr key={e.coin} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.coinName}>{e.coin}</span>
                          {isHot && <span style={styles.hotBadge}>HOT</span>}
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {fmtUsd(e.midPx, e.midPx < 1 ? 6 : 2)}
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {fmtUsd(e.oraclePx, e.oraclePx < 1 ? 6 : 2)}
                        </td>
                        <td
                          style={{
                            ...styles.tdMono,
                            textAlign: "right",
                            color: isHot ? "#f59e0b" : "#a1a1aa",
                            fontWeight: isHot ? 600 : 400,
                          }}
                        >
                          {fmt(e.edgeBps, 1)}
                        </td>
                        <td
                          style={{
                            ...styles.tdMono,
                            textAlign: "right",
                            color: pnlColor(-e.funding8h),
                          }}
                        >
                          {e.funding8h >= 0 ? "+" : ""}
                          {fmt(e.funding8h, 4)}%
                        </td>
                        <td style={{ ...styles.tdMono, textAlign: "right" }}>
                          {e.dayVolume >= 1_000_000
                            ? `$${fmt(e.dayVolume / 1_000_000, 1)}M`
                            : `$${fmt(e.dayVolume / 1_000, 0)}K`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Trade History */}
      <section style={{ ...styles.card, marginTop: 16 }}>
        <h2 style={styles.cardTitle}>TRADE HISTORY</h2>
        <p style={styles.cardSubtitle}>Hyperliquid fills ({trades.length} trades)</p>
        {trades.length === 0 ? (
          <p style={styles.empty}>No trades logged yet</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>TIME</th>
                  <th style={styles.th}>COIN</th>
                  <th style={styles.th}>SIDE</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>SIZE</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>PRICE</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>FEE</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.monoSmall} title={String(t.ts)}>
                        {timeSince(t.ts)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.coinName}>{t.coin}</span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.sideBadge,
                          backgroundColor:
                            t.side === "short"
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(34,197,94,0.15)",
                          color:
                            t.side === "short" ? "#ef4444" : "#22c55e",
                        }}
                      >
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...styles.tdMono, textAlign: "right" }}>
                      {fmtUsd(t.size_usd, 2)}
                    </td>
                    <td style={{ ...styles.tdMono, textAlign: "right" }}>
                      {fmtUsd(t.price, t.price < 1 ? 6 : 4)}
                    </td>
                    <td style={{ ...styles.tdMono, textAlign: "right", color: "#71717a" }}>
                      {fmtUsd(t.fee, 4)}
                    </td>
                    <td
                      style={{
                        ...styles.tdMono,
                        textAlign: "right",
                        color: pnlColor(t.closedPnl),
                        fontWeight: t.closedPnl !== 0 ? 600 : 400,
                      }}
                    >
                      {t.closedPnl !== 0
                        ? `${t.closedPnl >= 0 ? "+" : ""}${fmtUsd(t.closedPnl, 4)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>EDGEMARKET v3 — Hyperliquid Monitor</span>
        <span style={styles.footerWallet}>
          {`0x32e3...Fe869`}
        </span>
      </footer>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────

const mono = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";
const sans = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    color: "#e4e4e7",
    fontFamily: sans,
    padding: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderBottom: "1px solid #1e1e1e",
    paddingBottom: 16,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  backLink: {
    color: "#71717a",
    textDecoration: "none",
    fontSize: 20,
    lineHeight: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: mono,
    letterSpacing: "0.1em",
    color: "#fafafa",
    margin: 0,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: mono,
    letterSpacing: "0.05em",
    color: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.1)",
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid rgba(34,197,94,0.25)",
  },
  timestamp: {
    fontSize: 12,
    fontFamily: mono,
    color: "#52525b",
  },
  errorBadge: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: mono,
    color: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid rgba(239,68,68,0.25)",
  },
  equityBar: {
    display: "flex",
    gap: 32,
    flexWrap: "wrap" as const,
    backgroundColor: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: 8,
    padding: "20px 24px",
    marginBottom: 16,
  },
  equityStat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 500,
    fontFamily: mono,
    letterSpacing: "0.08em",
    color: "#52525b",
    textTransform: "uppercase" as const,
  },
  statValueLarge: {
    fontSize: 24,
    fontWeight: 600,
    fontFamily: mono,
    color: "#fafafa",
  },
  statValue: {
    fontSize: 18,
    fontWeight: 500,
    fontFamily: mono,
    color: "#a1a1aa",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  card: {
    backgroundColor: "#111111",
    border: "1px solid #1e1e1e",
    borderRadius: 8,
    padding: "20px",
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: mono,
    letterSpacing: "0.08em",
    color: "#a1a1aa",
    margin: "0 0 4px 0",
    textTransform: "uppercase" as const,
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: mono,
    color: "#3f3f46",
    margin: "0 0 16px 0",
  },
  empty: {
    fontSize: 13,
    fontFamily: mono,
    color: "#3f3f46",
    textAlign: "center" as const,
    padding: "32px 0",
    margin: 0,
  },
  tableWrap: {
    overflowX: "auto" as const,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
  },
  th: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: mono,
    letterSpacing: "0.06em",
    color: "#52525b",
    textAlign: "left" as const,
    padding: "8px 12px",
    borderBottom: "1px solid #1e1e1e",
    whiteSpace: "nowrap" as const,
    textTransform: "uppercase" as const,
  },
  tr: {
    borderBottom: "1px solid #141414",
  },
  td: {
    padding: "8px 12px",
    whiteSpace: "nowrap" as const,
    verticalAlign: "middle" as const,
  },
  tdMono: {
    padding: "8px 12px",
    fontFamily: mono,
    whiteSpace: "nowrap" as const,
    verticalAlign: "middle" as const,
  },
  coinName: {
    fontFamily: mono,
    fontWeight: 600,
    color: "#fafafa",
    marginRight: 8,
  },
  sideBadge: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: mono,
    letterSpacing: "0.04em",
    padding: "2px 6px",
    borderRadius: 3,
  },
  hotBadge: {
    fontSize: 9,
    fontWeight: 600,
    fontFamily: mono,
    letterSpacing: "0.04em",
    color: "#f59e0b",
    backgroundColor: "rgba(245,158,11,0.12)",
    padding: "2px 6px",
    borderRadius: 3,
    marginLeft: 6,
  },
  modeBadge: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: mono,
    letterSpacing: "0.04em",
    padding: "2px 6px",
    borderRadius: 3,
  },
  monoSmall: {
    fontFamily: mono,
    fontSize: 12,
    color: "#71717a",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingTop: 16,
    borderTop: "1px solid #1e1e1e",
    fontSize: 11,
    fontFamily: mono,
    color: "#3f3f46",
  },
  footerWallet: {
    color: "#52525b",
  },
};
