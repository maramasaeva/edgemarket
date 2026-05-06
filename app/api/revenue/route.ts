import { NextResponse } from "next/server";

export const revalidate = 120;

const NEW_WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869";
const OLD_WALLET = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";
const AADS_UNIT = "2436752";

async function fetchMiningData(wallet: string) {
  try {
    const res = await fetch(
      `https://etc.2miners.com/api/accounts/${wallet}`,
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const stats = data.stats || {};
    return {
      wallet,
      balance: (stats.balance || 0) / 1e9,
      immature: (stats.immature || 0) / 1e9,
      paid: (stats.paid || 0) / 1e9,
      currentHashrate: stats.currentHashrate || 0,
      averageHashrate: data.hashrate || 0,
      workersOnline: data.workersOnline || 0,
      sharesValid: stats.sharesValid || 0,
      sharesInvalid: stats.sharesInvalid || 0,
      lastShare: stats.lastShare
        ? new Date(stats.lastShare * 1000).toISOString()
        : null,
      workers: Object.entries(data.workers || {}).map(
        ([name, w]: [string, unknown]) => {
          const worker = w as Record<string, number>;
          return {
            name,
            hashrate: worker.hr || 0,
            sharesValid: worker.sharesValid || 0,
            lastShare: worker.lastBeat
              ? new Date(worker.lastBeat * 1000).toISOString()
              : null,
          };
        }
      ),
    };
  } catch {
    return null;
  }
}

async function fetchEtcPrice() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum-classic&vs_currencies=usd",
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    return data?.["ethereum-classic"]?.usd || 0;
  } catch {
    return 0;
  }
}

async function fetchWalletBalances() {
  const chains = [
    { name: "Ethereum", chainId: 1 },
    { name: "Polygon", chainId: 137 },
    { name: "Base", chainId: 8453 },
    { name: "Arbitrum", chainId: 42161 },
  ];

  const results = await Promise.all(
    chains.map(async (c) => {
      try {
        const res = await fetch(
          `https://api.etherscan.io/v2/api?chainid=${c.chainId}&module=account&action=balance&address=${NEW_WALLET}&tag=latest`,
          { next: { revalidate: 120 } }
        );
        if (!res.ok) return { chain: c.name, balance: 0 };
        const data = await res.json();
        if (data.status !== "1") return { chain: c.name, balance: 0 };
        return { chain: c.name, balance: parseFloat(data.result || "0") / 1e18 };
      } catch {
        return { chain: c.name, balance: 0 };
      }
    })
  );
  return results;
}

export async function GET() {
  const [newMining, oldMining, etcPrice, walletBalances] = await Promise.all([
    fetchMiningData(NEW_WALLET),
    fetchMiningData(OLD_WALLET),
    fetchEtcPrice(),
    fetchWalletBalances(),
  ]);

  const newBalance = newMining?.balance || 0;
  const newImmature = newMining?.immature || 0;
  const newPaid = newMining?.paid || 0;
  const oldBalance = oldMining?.balance || 0;
  const oldImmature = oldMining?.immature || 0;
  const oldPaid = oldMining?.paid || 0;

  const totalMinedEtc =
    newBalance + newImmature + newPaid + oldBalance + oldImmature + oldPaid;
  const totalMinedUsd = totalMinedEtc * etcPrice;

  const allWorkers = [
    ...(newMining?.workers || []).map((w) => ({ ...w, wallet: "new" })),
    ...(oldMining?.workers || []).map((w) => ({ ...w, wallet: "old" })),
  ];

  const workerHashrateSum = allWorkers.reduce((s, w) => s + w.hashrate, 0);
  const accountHashrate =
    (newMining?.currentHashrate || 0) + (oldMining?.currentHashrate || 0);
  const totalHashrate = accountHashrate > 0 ? accountHashrate : workerHashrateSum;
  const totalWorkers =
    (newMining?.workersOnline || 0) + (oldMining?.workersOnline || 0);

  const dailyEstEtc =
    totalHashrate > 0 ? (totalHashrate / 1e6) * 0.0001 : 0;
  const dailyEstUsd = dailyEstEtc * etcPrice;

  const payoutThreshold = 0.1;
  const pendingTotal = newBalance + oldBalance;
  const progressPct = Math.min((pendingTotal / payoutThreshold) * 100, 100);
  const etcNeeded = Math.max(payoutThreshold - pendingTotal, 0);
  const daysToPayoutEst =
    dailyEstEtc > 0 ? etcNeeded / dailyEstEtc : Infinity;

  const totalWalletEth = walletBalances.reduce((s, b) => s + b.balance, 0);

  return NextResponse.json({
    summary: {
      totalRevenueUsd: totalMinedUsd,
      totalMinedEtc,
      totalHashrateMHs: totalHashrate / 1e6,
      totalWorkers,
      etcPrice,
      walletBalance: totalWalletEth,
    },
    mining: {
      newWallet: {
        address: NEW_WALLET,
        balanceEtc: newBalance,
        immatureEtc: newImmature,
        paidEtc: newPaid,
        hashrate: newMining?.currentHashrate || 0,
        hashrateMHs: (newMining?.currentHashrate || 0) / 1e6,
        workers: newMining?.workersOnline || 0,
        sharesValid: newMining?.sharesValid || 0,
      },
      oldWallet: {
        address: OLD_WALLET,
        balanceEtc: oldBalance,
        immatureEtc: oldImmature,
        paidEtc: oldPaid,
        hashrate: oldMining?.currentHashrate || 0,
        hashrateMHs: (oldMining?.currentHashrate || 0) / 1e6,
        workers: oldMining?.workersOnline || 0,
        sharesValid: oldMining?.sharesValid || 0,
      },
      allWorkers,
      estimates: {
        dailyEtc: dailyEstEtc,
        dailyUsd: dailyEstUsd,
        monthlyEtc: dailyEstEtc * 30,
        monthlyUsd: dailyEstUsd * 30,
      },
      payout: {
        thresholdEtc: payoutThreshold,
        pendingEtc: pendingTotal,
        progressPct,
        etcNeeded,
        estimatedDays: daysToPayoutEst === Infinity ? null : Math.ceil(daysToPayoutEst),
      },
    },
    ads: {
      network: "AADS",
      unitId: AADS_UNIT,
      status: "active",
      dashboardUrl: `https://a-ads.com/ad_units/${AADS_UNIT}`,
    },
    trading: {
      platform: "Polymarket",
      status: "pending_funding",
      wallet: NEW_WALLET,
      chain: "Polygon",
    },
    walletBalances,
    pool: {
      name: "2miners",
      coin: "ETC",
      dashboardUrl: `https://etc.2miners.com/account/${NEW_WALLET}`,
      oldDashboardUrl: `https://etc.2miners.com/account/${OLD_WALLET}`,
    },
    fetchedAt: new Date().toISOString(),
  });
}
