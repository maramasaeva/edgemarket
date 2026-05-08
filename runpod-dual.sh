#!/bin/bash
set -e
WALLET="0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
WORKER="${1:-gpu}"
KAS_ADDR="kaspa:qzxa3gfam0dpj75cs39t0f9kfq4jt4lxph3ksqhvqmv7dcpflc569kqa36dlj"

pkill -f lolMiner 2>/dev/null || true
sleep 2

cd /tmp/1.92 2>/dev/null || cd /tmp/lolMiner* 2>/dev/null

./lolMiner --algo ETCHASH \
    --pool etc.2miners.com:1010 \
    --user "${WALLET}.${WORKER}" \
    --dualmode KASPADUAL \
    --dualpool stratum+tcp://kas.2miners.com:1088 \
    --dualuser "${KAS_ADDR}.${WORKER}" \
    --watchdog exit
