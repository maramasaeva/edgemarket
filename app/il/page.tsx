"use client";

import { useState } from "react";
import Link from "next/link";

type PoolRatio = "50/50" | "60/40" | "80/20";

interface ILResult {
  ilPercent: number;
  valueIfHeld: number;
  valueInPool: number;
  netDifference: number;
  priceRatio: number;
}

function calculateIL(
  priceEntryA: number,
  priceNowA: number,
  ratio: PoolRatio,
): ILResult {
  const priceRatio = priceNowA / priceEntryA;

  // Weight of Token A in the pool
  let weightA: number;
  switch (ratio) {
    case "50/50": weightA = 0.5; break;
    case "60/40": weightA = 0.6; break;
    case "80/20": weightA = 0.8; break;
  }
  const weightB = 1 - weightA;

  // For a weighted AMM, the IL formula generalizes to:
  // IL = (r^wA * 1^wB) / (wA * r + wB) - 1
  // where r = priceNowA / priceEntryA, wA = weight of token A, wB = weight of token B
  // Token B is assumed stable (price = 1 relative to itself)

  // Value if held (assuming initial $1000 portfolio)
  const initialValue = 1000;
  const valueIfHeld = initialValue * (weightA * priceRatio + weightB * 1);

  // Value in pool using the constant product formula for weighted pools
  const valueInPool = initialValue * Math.pow(priceRatio, weightA);

  const ilPercent = ((valueInPool - valueIfHeld) / valueIfHeld) * 100;
  const netDifference = valueInPool - valueIfHeld;

  return {
    ilPercent,
    valueIfHeld,
    valueInPool,
    netDifference,
    priceRatio,
  };
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ILPage() {
  const [priceEntry, setPriceEntry] = useState<string>("1000");
  const [priceNow, setPriceNow] = useState<string>("1200");
  const [ratio, setRatio] = useState<PoolRatio>("50/50");

  const numEntry = parseFloat(priceEntry) || 0;
  const numNow = parseFloat(priceNow) || 0;

  const hasInput = numEntry > 0 && numNow > 0;
  const result = hasInput ? calculateIL(numEntry, numNow, ratio) : null;

  // Generate data for multiple price points for the bar chart
  const chartPoints = hasInput
    ? [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0].map((mult) => {
        const r = calculateIL(numEntry, numEntry * mult, ratio);
        return { mult, il: r.ilPercent, held: r.valueIfHeld, pool: r.valueInPool };
      })
    : [];

  // Find max value for bar scaling
  const maxBarVal = Math.max(...chartPoints.map((p) => Math.max(p.held, p.pool)), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .il-input{width:100%;padding:12px 16px;background:#07070a;border:1px solid #1a1a2e;border-radius:8px;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:16px;outline:none;transition:border-color .15s}
        .il-input:focus{border-color:#818cf8}
        .il-input::placeholder{color:#334155}
        .stat-card{background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:16px 20px}
        .stat-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .stat-val{font-size:20px;font-weight:800;font-family:'JetBrains Mono',monospace}
        .ratio-btn{padding:10px 20px;border-radius:8px;border:1px solid #1a1a2e;background:transparent;color:#475569;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'JetBrains Mono',monospace}
        .ratio-btn:hover{border-color:#475569;color:#94a3b8}
        .ratio-btn.active{background:#818cf815;border-color:#818cf8;color:#818cf8}
        .nav-link{font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;text-decoration:none;padding:4px 8px;border-radius:4px;border:1px solid #1a1a2e;transition:all .15s}
        .nav-link:hover{border-color:#818cf8;color:#818cf8;text-decoration:none}
        @media(max-width:640px){
          .stat-val{font-size:16px}
          .stat-card{padding:12px}
          .result-grid{grid-template-columns:1fr 1fr!important}
          .chart-grid{grid-template-columns:repeat(5,1fr)!important}
        }
      `}</style>

      <header style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.04em" }}>
            EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
          </Link>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Impermanent Loss</span>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", background: "#ef4444",
            boxShadow: "0 0 8px #ef4444", animation: "pulse 2s infinite",
          }} />
        </div>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
          calculate impermanent loss for liquidity pool positions. compare HODL vs LP at any price point.
          <br />
          <span style={{ fontSize: 11, color: "#334155" }}>
            Token B is assumed stable (e.g., USDC). IL ignores trading fees. NFA. DYOR.
          </span>
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/" className="nav-link">Dashboard</Link>
          <Link href="/convert" className="nav-link">Convert</Link>
          <Link href="/gas" className="nav-link">Gas</Link>
          <Link href="/pnl" className="nav-link">P&L</Link>
          <Link href="/whales" className="nav-link">Whales</Link>
          <Link href="/staking" className="nav-link" style={{ color: "#818cf8", borderColor: "#818cf833" }}>Staking</Link>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Input Section */}
        <div style={{
          background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16,
          padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {/* Price at entry */}
            <div>
              <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                TOKEN A PRICE AT ENTRY ($)
              </label>
              <input
                className="il-input"
                type="text"
                value={priceEntry}
                onChange={(e) => setPriceEntry(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="1000"
              />
            </div>

            {/* Price now */}
            <div>
              <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                TOKEN A PRICE NOW ($)
              </label>
              <input
                className="il-input"
                type="text"
                value={priceNow}
                onChange={(e) => setPriceNow(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="1200"
              />
            </div>
          </div>

          {/* Pool Ratio */}
          <div>
            <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>
              POOL RATIO (TOKEN A / TOKEN B)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["50/50", "60/40", "80/20"] as PoolRatio[]).map((r) => (
                <button
                  key={r}
                  className={`ratio-btn ${ratio === r ? "active" : ""}`}
                  onClick={() => setRatio(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Price change indicator */}
          {hasInput && (
            <div style={{
              marginTop: 16, padding: "10px 16px", background: "#07070a",
              borderRadius: 8, border: "1px solid #111118",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                PRICE CHANGE
              </span>
              <span style={{
                fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: numNow >= numEntry ? "#22c55e" : "#ef4444",
              }}>
                {numNow >= numEntry ? "+" : ""}{(((numNow - numEntry) / numEntry) * 100).toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {/* Result Cards */}
            <div className="result-grid" style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 24,
            }}>
              <div className="stat-card">
                <div className="stat-label">Impermanent Loss</div>
                <div className="stat-val" style={{ color: "#ef4444" }}>
                  {result.ilPercent.toFixed(4)}%
                </div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  of pool value
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Value If Held</div>
                <div className="stat-val" style={{ color: "#22c55e" }}>
                  {fmtUsd(result.valueIfHeld)}
                </div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  HODL strategy
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Value In Pool</div>
                <div className="stat-val" style={{ color: "#818cf8" }}>
                  {fmtUsd(result.valueInPool)}
                </div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  LP position
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net Difference</div>
                <div className="stat-val" style={{
                  color: result.netDifference >= 0 ? "#22c55e" : "#ef4444",
                }}>
                  {result.netDifference >= 0 ? "+" : ""}{fmtUsd(result.netDifference)}
                </div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  LP vs HODL
                </div>
              </div>
            </div>

            {/* HODL vs LP Bar Chart */}
            <div style={{
              background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16,
              padding: 24, marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16, textTransform: "uppercase" }}>
                HODL vs LP at Different Price Points
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 12, justifyContent: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "#22c55e", display: "inline-block" }} />
                  <span style={{ fontSize: 10, color: "#64748b" }}>HODL</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "#818cf8", display: "inline-block" }} />
                  <span style={{ fontSize: 10, color: "#64748b" }}>LP</span>
                </span>
              </div>

              <div className="chart-grid" style={{
                display: "grid", gridTemplateColumns: `repeat(${chartPoints.length}, 1fr)`, gap: 4,
                alignItems: "end", height: 200,
              }}>
                {chartPoints.map((point) => {
                  const heldHeight = (point.held / maxBarVal) * 180;
                  const poolHeight = (point.pool / maxBarVal) * 180;
                  const isCurrentPrice = Math.abs(point.mult - (numNow / numEntry)) < 0.01;

                  return (
                    <div key={point.mult} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
                        {point.il.toFixed(1)}%
                      </div>
                      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 180 }}>
                        <div style={{
                          width: 14, height: Math.max(heldHeight, 2), borderRadius: "3px 3px 0 0",
                          background: "#22c55e", opacity: isCurrentPrice ? 1 : 0.6,
                          transition: "height 0.3s ease",
                        }} />
                        <div style={{
                          width: 14, height: Math.max(poolHeight, 2), borderRadius: "3px 3px 0 0",
                          background: "#818cf8", opacity: isCurrentPrice ? 1 : 0.6,
                          transition: "height 0.3s ease",
                        }} />
                      </div>
                      <div style={{
                        fontSize: 9, fontFamily: "'JetBrains Mono', monospace", marginTop: 4,
                        color: isCurrentPrice ? "#e2e8f0" : "#475569",
                        fontWeight: isCurrentPrice ? 700 : 400,
                      }}>
                        {point.mult}x
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                price multiplier (1x = entry price) // negative IL% = loss vs HODL
              </div>
            </div>

            {/* Big visual comparison */}
            <div style={{
              background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16,
              padding: 24, marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16, textTransform: "uppercase" }}>
                Your Position Comparison
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {/* HODL bar */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>HODL</span>
                    <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmtUsd(result.valueIfHeld)}</span>
                  </div>
                  <div style={{ height: 32, background: "#111118", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{
                      width: `${(result.valueIfHeld / Math.max(result.valueIfHeld, result.valueInPool)) * 100}%`,
                      height: "100%", background: "linear-gradient(90deg, #22c55e, #16a34a)", borderRadius: 6,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {/* LP bar */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>LP POOL</span>
                    <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmtUsd(result.valueInPool)}</span>
                  </div>
                  <div style={{ height: 32, background: "#111118", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{
                      width: `${(result.valueInPool / Math.max(result.valueIfHeld, result.valueInPool)) * 100}%`,
                      height: "100%", background: "linear-gradient(90deg, #818cf8, #6366f1)", borderRadius: 6,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 16, padding: "12px 16px", background: "#07070a",
                borderRadius: 8, border: "1px solid #111118", textAlign: "center",
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: result.netDifference >= 0 ? "#22c55e" : "#ef4444",
                }}>
                  LP is {result.netDifference >= 0 ? "winning" : "losing"} by {fmtUsd(Math.abs(result.netDifference))}
                </span>
                <span style={{ fontSize: 12, color: "#475569", marginLeft: 8 }}>
                  ({result.ilPercent.toFixed(4)}% IL)
                </span>
              </div>
            </div>

            {/* Explanation */}
            <div style={{
              background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16,
              padding: 24, marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" }}>
                What is Impermanent Loss?
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 12 }}>
                  Impermanent loss happens when you provide liquidity to an AMM (automated market maker)
                  pool and the price of your deposited tokens changes relative to when you deposited them.
                  The bigger the price change, the more IL you suffer.
                </p>
                <p style={{ marginBottom: 12 }}>
                  It&apos;s called &quot;impermanent&quot; because if the token prices return to their original ratio,
                  the loss disappears. However, if you withdraw while prices have diverged, the loss becomes permanent.
                </p>
                <p style={{ marginBottom: 12 }}>
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>Key points:</span>
                </p>
                <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li>IL occurs in <strong style={{ color: "#e2e8f0" }}>any</strong> direction of price movement &mdash; up or down</li>
                  <li>A <strong style={{ color: "#e2e8f0" }}>50/50 pool</strong> has the most IL; weighted pools (60/40, 80/20) reduce it</li>
                  <li>Trading fees earned can offset or exceed IL &mdash; this calculator does <strong style={{ color: "#e2e8f0" }}>not</strong> include fees</li>
                  <li>At <strong style={{ color: "#e2e8f0" }}>2x</strong> price change in a 50/50 pool, IL is roughly 5.7%</li>
                  <li>At <strong style={{ color: "#e2e8f0" }}>5x</strong> price change, IL reaches ~25.5%</li>
                </ul>
              </div>
              <div style={{
                marginTop: 16, padding: "10px 16px", background: "#f59e0b10",
                border: "1px solid #f59e0b22", borderRadius: 8,
                fontSize: 11, color: "#f59e0b",
              }}>
                remember: IL is the cost of LP&apos;ing vs just holding. trading fees and rewards can make LP profitable even with IL.
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasInput && (
          <div style={{
            textAlign: "center", padding: 48, color: "#334155", fontSize: 14,
          }}>
            enter token A&apos;s price at entry and current price to calculate impermanent loss
          </div>
        )}

        {/* AADS ad unit */}
        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>&larr; back to dashboard</Link>
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: 20, color: "#1a1a2e", fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        EDGEMARKET // NFA // IL calculator does not account for trading fees
      </footer>
    </div>
  );
}
