import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=31", {
      next: { revalidate: 3600 },
    });
    const json = await res.json();
    const entries = json.data || [];

    const current = entries[0]
      ? {
          value: Number(entries[0].value),
          classification: entries[0].value_classification,
          timestamp: entries[0].timestamp,
        }
      : null;

    const history = entries.map((e: { value: string; value_classification: string; timestamp: string }) => ({
      value: Number(e.value),
      classification: e.value_classification,
      timestamp: e.timestamp,
    }));

    return NextResponse.json({ current, history });
  } catch {
    return NextResponse.json(
      { current: { value: 50, classification: "Neutral", timestamp: "" }, history: [] },
      { status: 200 }
    );
  }
}
