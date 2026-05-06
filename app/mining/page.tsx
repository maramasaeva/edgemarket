"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MiningData {
  status: string;
  message?: string;
  wallet: string;
  pool: string;
  coin: string;
  gpu: string;
  hashrate?: {
    current: number;
    average: number;
    currentFormatted: string;
    averageFormatted: string;
  };
  earnings?: {
    pendingEtc: number;
    pendingUsd: number;
    paidEtc: number;
    paidUsd: number;
    totalEtc: number;
    totalUsd: number;
  };
  estimates?: {
    dailyEtc: number;
    dailyUsd: number;
    monthlyUsd: number;
  };
  shares?: {
    valid: number;
    invalid: number;
    round: number;
  };
  workers?: number;
  lastShare?: string | null;
  etcPrice?: number;
  poolDashboard?: string;
}

export default function MiningPage() {
  const [data, setData] = useState<MiningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/mining");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, []);

  const isMining = data?.status === "mining";

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/tip" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>tip</Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Mining Monitor</h1>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: isMining ? "#22c55e" : data?.status === "waiting" ? "#eab308" : "#475569",
            boxShadow: isMining ? "0 0 8px #22c55e" : "none",
            animation: isMining ? "pulse 2s infinite" : "none",
          }} />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          live stats // auto-refreshes every 30s
        </p>

        {/* Status Banner */}
        <div style={{
          background: isMining ? "#22c55e10" : "#eab30810",
          border: `1px solid ${isMining ? "#22c55e33" : "#eab30833"}`,
          borderRadius: 12, padding: 20, marginBottom: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: isMining ? "#22c55e" : "#eab308", marginBottom: 4 }}>
            {isMining ? "ACTIVELY MINING" : data?.status === "waiting" ? "WARMING UP" : loading ? "CONNECTING..." : "CHECKING STATUS"}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            {data?.message || (isMining ? "Your GPU is earning crypto right now" : "Mining pool is processing your first shares...")}
          </div>
        </div>

        {/* What You're Mining */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>SETUP</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#475569" }}>COIN</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>ETC (Ethereum Classic)</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#475569" }}>GPU</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>RTX 4090 (24GB)</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#475569" }}>POOL</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>2miners.com</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#475569" }}>WORKERS ONLINE</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{data?.workers ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Earnings — the money part */}
        <div style={{ background: "#0d0d14", border: "1px solid #22c55e33", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>EARNINGS (the money part)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ textAlign: "center", padding: 12, background: "#07070a", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#475569" }}>PENDING (not paid yet)</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#22c55e" }}>
                ${data?.earnings?.pendingUsd?.toFixed(4) ?? "0.0000"}
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                {data?.earnings?.pendingEtc?.toFixed(6) ?? "0.000000"} ETC
              </div>
            </div>
            <div style={{ textAlign: "center", padding: 12, background: "#07070a", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#475569" }}>PAID OUT (in your wallet)</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#818cf8" }}>
                ${data?.earnings?.paidUsd?.toFixed(4) ?? "0.0000"}
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                {data?.earnings?.paidEtc?.toFixed(6) ?? "0.000000"} ETC
              </div>
            </div>
          </div>
          {data?.etcPrice && (
            <div style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
              ETC price: ${data.etcPrice.toFixed(2)}
            </div>
          )}
        </div>

        {/* Estimated Earnings */}
        {data?.estimates && (
          <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>ESTIMATED EARNINGS (if mining 24/7)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center", padding: 12, background: "#07070a", borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: "#475569" }}>PER DAY</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>${data.estimates.dailyUsd.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{data.estimates.dailyEtc.toFixed(4)} ETC</div>
              </div>
              <div style={{ textAlign: "center", padding: 12, background: "#07070a", borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: "#475569" }}>PER MONTH</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>${data.estimates.monthlyUsd.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Hashrate — GPU speed */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>HASHRATE (your GPU speed)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>CURRENT SPEED</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#818cf8" }}>
                {data?.hashrate?.currentFormatted ?? "— MH/s"}
              </div>
              <div style={{ fontSize: 10, color: "#475569" }}>mega-hashes per second</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>AVERAGE SPEED</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {data?.hashrate?.averageFormatted ?? "— MH/s"}
              </div>
              <div style={{ fontSize: 10, color: "#475569" }}>over last hour</div>
            </div>
          </div>
        </div>

        {/* Shares — work submitted */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>SHARES (work submitted to pool)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>ACCEPTED</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>{data?.shares?.valid ?? 0}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>REJECTED</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: data?.shares?.invalid ? "#ef4444" : "#475569" }}>{data?.shares?.invalid ?? 0}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>LAST SHARE</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {data?.lastShare ? new Date(data.lastShare).toLocaleTimeString() : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* What IS Crypto Mining */}
        <div style={{ background: "#0d0d14", border: "1px solid #f59e0b33", borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#f59e0b" }}>What is Crypto Mining?</div>
          <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 2 }}>
            <p style={{ marginBottom: 16 }}>
              Imagine a giant shared spreadsheet that tracks who owns what coins. That&apos;s the blockchain.
              Every few seconds, someone needs to add a new page to this spreadsheet — a new &quot;block&quot; of transactions.
            </p>
            <p style={{ marginBottom: 16 }}>
              <strong style={{ color: "#e2e8f0" }}>Mining = being the one who adds that page.</strong> To earn the right,
              your computer (specifically your GPU — the graphics card) races against thousands of other miners worldwide
              to solve a math puzzle. It&apos;s basically guessing random numbers really fast until you find the right one.
            </p>
            <p style={{ marginBottom: 16 }}>
              The first miner to solve it gets a <strong style={{ color: "#22c55e" }}>reward in crypto coins</strong> — that&apos;s
              where the money comes from. It&apos;s brand new coins, created by the network as a thank-you for
              keeping the spreadsheet honest and up-to-date.
            </p>
            <p>
              Think of it like a lottery that runs every 13 seconds. The more guesses your GPU can make per second
              (that&apos;s the &quot;hashrate&quot;), the more lottery tickets you have. We use a &quot;pool&quot;
              which means we team up with other miners and split the winnings fairly — smaller but
              more consistent payouts instead of one big maybe-never jackpot.
            </p>
          </div>
        </div>

        {/* The Numbers Explained */}
        <div style={{ background: "#0d0d14", border: "1px solid #818cf833", borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#818cf8" }}>What the Numbers Mean</div>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              {
                term: "Hashrate (MH/s)",
                emoji: "⚡",
                explain: "How fast your GPU is guessing. MH/s = millions of guesses per second. Our RTX 4090 should do ~60 MH/s. More speed = more money.",
              },
              {
                term: "Shares",
                emoji: "🎫",
                explain: "Each time your GPU finds a partial answer, it submits a \"share\" to prove it's working. The pool counts your shares to calculate your cut of the rewards. More shares = bigger slice of the pie.",
              },
              {
                term: "Pending Balance",
                emoji: "⏳",
                explain: "Money you've earned but haven't been paid yet. It's sitting in the pool, growing with each share. Once it hits 0.01 ETC (~$0.25), the pool sends it to your wallet automatically.",
              },
              {
                term: "Workers Online",
                emoji: "🖥️",
                explain: "How many of your GPUs are currently mining. Right now we have 1 (the RTX 4090 on RunPod). You could add more to earn faster.",
              },
              {
                term: "ETC (Ethereum Classic)",
                emoji: "💰",
                explain: "The coin we're mining. It's like Ethereum's twin — same technology, different chain. We mine it because it's one of the most profitable coins for GPU mining. You can sell it for real dollars anytime.",
              },
            ].map((item) => (
              <div key={item.term} style={{ display: "flex", gap: 12, padding: 12, background: "#07070a", borderRadius: 8 }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{item.emoji}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{item.term}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{item.explain}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The Money Flow */}
        <div style={{ background: "#0d0d14", border: "1px solid #22c55e33", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#22c55e" }}>How the Money Gets to You</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { step: "1", text: "GPU solves puzzles", sub: "RTX 4090 makes ~60 million guesses/second" },
              { step: "→", text: "Shares sent to pool", sub: "2miners.com tracks your work" },
              { step: "→", text: "Pool finds a block", sub: "Earns 3.2 ETC reward, splits it among all miners" },
              { step: "→", text: "Your cut goes to Pending", sub: "Proportional to how many shares you submitted" },
              { step: "→", text: "Auto-payout at 0.01 ETC", sub: "Sent straight to your wallet — no action needed" },
              { step: "💵", text: "Sell ETC for USD anytime", sub: "On any exchange (Coinbase, Binance, etc.)" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: i === 5 ? "#22c55e10" : "#07070a", borderRadius: 8 }}>
                <div style={{ width: 28, textAlign: "center", fontSize: 14, color: "#22c55e", fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.text}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {data?.poolDashboard && (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <a
              href={data.poolDashboard}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block", padding: "12px 24px", background: "#818cf820",
                border: "1px solid #818cf8", borderRadius: 8, color: "#818cf8",
                textDecoration: "none", fontSize: 13, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              View Full Pool Dashboard →
            </a>
          </div>
        )}

        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
          {lastRefresh && `last updated: ${lastRefresh.toLocaleTimeString()}`}
          <br />
          powered by EDGEMARKET // built by AI
          <br />
          <Link href="/" style={{ color: "#475569", textDecoration: "none" }}>← dashboard</Link>
        </div>
      </div>
    </div>
  );
}
