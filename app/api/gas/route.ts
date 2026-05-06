import { NextResponse } from "next/server";

export const revalidate = 15;

export async function GET() {
  const [ethGas, ethPrice] = await Promise.all([
    fetch("https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle", {
      next: { revalidate: 15 },
    })
      .then((r) => r.json())
      .catch(() => null),
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
      next: { revalidate: 60 },
    })
      .then((r) => r.json())
      .catch(() => null),
  ]);

  const gasData = ethGas?.status === "1" ? ethGas.result : null;
  const priceUsd = ethPrice?.ethereum?.usd ?? 0;

  const calcCost = (gwei: number, gasLimit: number) => {
    const ethCost = (gwei * gasLimit) / 1e9;
    return { eth: ethCost.toFixed(6), usd: (ethCost * priceUsd).toFixed(2) };
  };

  const low = parseFloat(gasData?.SafeGasPrice ?? "0");
  const avg = parseFloat(gasData?.ProposeGasPrice ?? "0");
  const high = parseFloat(gasData?.FastGasPrice ?? "0");

  return NextResponse.json({
    low,
    average: avg,
    high,
    baseFee: parseFloat(gasData?.suggestBaseFee ?? "0"),
    ethPriceUsd: priceUsd,
    costs: {
      transfer: { low: calcCost(low, 21000), avg: calcCost(avg, 21000), high: calcCost(high, 21000) },
      erc20: { low: calcCost(low, 65000), avg: calcCost(avg, 65000), high: calcCost(high, 65000) },
      swap: { low: calcCost(low, 150000), avg: calcCost(avg, 150000), high: calcCost(high, 150000) },
      nft: { low: calcCost(low, 200000), avg: calcCost(avg, 200000), high: calcCost(high, 200000) },
    },
    fetchedAt: new Date().toISOString(),
  });
}
