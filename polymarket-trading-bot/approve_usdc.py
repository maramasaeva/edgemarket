"""Approve USDC.e for Polymarket exchanges - reset-then-approve pattern."""
import json
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC = "https://polygon-mainnet.g.alchemy.com/v2/5hkD1oooDXAhLoCwVT2Gn"
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WALLET = "0x32e3924374e00243bAcEcEfA1f8c56e398EFe869"
USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
MAX_UINT256 = 2**256 - 1

# Polymarket contracts on Polygon (from py_clob_client config.py)
SPENDERS = {
    "CTF Exchange": "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
    "NegRisk Exchange": "0xC5d563A36AE78145C45a50134d48A1215220f80a",
    "NegRisk Adapter": "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
}

ERC20_ABI = json.loads("""[
    {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]""")

def main():
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 30}))
    wallet = Web3.to_checksum_address(WALLET)
    usdc = w3.eth.contract(address=Web3.to_checksum_address(USDC_E), abi=ERC20_ABI)

    bal = usdc.functions.balanceOf(wallet).call()
    pol = w3.eth.get_balance(wallet) / 10**18
    print(f"USDC.e: {bal / 10**6:.4f} | POL: {pol:.4f}")

    nonce = w3.eth.get_transaction_count(wallet)
    gas_price = w3.eth.gas_price

    for name, spender_addr in SPENDERS.items():
        spender = Web3.to_checksum_address(spender_addr)
        current = usdc.functions.allowance(wallet, spender).call()

        if current >= bal:
            print(f"  {name}: already approved ({current / 10**6:.2f})")
            continue

        # Step 1: Reset to 0 (some USDC implementations require this)
        if current > 0:
            print(f"  {name}: resetting allowance to 0 first...")
            tx0 = usdc.functions.approve(spender, 0).build_transaction({
                "from": wallet, "nonce": nonce,
                "gasPrice": gas_price, "gas": 80000,
            })
            signed0 = w3.eth.account.sign_transaction(tx0, PRIVATE_KEY)
            h0 = w3.eth.send_raw_transaction(signed0.raw_transaction)
            r0 = w3.eth.wait_for_transaction_receipt(h0, timeout=60)
            print(f"    reset tx: {h0.hex()} (status: {r0['status']})")
            nonce += 1

        # Step 2: Approve max
        print(f"  {name}: approving max...")
        tx = usdc.functions.approve(spender, MAX_UINT256).build_transaction({
            "from": wallet, "nonce": nonce,
            "gasPrice": gas_price, "gas": 100000,
        })
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        r = w3.eth.wait_for_transaction_receipt(h, timeout=60)
        print(f"    approve tx: {h.hex()} (status: {r['status']})")
        if r['status'] != 1:
            # Try with a smaller amount instead of MAX_UINT256
            nonce += 1
            print(f"  {name}: max failed, trying with 1000 USDC...")
            tx2 = usdc.functions.approve(spender, 1000 * 10**6).build_transaction({
                "from": wallet, "nonce": nonce,
                "gasPrice": gas_price, "gas": 100000,
            })
            signed2 = w3.eth.account.sign_transaction(tx2, PRIVATE_KEY)
            h2 = w3.eth.send_raw_transaction(signed2.raw_transaction)
            r2 = w3.eth.wait_for_transaction_receipt(h2, timeout=60)
            print(f"    fallback tx: {h2.hex()} (status: {r2['status']})")
        nonce += 1

    # Verify
    print("\nFinal allowances:")
    for name, spender_addr in SPENDERS.items():
        spender = Web3.to_checksum_address(spender_addr)
        a = usdc.functions.allowance(wallet, spender).call()
        print(f"  {name}: {a / 10**6:.2f} USDC.e")

if __name__ == "__main__":
    main()
