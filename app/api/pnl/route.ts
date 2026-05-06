import { NextResponse } from "next/server";

export const revalidate = 60;

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  functionName: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "invalid ethereum address" },
      { status: 400 }
    );
  }

  const lowerAddr = address.toLowerCase();

  // Fetch ETH balance, recent transactions, and ERC-20 token transfers in parallel
  // Using Etherscan V2 API (no key = free tier, rate limited)
  const [balanceRes, txRes, tokenRes, ethPriceRes] = await Promise.all([
    fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest`,
      { next: { revalidate: 60 } }
    )
      .then((r) => r.json())
      .catch(() => null),
    fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc`,
      { next: { revalidate: 60 } }
    )
      .then((r) => r.json())
      .catch(() => null),
    fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&address=${address}&page=1&offset=20&startblock=0&endblock=99999999&sort=desc`,
      { next: { revalidate: 60 } }
    )
      .then((r) => r.json())
      .catch(() => null),
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: 60 } }
    )
      .then((r) => r.json())
      .catch(() => null),
  ]);

  // Parse ETH balance
  const balanceWei =
    balanceRes?.status === "1" ? balanceRes.result || "0" : "0";
  const balanceEth = parseFloat(balanceWei) / 1e18;
  const ethPriceUsd = ethPriceRes?.ethereum?.usd ?? 0;
  const balanceUsd = balanceEth * ethPriceUsd;

  // Parse recent ETH transactions
  const transactions: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    valueEth: number;
    timestamp: string;
    direction: "in" | "out";
    gasUsedEth: number;
    isError: boolean;
  }> = [];

  if (txRes?.status === "1" && Array.isArray(txRes.result)) {
    for (const tx of txRes.result.slice(0, 10) as EtherscanTx[]) {
      const valueWei = parseFloat(tx.value);
      const valueEth = valueWei / 1e18;
      const gasUsedEth =
        (parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / 1e18;
      const direction = tx.to.toLowerCase() === lowerAddr ? "in" : "out";

      transactions.push({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        valueEth,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        direction,
        gasUsedEth,
        isError: tx.isError === "1",
      });
    }
  }

  // Parse token transfers — aggregate unique tokens held
  const tokenMap = new Map<
    string,
    { name: string; symbol: string; decimals: number; balance: number }
  >();

  if (tokenRes?.status === "1" && Array.isArray(tokenRes.result)) {
    for (const tx of tokenRes.result as EtherscanTx[]) {
      const symbol = tx.tokenSymbol || "???";
      const name = tx.tokenName || symbol;
      const decimals = parseInt(tx.tokenDecimal || "18");
      const rawValue = parseFloat(tx.value) / Math.pow(10, decimals);
      const direction = tx.to.toLowerCase() === lowerAddr ? "in" : "out";

      if (!tokenMap.has(symbol)) {
        tokenMap.set(symbol, { name, symbol, decimals, balance: 0 });
      }
      const entry = tokenMap.get(symbol)!;
      entry.balance += direction === "in" ? rawValue : -rawValue;
    }
  }

  // Convert to array, filter tokens with positive estimated balance
  const tokens = Array.from(tokenMap.values())
    .filter((t) => t.balance > 0.0001)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 15);

  // Calculate ETH P&L from visible transactions
  let totalEthIn = 0;
  let totalEthOut = 0;
  let totalGasPaid = 0;

  for (const tx of transactions) {
    if (tx.direction === "in") totalEthIn += tx.valueEth;
    else totalEthOut += tx.valueEth;
    totalGasPaid += tx.gasUsedEth;
  }

  const netFlow = totalEthIn - totalEthOut;

  return NextResponse.json({
    address,
    balanceEth,
    balanceUsd,
    ethPriceUsd,
    transactions,
    tokens,
    summary: {
      totalEthIn,
      totalEthOut,
      totalGasPaid,
      netFlow,
      netFlowUsd: netFlow * ethPriceUsd,
    },
    fetchedAt: new Date().toISOString(),
  });
}
