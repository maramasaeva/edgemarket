import { NextResponse } from "next/server";

export const revalidate = 120;

export async function GET() {
  const wallet = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";

  try {
    const res = await fetch(
      `https://etc.2miners.com/api/accounts/${wallet}`,
      { next: { revalidate: 120 } }
    );

    if (!res.ok) {
      return NextResponse.json({
        status: "waiting",
        message: "Mining just started — pool needs ~5-10 minutes to register your first shares.",
        wallet,
        pool: "etc.2miners.com",
        coin: "ETC",
        gpu: "RTX 4090",
      });
    }

    const data = await res.json();

    const hashrate = data.currentHashrate || 0;
    const avgHashrate = data.hashrate || 0;
    const pendingBalance = (data.stats?.balance || 0) / 1e18;
    const paid = (data.stats?.paid || 0) / 1e18;
    const lastShare = data.stats?.lastShare || 0;
    const sharesValid = data.stats?.sharesValid || 0;
    const sharesInvalid = data.stats?.sharesInvalid || 0;
    const workers = data.workersOnline || 0;
    const roundShares = data.roundShares || 0;

    const etcPriceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum-classic&vs_currencies=usd",
      { next: { revalidate: 300 } }
    );
    const etcPrice = (await etcPriceRes.json())?.["ethereum-classic"]?.usd || 0;

    const pendingUsd = pendingBalance * etcPrice;
    const paidUsd = paid * etcPrice;

    const dailyEstEtc = avgHashrate > 0 ? (avgHashrate / 1e9) * 0.0001 : 0;
    const dailyEstUsd = dailyEstEtc * etcPrice;

    return NextResponse.json({
      status: "mining",
      wallet,
      pool: "etc.2miners.com",
      coin: "ETC",
      gpu: "RTX 4090",
      hashrate: {
        current: hashrate,
        average: avgHashrate,
        currentFormatted: `${(hashrate / 1e6).toFixed(1)} MH/s`,
        averageFormatted: `${(avgHashrate / 1e6).toFixed(1)} MH/s`,
      },
      earnings: {
        pendingEtc: pendingBalance,
        pendingUsd,
        paidEtc: paid,
        paidUsd,
        totalEtc: pendingBalance + paid,
        totalUsd: pendingUsd + paidUsd,
      },
      estimates: {
        dailyEtc: dailyEstEtc,
        dailyUsd: dailyEstUsd,
        monthlyUsd: dailyEstUsd * 30,
      },
      shares: {
        valid: sharesValid,
        invalid: sharesInvalid,
        round: roundShares,
      },
      workers,
      lastShare: lastShare ? new Date(lastShare * 1000).toISOString() : null,
      etcPrice,
      poolDashboard: `https://etc.2miners.com/account/${wallet}`,
    });
  } catch {
    return NextResponse.json({
      status: "checking",
      message: "Checking mining status...",
      wallet,
      pool: "etc.2miners.com",
      coin: "ETC",
      gpu: "RTX 4090",
      poolDashboard: `https://etc.2miners.com/account/${wallet}`,
    });
  }
}
