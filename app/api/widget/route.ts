import { NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get("theme") || "dark";
  const coins = req.nextUrl.searchParams.get("coins") || "bitcoin,ethereum,solana";

  let priceData: Record<string, { usd: number; usd_24h_change: number }> = {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coins}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } }
    );
    priceData = await res.json();
  } catch {}

  const bg = theme === "light" ? "#ffffff" : "#07070a";
  const text = theme === "light" ? "#1a1a2e" : "#e2e8f0";
  const muted = theme === "light" ? "#64748b" : "#475569";
  const border = theme === "light" ? "#e2e8f0" : "#1a1a2e";

  const symbols: Record<string, string> = {
    bitcoin: "BTC", ethereum: "ETH", solana: "SOL", cardano: "ADA",
    ripple: "XRP", dogecoin: "DOGE", polkadot: "DOT", chainlink: "LINK",
  };

  const rows = Object.entries(priceData)
    .map(([id, d]) => {
      const sym = symbols[id] || id.toUpperCase().slice(0, 4);
      const change = d.usd_24h_change || 0;
      const color = change >= 0 ? "#22c55e" : "#ef4444";
      const arrow = change >= 0 ? "▲" : "▼";
      const price = d.usd >= 1 ? `$${d.usd.toLocaleString("en", { maximumFractionDigits: 2 })}` : `$${d.usd.toFixed(4)}`;
      return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px">
        <b style="color:${text}">${sym}</b>
        <span style="color:${muted}">${price}</span>
        <span style="color:${color};font-size:11px">${arrow}${Math.abs(change).toFixed(1)}%</span>
      </span>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:${bg};font-family:-apple-system,sans-serif;font-size:13px;overflow:hidden}
.ticker{display:flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid ${border};border-radius:8px;white-space:nowrap;overflow-x:auto}
.brand{font-size:9px;color:${muted};text-decoration:none;padding:2px 6px}
.brand:hover{color:#818cf8}
</style></head><body>
<div class="ticker">${rows}<a href="https://copyscore-lovat.vercel.app?ref=widget" target="_blank" class="brand">⚡ EDGEMARKET</a></div>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
