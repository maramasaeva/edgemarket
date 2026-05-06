#!/bin/bash
# =============================================================
# GPU Mining Setup Script for RunPod
# Run this INSIDE your RunPod pod (via SSH or web terminal)
# =============================================================
# Mines Kaspa (KAS) — currently the most profitable GPU coin
# Auto-payout to a KAS address, then swap to ETH
# =============================================================

set -e

echo "=== EDGEMARKET GPU Mining Setup ==="
echo "Mining: Kaspa (KAS) on GPU"
echo ""

# Detect GPU
echo "[1/5] Detecting GPU..."
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || {
    echo "No NVIDIA GPU found! Make sure you're on a GPU pod."
    exit 1
}
echo ""

# Install mining software
echo "[2/5] Installing lolMiner (KAS GPU miner)..."
cd /tmp
wget -q https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.92/lolMiner_v1.92_Lin64.tar.gz -O lolminer.tar.gz
tar xzf lolminer.tar.gz
cd lolMiner_v1.92_Lin64 2>/dev/null || cd 1.92 2>/dev/null || cd lolMiner* 2>/dev/null

echo ""
echo "[3/5] Configuration:"
echo "  Pool: acc-pool.pw (auto-exchange pool — mines KAS, pays in ETH/BTC)"
echo "  Wallet: 0xc9b43AC372eD8D6b87Fa49058468f061acBce23A (ETH)"
echo "  Worker: edgemarket-runpod"
echo ""

# ACC Pool auto-exchanges mined coins to ETH and pays to ETH address
# This means we mine KAS but get paid in ETH directly!
POOL="stratum+tcp://kas.acc-pool.pw:13136"
WALLET="0xc9b43AC372eD8D6b87Fa49058468f061acBce23A"
WORKER="edgemarket"

echo "[4/5] Starting miner..."
echo "  Press Ctrl+C to stop"
echo ""

# Start mining
./lolMiner --algo KASPA \
    --pool "$POOL" \
    --user "$WALLET.$WORKER" \
    --watchdog exit

echo ""
echo "[5/5] Miner stopped."
