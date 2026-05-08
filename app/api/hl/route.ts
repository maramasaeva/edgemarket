import { NextRequest, NextResponse } from "next/server";

const HL_API = "https://api.hyperliquid.xyz/info";
const WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body as { type: string };

    let payload: Record<string, string>;

    switch (type) {
      case "clearinghouseState":
        payload = { type: "clearinghouseState", user: WALLET };
        break;
      case "allMids":
        payload = { type: "allMids" };
        break;
      case "metaAndAssetCtxs":
        payload = { type: "metaAndAssetCtxs" };
        break;
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    const res = await fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Hyperliquid API error", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", detail: String(err) },
      { status: 500 }
    );
  }
}
