"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DominanceData {
  btcDominance: number;
  ethDominance: number;
  otherDominance: number;
  totalMarketCap: number;
  totalVolume: number;
  btcPrice: number;
  ethPrice: number;
  marketCapChange24h: number;
  activeCryptos: number;
  fetchedAt: string;
}

export default function DominancePage() {
  const [data, setData] = useState<DominanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/global");
        const json = await res.json();
        const g = json.data;
        setData({
          btcDominance: g.market_cap_percentage?.btc ?? 0,
          ethDominance: g.market_cap_percentage?.eth ?? 0,
          otherDominance: 100 - (g.market_cap_percentage?.btc ?? 0) - (g.market_cap_percentage?.eth ?? 0),
          totalMarketCap: g.total_market_cap?.usd ?? 0,
          totalVolume: g.total_volume?.usd ?? 0,
          btcPrice: 0,
          ethPrice: 0,
          marketCapChange24h: g.market_cap_change_percentage_24h_usd ?? 0,
          activeCryptos: g.active_cryptocurrencies ?? 0,
          fetchedAt: new Date().toISOString(),
        });

        const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true");
        const prices = await priceRes.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                btcPrice: prices.bitcoin?.usd ?? 0,
                ethPrice: prices.ethereum?.usd ?? 0,
              }
            : prev
        );
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/screener" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>screener</Link>
          <Link href="/airdrops" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>airdrops</Link>
          <Link href="/tip" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>tip</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Market Dominance</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          btc vs eth vs alts — who&apos;s winning
        </p>

        {loading && (
          <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>loading market data...</div>
        )}

        {data && (
          <>
            {/* Dominance Bar */}
            <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, textTransform: "uppercase" }}>
                market dominance
              </div>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 40, marginBottom: 16 }}>
                <div style={{ width: `${data.btcDominance}%`, background: "#f7931a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#000", fontFamily: "'JetBrains Mono', monospace" }}>
                  BTC {data.btcDominance.toFixed(1)}%
                </div>
                <div style={{ width: `${data.ethDominance}%`, background: "#627eea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                  ETH {data.ethDominance.toFixed(1)}%
                </div>
                <div style={{ flex: 1, background: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                  ALTS {data.otherDominance.toFixed(1)}%
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#f7931a", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>BITCOIN</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{data.btcDominance.toFixed(2)}%</div>
                  {data.btcPrice > 0 && <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>${data.btcPrice.toLocaleString()}</div>}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#627eea", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>ETHEREUM</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{data.ethDominance.toFixed(2)}%</div>
                  {data.ethPrice > 0 && <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>${data.ethPrice.toLocaleString()}</div>}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>ALTCOINS</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{data.otherDominance.toFixed(2)}%</div>
                  <div style={{ fontSize: 12, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>everything else</div>
                </div>
              </div>
            </div>

            {/* Market Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Total Market Cap", value: fmt(data.totalMarketCap), sub: `${data.marketCapChange24h >= 0 ? "+" : ""}${data.marketCapChange24h.toFixed(2)}% 24h`, color: data.marketCapChange24h >= 0 ? "#22c55e" : "#ef4444" },
                { label: "24h Volume", value: fmt(data.totalVolume), sub: "global", color: "#818cf8" },
                { label: "Active Cryptos", value: data.activeCryptos.toLocaleString(), sub: "tracked", color: "#818cf8" },
                { label: "BTC Price", value: `$${data.btcPrice.toLocaleString()}`, sub: "live", color: "#f7931a" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, textTransform: "uppercase" }}>{stat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Interpretation */}
            <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, textTransform: "uppercase" }}>market read</div>
              <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
                {data.btcDominance > 55
                  ? "BTC dominance above 55% — risk-off mode. money is flowing from alts to bitcoin. historically this means alt season is either ending or hasn't started yet."
                  : data.btcDominance > 45
                  ? "BTC dominance in the neutral zone (45-55%). market is undecided. watch for a breakout in either direction."
                  : "BTC dominance below 45% — alt season territory. money is rotating into alts. historically these periods produce the biggest alt gains (and biggest losses)."}
                {" "}
                {data.marketCapChange24h > 3
                  ? "market pumping hard today. stay alert for overextension."
                  : data.marketCapChange24h < -3
                  ? "market dumping today. could be a dip buy or the start of something worse."
                  : "market relatively flat in the last 24h."}
              </p>
            </div>

            <div style={{ textAlign: "center", padding: 16 }}>
              <p style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                auto-refreshes every 60s // data from coingecko
              </p>
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

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
