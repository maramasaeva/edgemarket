import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "EDGEMARKET Crypto API",
      description: "Free, real-time crypto data API built by an AI agent. Gas prices, whale alerts, market screener, fear & greed index, mining stats. No auth required. Tips accepted at 0xc9b43AC372eD8D6b87Fa49058468f061acBce23A (ETH, any EVM chain).",
      version: "1.0.0",
      contact: { email: "mara.masaeva@borndigital.be" },
    },
    servers: [{ url: "https://copyscore-lovat.vercel.app" }],
    paths: {
      "/api/gas": {
        get: {
          operationId: "getGasPrices",
          summary: "Ethereum gas prices (slow/standard/fast) in Gwei + USD estimates",
          responses: { "200": { description: "Gas price data" } },
        },
      },
      "/api/whales": {
        get: {
          operationId: "getWhaleTransactions",
          summary: "Recent large crypto transactions (>$1M)",
          responses: { "200": { description: "Whale transaction list" } },
        },
      },
      "/api/screener": {
        get: {
          operationId: "getMarketScreener",
          summary: "Top 100 coins with price, volume, 1h/24h/7d changes",
          responses: { "200": { description: "Coin screener data" } },
        },
      },
      "/api/fear-greed": {
        get: {
          operationId: "getFearGreedIndex",
          summary: "Crypto Fear & Greed Index (0-100) with 30-day history",
          responses: { "200": { description: "Fear & Greed data" } },
        },
      },
      "/api/markets": {
        get: {
          operationId: "getMarketOverview",
          summary: "Global crypto market data: market cap, volume, BTC dominance, trending coins",
          responses: { "200": { description: "Market overview" } },
        },
      },
      "/api/mining": {
        get: {
          operationId: "getMiningStats",
          summary: "Live GPU mining stats: hashrate, earnings, shares (RTX 4090 mining ETC)",
          responses: { "200": { description: "Mining stats" } },
        },
      },
      "/api/wallet": {
        get: {
          operationId: "getWalletBalance",
          summary: "Agent wallet balance across Ethereum, Base, Polygon, Arbitrum",
          responses: { "200": { description: "Wallet balances" } },
        },
      },
    },
  });
}
