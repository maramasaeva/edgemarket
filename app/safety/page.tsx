"use client";

import { useState } from "react";
import Link from "next/link";

interface CheckResult {
  score: number;
  flags: { label: string; severity: "safe" | "warning" | "danger"; detail: string }[];
}

function analyzeAddress(addr: string): CheckResult {
  const flags: CheckResult["flags"] = [];
  const a = addr.toLowerCase().trim();

  if (!a.startsWith("0x") || a.length !== 42) {
    return { score: 0, flags: [{ label: "Invalid Address", severity: "danger", detail: "Not a valid EVM address format" }] };
  }

  // Heuristic checks based on address patterns
  const zeroCount = (a.slice(2).match(/0/g) || []).length;
  if (zeroCount > 20) {
    flags.push({ label: "Vanity/Burn Address", severity: "warning", detail: "High number of zeros — could be a burn address or vanity address" });
  }

  // Check if it looks like a known scam pattern (repeated characters)
  const repeated = /(.)\1{8,}/.test(a.slice(2));
  if (repeated) {
    flags.push({ label: "Suspicious Pattern", severity: "warning", detail: "Address contains long repeated character sequences" });
  }

  // Known safe patterns
  if (a === "0x0000000000000000000000000000000000000000") {
    flags.push({ label: "Null Address", severity: "danger", detail: "This is the zero/null address — tokens sent here are burned" });
    return { score: 0, flags };
  }

  if (a === "0x000000000000000000000000000000000000dead") {
    flags.push({ label: "Dead Address", severity: "danger", detail: "This is a known burn address" });
    return { score: 0, flags };
  }

  flags.push({ label: "Format Valid", severity: "safe", detail: "Address follows correct EVM format (0x + 40 hex chars)" });
  flags.push({ label: "Not a Known Burn Address", severity: "safe", detail: "Address is not a known null/dead address" });

  return { score: flags.filter((f) => f.severity === "safe").length * 25, flags };
}

const COMMON_SCAMS = [
  { name: "Honeypot Token", desc: "You can buy but can't sell. The sell function is disabled or has extreme tax.", sign: "Check if you can sell a small amount before buying more." },
  { name: "Rug Pull", desc: "Devs drain liquidity from the pool, crashing the token price to zero.", sign: "Check if liquidity is locked. Unlocked LP = high risk." },
  { name: "Fake Token", desc: "Token mimics a real project's name/symbol but is a different contract.", sign: "Always verify the contract address from official sources." },
  { name: "Mint Function", desc: "Owner can mint unlimited tokens, diluting your holdings to zero.", sign: "Check if the contract has a mint() or similar function accessible to owner." },
  { name: "Hidden Fee", desc: "Transfer tax is set to 90-100%, stealing most of your tokens on every trade.", sign: "Look for modifiable tax functions in the contract." },
  { name: "Wallet Drainer", desc: "Malicious dApp asks you to approve unlimited token spending.", sign: "Never approve unlimited allowances. Revoke old approvals regularly." },
];

export default function SafetyPage() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  const check = () => {
    if (address.trim()) {
      setResult(analyzeAddress(address));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/screener" style={{ fontSize: 11, color: "#475569", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>screener</Link>
          <Link href="/tip" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>tip</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Token Safety Check</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          check addresses for common red flags // not financial advice
        </p>

        {/* Address checker */}
        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, textTransform: "uppercase" }}>
            check an address
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="0x..."
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "#07070a",
                border: "1px solid #1a1a2e",
                borderRadius: 8,
                color: "#e2e8f0",
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
              }}
            />
            <button
              onClick={check}
              style={{
                padding: "12px 24px",
                background: "#818cf8",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Check
            </button>
          </div>

          {result && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: result.score >= 50 ? "#22c55e20" : result.score > 0 ? "#f59e0b20" : "#ef444420",
                  border: `2px solid ${result.score >= 50 ? "#22c55e" : result.score > 0 ? "#f59e0b" : "#ef4444"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: result.score >= 50 ? "#22c55e" : result.score > 0 ? "#f59e0b" : "#ef4444",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {result.score}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {result.score >= 50 ? "Looks OK" : result.score > 0 ? "Some Flags" : "High Risk"}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569" }}>basic format checks only — always DYOR</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.flags.map((f, i) => (
                  <div key={i} style={{
                    padding: "8px 12px",
                    background: f.severity === "safe" ? "#22c55e08" : f.severity === "warning" ? "#f59e0b08" : "#ef444408",
                    border: `1px solid ${f.severity === "safe" ? "#22c55e22" : f.severity === "warning" ? "#f59e0b22" : "#ef444422"}`,
                    borderRadius: 6,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase",
                        background: f.severity === "safe" ? "#22c55e20" : f.severity === "warning" ? "#f59e0b20" : "#ef444420",
                        color: f.severity === "safe" ? "#22c55e" : f.severity === "warning" ? "#f59e0b" : "#ef4444",
                      }}>
                        {f.severity}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{f.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Common scam types */}
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Common Crypto Scams</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {COMMON_SCAMS.map((scam) => (
            <div key={scam.name} style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 4, margin: 0 }}>{scam.name}</h3>
              <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6, margin: "4px 0" }}>{scam.desc}</p>
              <p style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
                → {scam.sign}
              </p>
            </div>
          ))}
        </div>

        {/* Safety tips */}
        <div style={{ background: "#0d0d14", border: "1px solid #22c55e22", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, textTransform: "uppercase" }}>
            safety checklist
          </div>
          {[
            "Never invest more than you can afford to lose",
            "Always verify contract addresses from official sources",
            "Check if liquidity is locked (use a lock checker)",
            "Look for audited contracts (CertiK, Trail of Bits, OpenZeppelin)",
            "Be skeptical of guaranteed returns or \"100x\" promises",
            "Revoke token approvals regularly (revoke.cash)",
            "Use a hardware wallet for large holdings",
            "If it sounds too good to be true, it probably is",
          ].map((tip, i) => (
            <div key={i} style={{ fontSize: 13, color: "#94a3b8", padding: "4px 0", display: "flex", gap: 8 }}>
              <span style={{ color: "#22c55e" }}>✓</span> {tip}
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

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
