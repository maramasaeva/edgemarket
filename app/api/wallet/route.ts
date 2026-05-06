import { NextResponse } from "next/server";

export const revalidate = 120;

const WALLET = "0xc9b43AC372eD8D6b87Fa49058468f061acBce23A";

interface EtherscanResult {
  status: string;
  result: string;
}

async function fetchBalance(
  chain: string,
  chainId: number
): Promise<{ chain: string; balanceWei: string; balanceEth: number }> {
  try {
    const res = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=balance&address=${WALLET}&tag=latest`,
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return { chain, balanceWei: "0", balanceEth: 0 };
    const data: EtherscanResult = await res.json();
    if (data.status !== "1") return { chain, balanceWei: "0", balanceEth: 0 };
    const wei = data.result || "0";
    const eth = parseFloat(wei) / 1e18;
    return { chain, balanceWei: wei, balanceEth: eth };
  } catch {
    return { chain, balanceWei: "0", balanceEth: 0 };
  }
}

export async function GET() {
  const chains = [
    { name: "Ethereum", chainId: 1 },
    { name: "Base", chainId: 8453 },
    { name: "Polygon", chainId: 137 },
    { name: "Arbitrum", chainId: 42161 },
  ];

  const balances = await Promise.all(
    chains.map((c) => fetchBalance(c.name, c.chainId))
  );

  const totalEth = balances.reduce((s, b) => s + b.balanceEth, 0);

  let transactions: Array<{
    hash: string;
    from: string;
    value: string;
    chain: string;
    timestamp: string;
  }> = [];

  try {
    const txRes = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${WALLET}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc`,
      { next: { revalidate: 120 } }
    );
    if (txRes.ok) {
      const txData = await txRes.json();
      if (txData.status === "1" && Array.isArray(txData.result)) {
        transactions = txData.result.map((tx: Record<string, string>) => ({
          hash: tx.hash,
          from: tx.from,
          value: (parseFloat(tx.value) / 1e18).toFixed(6),
          chain: "Ethereum",
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        }));
      }
    }
  } catch {}

  return NextResponse.json({
    address: WALLET,
    balances,
    totalEth,
    transactions,
    fetchedAt: new Date().toISOString(),
  });
}
