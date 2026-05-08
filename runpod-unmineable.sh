#!/bin/bash
set -e
ETH_WALLET="0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
WORKER="${1:-gpu}"
REFERRAL="ey3r-txlh"

pkill -f lolMiner 2>/dev/null || true
sleep 2

cd /tmp/1.92 2>/dev/null || cd /tmp/lolMiner* 2>/dev/null

echo "Starting unMineable ETH via ETCHASH (auto-exchange to ETH)"
echo "Wallet: $ETH_WALLET | Worker: $WORKER"

./lolMiner --algo ETCHASH \
    --pool stratum+tcp://etchash.unmineable.com:3333 \
    --user "ETH:${ETH_WALLET}.${WORKER}#${REFERRAL}" \
    --watchdog exit
