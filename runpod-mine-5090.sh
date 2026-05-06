#!/bin/bash
set -e
WALLET="0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
WORKER="${1:-edgemarket}"

echo "=== EDGEMARKET ETC Mining (RTX 5090) ==="
echo "Wallet: $WALLET"
echo "Worker: $WORKER"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || true

pkill -f lolMiner 2>/dev/null || true
sleep 2

cd /tmp
if [ ! -f /tmp/1.98a/lolMiner ]; then
    echo "Downloading lolMiner 1.98a (RTX 5090 support)..."
    wget -q https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.98a/lolMiner_v1.98a_Lin64.tar.gz
    tar xzf lolMiner_v1.98a_Lin64.tar.gz
    rm -f lolMiner_v1.98a_Lin64.tar.gz
fi

cd /tmp/1.98a
echo "Starting lolMiner 1.98a ETCHASH on 2miners..."
./lolMiner --algo ETCHASH \
    --pool etc.2miners.com:1010 \
    --user "${WALLET}.${WORKER}" \
    --watchdog exit
