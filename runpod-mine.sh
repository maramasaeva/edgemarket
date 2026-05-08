#!/bin/bash
# Run on each RunPod pod via Jupyter terminal or SSH
# Mines ETC to the EDGEMARKET wallet on 2miners pool
set -e

WALLET="0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
WORKER="${1:-edgemarket}"

echo "=== EDGEMARKET ETC Mining Setup ==="
echo "Wallet: $WALLET"
echo "Worker: $WORKER"

nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

cd /tmp
wget -q https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.92/lolMiner_v1.92_Lin64.tar.gz -O lolminer.tar.gz
tar xzf lolminer.tar.gz
cd 1.92 2>/dev/null || cd lolMiner* 2>/dev/null

echo "=== Starting miner ==="
./lolMiner --algo ETCHASH \
    --pool etc.2miners.com:1010 \
    --user "${WALLET}.${WORKER}" \
    --watchdog exit
