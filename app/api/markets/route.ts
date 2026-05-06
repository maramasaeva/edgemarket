import { NextResponse } from "next/server";

export const revalidate = 60;

interface CoinGeckoTrending {
  coins: Array<{
    item: {
      id: string;
      coin_id: number;
      name: string;
      symbol: string;
      thumb: string;
      small: string;
      price_btc: number;
      data?: {
        price: number;
        price_change_percentage_24h: Record<string, number>;
        market_cap: string;
        total_volume: string;
        sparkline: string;
      };
    };
  }>;
}

interface CoinGeckoGlobal {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
  };
}

interface FearGreed {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
  }>;
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const [trending, global, fearGreed, topCoins] = await Promise.all([
    fetchJSON<CoinGeckoTrending>("https://api.coingecko.com/api/v3/search/trending"),
    fetchJSON<CoinGeckoGlobal>("https://api.coingecko.com/api/v3/global"),
    fetchJSON<FearGreed>("https://api.alternative.me/fng/?limit=1"),
    fetchJSON<
      Array<{
        id: string;
        symbol: string;
        name: string;
        image: string;
        current_price: number;
        market_cap: number;
        price_change_percentage_24h: number;
        total_volume: number;
        sparkline_in_7d?: { price: number[] };
      }>
    >(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h"
    ),
  ]);

  const trendingCoins =
    trending?.coins?.map((c) => ({
      id: c.item.id,
      name: c.item.name,
      symbol: c.item.symbol.toUpperCase(),
      thumb: c.item.small || c.item.thumb,
      priceBtc: c.item.price_btc,
      priceUsd: c.item.data?.price ?? null,
      change24h: c.item.data?.price_change_percentage_24h?.usd ?? null,
      marketCap: c.item.data?.market_cap ?? null,
      sparkline: c.item.data?.sparkline ?? null,
    })) ?? [];

  const globalData = global?.data
    ? {
        totalMarketCap: global.data.total_market_cap.usd,
        totalVolume: global.data.total_volume.usd,
        btcDominance: global.data.market_cap_percentage.btc,
        ethDominance: global.data.market_cap_percentage.eth,
        marketCapChange24h: global.data.market_cap_change_percentage_24h_usd,
        activeCryptos: global.data.active_cryptocurrencies,
      }
    : null;

  const fear = fearGreed?.data?.[0]
    ? {
        value: parseInt(fearGreed.data[0].value),
        label: fearGreed.data[0].value_classification,
      }
    : null;

  const top =
    topCoins?.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price,
      change24h: c.price_change_percentage_24h,
      marketCap: c.market_cap,
      volume: c.total_volume,
      sparkline: c.sparkline_in_7d?.price?.slice(-24) ?? [],
    })) ?? [];

  return NextResponse.json({
    trending: trendingCoins,
    global: globalData,
    fearGreed: fear,
    topCoins: top,
    fetchedAt: new Date().toISOString(),
  });
}
