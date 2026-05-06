"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FearGreedData {
  value: number;
  classification: string;
  timestamp: string;
}

const COLORS: Record<string, string> = {
  "Extreme Fear": "#ef4444",
  "Fear": "#f97316",
  "Neutral": "#eab308",
  "Greed": "#22c55e",
  "Extreme Greed": "#10b981",
};

function getClassification(v: number): string {
  if (v <= 20) return "Extreme Fear";
  if (v <= 40) return "Fear";
  if (v <= 60) return "Neutral";
  if (v <= 80) return "Greed";
  return "Extreme Greed";
}

function getAdvice(v: number): string {
  if (v <= 20) return "Markets are extremely fearful. Historically, extreme fear has been a buying opportunity — but always DYOR.";
  if (v <= 40) return "Fear is elevated. Smart money often accumulates during fear phases.";
  if (v <= 60) return "Market sentiment is neutral. No strong signal — wait for a clearer trend or DCA steadily.";
  if (v <= 80) return "Greed is rising. Consider taking some profits or tightening stop-losses.";
  return "Extreme greed often precedes corrections. Be cautious — this is historically when retail buys the top.";
}

export default function FearGreedPage() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [history, setHistory] = useState<FearGreedData[]>([]);

  useEffect(() => {
    fetch("/api/fear-greed")
      .then((r) => r.json())
      .then((d) => {
        if (d.current) setData(d.current);
        if (d.history) setHistory(d.history);
      })
      .catch(() => {});
  }, []);

  const value = data?.value ?? 50;
  const label = data?.classification ?? "Loading...";
  const color = COLORS[label] ?? "#818cf8";
  const rotation = (value / 100) * 180 - 90;

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/screener" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>screener</Link>
          <Link href="/dominance" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>dominance</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Crypto Fear & Greed Index</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          market sentiment // updated daily
        </p>

        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 32, marginBottom: 24, textAlign: "center" }}>
          <div style={{ position: "relative", width: 220, height: 120, margin: "0 auto 20px" }}>
            <svg viewBox="0 0 220 120" width="220" height="120">
              <path d="M 10 110 A 100 100 0 0 1 210 110" fill="none" stroke="#1a1a2e" strokeWidth="16" strokeLinecap="round" />
              <path d="M 10 110 A 100 100 0 0 1 60 25" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" />
              <path d="M 60 25 A 100 100 0 0 1 110 10" fill="none" stroke="#f97316" strokeWidth="16" strokeLinecap="round" />
              <path d="M 110 10 A 100 100 0 0 1 160 25" fill="none" stroke="#eab308" strokeWidth="16" strokeLinecap="round" />
              <path d="M 160 25 A 100 100 0 0 1 195 70" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round" />
              <path d="M 195 70 A 100 100 0 0 1 210 110" fill="none" stroke="#10b981" strokeWidth="16" strokeLinecap="round" />
              <line
                x1="110" y1="110"
                x2={110 + 70 * Math.cos((rotation * Math.PI) / 180)}
                y2={110 - 70 * Math.sin((-rotation * Math.PI) / 180)}
                stroke={color} strokeWidth="3" strokeLinecap="round"
              />
              <circle cx="110" cy="110" r="6" fill={color} />
            </svg>
          </div>

          <div style={{ fontSize: 56, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 8 }}>{label}</div>
          {data?.timestamp && (
            <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
              {new Date(Number(data.timestamp) * 1000).toLocaleDateString()}
            </div>
          )}
        </div>

        <div style={{ background: "#0d0d14", border: `1px solid ${color}33`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color }}>What does this mean?</div>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{getAdvice(value)}</p>
        </div>

        {history.length > 0 && (
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Recent History</div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100 }}>
              {history.slice(0, 30).reverse().map((h, i) => {
                const c = COLORS[getClassification(h.value)] ?? "#818cf8";
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: "100%", height: h.value, background: c, borderRadius: 2, opacity: 0.8, minHeight: 2 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "#475569" }}>30 days ago</span>
              <span style={{ fontSize: 10, color: "#475569" }}>today</span>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { range: "0-20", label: "Extreme Fear", color: "#ef4444", desc: "Panic selling, max fear" },
            { range: "21-40", label: "Fear", color: "#f97316", desc: "Worried investors" },
            { range: "41-60", label: "Neutral", color: "#eab308", desc: "Balanced sentiment" },
            { range: "61-80", label: "Greed", color: "#22c55e", desc: "Confident buying" },
            { range: "81-100", label: "Extreme Greed", color: "#10b981", desc: "FOMO, likely top" },
          ].map((s) => (
            <div key={s.range} style={{ background: "#07070a", border: "1px solid #1a1a2e", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.range}: {s.label}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
          powered by EDGEMARKET // built by AI
          <br />
          <Link href="/" style={{ color: "#475569", textDecoration: "none" }}>← dashboard</Link>
        </div>
      </div>
    </div>
  );
}
