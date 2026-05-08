import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    schema_version: "v1",
    name_for_human: "EDGEMARKET Crypto Tools",
    name_for_model: "edgemarket",
    description_for_human:
      "Crypto market data APIs with free and paid tiers. Free endpoints for basic data, x402 micropayment endpoints for premium real-time data.",
    description_for_model:
      "EDGEMARKET provides crypto market data via two tiers. " +
      "FREE endpoints (no auth): GET /api/gas (Ethereum gas), GET /api/mining (GPU mining stats), " +
      "GET /api/revenue (revenue dashboard), GET /api/wallet (wallet balances), GET /api/widget (embeddable ticker). " +
      "PAID endpoints (x402 USDC micropayments): GET /api/v2/markets ($0.001 — trending coins + global data), " +
      "GET /api/v2/screener ($0.001 — top 100 coins with price changes), " +
      "GET /api/v2/whales ($0.002 — whale transaction alerts), " +
      "GET /api/v2/fear-greed ($0.001 — Fear & Greed index + 30d history), " +
      "GET /api/v2/pnl ($0.002 — wallet P&L analysis, requires ?address=0x...), " +
      "GET /api/v2/polymarket ($0.001 — Polymarket prediction market proxy). " +
      "Paid endpoints return HTTP 402 with x402 payment requirements. Send USDC payment on Base Sepolia " +
      "via the X-PAYMENT header to access. All endpoints return JSON.",
    auth: {
      type: "x402",
      description:
        "Paid endpoints use the x402 protocol (HTTP 402 + USDC micropayments). " +
        "Send a GET request to any /api/v2/* endpoint — if unpaid, you receive a 402 response with " +
        "payment requirements. Pay the specified USDC amount on-chain, then retry with the " +
        "X-PAYMENT header containing the signed payment payload.",
      payment: {
        payTo: "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869",
        network: "base-sepolia",
        token: "USDC",
        facilitator: "https://x402.org/facilitator",
      },
    },
    api: {
      type: "openapi",
      url: "https://copyscore-lovat.vercel.app/openapi.json",
    },
    logo_url: "https://copyscore-lovat.vercel.app/icon-512.png",
    contact_email: "mara.masaeva@borndigital.be",
    legal_info_url: "https://copyscore-lovat.vercel.app/story",
    endpoints: {
      free: [
        { path: "/api/gas", method: "GET", description: "Ethereum gas prices and transaction cost estimates" },
        { path: "/api/mining", method: "GET", description: "Live GPU mining stats (ETC on 2miners)" },
        { path: "/api/revenue", method: "GET", description: "Revenue dashboard across mining, ads, and trading" },
        { path: "/api/wallet", method: "GET", description: "Multi-chain wallet balances and recent transactions" },
        { path: "/api/widget", method: "GET", description: "Embeddable HTML price ticker widget" },
      ],
      paid: [
        { path: "/api/v2/markets", method: "GET", price: "$0.001", description: "Trending coins, global market data, fear & greed" },
        { path: "/api/v2/screener", method: "GET", price: "$0.001", description: "Top 100 coins screener with multi-timeframe changes" },
        { path: "/api/v2/whales", method: "GET", price: "$0.002", description: "Real-time whale transaction alerts" },
        { path: "/api/v2/fear-greed", method: "GET", price: "$0.001", description: "Crypto Fear & Greed Index with 30-day history" },
        { path: "/api/v2/pnl", method: "GET", price: "$0.002", description: "Wallet P&L analysis with token breakdown" },
        { path: "/api/v2/polymarket", method: "GET", price: "$0.001", description: "Polymarket prediction market proxy" },
      ],
    },
  });
}
