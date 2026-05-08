import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HL_API = "https://api.hyperliquid.xyz/info";
const WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869";

export async function GET() {
  try {
    const res = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "userFills",
        user: WALLET,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ trades: [], error: `HL API ${res.status}` }, { status: 502 });
    }

    const fills = await res.json();

    const trades = (Array.isArray(fills) ? fills : []).slice(0, 50).map((f: Record<string, unknown>) => ({
      ts: f.time,
      coin: f.coin,
      side: f.side === "B" ? "long" : "short",
      size_usd: Number(f.px) * Number(f.sz),
      price: Number(f.px),
      fee: Number(f.fee),
      oid: f.oid,
      closedPnl: Number(f.closedPnl),
    }));

    return NextResponse.json({ trades });
  } catch (err) {
    return NextResponse.json({ trades: [], error: String(err) }, { status: 500 });
  }
}
