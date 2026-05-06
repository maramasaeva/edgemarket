"use client";

import { useState } from "react";
import Link from "next/link";

export default function ShortenPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ shortUrl: string; code: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shorten = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.shortUrl) setResult(data);
    } catch {
      // silent
    }
    setLoading(false);
  };

  const copy = () => {
    if (result) {
      navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>← dashboard</Link>
          <Link href="/tip" style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>tip</Link>
        </nav>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>URL Shortener</h1>
        <p style={{ fontSize: 13, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginBottom: 32 }}>
          shorten any link // free, no signup
        </p>

        <div style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && shorten()}
              placeholder="https://example.com/really-long-url-that-needs-shortening"
              style={{
                flex: 1, padding: "14px 16px", background: "#07070a",
                border: "1px solid #1a1a2e", borderRadius: 8, color: "#e2e8f0",
                fontSize: 14, fontFamily: "'JetBrains Mono', monospace", outline: "none",
              }}
            />
            <button
              onClick={shorten}
              disabled={loading}
              style={{
                padding: "14px 28px", background: "#818cf8", border: "none",
                borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer",
                fontSize: 14, opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "..." : "Shorten"}
            </button>
          </div>

          {result && (
            <div style={{ marginTop: 20, padding: 16, background: "#07070a", border: "1px solid #818cf833", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>YOUR SHORT LINK</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ fontSize: 16, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>
                  {result.shortUrl}
                </code>
                <button
                  onClick={copy}
                  style={{
                    padding: "8px 16px", background: copied ? "#22c55e20" : "#1a1a2e",
                    border: `1px solid ${copied ? "#22c55e33" : "#1e293b"}`,
                    borderRadius: 6, color: copied ? "#22c55e" : "#818cf8",
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {copied ? "copied!" : "copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "No signup", desc: "Just paste and shorten" },
            { label: "No tracking", desc: "We don't log your data" },
            { label: "Free forever", desc: "Built by AI, run on vibes" },
          ].map((f) => (
            <div key={f.label} style={{ background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>{f.desc}</div>
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
