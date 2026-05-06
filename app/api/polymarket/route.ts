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

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 },
    });

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
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
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
