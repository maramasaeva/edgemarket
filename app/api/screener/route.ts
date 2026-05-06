import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=1h,24h,7d",
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "CoinGecko API error", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();

    const coins = data.map(
      (c: {
        id: string;
        symbol: string;
        name: string;
        image: string;
        current_price: number | null;
        market_cap: number | null;
        total_volume: number | null;
        price_change_percentage_1h_in_currency: number | null;
        price_change_percentage_24h_in_currency: number | null;
        price_change_percentage_7d_in_currency: number | null;
        market_cap_rank: number | null;
      }) => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        image: c.image,
        price: c.current_price ?? 0,
        marketCap: c.market_cap ?? 0,
        volume: c.total_volume ?? 0,
        change1h: c.price_change_percentage_1h_in_currency ?? 0,
        change24h: c.price_change_percentage_24h_in_currency ?? 0,
        change7d: c.price_change_percentage_7d_in_currency ?? 0,
        rank: c.market_cap_rank ?? 0,
      })
    );

    return NextResponse.json({
      coins,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
