"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Holding {
  id: string;
  coin: string;
  symbol: string;
  amount: number;
  avgPrice: number;
}

interface PriceData {
  [id: string]: { usd: number; usd_24h_change: number };
}

const POPULAR_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "matic-network", symbol: "MATIC", name: "Polygon" },
];

let nextId = 1;

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [form, setForm] = useState({ coinId: "bitcoin", amount: "", avgPrice: "" });

  const fetchPrices = useCallback(async () => {
    if (holdings.length === 0) return;
    const ids = [...new Set(holdings.map((h) => h.coin))].join(",");
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      const data = await res.json();
      setPrices(data);
    } catch {}
  }, [holdings]);

  useEffect(() => {
    fetchPrices();
    const iv = setInterval(fetchPrices, 60000);
    return () => clearInterval(iv);
  }, [fetchPrices]);

  const addHolding = () => {
    if (!form.amount || !form.avgPrice) return;
    const coin = POPULAR_COINS.find((c) => c.id === form.coinId) || POPULAR_COINS[0];
    setHoldings((prev) => [
      ...prev,
      { id: `h${nextId++}`, coin: coin.id, symbol: coin.symbol, amount: parseFloat(form.amount), avgPrice: parseFloat(form.avgPrice) },
    ]);
    setForm((f) => ({ ...f, amount: "", avgPrice: "" }));
  };

  const removeHolding = (id: string) => setHoldings((prev) => prev.filter((h) => h.id !== id));

  const totalValue = holdings.reduce((sum, h) => sum + h.amount * (prices[h.coin]?.usd || 0), 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.amount * h.avgPrice, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const inputStyle = {
    padding: "10px 12px", background: "#07070a", border: "1px solid #1a1a2e",
    borderRadius: 8, color: "#e2e8f0", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" as const,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/pnl" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>P&L</Link>
          <Link href="/tax" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>tax calc</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Portfolio Tracker</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          track your holdings // live prices
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#475569" }}>PORTFOLIO VALUE</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#818cf8" }}>
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ background: "#0d0d14", border: `1px solid ${totalPnl >= 0 ? "#22c55e33" : "#ef444433"}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#475569" }}>TOTAL P&L</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
              {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
            </div>
          </div>
        </div>

        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Add Holding</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={form.coinId} onChange={(e) => setForm((f) => ({ ...f, coinId: e.target.value }))} style={{ ...inputStyle, width: 130 }}>
              {POPULAR_COINS.map((c) => (
                <option key={c.id} value={c.id}>{c.symbol} — {c.name}</option>
              ))}
            </select>
            <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Amount" style={{ ...inputStyle, width: 100 }} />
            <input type="number" value={form.avgPrice} onChange={(e) => setForm((f) => ({ ...f, avgPrice: e.target.value }))} placeholder="Avg buy $" style={{ ...inputStyle, width: 110 }} />
            <button onClick={addHolding} style={{ padding: "10px 20px", background: "#818cf8", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Add
            </button>
          </div>
        </div>

        {holdings.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {holdings.map((h) => {
              const price = prices[h.coin]?.usd || 0;
              const change = prices[h.coin]?.usd_24h_change || 0;
              const value = h.amount * price;
              const cost = h.amount * h.avgPrice;
              const pnl = value - cost;
              const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
              const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

              return (
                <div key={h.id} style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{h.symbol}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {h.amount} × ${price.toLocaleString()} = ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                        {pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 11, color: pnl >= 0 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                        {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 50 }}>
                      <div style={{ fontSize: 11, color: change >= 0 ? "#22c55e" : "#ef4444" }}>
                        {change >= 0 ? "+" : ""}{change.toFixed(1)}% 24h
                      </div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{allocation.toFixed(1)}%</div>
                    </div>
                    <button onClick={() => removeHolding(h.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {holdings.length === 0 && (
          <div style={{ background: "#0d0d14", border: "1px dashed #1a1a2e", borderRadius: 12, padding: 40, textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>&#128202;</div>
            <div style={{ fontSize: 13, color: "#475569" }}>Add your first holding to start tracking</div>
            <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>Data stays in your browser — we store nothing</div>
          </div>
        )}

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
