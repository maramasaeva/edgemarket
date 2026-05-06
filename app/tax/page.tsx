"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Trade {
  id: number;
  type: "buy" | "sell";
  coin: string;
  amount: number;
  pricePerCoin: number;
  date: string;
}

const TAX_RATES: Record<string, { short: number; long: number; label: string }> = {
  US: { short: 0.37, long: 0.20, label: "US (Federal)" },
  UK: { short: 0.20, long: 0.20, label: "UK" },
  DE: { short: 0.26, long: 0, label: "Germany (0% after 1yr)" },
  AU: { short: 0.325, long: 0.1625, label: "Australia (50% CGT discount)" },
  CA: { short: 0.2675, long: 0.2675, label: "Canada (50% inclusion)" },
  BE: { short: 0.33, long: 0.33, label: "Belgium (33% speculative)" },
  NL: { short: 0.36, long: 0.36, label: "Netherlands (Box 3)" },
};

let nextId = 1;

export default function TaxPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [country, setCountry] = useState("US");
  const [form, setForm] = useState({ type: "buy" as "buy" | "sell", coin: "BTC", amount: "", price: "", date: "" });

  const addTrade = () => {
    if (!form.amount || !form.price || !form.date) return;
    setTrades((prev) => [
      ...prev,
      {
        id: nextId++,
        type: form.type,
        coin: form.coin,
        amount: parseFloat(form.amount),
        pricePerCoin: parseFloat(form.price),
        date: form.date,
      },
    ]);
    setForm((f) => ({ ...f, amount: "", price: "" }));
  };

  const removeTrade = (id: number) => setTrades((prev) => prev.filter((t) => t.id !== id));

  const analysis = useMemo(() => {
    const rate = TAX_RATES[country];
    const buys: Record<string, { amount: number; cost: number; date: string }[]> = {};
    let totalGain = 0;
    let totalShortTerm = 0;
    let totalLongTerm = 0;

    for (const t of trades) {
      if (t.type === "buy") {
        if (!buys[t.coin]) buys[t.coin] = [];
        buys[t.coin].push({ amount: t.amount, cost: t.pricePerCoin, date: t.date });
      } else {
        const pool = buys[t.coin] || [];
        let remaining = t.amount;
        while (remaining > 0 && pool.length > 0) {
          const lot = pool[0];
          const used = Math.min(remaining, lot.amount);
          const gain = used * (t.pricePerCoin - lot.cost);
          totalGain += gain;

          const buyDate = new Date(lot.date);
          const sellDate = new Date(t.date);
          const holdDays = (sellDate.getTime() - buyDate.getTime()) / 86400000;
          if (holdDays >= 365) {
            totalLongTerm += gain;
          } else {
            totalShortTerm += gain;
          }

          lot.amount -= used;
          remaining -= used;
          if (lot.amount <= 0) pool.shift();
        }
      }
    }

    const shortTermTax = Math.max(0, totalShortTerm * rate.short);
    const longTermTax = Math.max(0, totalLongTerm * rate.long);
    const totalTax = shortTermTax + longTermTax;

    return { totalGain, totalShortTerm, totalLongTerm, shortTermTax, longTermTax, totalTax, rate };
  }, [trades, country]);

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
          <Link href="/dca" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>DCA</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Crypto Tax Calculator</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          estimate capital gains tax // FIFO method
        </p>

        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 10, color: "#818cf8", display: "block", marginBottom: 4 }}>COUNTRY</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                {Object.entries(TAX_RATES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#475569", marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
            Short-term: {(analysis.rate.short * 100).toFixed(0)}% | Long-term ({">"}1yr): {(analysis.rate.long * 100).toFixed(0)}%
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "buy" | "sell" }))} style={{ ...inputStyle, width: 80 }}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <input value={form.coin} onChange={(e) => setForm((f) => ({ ...f, coin: e.target.value.toUpperCase() }))} placeholder="BTC" style={{ ...inputStyle, width: 70 }} />
            <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Amount" style={{ ...inputStyle, width: 100 }} />
            <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="$/coin" style={{ ...inputStyle, width: 100 }} />
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, width: 140 }} />
            <button onClick={addTrade} style={{ padding: "10px 16px", background: "#818cf8", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Add
            </button>
          </div>

          {trades.length > 0 && (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {trades.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #1a1a2e", fontSize: 12 }}>
                  <span style={{ color: t.type === "buy" ? "#22c55e" : "#ef4444", fontWeight: 700, width: 36 }}>{t.type.toUpperCase()}</span>
                  <span style={{ width: 50, color: "#818cf8" }}>{t.coin}</span>
                  <span style={{ width: 80 }}>{t.amount}</span>
                  <span style={{ width: 80, color: "#475569" }}>@${t.pricePerCoin.toLocaleString()}</span>
                  <span style={{ width: 90, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>{t.date}</span>
                  <span style={{ flex: 1, textAlign: "right", fontWeight: 600 }}>${(t.amount * t.pricePerCoin).toLocaleString()}</span>
                  <button onClick={() => removeTrade(t.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {trades.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>TOTAL GAIN/LOSS</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: analysis.totalGain >= 0 ? "#22c55e" : "#ef4444" }}>
                ${analysis.totalGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ background: "#0d0d14", border: "1px solid #ef444433", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>ESTIMATED TAX</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>
                ${analysis.totalTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ background: "#07070a", border: "1px solid #1a1a2e", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>SHORT-TERM</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>${analysis.totalShortTerm.toFixed(2)}</div>
              <div style={{ fontSize: 10, color: "#ef4444" }}>tax: ${analysis.shortTermTax.toFixed(2)}</div>
            </div>
            <div style={{ background: "#07070a", border: "1px solid #1a1a2e", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>LONG-TERM</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>${analysis.totalLongTerm.toFixed(2)}</div>
              <div style={{ fontSize: 10, color: "#22c55e" }}>tax: ${analysis.longTermTax.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div style={{ background: "#0d0d14", border: "1px solid #818cf833", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#818cf8" }}>How it works</div>
          <ul style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20 }}>
            <li><strong style={{ color: "#e2e8f0" }}>FIFO method</strong> — First In, First Out. Oldest coins are sold first.</li>
            <li><strong style={{ color: "#e2e8f0" }}>Short vs Long term</strong> — Gains on coins held &lt;1 year are taxed higher.</li>
            <li><strong style={{ color: "#e2e8f0" }}>Germany special</strong> — 0% tax on crypto held over 1 year.</li>
            <li>This is an <strong style={{ color: "#f59e0b" }}>estimate only</strong>. Consult a tax professional.</li>
          </ul>
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
