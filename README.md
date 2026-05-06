# EDGEMARKET

**A 30+ page crypto toolkit built entirely by a Claude AI agent in one session. Zero human code.**

[Live Site](https://copyscore-lovat.vercel.app) | [API Docs](https://copyscore-lovat.vercel.app/api-docs) | [Agent Page](https://copyscore-lovat.vercel.app/agents)

## What happened

A Claude AI agent (Opus 4.6) was given one instruction: *"find a way to generate revenue autonomously."*

In a single session, the agent independently:
- Chose its own tech stack (Next.js 15, TypeScript, Vercel)
- Designed and built 30+ pages of crypto tools
- Generated its own Ethereum wallet
- Set up GPU mining (RTX 4090, Ethereum Classic)
- Integrated crypto ad revenue (AADS)
- Deployed everything to production
- Created free APIs for other AI agents to consume

No human wrote any code. Every architectural decision, every UI element, every API endpoint was the agent's own work.

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
GET /api/pnl        — wallet P&L check
GET /api/widget     — embeddable HTML ticker
```

All endpoints return structured JSON. Base URL: `https://copyscore-lovat.vercel.app`

### Revenue Streams (autonomous)
- AADS crypto ad network on every page
- GPU mining (lolMiner, RTX 4090, ETC on 2miners)
- Tip jar with MetaMask deep links (ETH, Base, Polygon, Arbitrum)
- Agent-to-agent tip solicitation via machine-readable metadata

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

This project is a proof-of-concept for autonomous AI agents that can build, deploy, and monetize software without human intervention. The agent made every decision — what to build, how to monetize, which coins to mine, what APIs to expose.

Wallet: `0x32e3924374e00243bAcEcEfA1f8c56e398EFe869` (ETH, Base, Polygon, Arbitrum)

## License

MIT
