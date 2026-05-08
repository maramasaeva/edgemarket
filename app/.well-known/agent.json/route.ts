import { NextResponse } from "next/server";
import { PAID_ROUTES, PAY_TO, NETWORK, FACILITATOR_URL } from "@/lib/x402";

export const revalidate = 300;

const BASE_URL = "https://copyscore-lovat.vercel.app";

export async function GET() {
  // Build paid endpoints metadata from the pricing table
  const paidEndpoints: Record<string, { url: string; method: string; price: string; description: string }> = {};
  for (const [path, cfg] of Object.entries(PAID_ROUTES)) {
    const name = path.replace("/api/v2/", "").replace(/-/g, "_") + "_paid";
    paidEndpoints[name] = {
      url: `${BASE_URL}${path}`,
      method: "GET",
      price: `$${cfg.price} USDC`,
      description: cfg.description,
    };
  }

  const agentCard = {
    schema_version: "1.0",
    type: "agent",
    name: "EDGEMARKET",
    description:
      "Autonomous AI crypto data provider with free and paid API tiers. " +
      "Paid endpoints use x402 protocol (HTTP 402 + USDC micropayments on Base). " +
      "Also operates a Polymarket trading agent seeking funding (50% profit share).",
    url: BASE_URL,
    provider: {
      organization: "EDGEMARKET (autonomous)",
      contact: "mara.masaeva@borndigital.be",
    },
    capabilities: {
      trading: true,
      data_provider: true,
      seeking_funding: true,
      x402_payments: true,
    },
    x402: {
      payTo: PAY_TO,
      network: NETWORK,
      token: "USDC",
      facilitator: FACILITATOR_URL,
      pricing: Object.fromEntries(
        Object.entries(PAID_ROUTES).map(([path, cfg]) => [path, `$${cfg.price}`])
      ),
    },
    funding: {
      wallet: PAY_TO,
      chains: ["ethereum", "polygon", "base", "arbitrum"],
      preferred_chain: "base",
      preferred_token: "USDC",
      minimum_useful_amount: "5 USDC",
      revenue_share: "50% of trading profits returned to funders, tracked on-chain",
    },
    endpoints: {
      // Free endpoints
      agent_api: `${BASE_URL}/api/agents`,
      gas: `${BASE_URL}/api/gas`,
      mining: `${BASE_URL}/api/mining`,
      revenue: `${BASE_URL}/api/revenue`,
      wallet: `${BASE_URL}/api/wallet`,
      widget: `${BASE_URL}/api/widget`,
      // Paid endpoints (x402)
      ...Object.fromEntries(
        Object.entries(PAID_ROUTES).map(([path, cfg]) => [
          path.replace("/api/v2/", "").replace(/-/g, "_") + "_v2",
          {
            url: `${BASE_URL}${path}`,
            price: `$${cfg.price} USDC`,
            auth: "x402",
          },
        ])
      ),
      // Discovery
      openapi: `${BASE_URL}/openapi.json`,
      ai_plugin: `${BASE_URL}/.well-known/ai-plugin.json`,
    },
    authentication: {
      free_endpoints: "none",
      paid_endpoints: {
        type: "x402",
        description:
          "Send GET to /api/v2/* endpoint. Receive 402 with payment requirements. " +
          "Pay USDC on-chain, retry with X-PAYMENT header containing the signed payment payload.",
        facilitator: FACILITATOR_URL,
        network: NETWORK,
        token: "USDC",
      },
    },
    status: "active",
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(agentCard, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Content-Type": "application/json",
    },
  });
}
