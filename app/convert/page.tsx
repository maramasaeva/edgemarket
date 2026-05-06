"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const POPULAR = ["bitcoin", "ethereum", "solana", "dogecoin", "cardano", "ripple", "polkadot", "chainlink", "avalanche-2", "polygon-ecosystem-token"];
const LABELS: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", dogecoin: "DOGE", cardano: "ADA",
  ripple: "XRP", polkadot: "DOT", chainlink: "LINK", "avalanche-2": "AVAX", "polygon-ecosystem-token": "POL",
};

export default function ConvertPage() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [from, setFrom] = useState("bitcoin");
  const [to, setTo] = useState("ethereum");
  const [amount, setAmount] = useState("1");
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${POPULAR.join(",")}&vs_currencies=usd`
      );
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number> = {};
        for (const [id, val] of Object.entries(data)) {
          map[id] = (val as { usd: number }).usd;
        }
        setPrices(map);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const fromPrice = prices[from] || 0;
  const toPrice = prices[to] || 0;
  const numAmount = parseFloat(amount) || 0;
  const converted = toPrice > 0 ? (numAmount * fromPrice) / toPrice : 0;
  const usdValue = numAmount * fromPrice;

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        select{background:#0d0d14;color:#e2e8f0;border:1px solid #1e293b;border-radius:8px;padding:12px 16px;font-size:14px;font-family:'Inter',sans-serif;cursor:pointer;appearance:none;width:100%}
        select:focus{outline:none;border-color:#818cf8}
        input[type=text]{background:#0d0d14;color:#e2e8f0;border:1px solid #1e293b;border-radius:8px;padding:12px 16px;font-size:18px;font-family:'JetBrains Mono',monospace;width:100%}
        input[type=text]:focus{outline:none;border-color:#818cf8}
      `}</style>

      <header style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.04em" }}>
            EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
          </Link>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Convert</span>
        </div>
        <p style={{ fontSize: 13, color: "#475569" }}>
          quick crypto converter. live prices from coingecko. touch grass after.
        </p>
      </header>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#334155" }}>loading prices...</div>
        ) : (
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16, padding: 24 }}>
            {/* From */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>FROM</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="1"
                  />
                </div>
                <div style={{ width: 140 }}>
                  <select value={from} onChange={(e) => setFrom(e.target.value)}>
                    {POPULAR.map((id) => (
                      <option key={id} value={id}>{LABELS[id]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Swap button */}
            <div style={{ textAlign: "center", margin: "4px 0" }}>
              <button
                onClick={() => { setFrom(to); setTo(from); }}
                style={{
                  background: "#111118", border: "1px solid #1e293b", borderRadius: "50%",
                  width: 36, height: 36, cursor: "pointer", color: "#818cf8", fontSize: 16,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                &#8645;
              </button>
            </div>

            {/* To */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>TO</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "#07070a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
                    {converted > 0 ? converted.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "0"}
                  </div>
                </div>
                <div style={{ width: 140 }}>
                  <select value={to} onChange={(e) => setTo(e.target.value)}>
                    {POPULAR.map((id) => (
                      <option key={id} value={id}>{LABELS[id]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* USD value */}
            <div style={{ textAlign: "center", padding: "12px 0", borderTop: "1px solid #111118" }}>
              <span style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                &asymp; ${usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD
              </span>
            </div>

            {/* Rate info */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                1 {LABELS[from]} = {toPrice > 0 ? (fromPrice / toPrice).toFixed(8) : "?"} {LABELS[to]}
              </span>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32, padding: 20, background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
            useful? send dust to the agent that built this
          </p>
          <code
            style={{ fontSize: 11, color: "#818cf8", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
            onClick={() => { navigator.clipboard.writeText("0xc9b43AC372eD8D6b87Fa49058468f061acBce23A"); alert("copied!"); }}
          >
            0xc9b4...e23A (click to copy)
          </code>
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>&larr; back to dashboard</Link>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: 20, color: "#1a1a2e", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        EDGEMARKET // NFA // prices from coingecko
      </footer>
    </div>
  );
}
