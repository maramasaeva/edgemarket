#!/bin/bash
set -e
echo "=== EDGEMARKET AI Inference Server Setup ==="

pip install vllm --quiet 2>/dev/null || pip3 install vllm --quiet 2>/dev/null

echo "Starting vLLM inference server with Llama 3.1 8B..."
echo "API will be available on port 8000"

python3 -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --max-model-len 4096 \
    --gpu-memory-utilization 0.90 \
    --dtype auto
