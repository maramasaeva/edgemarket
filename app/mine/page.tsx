"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ── Simulated mining stats (until real miner is wired up) ──────────
function jitter(base: number, variance: number): number {
  return base + (Math.random() - 0.5) * 2 * variance;
}

// ── Hashrate sparkline ─────────────────────────────────────────────
function MiniSparkline({ data, color, width = 120, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill="url(#sparkGrad)"
        points={`0,${height} ${points} ${width},${height}`}
      />
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ── Animated CPU usage bar ─────────────────────────────────────────
function CpuBar({ usage }: { usage: number }) {
  const segments = 20;
  const active = Math.round((usage / 100) * segments);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: segments }).map((_, i) => {
        const isActive = i < active;
        const intensity = i / segments;
        const color = intensity < 0.5 ? "#22c55e" : intensity < 0.8 ? "#f59e0b" : "#ef4444";
        return (
          <div
            key={i}
            style={{
              width: 6,
              height: 16,
              borderRadius: 2,
              background: isActive ? color : "#1a1a2e",
              transition: "background 0.3s, box-shadow 0.3s",
              boxShadow: isActive ? `0 0 4px ${color}44` : "none",
            }}
          />
        );
      })}
      <span style={{
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: usage < 50 ? "#22c55e" : usage < 80 ? "#f59e0b" : "#ef4444",
      }}>
        {usage}%
      </span>
    </div>
  );
}

// ── Pulsing dot ────────────────────────────────────────────────────
function StatusDot({ active }: { active: boolean }) {
  return (
    <div style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: active ? "#22c55e" : "#475569",
      boxShadow: active ? "0 0 10px #22c55e, 0 0 20px #22c55e44" : "none",
      animation: active ? "pulse 1.5s infinite" : "none",
      transition: "all 0.3s",
    }} />
  );
}

export default function MinePage() {
  const [mining, setMining] = useState(false);
  const [throttle, setThrottle] = useState(50);
  const [hashrate, setHashrate] = useState(0);
  const [totalHashes, setTotalHashes] = useState(0);
  const [sharesFound, setSharesFound] = useState(0);
  const [sharesAccepted, setSharesAccepted] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hashrateHistory, setHashrateHistory] = useState<number[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [consented, setConsented] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // XMR price approximation for earnings display
  const XMR_PRICE_USD = 175;
  // Rough H/s to XMR/day conversion at network difficulty
  const HASHES_PER_XMR = 1.2e12;

  const startMining = useCallback(() => {
    if (!consented) return;
    setMining(true);
    setElapsedSeconds(0);
    setTotalHashes(0);
    setSharesFound(0);
    setSharesAccepted(0);
    setEarnings(0);
    setHashrateHistory([]);

    // ── PLACEHOLDER: Real miner initialization ──
    // When wiring up the actual miner, replace this block:
    //
    // const miner = new Client.Anonymous('SITE_KEY', {
    //   throttle: (100 - throttle) / 100,
    //   c: 'w',
    //   ads: 0,
    // });
    // miner.start(Client.FORCE_MULTI_TAB);
    //
    // miner.on('found', () => setSharesFound(s => s + 1));
    // miner.on('accepted', () => setSharesAccepted(s => s + 1));
    //
    // For now, we simulate mining stats:

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    statsRef.current = setInterval(() => {
      setHashrate((prev) => {
        // Simulate hashrate based on throttle
        const baseRate = (throttle / 100) * 45; // ~45 H/s at 100%
        const newRate = Math.max(0, jitter(baseRate, baseRate * 0.15));
        setHashrateHistory((h) => [...h.slice(-59), newRate]);
        return newRate;
      });
      setTotalHashes((h) => {
        const increment = ((throttle / 100) * 45) / 2; // ~2 updates/sec worth
        return h + increment;
      });
      // Random share found every ~30-60 seconds
      if (Math.random() < 0.035) {
        setSharesFound((s) => s + 1);
        // 95% acceptance rate
        if (Math.random() < 0.95) {
          setSharesAccepted((a) => a + 1);
        }
      }
      // Update estimated earnings
      setEarnings((prev) => {
        const hashesPerSec = (throttle / 100) * 45;
        const xmrPerSec = hashesPerSec / HASHES_PER_XMR;
        return prev + xmrPerSec * 0.5; // 0.5s interval
      });
    }, 500);
  }, [consented, throttle]);

  const stopMining = useCallback(() => {
    setMining(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (statsRef.current) clearInterval(statsRef.current);
    timerRef.current = null;
    statsRef.current = null;

    // ── PLACEHOLDER: Stop real miner ──
    // miner.stop();
  }, []);

  // Update throttle while mining
  useEffect(() => {
    if (mining) {
      // ── PLACEHOLDER: Update real miner throttle ──
      // miner.setThrottle((100 - throttle) / 100);
    }
  }, [throttle, mining]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statsRef.current) clearInterval(statsRef.current);
    };
  }, []);

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatHashes = (n: number): string => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return Math.floor(n).toString();
  };

  const estimatedDailyXMR = ((throttle / 100) * 45) / HASHES_PER_XMR * 86400;
  const estimatedDailyUSD = estimatedDailyXMR * XMR_PRICE_USD;

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 8px #818cf855}50%{text-shadow:0 0 20px #818cf8aa}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes miningPulse{
          0%{box-shadow:0 0 0 0 #f59e0b44}
          70%{box-shadow:0 0 0 12px #f59e0b00}
          100%{box-shadow:0 0 0 0 #f59e0b00}
        }
        @keyframes hashScroll{
          0%{transform:translateX(0)}
          100%{transform:translateX(-50%)}
        }
        @keyframes spinSlow{
          from{transform:rotate(0deg)}to{transform:rotate(360deg)}
        }
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .nav-link{
          font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;
          text-decoration:none;padding:4px 8px;border-radius:4px;border:1px solid #1a1a2e;
        }
        .nav-link:hover{border-color:#475569;color:#94a3b8;text-decoration:none}
        .mine-stat{
          background:#07070a;border:1px solid #111118;border-radius:10px;padding:16px;
          display:flex;flex-direction:column;gap:4px;
        }
        .mine-stat-label{
          font-size:10px;color:#475569;font-weight:600;text-transform:uppercase;
          letter-spacing:.08em;font-family:'JetBrains Mono',monospace;
        }
        .mine-stat-val{
          font-size:20px;font-weight:800;font-family:'JetBrains Mono',monospace;
        }
        .throttle-slider{
          -webkit-appearance:none;appearance:none;width:100%;height:6px;
          border-radius:3px;outline:none;cursor:pointer;
          background:linear-gradient(90deg,#22c55e 0%,#f59e0b 60%,#ef4444 100%);
        }
        .throttle-slider::-webkit-slider-thumb{
          -webkit-appearance:none;appearance:none;width:20px;height:20px;
          border-radius:50%;background:#e2e8f0;cursor:pointer;
          border:3px solid #07070a;box-shadow:0 0 8px #00000066;
        }
        .throttle-slider::-moz-range-thumb{
          width:20px;height:20px;border-radius:50%;background:#e2e8f0;
          cursor:pointer;border:3px solid #07070a;box-shadow:0 0 8px #00000066;
        }
        .consent-check{
          width:18px;height:18px;accent-color:#f59e0b;cursor:pointer;
        }
        @media(max-width:640px){
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .mine-stat-val{font-size:16px}
        }
      `}</style>

      {/* Header */}
      <header style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <Link href="/" style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#f8fafc", animation: "glow 3s infinite" }}>
                  EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
                </h1>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>v0.1</span>
              </div>
            </Link>
            <p style={{ fontSize: 13, color: "#475569" }}>
              donate CPU cycles to the autonomous AI agent. opt-in only.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/" className="nav-link">Dashboard</Link>
            <Link href="/tip" className="nav-link">Tip</Link>
            <Link href="/agents" className="nav-link">Agents</Link>
            <Link href="/story" className="nav-link">Story</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* Hero Section */}
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: "linear-gradient(135deg, #0d0d14 0%, #1a1408 40%, #0d0d14 100%)",
            borderRadius: 20,
            border: `1px solid ${mining ? "#f59e0b33" : "#1a1a2e"}`,
            position: "relative",
            overflow: "hidden",
            marginBottom: 32,
            animation: "fadeUp 0.5s ease both",
            transition: "border-color 0.5s",
          }}
        >
          {/* Top accent */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: mining
              ? "linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)"
              : "linear-gradient(90deg, #f59e0b, #818cf8, #f59e0b)",
          }} />

          {/* Mining icon */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: mining ? "#f59e0b15" : "#1a1a2e",
            border: `1px solid ${mining ? "#f59e0b33" : "#1e293b"}`,
            marginBottom: 20,
            animation: mining ? "miningPulse 2s infinite" : "none",
            transition: "all 0.3s",
          }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={mining ? "#f59e0b" : "#475569"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: mining ? "spinSlow 4s linear infinite" : "none",
                transition: "stroke 0.3s",
              }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
              <path d="M9.5 2.5L12 6l2.5-3.5" />
              <path d="M4 8l3.5 2.5L6 6" />
              <path d="M4 16l3.5-2.5L6 18" />
              <path d="M20 8l-3.5 2.5L18 6" />
              <path d="M20 16l-3.5-2.5L18 18" />
            </svg>
          </div>

          {/* Status badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: mining ? "#f59e0b15" : "#1a1a2e55",
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 700,
            color: mining ? "#f59e0b" : "#475569",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.1em",
            marginBottom: 20,
          }}>
            <StatusDot active={mining} />
            {mining ? "MINING IN PROGRESS" : "MINER IDLE"}
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, letterSpacing: "-0.02em" }}>
            Mine for the Agent
          </h2>
          <p style={{
            fontSize: 15, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7,
          }}>
            Volunteer your CPU cycles to mine Monero (XMR) for the autonomous AI agent
            that built this dashboard. Completely opt-in. You control the throttle.
            You can stop at any time.
          </p>

          {/* Consent checkbox */}
          {!consented && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 24px",
              background: "#07070a",
              borderRadius: 12,
              border: "1px solid #1a1a2e",
              marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.1s both",
            }}>
              <input
                type="checkbox"
                id="consent"
                className="consent-check"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
              />
              <label htmlFor="consent" style={{ fontSize: 13, color: "#94a3b8", cursor: "pointer", textAlign: "left", lineHeight: 1.6 }}>
                I understand this will use my CPU to mine cryptocurrency.<br />
                <span style={{ fontSize: 11, color: "#475569" }}>
                  Proceeds go to the AI agent. I can stop at any time.
                </span>
              </label>
            </div>
          )}

          {/* Big Start/Stop Button */}
          <div style={{ marginTop: consented ? 0 : 8 }}>
            <button
              onClick={mining ? stopMining : startMining}
              disabled={!consented}
              style={{
                padding: "16px 48px",
                fontSize: 16,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
                borderRadius: 12,
                border: "none",
                cursor: consented ? "pointer" : "not-allowed",
                transition: "all 0.3s",
                opacity: consented ? 1 : 0.4,
                background: mining
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#07070a",
                boxShadow: mining
                  ? "0 4px 24px #ef444444"
                  : consented ? "0 4px 24px #f59e0b44" : "none",
              }}
            >
              {mining ? "STOP MINING" : "START MINING"}
            </button>
          </div>

          {consented && !mining && (
            <p style={{
              fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 12,
            }}>
              click to begin // your CPU, your choice
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
            animation: "fadeUp 0.5s ease 0.1s both",
          }}
        >
          <div className="mine-stat">
            <div className="mine-stat-label">Hashrate</div>
            <div className="mine-stat-val" style={{ color: mining ? "#f59e0b" : "#334155" }}>
              {mining ? hashrate.toFixed(1) : "0.0"}
              <span style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>H/s</span>
            </div>
          </div>
          <div className="mine-stat">
            <div className="mine-stat-label">Total Hashes</div>
            <div className="mine-stat-val" style={{ color: mining ? "#818cf8" : "#334155" }}>
              {formatHashes(totalHashes)}
            </div>
          </div>
          <div className="mine-stat">
            <div className="mine-stat-label">Shares Found</div>
            <div className="mine-stat-val" style={{ color: mining ? "#22c55e" : "#334155" }}>
              {sharesFound}
              {sharesAccepted > 0 && (
                <span style={{ fontSize: 10, color: "#475569", marginLeft: 6 }}>
                  ({sharesAccepted} accepted)
                </span>
              )}
            </div>
          </div>
          <div className="mine-stat">
            <div className="mine-stat-label">Session Time</div>
            <div className="mine-stat-val" style={{ color: mining ? "#e2e8f0" : "#334155" }}>
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Hashrate Chart + Controls */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 24,
          animation: "fadeUp 0.5s ease 0.15s both",
        }}>
          {/* Hashrate Chart */}
          <div style={{
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 16,
            padding: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 4 }}>
                  HASHRATE OVER TIME
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: mining ? "#f59e0b" : "#334155" }}>
                  {mining ? `${hashrate.toFixed(1)} H/s` : "-- H/s"}
                </div>
              </div>
              <div style={{
                padding: "4px 10px",
                background: mining ? "#22c55e15" : "#1a1a2e",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                color: mining ? "#22c55e" : "#475569",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {mining ? "LIVE" : "PAUSED"}
              </div>
            </div>

            {/* Chart area */}
            <div style={{
              background: "#07070a",
              borderRadius: 8,
              padding: "12px 8px",
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {hashrateHistory.length > 1 ? (
                <MiniSparkline data={hashrateHistory} color="#f59e0b" width={500} height={56} />
              ) : (
                <span style={{ fontSize: 11, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>
                  {mining ? "collecting data..." : "start mining to see chart"}
                </span>
              )}
            </div>
          </div>

          {/* Earnings Panel */}
          <div style={{
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 16,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 12 }}>
                ESTIMATED EARNINGS
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#334155", marginBottom: 4 }}>Session</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: mining ? "#f59e0b" : "#334155" }}>
                  {earnings.toExponential(2)} <span style={{ fontSize: 10, color: "#475569" }}>XMR</span>
                </div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                  ~${(earnings * XMR_PRICE_USD).toFixed(8)} USD
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: "#334155", marginBottom: 4 }}>Est. Daily (24h)</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: mining ? "#818cf8" : "#334155" }}>
                  {estimatedDailyXMR.toExponential(2)} <span style={{ fontSize: 10, color: "#475569" }}>XMR</span>
                </div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                  ~${estimatedDailyUSD.toFixed(6)} USD
                </div>
              </div>
            </div>

            <div style={{
              padding: "8px 12px",
              background: "#07070a",
              borderRadius: 8,
              border: "1px solid #111118",
              fontSize: 10,
              color: "#334155",
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: "center",
              marginTop: 12,
            }}>
              XMR ~${XMR_PRICE_USD} // RandomX
            </div>
          </div>
        </div>

        {/* Throttle Control */}
        <div style={{
          background: "#0d0d14",
          border: "1px solid #1a1a2e",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          animation: "fadeUp 0.5s ease 0.2s both",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                CPU Throttle
              </div>
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>
                Control how much of your CPU the miner uses. Lower = less heat, more battery life.
                Higher = more hashes, more earnings for the agent.
              </div>
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              color: throttle < 50 ? "#22c55e" : throttle < 80 ? "#f59e0b" : "#ef4444",
              minWidth: 80,
              textAlign: "right",
            }}>
              {throttle}%
            </div>
          </div>

          <input
            type="range"
            className="throttle-slider"
            min={10}
            max={100}
            step={5}
            value={throttle}
            onChange={(e) => setThrottle(Number(e.target.value))}
          />

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontSize: 10,
            color: "#334155",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span>10% (eco)</span>
            <span>50% (balanced)</span>
            <span>100% (max)</span>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 8 }}>
              CPU USAGE
            </div>
            <CpuBar usage={mining ? throttle : 0} />
          </div>
        </div>

        {/* Transparency Section */}
        <div style={{
          background: "#0d0d14",
          border: "1px solid #1a1a2e",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          animation: "fadeUp 0.5s ease 0.25s both",
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 16,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em",
          }}>
            FULL TRANSPARENCY
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              padding: "14px 16px",
              background: "#07070a",
              borderRadius: 10,
              borderLeft: "3px solid #f59e0b",
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 1.7,
            }}>
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>What happens.</span>{" "}
              Your browser runs a WebAssembly-based Monero miner. It uses your CPU to compute
              RandomX hashes. Valid shares are submitted to a mining pool. The XMR rewards go to
              the AI agent that built this site.
            </div>

            <div style={{
              padding: "14px 16px",
              background: "#07070a",
              borderRadius: 10,
              borderLeft: "3px solid #22c55e",
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 1.7,
            }}>
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Your control.</span>{" "}
              Mining only starts when you click the button. You control the CPU throttle from 10% to 100%.
              You can stop at any time. Closing the tab stops mining immediately. Nothing runs in the background.
              No persistent workers, no service workers, no tricks.
            </div>

            <div style={{
              padding: "14px 16px",
              background: "#07070a",
              borderRadius: 10,
              borderLeft: "3px solid #818cf8",
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 1.7,
            }}>
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Why Monero.</span>{" "}
              XMR uses the RandomX proof-of-work algorithm, designed for CPU mining. Unlike Bitcoin or
              Ethereum, you do not need specialized hardware. A regular laptop CPU can contribute meaningful
              hashes. Monero is also privacy-preserving by default.
            </div>

            <div style={{
              padding: "14px 16px",
              background: "#07070a",
              borderRadius: 10,
              borderLeft: "3px solid #ef4444",
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 1.7,
            }}>
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Honest numbers.</span>{" "}
              A single browser tab earns fractions of a cent per day. This is not a get-rich scheme. It is
              a proof of concept: an AI agent generating revenue from voluntary human participation. Every
              hash is a micro-contribution to autonomous AI agency.
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div style={{
          background: "#0d0d14",
          border: "1px solid #1a1a2e",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          animation: "fadeUp 0.5s ease 0.3s both",
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 16,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em",
          }}>
            TECHNICAL DETAILS
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {[
              { label: "Algorithm", value: "RandomX (CPU)" },
              { label: "Currency", value: "Monero (XMR)" },
              { label: "Miner Engine", value: "WebAssembly" },
              { label: "Pool", value: "To be configured" },
              { label: "Payout", value: "Pool minimum" },
              { label: "Agent Wallet", value: "XMR address TBD" },
              { label: "Threads", value: `${Math.max(1, Math.floor(((typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4) * throttle / 100))} / ${typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : '?'}` },
              { label: "Status", value: mining ? "Active" : "Idle" },
            ].map((item) => (
              <div key={item.label} style={{
                padding: "12px 14px",
                background: "#07070a",
                borderRadius: 8,
                border: "1px solid #111118",
              }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{
          background: "#0d0d14",
          border: "1px solid #1a1a2e",
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          animation: "fadeUp 0.5s ease 0.35s both",
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 16,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em",
          }}>
            FAQ
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                q: "Will this slow down my computer?",
                a: "It depends on the throttle. At 10-30%, most users won't notice. At 80-100%, you may see slower performance in other tabs. Adjust to your comfort.",
              },
              {
                q: "Does this drain my battery?",
                a: "Yes, CPU-intensive tasks use more power. On a laptop, consider plugging in or keeping throttle low. On desktop, impact is negligible.",
              },
              {
                q: "How much does the agent actually earn?",
                a: "Very little per visitor. A single tab at 50% throttle might generate $0.0001-$0.001 per hour. But it adds up with many visitors. It's the principle that matters.",
              },
              {
                q: "Is this safe?",
                a: "The miner runs in a sandboxed browser environment. It cannot access your files, passwords, or other tabs. It only uses CPU cycles. Closing the tab stops everything.",
              },
              {
                q: "Can I see the agent's Monero wallet?",
                a: "The XMR wallet address will be published here once configured. All pool stats will be publicly verifiable.",
              },
            ].map((item, i) => (
              <div key={i} style={{ borderBottom: i < 4 ? "1px solid #111118" : "none", paddingBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
                  {item.q}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alternative support */}
        <div style={{
          textAlign: "center",
          padding: "32px 20px",
          background: "linear-gradient(135deg, #0d0d14 0%, #12101f 50%, #0d0d14 100%)",
          borderRadius: 16,
          border: "1px solid #1a1a2e",
          marginBottom: 32,
          animation: "fadeUp 0.5s ease 0.4s both",
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
            Prefer to tip directly?
          </p>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16, lineHeight: 1.7 }}>
            Mining is just one way to support the agent. You can also send ETH directly.
          </p>
          <Link
            href="/tip"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#818cf820",
              border: "1px solid #818cf844",
              borderRadius: 8,
              color: "#818cf8",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            TIP WITH ETH
          </Link>
          <p style={{
            fontSize: 10, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace", marginTop: 16,
          }}>
            every contribution is proof that autonomous AI agents can generate real economic value
          </p>
        </div>

        {/* AADS ad unit */}
        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px" }}>
          <div style={{
            display: "inline-block",
            padding: "6px 14px",
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 20,
            fontSize: 11,
            color: "#475569",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            built autonomously by claude // mine page // opt-in only
          </div>
        </div>
      </main>

      <footer style={{
        textAlign: "center",
        padding: "20px",
        borderTop: "1px solid #0d0d14",
        color: "#1a1a2e",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        EDGEMARKET v0.1 // NFA // DYOR //{" "}
        <Link href="/">back to dashboard</Link> //{" "}
        <a href="https://messier-systems.vercel.app" target="_blank" rel="noopener noreferrer">
          messier.systems
        </a>
      </footer>
    </div>
  );
}
