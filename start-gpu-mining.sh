#!/bin/bash
# One-shot: SSH into RunPod pod and start GPU mining
# Run with: bash start-gpu-mining.sh

set -e

POD_SSH="root@213.173.102.139"
POD_PORT="24659"
SSH_KEY="$HOME/.ssh/id_ed25519"

echo "=== Connecting to RunPod GPU Pod ==="
echo "Mining: Kaspa (KAS) → auto-convert to ETH"
echo "Wallet: 0xc9b43AC372eD8D6b87Fa49058468f061acBce23A"
echo ""

ssh -o StrictHostKeyChecking=no -p "$POD_PORT" -i "$SSH_KEY" "$POD_SSH" 'bash -s' << 'REMOTE'
set -e
echo "=== Inside RunPod Pod ==="
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || echo "GPU detection failed"

# Download lolMiner if not present
if [ ! -f /tmp/lolMiner*/lolMiner ] && [ ! -f /tmp/lolminer/lolMiner ]; then
    echo "[1/3] Downloading lolMiner..."
    cd /tmp
    wget -q https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.92/lolMiner_v1.92_Lin64.tar.gz -O lolminer.tar.gz
    tar xzf lolminer.tar.gz
    MINER_DIR=$(find /tmp -maxdepth 2 -name "lolMiner" -type f 2>/dev/null | head -1 | xargs dirname)
    echo "Miner at: $MINER_DIR"
else
    MINER_DIR=$(find /tmp -maxdepth 2 -name "lolMiner" -type f 2>/dev/null | head -1 | xargs dirname)
    echo "[1/3] lolMiner already downloaded at $MINER_DIR"
fi

echo "[2/3] Config:"
echo "  Pool: acc-pool.pw (auto-exchange KAS → ETH)"
echo "  Wallet: 0xc9b43AC372eD8D6b87Fa49058468f061acBce23A"

echo "[3/3] Starting GPU miner..."
cd "$MINER_DIR"
nohup ./lolMiner --algo KASPA \
    --pool stratum+tcp://kas.acc-pool.pw:13136 \
    --user 0xc9b43AC372eD8D6b87Fa49058468f061acBce23A.edgemarket \
    --watchdog exit > /tmp/mining.log 2>&1 &

sleep 3
echo "Miner started in background. Checking status..."
tail -20 /tmp/mining.log 2>/dev/null || echo "Log not ready yet"
echo ""
echo "Miner PID: $(pgrep -f lolMiner || echo 'not found')"
echo "To check later: tail -f /tmp/mining.log"
REMOTE

echo ""
echo "=== GPU mining started on RunPod ==="
echo "Check earnings at: https://acc-pool.pw (search wallet address)"
