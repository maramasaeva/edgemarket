# Flash Loan Arbitrage — Polygon

Aave V3 flash loan arbitrage between QuickSwap V3 and SushiSwap V2 on Polygon.

## How it works

1. Borrow USDC.e from Aave V3 (zero collateral via flash loan)
2. Buy an intermediate token (WMATIC, WETH, WBTC) on one DEX
3. Sell it on the other DEX for USDC.e
4. Repay Aave (principal + 0.05% fee)
5. Keep the profit

## Setup

```bash
# Install Python dependencies
pip install web3 python-dotenv py-solc-x

# Create .env in the parent directory (polymarket-trading-bot/.env)
echo 'PRIVATE_KEY=0xYourPrivateKeyHere' > ../.env
# Also set RPC if you have a private one:
# echo 'POLYGON_RPC=https://your-rpc-url' >> ../.env
```

## Usage

### 1. Scan for opportunities

```bash
python scanner.py

# Or with a custom RPC:
python scanner.py https://polygon-mainnet.infura.io/v3/YOUR_KEY
```

The scanner checks USDC.e/WMATIC, USDC.e/WETH, and USDC.e/WBTC across both DEXes
in both directions and reports any profitable arbitrage opportunities.

### 2. Deploy the contract

```bash
python deploy.py
```

Requires MATIC in your wallet for gas (~0.01-0.05 MATIC).
The deployed contract address is saved to `.deployed`.

### 3. Execute an arb

Call `executeArb()` on the deployed contract with the parameters from the scanner output.
Only the owner (deployer) can call this function.

## Contract Functions

| Function | Description |
|----------|-------------|
| `executeArb(borrowAmount, intermediateToken, minProfit, buyOnSushi)` | Trigger a flash loan arb |
| `withdraw(token)` | Pull ERC-20 profits to owner |
| `withdrawMatic()` | Pull MATIC to owner |

## Architecture

```
scanner.py          — Monitors prices, finds arb opportunities
FlashArb.sol        — On-chain: borrows, swaps, repays, keeps profit
deploy.py           — Compiles and deploys the contract
```

## Addresses (Polygon)

| Contract | Address |
|----------|---------|
| Aave V3 Pool | 0x794a61358D6845594F94dc1DB02A252b5b4814aD |
| QuickSwap V3 Router | 0xf5b509bB0909a69B1c207E495f687a596C168E12 |
| QuickSwap V3 Quoter | 0xa15F0D7377B2A0C0c10db057f641beD21028FC89 |
| SushiSwap V2 Router | 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506 |
| USDC.e | 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 |
| WMATIC | 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270 |
| WETH | 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f8d6 |
| WBTC | 0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6 |

## Risks

- **Slippage**: Prices can move between scanning and execution. The `minProfit` parameter guards against this.
- **Gas costs**: If gas spikes, the trade may not be profitable.
- **MEV**: Bots may frontrun your transaction. Consider using Flashbots/private mempool.
- **Smart contract risk**: The contract has not been audited. Use at your own risk.
- **Liquidity**: Low-liquidity pools may not fill large orders at quoted prices.
