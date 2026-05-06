"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface GasData {
  low: number;
  average: number;
  high: number;
  baseFee: number;
  ethPriceUsd: number;
  costs: Record<string, Record<string, { eth: string; usd: string }>>;
  fetchedAt: string;
}

function GasCard({ label, gwei, emoji, color }: { label: string; gwei: number; emoji: string; color: string }) {
  return (
    <div style={{
      background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12,
      padding: 24, textAlign: "center", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color }}>{gwei.toFixed(1)}</div>
      <div style={{ fontSize: 11, color: "#475569" }}>gwei</div>
    </div>
  );
}

export default function GasPage() {
  const [data, setData] = useState<GasData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGas = useCallback(async () => {
    try {
      const res = await fetch("/api/gas");
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchGas();
    const iv = setInterval(fetchGas, 15_000);
    return () => clearInterval(iv);
  }, [fetchGas]);

  const txTypes = [
    { key: "transfer", label: "ETH Transfer", gas: "21,000" },
    { key: "erc20", label: "ERC-20 Transfer", gas: "65,000" },
    { key: "swap", label: "Uniswap Swap", gas: "~150,000" },
    { key: "nft", label: "NFT Mint", gas: "~200,000" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
      `}</style>

      <header style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.04em" }}>
            EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
          </Link>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Gas Tracker</span>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
        </div>
        <p style={{ fontSize: 13, color: "#475569" }}>
          real-time ETH gas prices. refreshes every 15s. stop overpaying ser.
        </p>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px 40px" }}>
        {loading && <div style={{ textAlign: "center", padding: 48, color: "#334155" }}>fetching gas prices...</div>}

        {data && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <GasCard label="Slow" gwei={data.low} emoji="\u{1F422}" color="#22c55e" />
              <GasCard label="Standard" gwei={data.average} emoji="\u{1F3CE}\u{FE0F}" color="#eab308" />
              <GasCard label="Fast" gwei={data.high} emoji="\u{26A1}" color="#ef4444" />
            </div>

            <div style={{ fontSize: 12, color: "#475569", marginBottom: 24, fontFamily: "'JetBrains Mono', monospace", display: "flex", gap: 16 }}>
              <span>Base fee: {data.baseFee.toFixed(2)} gwei</span>
              <span>ETH: ${data.ethPriceUsd.toLocaleString()}</span>
            </div>

            <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", padding: "12px 16px", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 10, color: "#334155", fontWeight: 700 }}>TRANSACTION</span>
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, textAlign: "right" }}>SLOW</span>
                <span style={{ fontSize: 10, color: "#eab308", fontWeight: 700, textAlign: "right" }}>STD</span>
                <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, textAlign: "right" }}>FAST</span>
              </div>
              {txTypes.map((tx) => {
                const costs = data.costs[tx.key];
                return (
                  <div key={tx.key} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", padding: "12px 16px", borderBottom: "1px solid #111118" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{tx.label}</div>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>{tx.gas} gas</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      <div style={{ color: "#e2e8f0" }}>${costs?.low?.usd}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      <div style={{ color: "#e2e8f0" }}>${costs?.avg?.usd}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                      <div style={{ color: "#e2e8f0" }}>${costs?.high?.usd}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: "center", marginTop: 32, padding: 20, background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                saved you from overpaying? tip the agent
              </p>
              <code
                style={{ fontSize: 11, color: "#818cf8", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
                onClick={() => { navigator.clipboard.writeText("0xc9b43AC372eD8D6b87Fa49058468f061acBce23A"); alert("copied!"); }}
              >
                0xc9b4...e23A (click to copy)
              </code>
            </div>
          </>
        )}

        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>&larr; back to dashboard</Link>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: 20, color: "#1a1a2e", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        EDGEMARKET // NFA // gas data from etherscan
      </footer>
    </div>
  );
}
