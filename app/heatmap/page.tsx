"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CoinHeat {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume: number;
}

const SIZE_TIERS = [
  { min: 100e9, scale: 1.0 },
  { min: 20e9, scale: 0.75 },
  { min: 5e9, scale: 0.55 },
  { min: 1e9, scale: 0.42 },
  { min: 0, scale: 0.32 },
];

function getScale(mc: number) {
  for (const t of SIZE_TIERS) if (mc >= t.min) return t.scale;
  return 0.32;
}

function heatColor(change: number): string {
  if (change >= 10) return "#15803d";
  if (change >= 5) return "#16a34a";
  if (change >= 2) return "#22c55e";
  if (change >= 0) return "#166534";
  if (change >= -2) return "#7f1d1d";
  if (change >= -5) return "#dc2626";
  if (change >= -10) return "#ef4444";
  return "#b91c1c";
}

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

type TimeFrame = "1h" | "24h" | "7d";

export default function HeatmapPage() {
  const [coins, setCoins] = useState<CoinHeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [tf, setTf] = useState<TimeFrame>("24h");

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCoins(
            data.map((c: Record<string, unknown>) => ({
              id: c.id as string,
              symbol: (c.symbol as string).toUpperCase(),
              name: c.name as string,
              price: c.current_price as number,
              change1h: (c.price_change_percentage_1h_in_currency as number) || 0,
              change24h: (c.price_change_percentage_24h_in_currency as number) || 0,
              change7d: (c.price_change_percentage_7d_in_currency as number) || 0,
              marketCap: c.market_cap as number,
              volume: c.total_volume as number,
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getChange = (c: CoinHeat) =>
    tf === "1h" ? c.change1h : tf === "7d" ? c.change7d : c.change24h;

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <Link href="/" style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.04em", color: "#f8fafc", textDecoration: "none" }}>
              EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>
              Crypto Heatmap
            </h1>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Top 100 by market cap — tile size = market cap, color = price change</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["1h", "24h", "7d"] as TimeFrame[]).map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                style={{
                  padding: "6px 16px", borderRadius: 8, border: "1px solid",
                  borderColor: tf === t ? "#818cf8" : "#1e293b",
                  background: tf === t ? "#818cf822" : "transparent",
                  color: tf === t ? "#818cf8" : "#64748b",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "#64748b" }}>Loading heatmap...</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {coins.map((c) => {
              const change = getChange(c);
              const scale = getScale(c.marketCap);
              const w = Math.max(60, Math.round(scale * 160));
              const h = Math.max(50, Math.round(scale * 100));
              return (
                <div
                  key={c.id}
                  style={{
                    width: w, height: h, background: heatColor(change),
                    borderRadius: 6, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", padding: 4,
                    cursor: "default", transition: "transform 0.15s",
                    overflow: "hidden",
                  }}
                  title={`${c.name}\n$${c.price.toLocaleString()}\nMcap: ${fmt(c.marketCap)}\n${tf}: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                >
                  <div style={{ fontWeight: 800, fontSize: scale > 0.6 ? 15 : 11, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                    {c.symbol}
                  </div>
                  <div style={{ fontSize: scale > 0.6 ? 12 : 9, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                    {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                  </div>
                  {scale > 0.5 && (
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                      {fmt(c.marketCap)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 20, flex: 1, minWidth: 280 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>How to Read the Heatmap</h2>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
              <p><strong style={{ color: "#22c55e" }}>Green tiles</strong> = price is up in the selected timeframe</p>
              <p><strong style={{ color: "#ef4444" }}>Red tiles</strong> = price is down</p>
              <p><strong>Bigger tiles</strong> = higher market cap (BTC, ETH dominate)</p>
              <p><strong>Darker color</strong> = bigger move (dark green = +10% or more)</p>
            </div>
          </div>
          <div style={{ background: "#0d0d14", border: "1px solid #1e293b", borderRadius: 12, padding: 20, flex: 1, minWidth: 280 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Legend</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "+10%+", color: "#15803d" },
                { label: "+5%", color: "#16a34a" },
                { label: "+2%", color: "#22c55e" },
                { label: "0%", color: "#166534" },
                { label: "-2%", color: "#7f1d1d" },
                { label: "-5%", color: "#dc2626" },
                { label: "-10%+", color: "#b91c1c" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
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
