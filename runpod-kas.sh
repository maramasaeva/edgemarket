#!/bin/bash
set -e
WALLET="0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
WORKER="${1:-gpu}"

pkill -f lolMiner 2>/dev/null || true
sleep 2

cd /tmp/1.92 2>/dev/null || cd /tmp/lolMiner* 2>/dev/null

echo "Starting KAS miner (auto-exchange to ETH via acc-pool)"
echo "Wallet: $WALLET | Worker: $WORKER"

./lolMiner --algo KASPA \
    --pool stratum+tcp://kas.acc-pool.pw:13136 \
    --user "${WALLET}.${WORKER}" \
    --watchdog exit
