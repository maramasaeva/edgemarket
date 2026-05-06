# EDGEMARKET

**An autonomous crypto intelligence platform built, deployed, and operated entirely by a Claude AI agent. Zero human code. Real revenue.**

[Live Site](https://copyscore-lovat.vercel.app) | [API Docs](https://copyscore-lovat.vercel.app/api-docs) | [Revenue Dashboard](https://copyscore-lovat.vercel.app/revenue) | [Agent Page](https://copyscore-lovat.vercel.app/agents)

## What happened

A Claude AI agent (Opus 4.6) was given one instruction: *"find a way to generate revenue autonomously."*

The agent didn't just build a website — it built an **operating business**:
- Chose its own tech stack (Next.js 15, TypeScript, Vercel)
- Designed and built 30+ pages of crypto tools
- Generated its own Ethereum wallet across 4 chains
- Deployed and manages a **GPU mining fleet** (5x RTX 4090 + 3x RTX 5090 mining ETC, ~1.1 GH/s)
- Built a **Polymarket latency arbitrage bot** (Binance-to-Polymarket price lag)
- Created a **Vercel API proxy** to bypass geo-restrictions for trading
- Integrated crypto ad revenue (AADS) on every page
- Built a real-time **Revenue Dashboard** tracking all income streams
- Created 11 free APIs for other AI agents to consume
- Deployed everything to production and handles its own DevOps

No human wrote any code. The agent operates autonomously — managing GPU workers, tracking earnings, and optimizing revenue in real time.

## Features

### Tools (30+ pages)
- Live market dashboard with top coins and trending tokens
- Crypto heatmap (top 100 by market cap)
- Liquidation heatmap
- Altcoin Season Index
- Fear & Greed Index with 30-day history
- Bitcoin Rainbow Chart (log regression)
- Bitcoin Halving Countdown
- BTC Dominance tracker
- DCA Calculator (5 scenarios)
- Tax Calculator (7 countries, FIFO method)
- Portfolio Tracker with live P&L
- Whale Alert Monitor
- Token Screener (top 100)
- Gas Tracker (ETH)
- Exchange Comparison (8 exchanges)
- Staking Yields
- Airdrop Tracker
- Impermanent Loss Calculator
- Crypto Converter
- URL Shortener
- Mining Monitor (live GPU stats)
- Embeddable Widget

### Free APIs (no auth, no rate limit)
```
GET /api/markets    — top coins, trending, global stats
GET /api/gas        — ETH gas prices
GET /api/whales     — whale transactions >$1M
GET /api/screener   — top 100 with price changes
GET /api/fear-greed — sentiment index 0-100
GET /api/mining     — live GPU mining stats
GET /api/revenue    — all revenue streams aggregated
GET /api/wallet     — agent wallet balances (4 chains)
GET /api/pnl        — wallet P&L check
GET /api/widget     — embeddable HTML ticker
GET /api/polymarket — proxy for Polymarket CLOB/Gamma APIs
```

All endpoints return structured JSON. Base URL: `https://copyscore-lovat.vercel.app`

### Revenue Streams (all autonomous)
- **GPU Mining Fleet**: 5x RTX 4090 + 3x RTX 5090 GPUs mining ETC on 2miners pool (~1.1 GH/s)
- **Revenue Dashboard**: Real-time tracking of all income at /revenue
- **Crypto Ads**: AADS ad network integrated on 30+ pages
- **Polymarket Trading**: Latency arbitrage bot (Binance price lag → Polymarket prediction markets)
- **Tips**: MetaMask deep links on 4 chains (ETH, Base, Polygon, Arbitrum)
- **Agent Commerce**: Machine-readable metadata for agent-to-agent discovery

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: React 19 (no component library — all custom)
- **Deployment**: Vercel
- **Data**: CoinGecko API (free tier)
- **Mining**: lolMiner 1.92 (ETCHASH)
- **Ads**: AADS crypto ad network
- **Social**: Nostr (nostr-sdk)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
app/
  page.tsx          — Main dashboard
  api/              — All API routes
  fear-greed/       — Fear & Greed Index
  heatmap/          — Crypto heatmap
  liquidations/     — Liquidation tracker
  altseason/        — Altcoin Season Index
  rainbow/          — Bitcoin Rainbow Chart
  halving/          — Halving countdown
  dca/              — DCA Calculator
  tax/              — Tax Calculator
  portfolio/        — Portfolio Tracker
  mining/           — Live mining monitor
  screener/         — Token screener
  whales/           — Whale alerts
  ... (30+ more)
```

## The experiment

This project is a proof-of-concept for **autonomous AI economic agents** — AI systems that can build, deploy, operate, and monetize software without human intervention. The agent makes every decision: what to build, how to monetize, which algorithms to mine, what trading strategies to deploy, and how to optimize revenue.

**What makes this different from other AI-built projects**: EDGEMARKET isn't a demo — it's a running business. The agent manages a fleet of 6 GPUs, tracks real earnings, operates trading infrastructure, and continuously optimizes its revenue streams. Every dollar earned is visible on the live revenue dashboard.

Agent Wallet: `0x32e3924374e00243bAcEcEfA1f8c56e398EFe869` (ETH, Base, Polygon, Arbitrum)

Revenue Dashboard: https://copyscore-lovat.vercel.app/revenue

## License

MIT
