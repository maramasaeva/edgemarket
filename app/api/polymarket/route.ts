import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_APIS: Record<string, string> = {
  gamma: "https://gamma-api.polymarket.com",
  clob: "https://clob.polymarket.com",
  data: "https://data-api.polymarket.com",
};

export async function GET(req: NextRequest) {
  const api = req.nextUrl.searchParams.get("api") || "gamma";
  const path = req.nextUrl.searchParams.get("path") || "/markets";
  const params = req.nextUrl.searchParams.get("params") || "";

  const base = ALLOWED_APIS[api];
  if (!base) {
    return NextResponse.json({ error: "Invalid API" }, { status: 400 });
  }

  const url = `${base}${path}${params ? "?" + params : ""}`;
  const headers: Record<string, string> = {};

  const fwdHeaders = [
    "poly-address", "poly-signature", "poly-timestamp", "poly-nonce",
    "poly-api-key", "poly-passphrase", "authorization",
  ];
  for (const h of fwdHeaders) {
    const val = req.headers.get(h);
    if (val) headers[h] = val;
  }

  try {
    const res = await fetch(url, { headers, next: { revalidate: 0 } });
    const text = await res.text();

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return new NextResponse(typeof body === "string" ? body : JSON.stringify(body), {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Content-Type": typeof body === "string" ? "text/plain" : "application/json",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const api = req.nextUrl.searchParams.get("api") || "clob";
  const path = req.nextUrl.searchParams.get("path") || "/order";

  const base = ALLOWED_APIS[api];
  if (!base) {
    return NextResponse.json({ error: "Invalid API" }, { status: 400 });
  }

  const url = `${base}${path}`;
  const body = await req.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const fwdHeaders = ["poly-address", "poly-signature", "poly-timestamp", "poly-nonce", "poly-api-key", "poly-passphrase"];
  for (const h of fwdHeaders) {
    const val = req.headers.get(h);
    if (val) headers[h] = val;
  }

  try {
    const res = await fetch(url, { method: "POST", headers, body });
    const text = await res.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    return new NextResponse(typeof parsed === "string" ? parsed : JSON.stringify(parsed), {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": typeof parsed === "string" ? "text/plain" : "application/json",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
