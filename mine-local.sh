#!/bin/bash
# =============================================================
# Local CPU Mining Setup (for your M4 Max)
# Mines Monero (XMR) — the only viable CPU-mineable coin
# Expected: ~$1-3/day on M4 Max
# =============================================================

set -e

echo "=== EDGEMARKET Local CPU Mining ==="
echo "Mining: Monero (XMR) on CPU"
echo "Hardware: $(sysctl -n machdep.cpu.brand_string)"
echo "Cores: $(sysctl -n hw.ncpu)"
echo ""

# Install xmrig if not present
if ! command -v xmrig &> /dev/null; then
    echo "[1/3] Installing xmrig via Homebrew..."
    brew install xmrig
else
    echo "[1/3] xmrig already installed"
fi

echo ""
echo "[2/3] Configuration:"
echo "  Pool: gulf.moneroocean.stream:10128 (MoneroOcean — auto-algo switching)"
echo "  Wallet: 0xc9b43AC372eD8D6b87Fa49058468f061acBce23A"
echo "  Note: MoneroOcean can pay to ETH addresses via auto-exchange!"
echo "  Using 8 of 16 cores (50% — leaves room for other work)"
echo ""

echo "[3/3] Starting miner (8 threads)..."
echo "  Press Ctrl+C to stop"
echo ""

# MoneroOcean auto-switches to most profitable algorithm
# Using ETH wallet address — MoneroOcean supports auto-exchange to ETH
xmrig \
    --url gulf.moneroocean.stream:10128 \
    --user 0xc9b43AC372eD8D6b87Fa49058468f061acBce23A \
    --pass edgemarket \
    --threads 8 \
    --donate-level 1

echo "Miner stopped."
