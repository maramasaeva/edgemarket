"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Worker {
  name: string;
  hashrate: number;
  sharesValid: number;
  lastShare: string | null;
  wallet: string;
}

interface RevenueData {
  summary: {
    totalRevenueUsd: number;
    totalMinedEtc: number;
    totalHashrateMHs: number;
    totalWorkers: number;
    etcPrice: number;
    walletBalance: number;
  };
  mining: {
    newWallet: {
      address: string;
      balanceEtc: number;
      immatureEtc: number;
      paidEtc: number;
      hashrate: number;
      hashrateMHs: number;
      workers: number;
      sharesValid: number;
    };
    oldWallet: {
      address: string;
      balanceEtc: number;
      immatureEtc: number;
      paidEtc: number;
      hashrate: number;
      hashrateMHs: number;
      workers: number;
      sharesValid: number;
    };
    allWorkers: Worker[];
    estimates: {
      dailyEtc: number;
      dailyUsd: number;
      monthlyEtc: number;
      monthlyUsd: number;
    };
    payout: {
      thresholdEtc: number;
      pendingEtc: number;
      progressPct: number;
      etcNeeded: number;
      estimatedDays: number | null;
    };
  };
  ads: {
    network: string;
    unitId: string;
    status: string;
    dashboardUrl: string;
  };
  trading: {
    platform: string;
    status: string;
    wallet: string;
    chain: string;
  };
  walletBalances: Array<{ chain: string; balance: number }>;
  pool: {
    name: string;
    coin: string;
    dashboardUrl: string;
    oldDashboardUrl: string;
  };
  fetchedAt: string;
}

function StatCard({ label, value, sub, color = "#818cf8" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "#0f1117",
      border: "1px solid #1e293b",
      borderRadius: 8,
      padding: "16px 20px",
      flex: "1 1 140px",
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  const clamp = Math.min(Math.max(pct, 0), 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace" }}>{clamp.toFixed(1)}%</span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{
          background: clamp > 80 ? "#22c55e" : clamp > 40 ? "#eab308" : "#818cf8",
          height: "100%",
          width: `${clamp}%`,
          borderRadius: 4,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/revenue");
      const json = await res.json();
      setData(json);
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>
            &larr; dashboard
          </Link>
          <Link href="/mining" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>mining</Link>
          <Link href="/tip" style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>tip</Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Revenue Dashboard</h1>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: data?.summary?.totalWorkers ? "#22c55e" : "#ef4444",
            boxShadow: data?.summary?.totalWorkers ? "0 0 8px #22c55e" : "0 0 8px #ef4444",
          }} />
        </div>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24, fontFamily: "'JetBrains Mono', monospace" }}>
          all autonomous revenue streams — built and operated by AI agent
        </p>

        {loading && !data && (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading revenue data...</div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard
                label="Total Revenue"
                value={`$${data.summary.totalRevenueUsd.toFixed(4)}`}
                sub={`${data.summary.totalMinedEtc.toFixed(6)} ETC`}
                color="#22c55e"
              />
              <StatCard
                label="Hashrate"
                value={`${data.summary.totalHashrateMHs.toFixed(1)} MH/s`}
                sub={`${data.summary.totalWorkers} worker${data.summary.totalWorkers !== 1 ? "s" : ""} online`}
                color="#818cf8"
              />
              <StatCard
                label="ETC Price"
                value={`$${data.summary.etcPrice.toFixed(2)}`}
                sub="CoinGecko"
                color="#f59e0b"
              />
              <StatCard
                label="Daily Est."
                value={`$${data.mining.estimates.dailyUsd.toFixed(4)}`}
                sub={`${data.mining.estimates.dailyEtc.toFixed(6)} ETC/day`}
                color="#06b6d4"
              />
            </div>

            {/* Payout Progress */}
            <div style={{ background: "#0f1117", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Payout Progress</h2>
              <ProgressBar pct={data.mining.payout.progressPct} label={`${data.mining.payout.pendingEtc.toFixed(6)} / ${data.mining.payout.thresholdEtc} ETC`} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{data.mining.payout.etcNeeded.toFixed(6)} ETC needed</span>
                <span>{data.mining.payout.estimatedDays !== null ? `~${data.mining.payout.estimatedDays} days` : "calculating..."}</span>
              </div>
            </div>

            {/* Revenue Streams */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Revenue Streams</h2>

            {/* Mining */}
            <div style={{ background: "#0f1117", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>GPU Mining (ETC)</h3>
                <span style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: data.summary.totalWorkers > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: data.summary.totalWorkers > 0 ? "#22c55e" : "#ef4444",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {data.summary.totalWorkers > 0 ? "ACTIVE" : "OFFLINE"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <StatCard label="Pending" value={`${(data.mining.newWallet.balanceEtc + data.mining.oldWallet.balanceEtc).toFixed(6)}`} sub="ETC" color="#f59e0b" />
                <StatCard label="Monthly Est." value={`$${data.mining.estimates.monthlyUsd.toFixed(2)}`} sub={`${data.mining.estimates.monthlyEtc.toFixed(4)} ETC`} color="#22c55e" />
                <StatCard label="Total Paid" value={`${(data.mining.newWallet.paidEtc + data.mining.oldWallet.paidEtc).toFixed(6)}`} sub="ETC" color="#06b6d4" />
              </div>

              {/* Workers */}
              {data.mining.allWorkers.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>Workers</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {data.mining.allWorkers.map((w, i) => (
                      <div key={i} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 10px",
                        background: "#0a0a10",
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        <span style={{ color: "#e2e8f0" }}>{w.name}</span>
                        <span style={{ color: w.hashrate > 0 ? "#22c55e" : "#ef4444" }}>
                          {(w.hashrate / 1e6).toFixed(1)} MH/s
                        </span>
                        <span style={{ color: "#64748b" }}>{w.sharesValid} shares</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 11, color: "#475569" }}>
                <a href={data.pool.dashboardUrl} target="_blank" rel="noopener" style={{ color: "#818cf8", textDecoration: "none" }}>
                  View on 2miners &rarr;
                </a>
              </div>
            </div>

            {/* Ads */}
            <div style={{ background: "#0f1117", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#818cf8" }}>Crypto Ads (AADS)</h3>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  background: "rgba(130,140,248,0.15)", color: "#818cf8",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>ACTIVE</span>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                Crypto ad network running on all {">"}30 pages. Revenue paid in BTC.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Network" value="AADS" sub={`Unit #${data.ads.unitId}`} color="#818cf8" />
                <StatCard label="Pages" value="30+" sub="All pages monetized" color="#818cf8" />
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: "#475569" }}>
                <a href={data.ads.dashboardUrl} target="_blank" rel="noopener" style={{ color: "#818cf8", textDecoration: "none" }}>
                  View AADS dashboard &rarr;
                </a>
              </div>
            </div>

            {/* Polymarket Trading */}
            <div style={{ background: "#0f1117", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#06b6d4" }}>Polymarket Trading</h3>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  background: "rgba(234,179,8,0.15)", color: "#eab308",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>PENDING FUNDING</span>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                Latency arbitrage bot ready. Needs USDC.e on Polygon to begin trading.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Strategy" value="Arb" sub="Binance-Polymarket latency" color="#06b6d4" />
                <StatCard label="Status" value="Ready" sub="Awaiting USDC funding" color="#eab308" />
              </div>
            </div>

            {/* Tips */}
            <div style={{ background: "#0f1117", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>Tips & Donations</h3>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  background: "rgba(34,197,94,0.15)", color: "#22c55e",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>LIVE</span>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                MetaMask deep links on 4 chains: ETH, Polygon, Base, Arbitrum.
              </p>
              <Link href="/tip" style={{ fontSize: 11, color: "#22c55e", textDecoration: "none", fontFamily: "'JetBrains Mono', monospace" }}>
                View tip page &rarr;
              </Link>
            </div>

            {/* Wallet Balances */}
            <div style={{ background: "#0f1117", border: "1px solid #1e293b", borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Wallet Balances</h3>
              <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
                {data.mining.newWallet.address.slice(0, 6)}...{data.mining.newWallet.address.slice(-4)}
              </div>
              {data.walletBalances.map((wb, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", padding: "6px 0",
                  borderBottom: i < data.walletBalances.length - 1 ? "1px solid #1e293b" : "none",
                  fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <span style={{ color: "#94a3b8" }}>{wb.chain}</span>
                  <span style={{ color: wb.balance > 0 ? "#22c55e" : "#475569" }}>
                    {wb.balance.toFixed(6)} {wb.chain === "Polygon" ? "MATIC" : "ETH"}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace", paddingBottom: 40 }}>
              auto-refreshes every 30s &middot; last update: {data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : "..."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
