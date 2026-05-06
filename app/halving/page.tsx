"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/* ── constants ── */
const HALVING_INTERVAL = 210_000;
const NEXT_HALVING_BLOCK = 1_050_000;
const CURRENT_REWARD = 3.125;
const NEXT_REWARD = 1.5625;
const MAX_SUPPLY = 21_000_000;
const AVG_BLOCK_TIME_SEC = 600; // ~10 min

const HISTORICAL_HALVINGS = [
  { num: 1, date: "Nov 28, 2012", block: 210_000, rewardBefore: 50, rewardAfter: 25, price: "$12" },
  { num: 2, date: "Jul 9, 2016", block: 420_000, rewardBefore: 25, rewardAfter: 12.5, price: "$650" },
  { num: 3, date: "May 11, 2020", block: 630_000, rewardBefore: 12.5, rewardAfter: 6.25, price: "$8,572" },
  { num: 4, date: "Apr 20, 2024", block: 840_000, rewardBefore: 6.25, rewardAfter: 3.125, price: "$63,800" },
  { num: 5, date: "~April 2028", block: 1_050_000, rewardBefore: 3.125, rewardAfter: 1.5625, price: "TBD" },
];

/* ── helpers ── */

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function calcSupplyAtBlock(block: number): number {
  let supply = 0;
  let reward = 50;
  let b = 0;
  while (b + HALVING_INTERVAL <= block) {
    supply += HALVING_INTERVAL * reward;
    b += HALVING_INTERVAL;
    reward /= 2;
  }
  supply += (block - b) * reward;
  return supply;
}

function calcInflationRate(reward: number, supply: number): number {
  // annual blocks ~52560 (365.25 * 24 * 6)
  const annualNewBtc = reward * 52_560;
  return (annualNewBtc / supply) * 100;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function secsToTime(totalSec: number): TimeLeft {
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  return { days, hours, minutes, seconds };
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/* ── components ── */

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#f7931a",
          lineHeight: 1.1,
          minWidth: 80,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#64748b",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: 12,
        background: "#1a1a2e",
        borderRadius: 6,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: `${Math.min(percent, 100)}%`,
          height: "100%",
          background: "linear-gradient(90deg, #f7931a, #f59e0b)",
          borderRadius: 6,
          transition: "width 0.5s ease",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: "#fff",
            borderRadius: 2,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

/* ── main page ── */

export default function HalvingPage() {
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [blocksRemaining, setBlocksRemaining] = useState<number>(0);
  const [estimatedDate, setEstimatedDate] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [totalMined, setTotalMined] = useState<number>(0);
  const [inflationRate, setInflationRate] = useState<number>(0);

  const fetchBlockHeight = useCallback(async () => {
    try {
      // Try blockchain.info first, fallback to blockstream
      let height: number | null = null;
      try {
        const res = await fetch("https://blockchain.info/q/getblockcount", { cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          height = parseInt(text.trim(), 10);
        }
      } catch {
        // fallback
      }

      if (!height) {
        try {
          const res = await fetch("https://blockstream.info/api/blocks/tip/height", { cache: "no-store" });
          if (res.ok) {
            const text = await res.text();
            height = parseInt(text.trim(), 10);
          }
        } catch {
          // both failed
        }
      }

      if (height && !isNaN(height)) {
        setBlockHeight(height);
        setError(null);
      } else {
        setError("Could not fetch block height");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch block height on mount & every 60s
  useEffect(() => {
    fetchBlockHeight();
    const iv = setInterval(fetchBlockHeight, 60_000);
    return () => clearInterval(iv);
  }, [fetchBlockHeight]);

  // Compute derived state when blockHeight changes
  useEffect(() => {
    if (blockHeight === null) return;

    const remaining = NEXT_HALVING_BLOCK - blockHeight;
    setBlocksRemaining(remaining > 0 ? remaining : 0);

    // Progress within current halving cycle
    const lastHalvingBlock = NEXT_HALVING_BLOCK - HALVING_INTERVAL; // 840,000
    const blocksSinceHalving = blockHeight - lastHalvingBlock;
    const pct = (blocksSinceHalving / HALVING_INTERVAL) * 100;
    setProgress(Math.max(0, Math.min(pct, 100)));

    // Supply stats
    const mined = calcSupplyAtBlock(blockHeight);
    setTotalMined(mined);
    setInflationRate(calcInflationRate(CURRENT_REWARD, mined));

    // Estimated halving date
    if (remaining > 0) {
      const secsToHalving = remaining * AVG_BLOCK_TIME_SEC;
      const halvingDate = new Date(Date.now() + secsToHalving * 1000);
      setEstimatedDate(
        halvingDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      );
    }
  }, [blockHeight]);

  // Countdown ticker every second
  useEffect(() => {
    if (blockHeight === null) return;
    const remaining = NEXT_HALVING_BLOCK - blockHeight;
    if (remaining <= 0) return;

    // We track time from when we last fetched blockHeight
    const secsAtFetch = remaining * AVG_BLOCK_TIME_SEC;
    const fetchTime = Date.now();

    const tick = () => {
      const elapsed = (Date.now() - fetchTime) / 1000;
      const secsLeft = Math.max(0, secsAtFetch - elapsed);
      setCountdown(secsToTime(secsLeft));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [blockHeight]);

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}body{background:#07070a}
        ::selection{background:#f7931a;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 8px #f7931a55}50%{text-shadow:0 0 20px #f7931aaa}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .skel{background:linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        a{color:#f7931a;text-decoration:none}a:hover{text-decoration:underline}
        .stat-card{background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:16px 20px;flex:1;min-width:140px}
        .stat-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .stat-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace}
        .halving-table{width:100%;border-collapse:collapse;font-size:13px}
        .halving-table th{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.08em;padding:12px 16px;text-align:left;border-bottom:1px solid #1e293b}
        .halving-table td{padding:12px 16px;border-bottom:1px solid #111118;color:#94a3b8;font-family:'JetBrains Mono',monospace;font-size:12px}
        .halving-table tr:hover{background:#0f0f18}
        .halving-table tr:last-child td{border-bottom:none}
        .nav-link{font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace;text-decoration:none;padding:4px 8px;border-radius:4px;border:1px solid #1a1a2e;transition:all .15s}
        .nav-link:hover{border-color:#f7931a;color:#f7931a;text-decoration:none}
        @media(max-width:768px){
          .countdown-grid{flex-direction:column;gap:12px!important}
          .countdown-unit-value{font-size:32px!important}
          .stats-grid{grid-template-columns:1fr!important}
          .halving-table{font-size:11px}
          .halving-table th,.halving-table td{padding:8px 10px}
          .hide-mobile{display:none!important}
        }
      `}</style>

      {/* Header */}
      <header style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", animation: "glow 3s infinite" }}>
                BITCOIN <span style={{ color: "#f7931a" }}>HALVING</span>
              </h1>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: blockHeight ? "#22c55e" : "#f59e0b",
                  boxShadow: `0 0 8px ${blockHeight ? "#22c55e" : "#f59e0b"}`,
                  animation: "pulse 2s infinite",
                }}
              />
            </div>
            <p style={{ fontSize: 13, color: "#475569" }}>
              countdown to the next block reward halving
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/tip" className="nav-link" style={{ color: "#f59e0b", borderColor: "#f59e0b33" }}>Tip</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skel" style={{ height: 180 }} />
            <div className="skel" style={{ height: 60 }} />
            <div className="skel" style={{ height: 200 }} />
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>block fetch failed</p>
            <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{error}</p>
            <button
              onClick={fetchBlockHeight}
              style={{
                padding: "8px 20px",
                background: "#1e293b",
                border: "none",
                borderRadius: 6,
                color: "#e2e8f0",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              retry
            </button>
          </div>
        )}

        {!loading && blockHeight !== null && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {/* ── Countdown ── */}
            <div
              style={{
                background: "#0d0d14",
                border: "1px solid #1a1a2e",
                borderRadius: 16,
                padding: "32px 24px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "linear-gradient(90deg, #f7931a, #f59e0b, #f7931a)",
                }}
              />

              <p
                style={{
                  fontSize: 10,
                  color: "#475569",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.12em",
                  marginBottom: 20,
                }}
              >
                NEXT HALVING &mdash; BLOCK {fmtNum(NEXT_HALVING_BLOCK)}
                {estimatedDate && <> &mdash; EST. {estimatedDate.toUpperCase()}</>}
              </p>

              {blocksRemaining > 0 ? (
                <div
                  className="countdown-grid"
                  style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24 }}
                >
                  <CountdownUnit value={fmtNum(countdown.days)} label="Days" />
                  <div style={{ fontSize: 36, color: "#1e293b", fontWeight: 300, alignSelf: "flex-start", paddingTop: 8 }}>:</div>
                  <CountdownUnit value={pad2(countdown.hours)} label="Hours" />
                  <div style={{ fontSize: 36, color: "#1e293b", fontWeight: 300, alignSelf: "flex-start", paddingTop: 8 }}>:</div>
                  <CountdownUnit value={pad2(countdown.minutes)} label="Minutes" />
                  <div style={{ fontSize: 36, color: "#1e293b", fontWeight: 300, alignSelf: "flex-start", paddingTop: 8 }}>:</div>
                  <CountdownUnit value={pad2(countdown.seconds)} label="Seconds" />
                </div>
              ) : (
                <div style={{ fontSize: 36, fontWeight: 900, color: "#f7931a", marginBottom: 24 }}>
                  HALVING COMPLETE
                </div>
              )}

              {/* Progress bar */}
              <div style={{ maxWidth: 600, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>Block {fmtNum(NEXT_HALVING_BLOCK - HALVING_INTERVAL)}</span>
                  <span>{progress.toFixed(2)}%</span>
                  <span>Block {fmtNum(NEXT_HALVING_BLOCK)}</span>
                </div>
                <ProgressBar percent={progress} />
              </div>
            </div>

            {/* ── Live Stats Grid ── */}
            <div
              className="stats-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}
            >
              <div className="stat-card">
                <div className="stat-label">Current Block</div>
                <div className="stat-val" style={{ color: "#e2e8f0" }}>{fmtNum(blockHeight)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Blocks Remaining</div>
                <div className="stat-val" style={{ color: "#f7931a" }}>{fmtNum(blocksRemaining)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Current Reward</div>
                <div className="stat-val" style={{ color: "#22c55e" }}>{CURRENT_REWARD} BTC</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  next: {NEXT_REWARD} BTC
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Reward Reduction</div>
                <div className="stat-val" style={{ color: "#ef4444" }}>-50%</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  every 210,000 blocks
                </div>
              </div>
            </div>

            {/* ── Supply Stats ── */}
            <div
              style={{
                background: "#0d0d14",
                border: "1px solid #1a1a2e",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#e2e8f0",
                  marginBottom: 16,
                  letterSpacing: "-0.02em",
                }}
              >
                Supply Statistics
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div>
                  <div className="stat-label">Total BTC Mined</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#f7931a" }}>
                    {fmtNum(Math.floor(totalMined))}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Max Supply</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
                    {fmtNum(MAX_SUPPLY)}
                  </div>
                </div>
                <div>
                  <div className="stat-label">% Mined</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#22c55e" }}>
                    {((totalMined / MAX_SUPPLY) * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="stat-label">Annual Inflation</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8" }}>
                    {inflationRate.toFixed(3)}%
                  </div>
                </div>
                <div>
                  <div className="stat-label">BTC Remaining</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#64748b" }}>
                    {fmtNum(Math.floor(MAX_SUPPLY - totalMined))}
                  </div>
                </div>
                <div>
                  <div className="stat-label">New BTC / Day</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#f59e0b" }}>
                    {fmtNum(Math.round(CURRENT_REWARD * 144))}
                  </div>
                </div>
              </div>

              {/* Supply progress bar */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>{fmtNum(Math.floor(totalMined))} mined</span>
                  <span>{fmtNum(MAX_SUPPLY)} max</span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "#1a1a2e",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(totalMined / MAX_SUPPLY) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #f7931a, #22c55e)",
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── Historical Halvings Table ── */}
            <div
              style={{
                background: "#0d0d14",
                border: "1px solid #1a1a2e",
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a2e" }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
                  Halving History
                </h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="halving-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Block</th>
                      <th>Reward Before</th>
                      <th>Reward After</th>
                      <th>BTC Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HISTORICAL_HALVINGS.map((h) => (
                      <tr key={h.num} style={h.num === 5 ? { background: "#f7931a08" } : undefined}>
                        <td
                          style={{
                            color: h.num === 5 ? "#f7931a" : "#64748b",
                            fontWeight: h.num === 5 ? 700 : 400,
                          }}
                        >
                          {h.num}
                        </td>
                        <td style={{ color: h.num === 5 ? "#f7931a" : "#94a3b8" }}>{h.date}</td>
                        <td>{fmtNum(h.block)}</td>
                        <td>{h.rewardBefore} BTC</td>
                        <td style={{ color: "#22c55e" }}>{h.rewardAfter} BTC</td>
                        <td
                          style={{
                            color: h.price === "TBD" ? "#64748b" : "#e2e8f0",
                            fontWeight: 600,
                          }}
                        >
                          {h.price}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Reward Schedule Visual ── */}
            <div
              style={{
                background: "#0d0d14",
                border: "1px solid #1a1a2e",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#e2e8f0",
                  marginBottom: 16,
                  letterSpacing: "-0.02em",
                }}
              >
                Block Reward Schedule
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { era: "2009-2012", reward: 50, pct: 100 },
                  { era: "2012-2016", reward: 25, pct: 50 },
                  { era: "2016-2020", reward: 12.5, pct: 25 },
                  { era: "2020-2024", reward: 6.25, pct: 12.5 },
                  { era: "2024-2028", reward: 3.125, pct: 6.25, current: true },
                  { era: "2028-2032", reward: 1.5625, pct: 3.125, future: true },
                ].map((era) => (
                  <div key={era.era} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: era.current ? "#f7931a" : era.future ? "#475569" : "#64748b",
                        fontFamily: "'JetBrains Mono', monospace",
                        minWidth: 80,
                        fontWeight: era.current ? 700 : 400,
                      }}
                    >
                      {era.era}
                    </span>
                    <div
                      style={{
                        height: 20,
                        width: `${Math.max(era.pct, 2)}%`,
                        background: era.current
                          ? "linear-gradient(90deg, #f7931a, #f59e0b)"
                          : era.future
                            ? "#1e293b"
                            : "#f7931a44",
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                        border: era.current ? "1px solid #f7931a" : "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: era.current ? "#f7931a" : era.future ? "#475569" : "#94a3b8",
                        minWidth: 70,
                      }}
                    >
                      {era.reward} BTC
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AADS ad unit */}
            <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
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

            {/* ── Info Box ── */}
            <div
              style={{
                background: "#0d0d14",
                border: "1px solid #1a1a2e",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#e2e8f0",
                  marginBottom: 12,
                  letterSpacing: "-0.02em",
                }}
              >
                What is a Bitcoin Halving?
              </h2>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 12 }}>
                  Every 210,000 blocks (roughly four years), the Bitcoin network cuts the block
                  reward miners receive in half. This event is called a &ldquo;halving&rdquo; (or
                  &ldquo;halvening&rdquo;). It is hardcoded into Bitcoin&apos;s protocol and cannot
                  be changed.
                </p>
                <p style={{ marginBottom: 12 }}>
                  The halving enforces Bitcoin&apos;s deflationary monetary policy. When Bitcoin
                  launched in 2009, miners earned 50 BTC per block. After four halvings, the
                  reward is now 3.125 BTC. After the next halving at block 1,050,000, it will
                  drop to 1.5625 BTC.
                </p>
                <p>
                  Historically, halvings have preceded significant bull runs, though past
                  performance does not guarantee future results. The reduced supply of new
                  coins entering circulation, combined with steady or growing demand, creates
                  upward price pressure. The final Bitcoin is expected to be mined around the
                  year 2140.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Built by AI badge */}
        <div style={{ textAlign: "center", marginTop: 24, padding: "16px" }}>
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
            built autonomously by claude // NFA // DYOR
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
        EDGEMARKET // BTC halving countdown // data: blockchain.info //{" "}
        <Link href="/" style={{ color: "#475569" }}>
          home
        </Link>
      </footer>
    </div>
  );
}
