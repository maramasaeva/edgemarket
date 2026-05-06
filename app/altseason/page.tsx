"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AltData {
  btcDominance: number;
  ethBtcRatio: number;
  altcoinMarketCap: number;
  totalMarketCap: number;
  altSeasonIndex: number;
  phase: string;
  top50Performance: { symbol: string; change30d: number }[];
}

function getPhase(index: number): { label: string; color: string; desc: string } {
  if (index >= 75) return { label: "ALT SEASON", color: "#22c55e", desc: "Altcoins massively outperforming Bitcoin. Historically a late-cycle signal." };
  if (index >= 50) return { label: "Alt-Leaning", color: "#84cc16", desc: "Altcoins gaining strength. Money rotating from BTC to alts." };
  if (index >= 25) return { label: "BTC-Leaning", color: "#f59e0b", desc: "Bitcoin still dominates. Some alts showing early strength." };
  return { label: "BTC SEASON", color: "#ef4444", desc: "Bitcoin heavily outperforming altcoins. Capital flowing into BTC." };
}

export default function AltSeasonPage() {
  const [data, setData] = useState<AltData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("https://api.coingecko.com/api/v3/global").then((r) => r.json()),
      fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&sparkline=false&price_change_percentage=30d").then((r) => r.json()),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=btc,usd").then((r) => r.json()),
    ])
      .then(([globalRes, marketsRes, priceRes]) => {
        const g = globalRes?.data;
        if (!g || !Array.isArray(marketsRes)) return;

        const btcDom = g.market_cap_percentage?.btc || 55;
        const totalMc = g.total_market_cap?.usd || 0;
        const altMc = totalMc * (1 - btcDom / 100);
        const ethBtc = priceRes?.ethereum?.btc || 0.025;

        const top50 = marketsRes
          .filter((c: Record<string, unknown>) => (c.id as string) !== "bitcoin" && (c.id as string) !== "tether" && (c.id as string) !== "usd-coin")
          .slice(0, 50)
          .map((c: Record<string, unknown>) => ({
            symbol: (c.symbol as string).toUpperCase(),
            change30d: (c.price_change_percentage_30d_in_currency as number) || 0,
          }));

        const btc30d = marketsRes.find((c: Record<string, unknown>) => c.id === "bitcoin")?.price_change_percentage_30d_in_currency || 0;
        const outperformers = top50.filter((c: { change30d: number }) => c.change30d > btc30d).length;
        const altSeasonIndex = Math.min(100, Math.round((outperformers / Math.max(top50.length, 1)) * 100));

        setData({
          btcDominance: btcDom,
          ethBtcRatio: ethBtc,
          altcoinMarketCap: altMc,
          totalMarketCap: totalMc,
          altSeasonIndex,
          phase: getPhase(altSeasonIndex).label,
          top50Performance: top50.sort((a, b) => b.change30d - a.change30d),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const phase = data ? getPhase(data.altSeasonIndex) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.04em", color: "#f8fafc", textDecoration: "none" }}>
          EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 12 }}>Altcoin Season Index</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 24 }}>
          Are we in altcoin season? Tracks how many of the top 50 altcoins outperform Bitcoin over 30 days.
        </p>

        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {loading || !data || !phase ? (
          <div style={{ textAlign: "center", padding: 80, color: "#64748b" }}>Calculating altseason index...</div>
        ) : (
          <>
            <div style={{
              background: "#0d0d14", border: `1px solid ${phase.color}44`, borderRadius: 16,
              padding: 32, textAlign: "center", marginBottom: 24,
            }}>
              <div style={{ fontSize: 64, fontWeight: 900, color: phase.color, lineHeight: 1 }}>
                {data.altSeasonIndex}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>/ 100</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: phase.color, marginTop: 8 }}>{phase.label}</div>
              <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, maxWidth: 500, margin: "8px auto 0" }}>{phase.desc}</p>

              <div style={{
                marginTop: 20, height: 12, background: "#1e293b", borderRadius: 6,
                position: "relative", overflow: "hidden", maxWidth: 400, margin: "20px auto 0",
              }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 6,
                  width: `${data.altSeasonIndex}%`,
                  background: `linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)`,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 400, margin: "4px auto 0", fontSize: 10, color: "#475569" }}>
                <span>BTC Season</span>
                <span>Alt Season</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "BTC Dominance", value: `${data.btcDominance.toFixed(1)}%`, color: "#f59e0b" },
                { label: "ETH/BTC Ratio", value: data.ethBtcRatio.toFixed(4), color: "#818cf8" },
                { label: "Altcoin Market Cap", value: data.altcoinMarketCap >= 1e12 ? `$${(data.altcoinMarketCap / 1e12).toFixed(2)}T` : `$${(data.altcoinMarketCap / 1e9).toFixed(0)}B`, color: "#22c55e" },
                { label: "Alts Outperforming BTC", value: `${data.top50Performance.filter((c) => c.change30d > 0).length} / ${data.top50Performance.length}`, color: "#10b981" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Top 50 Altcoin Performance (30d)</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.top50Performance.map((c) => (
                  <div
                    key={c.symbol}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: c.change30d >= 0 ? "#22c55e15" : "#ef444415",
                      color: c.change30d >= 0 ? "#22c55e" : "#ef4444",
                      border: `1px solid ${c.change30d >= 0 ? "#22c55e22" : "#ef444422"}`,
                    }}
                  >
                    {c.symbol} {c.change30d >= 0 ? "+" : ""}{c.change30d.toFixed(1)}%
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>What Is Altcoin Season?</h2>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                <p><strong style={{ color: "#e2e8f0" }}>Altcoin season</strong> happens when 75%+ of the top 50 altcoins outperform Bitcoin over a 30-day window. This typically occurs in the later stages of a bull market when traders rotate profits from BTC into smaller coins.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: "#e2e8f0" }}>BTC season</strong> is the opposite — Bitcoin outperforms most altcoins. This often happens at the start of a bull cycle or during risk-off periods.</p>
                <p style={{ marginTop: 8 }}>The index ranges from 0 (extreme BTC dominance) to 100 (extreme alt dominance). Values above 75 = altseason, below 25 = BTC season.</p>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ color: "#475569", fontSize: 12, textDecoration: "none" }}>&larr; back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
