"""Deposit USDC from Arbitrum to Hyperliquid bridge."""
import json, os
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
HL_BRIDGE = "0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7"

ERC20_ABI = json.loads('[{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]')

# Try multiple RPCs
for rpc in ["https://arb1.arbitrum.io/rpc", "https://rpc.ankr.com/arbitrum", "https://arbitrum.drpc.org"]:
    try:
        w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 20}))
        w3.eth.block_number
        print(f"Connected to {rpc}")
        break
    except:
        continue

wallet = Web3.to_checksum_address(WALLET)
usdc = w3.eth.contract(address=Web3.to_checksum_address(USDC_ARB), abi=ERC20_ABI)
bal = usdc.functions.balanceOf(wallet).call()
eth = w3.eth.get_balance(wallet)

print(f"USDC: {bal/1e6:.4f}")
print(f"ETH:  {eth/1e18:.6f}")

if bal == 0:
    print("No USDC!")
    exit(1)
if eth == 0:
    print("No ETH for gas!")
    exit(1)

nonce = w3.eth.get_transaction_count(wallet)

# Approve HL bridge
allowance = usdc.functions.allowance(wallet, Web3.to_checksum_address(HL_BRIDGE)).call()
if allowance < bal:
    print("Approving USDC for Hyperliquid bridge...")
    tx = usdc.functions.approve(
        Web3.to_checksum_address(HL_BRIDGE), 2**256 - 1
    ).build_transaction({
        "from": wallet, "nonce": nonce,
        "maxFeePerGas": w3.eth.gas_price * 2,
        "maxPriorityFeePerGas": w3.eth.max_priority_fee,
        "gas": 80000,
    })
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    r = w3.eth.wait_for_transaction_receipt(h, timeout=60)
    print(f"  Approve: {h.hex()} (status: {r['status']})")
    nonce += 1

# Transfer USDC to HL bridge
print(f"Depositing {bal/1e6:.4f} USDC to Hyperliquid...")
tx = usdc.functions.transfer(
    Web3.to_checksum_address(HL_BRIDGE), bal
).build_transaction({
    "from": wallet, "nonce": nonce,
    "maxFeePerGas": w3.eth.gas_price * 2,
    "maxPriorityFeePerGas": w3.eth.max_priority_fee,
    "gas": 150000,
})
signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
h = w3.eth.send_raw_transaction(signed.raw_transaction)
r = w3.eth.wait_for_transaction_receipt(h, timeout=60)
print(f"  Deposit: {h.hex()} (status: {r['status']})")

if r["status"] == 1:
    print("\nDeposit sent! Should appear on Hyperliquid in ~1 min.")

# Check HL equity
import time
time.sleep(10)
from hyperliquid.utils import constants
from hyperliquid.info import Info
info = Info(constants.MAINNET_API_URL)
account = Account.from_key(PRIVATE_KEY)
user = info.user_state(account.address)
equity = float(user.get("marginSummary", {}).get("accountValue", "0"))
print(f"Hyperliquid equity: ${equity:.2f}")
