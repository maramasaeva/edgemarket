import { NextResponse } from "next/server";

export const revalidate = 30;

interface WhaleTransaction {
  hash: string;
  timestamp: number;
  amount: number;
  amountUsd: number;
  symbol: string;
  from: string;
  fromLabel: string;
  to: string;
  toLabel: string;
  type: string; // "transfer" | "mint" | "burn"
}

async function fetchWhaleAlert(): Promise<WhaleTransaction[] | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const since = now - 3600; // last hour
    const res = await fetch(
      `https://api.whale-alert.io/v1/transactions?api_key=demo&min_value=500000&start=${since}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== "success" || !data.transactions) return null;

    return data.transactions.slice(0, 30).map((tx: Record<string, unknown>) => {
      const from = tx.from as Record<string, unknown> | undefined;
      const to = tx.to as Record<string, unknown> | undefined;
      return {
        hash: (tx.hash as string) || (tx.id as string) || String(tx.timestamp),
        timestamp: tx.timestamp as number,
        amount: tx.amount as number,
        amountUsd: (tx.amount_usd as number) || (tx.amount as number),
        symbol: ((tx.symbol as string) || "").toUpperCase(),
        from: (from?.address as string) || "unknown",
        fromLabel: (from?.owner as string) || (from?.owner_type as string) || "unknown",
        to: (to?.address as string) || "unknown",
        toLabel: (to?.owner as string) || (to?.owner_type as string) || "unknown",
        type: (tx.transaction_type as string) || "transfer",
      };
    });
  } catch {
    return null;
  }
}

async function fetchEtherscanLargeTransfers(): Promise<WhaleTransaction[] | null> {
  try {
    // Get latest block number
    const blockRes = await fetch(
      "https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_blockNumber",
      { next: { revalidate: 30 } }
    );
    if (!blockRes.ok) return null;
    const blockData = await blockRes.json();
    const latestBlock = parseInt(blockData.result, 16);
    if (!latestBlock) return null;

    // Get ETH price
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    const priceData = await priceRes.json().catch(() => null);
    const ethPrice = priceData?.ethereum?.usd ?? 3500;

    // Fetch recent blocks' internal and normal transactions
    // Use a range of last ~5 blocks for large transfers
    const startBlock = latestBlock - 5;
    const txRes = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlistinternal&startblock=${startBlock}&endblock=${latestBlock}&sort=desc&page=1&offset=50`,
      { next: { revalidate: 30 } }
    );

    if (!txRes.ok) return null;
    const txData = await txRes.json();

    const knownAddresses: Record<string, string> = {
      "0x28c6c06298d514db089934071355e5743bf21d60": "Binance",
      "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance",
      "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance",
      "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": "Binance",
      "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance",
      "0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2": "FTX",
      "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": "Kraken",
      "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": "Coinbase",
      "0x503828976d22510aad0339f0983d14e23a7d9e81": "Coinbase",
      "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance",
      "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503": "Binance",
      "0xdc24316b9ae028f1497c275eb9192a3ea0f67022": "Lido",
      "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "Lido stETH",
      "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch",
      "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap Router",
      "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x Protocol",
      "0x00000000219ab540356cbb839cbe05303d7705fa": "ETH2 Deposit",
    };

    function labelAddress(addr: string): string {
      if (!addr) return "unknown";
      const lower = addr.toLowerCase();
      return knownAddresses[lower] || "wallet";
    }

    const minWei = BigInt(Math.floor(500000 / ethPrice * 1e18)); // ~$500K in wei

    const transactions: WhaleTransaction[] = [];
    if (txData?.status === "1" && Array.isArray(txData.result)) {
      for (const tx of txData.result) {
        const valueWei = BigInt(tx.value || "0");
        if (valueWei >= minWei) {
          const ethAmount = Number(valueWei) / 1e18;
          transactions.push({
            hash: tx.hash || tx.traceId || String(tx.timeStamp),
            timestamp: parseInt(tx.timeStamp) || Math.floor(Date.now() / 1000),
            amount: ethAmount,
            amountUsd: ethAmount * ethPrice,
            symbol: "ETH",
            from: tx.from || "unknown",
            fromLabel: labelAddress(tx.from),
            to: tx.to || "unknown",
            toLabel: labelAddress(tx.to),
            type: "transfer",
          });
        }
      }
    }

    // Also try normal transactions list for the same block range
    const normalRes = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getBlockByNumber&tag=0x${latestBlock.toString(16)}&boolean=true`,
      { next: { revalidate: 30 } }
    );
    if (normalRes.ok) {
      const normalData = await normalRes.json();
      const block = normalData?.result;
      if (block?.transactions) {
        for (const tx of block.transactions as Array<Record<string, string>>) {
          const valueWei = BigInt(tx.value || "0x0");
          if (valueWei >= minWei) {
            const ethAmount = Number(valueWei) / 1e18;
            const existing = transactions.find((t) => t.hash === tx.hash);
            if (!existing) {
              transactions.push({
                hash: tx.hash,
                timestamp: parseInt(block.timestamp, 16) || Math.floor(Date.now() / 1000),
                amount: ethAmount,
                amountUsd: ethAmount * ethPrice,
                symbol: "ETH",
                from: tx.from || "unknown",
                fromLabel: labelAddress(tx.from),
                to: tx.to || "unknown",
                toLabel: labelAddress(tx.to),
                type: "transfer",
              });
            }
          }
        }
      }
    }

    // Sort by USD value desc
    transactions.sort((a, b) => b.amountUsd - a.amountUsd);
    return transactions.slice(0, 30);
  } catch {
    return null;
  }
}

export async function GET() {
  // Try Whale Alert first
  let transactions = await fetchWhaleAlert();
  let source = "whale-alert";

  // Fallback to Etherscan
  if (!transactions || transactions.length === 0) {
    transactions = await fetchEtherscanLargeTransfers();
    source = "etherscan";
  }

  if (!transactions) {
    transactions = [];
    source = "none";
  }

  return NextResponse.json({
    transactions,
    source,
    count: transactions.length,
    fetchedAt: new Date().toISOString(),
  });
}
