import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";
export const preferredRegion = "iad1";

const CLOB_BASE = "https://clob.polymarket.com";

// Headers that MUST NOT be forwarded — includes all geo/origin-revealing headers
const SKIP_HEADERS = new Set([
  "host", "connection", "transfer-encoding", "keep-alive",
  "upgrade", "expect", "accept-encoding",
  "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
  "x-real-ip", "x-vercel-ip-country", "x-vercel-ip-city",
  "x-vercel-ip-country-region", "x-vercel-ip-latitude",
  "x-vercel-ip-longitude", "x-vercel-ip-timezone",
  "x-vercel-proxied-for", "x-vercel-forwarded-for",
  "x-vercel-deployment-url", "x-vercel-id",
  "x-middleware-prefetch", "x-invoke-path", "x-invoke-query",
  "cf-connecting-ip", "cf-ipcountry", "true-client-ip",
  "forwarded", "via",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

async function proxyRequest(req: NextRequest, params: Promise<{ path?: string[] }>) {
  const { path } = await params;
  const targetPath = "/" + (path ?? []).join("/");
  const search = req.nextUrl.search;
  const url = `${CLOB_BASE}${targetPath}${search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (SKIP_HEADERS.has(k)) return;
    if (k.startsWith("x-vercel")) return;
    if (k.startsWith("x-forwarded")) return;
    headers[key] = value;
  });

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();

    const resHeaders: Record<string, string> = { ...CORS_HEADERS };
    const ct = res.headers.get("content-type");
    if (ct) resHeaders["Content-Type"] = ct;

    return new NextResponse(text, { status: res.status, headers: resHeaders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502, headers: CORS_HEADERS });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
