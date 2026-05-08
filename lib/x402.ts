import { NextRequest, NextResponse } from "next/server";
import {
  x402HTTPResourceServer,
  x402ResourceServer,
  HTTPFacilitatorClient,
  type RouteConfig,
  type HTTPAdapter,
  type HTTPProcessResult,
} from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import type { Network } from "@x402/core/types";

// ── Constants ────────────────────────────────────────────────────────
const PAY_TO = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869";
const FACILITATOR_URL = "https://x402.org/facilitator";
const NETWORK: Network = "eip155:8453"; // Base mainnet

// ── Route pricing table ──────────────────────────────────────────────
// Maps /api/v2/<endpoint> paths to their price in USDC (dollar strings).
export const PAID_ROUTES: Record<string, { price: string; description: string }> = {
  "/api/v2/markets":    { price: "0.001", description: "Trending coins, global market data, fear & greed index" },
  "/api/v2/screener":   { price: "0.001", description: "Top 100 coins with 1h/24h/7d price changes" },
  "/api/v2/whales":     { price: "0.002", description: "Real-time whale transaction alerts" },
  "/api/v2/fear-greed": { price: "0.001", description: "Crypto Fear & Greed Index with 30-day history" },
  "/api/v2/pnl":        { price: "0.002", description: "Wallet P&L analysis with token breakdown" },
  "/api/v2/polymarket": { price: "0.001", description: "Polymarket prediction market proxy" },
};

// ── Server singleton (lazy init) ─────────────────────────────────────
let _httpServer: x402HTTPResourceServer | null = null;
let _initPromise: Promise<void> | null = null;

function buildRoutes(): Record<string, RouteConfig> {
  const routes: Record<string, RouteConfig> = {};
  for (const [path, cfg] of Object.entries(PAID_ROUTES)) {
    routes[`GET ${path}`] = {
      accepts: {
        scheme: "exact",
        network: NETWORK,
        payTo: PAY_TO,
        price: `$${cfg.price}`,
        maxTimeoutSeconds: 60,
      },
      description: cfg.description,
      mimeType: "application/json",
    };
  }
  // Also handle POST for polymarket
  routes["POST /api/v2/polymarket"] = routes["GET /api/v2/polymarket"];
  return routes;
}

async function getServer(): Promise<x402HTTPResourceServer> {
  if (_httpServer && _initPromise) {
    await _initPromise;
    return _httpServer;
  }

  const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
  const coreServer = new x402ResourceServer(facilitator);
  registerExactEvmScheme(coreServer);

  const routes = buildRoutes();
  _httpServer = new x402HTTPResourceServer(coreServer, routes);

  _initPromise = _httpServer.initialize().catch((err) => {
    // If initialization fails (e.g. facilitator unreachable) we still
    // allow the fallback 402 path to work so agents can discover pricing.
    console.warn("[x402] Server initialization warning:", err?.message ?? err);
  });

  await _initPromise;
  return _httpServer;
}

// ── NextRequest → HTTPAdapter bridge ─────────────────────────────────
function nextRequestAdapter(req: NextRequest): HTTPAdapter {
  return {
    getHeader(name: string) {
      return req.headers.get(name) ?? undefined;
    },
    getMethod() {
      return req.method;
    },
    getPath() {
      return new URL(req.url).pathname;
    },
    getUrl() {
      return req.url;
    },
    getAcceptHeader() {
      return req.headers.get("accept") ?? "*/*";
    },
    getUserAgent() {
      return req.headers.get("user-agent") ?? "";
    },
    getQueryParams() {
      const params: Record<string, string> = {};
      new URL(req.url).searchParams.forEach((v, k) => {
        params[k] = v;
      });
      return params;
    },
    getQueryParam(name: string) {
      return new URL(req.url).searchParams.get(name) ?? undefined;
    },
  };
}

// ── Fallback 402 response (when x402 server init fails) ──────────────
function fallback402(path: string): NextResponse {
  const cfg = PAID_ROUTES[path];
  if (!cfg) {
    return NextResponse.json({ error: "Unknown paid route" }, { status: 404 });
  }

  // Minimal x402-compatible 402 response that any compliant client can parse
  const paymentRequired = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        maxAmountRequired: String(Math.round(parseFloat(cfg.price) * 1e6)), // USDC has 6 decimals
        resource: `https://copyscore-lovat.vercel.app${path}`,
        description: cfg.description,
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        asset: "USDC",
        extra: {},
        outputSchema: {},
      },
    ],
  };

  return NextResponse.json(paymentRequired, {
    status: 402,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "X-Payment-Response",
      "Content-Type": "application/json",
    },
  });
}

// ── Main gate function ───────────────────────────────────────────────
// Call this at the top of every paid v2 route handler.
// Returns null if payment is valid (proceed to serve data).
// Returns a NextResponse (402 or error) if payment is missing/invalid.
export async function requirePayment(
  req: NextRequest,
): Promise<NextResponse | null> {
  const path = new URL(req.url).pathname;

  // Check if there's a payment header at all
  const paymentHeader =
    req.headers.get("X-PAYMENT") ??
    req.headers.get("x-payment") ??
    req.headers.get("X-Payment");

  if (!paymentHeader) {
    // No payment → return 402 with requirements
    try {
      const server = await getServer();
      const adapter = nextRequestAdapter(req);
      const context = {
        adapter,
        path: adapter.getPath(),
        method: adapter.getMethod(),
        paymentHeader: undefined,
      };

      const result: HTTPProcessResult =
        await server.processHTTPRequest(context);

      if (result.type === "payment-error") {
        return new NextResponse(
          JSON.stringify(result.response.body),
          {
            status: result.response.status,
            headers: {
              ...result.response.headers,
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // If the server says no payment required (shouldn't happen for our routes
      // but handle gracefully), allow through.
      if (result.type === "no-payment-required") {
        return null;
      }
    } catch {
      // Facilitator down → use fallback 402
      return fallback402(path);
    }

    return fallback402(path);
  }

  // Payment header present → verify and settle via x402 server
  try {
    const server = await getServer();
    const adapter = nextRequestAdapter(req);
    const context = {
      adapter,
      path: adapter.getPath(),
      method: adapter.getMethod(),
      paymentHeader,
    };

    const result: HTTPProcessResult = await server.processHTTPRequest(context);

    if (result.type === "payment-verified") {
      // Payment is good — let the route handler proceed.
      // Settlement will happen after response is ready.
      // For simplicity in v1, we settle immediately.
      try {
        const settleResult = await server.processSettlement(
          result.paymentPayload,
          result.paymentRequirements,
          result.declaredExtensions,
        );

        if (!settleResult.success) {
          return NextResponse.json(
            {
              error: "Payment settlement failed",
              reason: settleResult.errorReason,
              message: settleResult.errorMessage,
            },
            {
              status: 402,
              headers: {
                ...settleResult.headers,
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        // Attach settlement headers — the caller can merge these into the response.
        // For now we just let through.
        return null;
      } catch (settleErr) {
        console.error("[x402] Settlement error:", settleErr);
        // If settlement fails but verification passed, still serve data.
        // The resource server can retry settlement later.
        return null;
      }
    }

    if (result.type === "payment-error") {
      return new NextResponse(
        JSON.stringify(result.response.body),
        {
          status: result.response.status,
          headers: {
            ...result.response.headers,
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // no-payment-required
    return null;
  } catch (err) {
    console.error("[x402] Payment processing error:", err);
    // If the full x402 pipeline fails, fall back to requiring payment
    return fallback402(path);
  }
}

// ── Re-export for metadata ───────────────────────────────────────────
export { PAY_TO, NETWORK, FACILITATOR_URL };
