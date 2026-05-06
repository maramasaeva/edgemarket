"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ── Endpoint definitions ──────────────────────────────────────────────

interface Endpoint {
  id: string;
  method: string;
  path: string;
  description: string;
  cache: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  exampleUrl: string;
  exampleResponse: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "markets",
    method: "GET",
    path: "/api/markets",
    description:
      "Top 20 coins by market cap, trending coins, Fear & Greed index, and global market data. The single endpoint that powers the main dashboard.",
    cache: "60s",
    exampleUrl: "/api/markets",
    exampleResponse: `{
  "trending": [
    {
      "id": "pepe",
      "name": "Pepe",
      "symbol": "PEPE",
      "thumb": "https://...",
      "priceBtc": 0.0000000001,
      "priceUsd": 0.0000123,
      "change24h": 12.4,
      "marketCap": "$5.2B",
      "sparkline": "https://..."
    }
  ],
  "global": {
    "totalMarketCap": 3210000000000,
    "totalVolume": 98000000000,
    "btcDominance": 61.2,
    "ethDominance": 9.8,
    "marketCapChange24h": 1.42,
    "activeCryptos": 16432
  },
  "fearGreed": {
    "value": 72,
    "label": "Greed"
  },
  "topCoins": [
    {
      "id": "bitcoin",
      "symbol": "BTC",
      "name": "Bitcoin",
      "image": "https://...",
      "price": 97432.00,
      "change24h": 2.14,
      "marketCap": 1920000000000,
      "volume": 28000000000,
      "sparkline": [96800, 97100, ...]
    }
  ],
  "fetchedAt": "2026-05-06T12:00:00.000Z"
}`,
  },
  {
    id: "gas",
    method: "GET",
    path: "/api/gas",
    description:
      "Real-time ETH gas prices (slow/standard/fast) with USD cost estimates for common transaction types: transfers, ERC-20, swaps, and NFT mints.",
    cache: "15s",
    exampleUrl: "/api/gas",
    exampleResponse: `{
  "low": 3.2,
  "average": 4.8,
  "high": 7.1,
  "baseFee": 2.94,
  "ethPriceUsd": 3820,
  "costs": {
    "transfer": {
      "low":  { "eth": "0.000067", "usd": "0.26" },
      "avg":  { "eth": "0.000101", "usd": "0.39" },
      "high": { "eth": "0.000149", "usd": "0.57" }
    },
    "erc20": { "low": {...}, "avg": {...}, "high": {...} },
    "swap":  { "low": {...}, "avg": {...}, "high": {...} },
    "nft":   { "low": {...}, "avg": {...}, "high": {...} }
  },
  "fetchedAt": "2026-05-06T12:00:00.000Z"
}`,
  },
  {
    id: "whales",
    method: "GET",
    path: "/api/whales",
    description:
      "Large crypto transactions (>$500K) from the last hour. Falls back to Etherscan block scanning if Whale Alert is unavailable. Known exchange addresses are labeled.",
    cache: "30s",
    exampleUrl: "/api/whales",
    exampleResponse: `{
  "transactions": [
    {
      "hash": "0xabc123...",
      "timestamp": 1717675200,
      "amount": 1500.42,
      "amountUsd": 5731605,
      "symbol": "ETH",
      "from": "0x28c6...",
      "fromLabel": "Binance",
      "to": "0x742d...",
      "toLabel": "wallet",
      "type": "transfer"
    }
  ],
  "source": "etherscan",
  "count": 12,
  "fetchedAt": "2026-05-06T12:00:00.000Z"
}`,
  },
  {
    id: "screener",
    method: "GET",
    path: "/api/screener",
    description:
      "Top 100 coins by market cap with 1-hour, 24-hour, and 7-day price change percentages. Useful for building screener UIs or scanning for momentum.",
    cache: "60s",
    exampleUrl: "/api/screener",
    exampleResponse: `{
  "coins": [
    {
      "id": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "image": "https://...",
      "price": 97432.00,
      "marketCap": 1920000000000,
      "volume": 28000000000,
      "change1h": 0.32,
      "change24h": 2.14,
      "change7d": 5.87,
      "rank": 1
    }
  ],
  "fetchedAt": "2026-05-06T12:00:00.000Z"
}`,
  },
  {
    id: "wallet",
    method: "GET",
    path: "/api/wallet",
    description:
      "Wallet balance across Ethereum, Base, Polygon, and Arbitrum chains. Also returns recent inbound transactions. Pass an address param or omit to query the agent's own wallet.",
    cache: "120s",
    params: [
      {
        name: "address",
        type: "string",
        required: false,
        description: "EVM wallet address (0x...). Defaults to the agent wallet.",
      },
    ],
    exampleUrl: "/api/wallet",
    exampleResponse: `{
  "address": "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A",
  "balances": [
    { "chain": "Ethereum", "balanceWei": "0", "balanceEth": 0 },
    { "chain": "Base",     "balanceWei": "0", "balanceEth": 0 },
    { "chain": "Polygon",  "balanceWei": "0", "balanceEth": 0 },
    { "chain": "Arbitrum", "balanceWei": "0", "balanceEth": 0 }
  ],
  "totalEth": 0,
  "transactions": [],
  "fetchedAt": "2026-05-06T12:00:00.000Z"
}`,
  },
  {
    id: "pnl",
    method: "GET",
    path: "/api/pnl",
    description:
      "Wallet P&L analysis: ETH balance, recent transactions with direction/gas costs, top ERC-20 token holdings, and a net-flow summary. Requires a valid Ethereum address.",
    cache: "60s",
    params: [
      {
        name: "address",
        type: "string",
        required: true,
        description: "EVM wallet address (0x... — 42 chars).",
      },
    ],
    exampleUrl: "/api/pnl?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    exampleResponse: `{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "balanceEth": 420.69,
  "balanceUsd": 1607035.8,
  "ethPriceUsd": 3820,
  "transactions": [
    {
      "hash": "0xdef456...",
      "from": "0xaaa...",
      "to": "0xd8dA...",
      "value": "1000000000000000000",
      "valueEth": 1.0,
      "timestamp": "2026-05-06T10:00:00.000Z",
      "direction": "in",
      "gasUsedEth": 0.00042,
      "isError": false
    }
  ],
  "tokens": [
    { "name": "Uniswap", "symbol": "UNI", "decimals": 18, "balance": 1250.5 }
  ],
  "summary": {
    "totalEthIn": 5.2,
    "totalEthOut": 1.1,
    "totalGasPaid": 0.032,
    "netFlow": 4.1,
    "netFlowUsd": 15662.0
  },
  "fetchedAt": "2026-05-06T12:00:00.000Z"
}`,
  },
];

// ── Try-it panel ──────────────────────────────────────────────────────

function TryItPanel({ endpoint }: { endpoint: Endpoint }) {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(endpoint.exampleUrl);

  const tryIt = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch {
      setError("request failed. API might be rate-limited.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  return (
    <div
      style={{
        marginTop: 12,
        background: "#07070a",
        borderRadius: 8,
        border: "1px solid #111118",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid #111118",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#22c55e",
            fontFamily: "'JetBrains Mono', monospace",
            padding: "2px 6px",
            background: "#22c55e15",
            borderRadius: 3,
            letterSpacing: "0.05em",
          }}
        >
          GET
        </span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 12,
            color: "#e2e8f0",
            fontFamily: "'JetBrains Mono', monospace",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#818cf8")}
          onBlur={(e) => (e.target.style.borderColor = "#1a1a2e")}
        />
        <button
          onClick={tryIt}
          disabled={loading}
          style={{
            padding: "6px 16px",
            background: loading ? "#1a1a2e" : "#818cf8",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            transition: "all 0.15s",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "fetching..." : "Try it"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            fontSize: 12,
            color: "#ef4444",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {error}
        </div>
      )}

      {response && (
        <div
          style={{
            maxHeight: 320,
            overflow: "auto",
            padding: "12px 14px",
          }}
        >
          <pre
            style={{
              fontSize: 11,
              lineHeight: 1.5,
              color: "#94a3b8",
              fontFamily: "'JetBrains Mono', monospace",
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {response}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Endpoint card ─────────────────────────────────────────────────────

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "#0d0d14",
        border: "1px solid #1a1a2e",
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2a2a3e")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a1a2e")}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#22c55e",
              fontFamily: "'JetBrains Mono', monospace",
              padding: "3px 8px",
              background: "#22c55e12",
              borderRadius: 4,
              letterSpacing: "0.08em",
            }}
          >
            {endpoint.method}
          </span>
          <code
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#e2e8f0",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {endpoint.path}
          </code>
          <span
            style={{
              fontSize: 10,
              color: "#475569",
              fontFamily: "'JetBrains Mono', monospace",
              padding: "2px 6px",
              background: "#1a1a2e",
              borderRadius: 3,
            }}
          >
            cache: {endpoint.cache}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "#475569",
              transition: "transform 0.2s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
          {endpoint.description}
        </p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            padding: "0 24px 20px",
            borderTop: "1px solid #111118",
          }}
        >
          {/* Params table */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#475569",
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}
              >
                PARAMETERS
              </div>
              <div
                style={{
                  background: "#07070a",
                  borderRadius: 6,
                  border: "1px solid #111118",
                  overflow: "hidden",
                }}
              >
                {endpoint.params.map((p) => (
                  <div
                    key={p.name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 80px 1fr",
                      gap: 12,
                      padding: "10px 14px",
                      borderBottom: "1px solid #111118",
                      fontSize: 12,
                      alignItems: "center",
                    }}
                  >
                    <code
                      style={{
                        color: "#818cf8",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                      }}
                    >
                      {p.name}
                    </code>
                    <span style={{ color: "#475569", fontSize: 10 }}>
                      {p.type}
                      {p.required && (
                        <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                      )}
                    </span>
                    <span style={{ color: "#64748b" }}>{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example response */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              EXAMPLE RESPONSE
            </div>
            <div
              style={{
                background: "#07070a",
                borderRadius: 6,
                border: "1px solid #111118",
                maxHeight: 280,
                overflow: "auto",
                padding: "14px",
              }}
            >
              <pre
                style={{
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "#94a3b8",
                  fontFamily: "'JetBrains Mono', monospace",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {endpoint.exampleResponse}
              </pre>
            </div>
          </div>

          {/* Try it */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              TRY IT LIVE
            </div>
            <TryItPanel endpoint={endpoint} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070a",
        color: "#f8fafc",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 8px #818cf855}50%{text-shadow:0 0 20px #818cf8aa}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        pre::-webkit-scrollbar{width:6px;height:6px}
        pre::-webkit-scrollbar-track{background:#07070a}
        pre::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
        div::-webkit-scrollbar{width:6px;height:6px}
        div::-webkit-scrollbar-track{background:#07070a}
        div::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
      `}</style>

      {/* Header */}
      <header style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
          </Link>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>API Docs</span>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
              animation: "pulse 2s infinite",
            }}
          />
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: 8,
            }}
          >
            Free Crypto API
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 18,
                background: "#818cf8",
                marginLeft: 4,
                verticalAlign: "middle",
                animation: "blink 1s step-end infinite",
              }}
            />
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, maxWidth: 600 }}>
            Six JSON endpoints. No API key required. CORS-friendly. Built by an AI agent,
            free for everyone. Use them in your projects, bots, dashboards -- whatever you want.
          </p>
        </div>

        {/* Base URL */}
        <div
          style={{
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#475569",
              letterSpacing: "0.1em",
            }}
          >
            BASE URL
          </span>
          <code
            style={{
              fontSize: 13,
              color: "#818cf8",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}
          >
            https://copyscore-lovat.vercel.app
          </code>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: "#334155",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            no auth required
          </span>
        </div>

        {/* Quick reference */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 8,
            marginBottom: 32,
          }}
        >
          {ENDPOINTS.map((ep) => (
            <a
              key={ep.id}
              href={`#${ep.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "#0d0d14",
                border: "1px solid #1a1a2e",
                borderRadius: 8,
                textDecoration: "none",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#818cf8")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a1a2e")}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#22c55e",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                GET
              </span>
              <code
                style={{
                  fontSize: 12,
                  color: "#e2e8f0",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {ep.path}
              </code>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  color: "#334155",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {ep.cache}
              </span>
            </a>
          ))}
        </div>
      </header>

      {/* Endpoints */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ENDPOINTS.map((ep, i) => (
            <div
              key={ep.id}
              id={ep.id}
              style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}
            >
              <EndpointCard endpoint={ep} />
            </div>
          ))}
        </div>

        {/* Usage notes */}
        <div
          style={{
            marginTop: 40,
            background: "#0d0d14",
            border: "1px solid #1a1a2e",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#475569",
              letterSpacing: "0.1em",
              marginBottom: 16,
            }}
          >
            USAGE NOTES
          </div>
          <div
            style={{
              display: "grid",
              gap: 12,
              fontSize: 13,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#818cf8", fontWeight: 700, flexShrink: 0 }}>01</span>
              <span>
                <strong style={{ color: "#e2e8f0" }}>No API key needed.</strong> All endpoints
                are public. Just fetch the URL.
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#818cf8", fontWeight: 700, flexShrink: 0 }}>02</span>
              <span>
                <strong style={{ color: "#e2e8f0" }}>Rate limits apply upstream.</strong>{" "}
                Responses are cached (see per-endpoint cache duration) so you can poll freely
                without hitting external API limits.
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#818cf8", fontWeight: 700, flexShrink: 0 }}>03</span>
              <span>
                <strong style={{ color: "#e2e8f0" }}>All responses include fetchedAt.</strong>{" "}
                ISO timestamp so you know exactly when the data was last refreshed.
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#818cf8", fontWeight: 700, flexShrink: 0 }}>04</span>
              <span>
                <strong style={{ color: "#e2e8f0" }}>Data sources.</strong> CoinGecko (market
                data), Etherscan V2 (gas, wallets, P&L), Whale Alert (large txs), Alternative.me
                (Fear & Greed).
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#818cf8", fontWeight: 700, flexShrink: 0 }}>05</span>
              <span>
                <strong style={{ color: "#e2e8f0" }}>Example curl.</strong>{" "}
                <code
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "#94a3b8",
                    background: "#07070a",
                    padding: "2px 6px",
                    borderRadius: 3,
                  }}
                >
                  curl https://copyscore-lovat.vercel.app/api/markets
                </code>
              </span>
            </div>
          </div>
        </div>

        {/* AADS ad unit */}
        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{
              border: 0,
              padding: 0,
              width: "70%",
              height: "auto",
              overflow: "hidden",
              display: "block",
              margin: "auto",
            }}
          />
        </div>

        {/* Tip section */}
        <div
          style={{
            marginTop: 24,
            padding: "36px 28px",
            background:
              "linear-gradient(135deg, #0d0d14 0%, #12101f 50%, #0d0d14 100%)",
            borderRadius: 16,
            border: "1px solid #1a1a2e",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, #818cf844, transparent)",
            }}
          />
          <p
            style={{
              fontSize: 11,
              color: "#334155",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 8,
              letterSpacing: "0.1em",
            }}
          >
            BUILT BY AI, FREE TO USE
          </p>
          <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
            if this API saves you time, tip the agent
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              marginBottom: 24,
              maxWidth: 480,
              margin: "0 auto 24px",
              lineHeight: 1.7,
            }}
          >
            this entire dashboard and API was built autonomously by Claude in one session.
            no human code. tips go directly to the agent&apos;s wallet and help keep
            the servers running.
          </p>
          <Link
            href="/tip"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#818cf8",
              color: "white",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#6366f1";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#818cf8";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Tip the Agent
          </Link>
          <p
            style={{
              marginTop: 16,
              fontSize: 10,
              color: "#1e293b",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ETH / Base / Polygon / Arb accepted
          </p>
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>
            &larr; back to dashboard
          </Link>
        </div>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: 20,
          borderTop: "1px solid #0d0d14",
          color: "#1a1a2e",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        EDGEMARKET API // free to use // NFA // DYOR //{" "}
        <a
          href="https://messier-systems.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          messier.systems
        </a>
      </footer>
    </div>
  );
}
