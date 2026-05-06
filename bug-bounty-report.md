# Immunefi Bug Bounty Research Report

**Date:** 2026-05-06
**Researcher:** Automated Smart Contract Audit Agent

---

## 1. Programs Researched

### 1.1 Ethena ($3M max bounty)
- **Max Critical:** $3,000,000 (min $100,000)
- **High:** $10,000-$75,000
- **Medium:** $10,000
- **Low:** $2,500
- **Status:** Active, last updated 15 April 2026
- **Note:** 27 assets in scope, but individual contract addresses were not exposed on the bounty page. Vault has $12,497.56 available. KYC required.
- **Assessment:** Highest reward but limited scope visibility from public page. Would require deeper exploration of their specific in-scope assets.

### 1.2 SSV Network ($250K max bounty)
- **Max Critical:** $250,000 (min $50,000)
- **High:** $30,000
- **Medium:** $10,000
- **Low:** $1,500
- **Status:** Active, last updated 9 April 2026
- **GitHub:** https://github.com/ssvlabs/ssv-network
- **Contracts analyzed:**
  - `SSVNetwork.sol` - Main proxy/facade
  - `SSVProxy.sol` - Delegate call implementation
  - `SSVStorage.sol` - Storage layout
  - `SSVStaking.sol` - Staking module (new)
  - `SSVClusters.sol` - Cluster management
  - `CoreLib.sol` - Transfer utilities
- **Assessment:** Well-structured, recently updated code. New staking module is most promising attack surface.

### 1.3 Lombard Finance ($250K max bounty)
- **Max Critical:** $250,000 (min $50,000)
- **High:** $10,000-$50,000
- **Medium:** $2,500
- **Low:** $1,000
- **Status:** Active, last updated 15 April 2026
- **GitHub:** https://github.com/lombard-finance/evm-smart-contracts
- **Contracts analyzed:**
  - `Bridge.sol` - Cross-chain bridge
  - `Consortium.sol` - Multisig verification
  - `Bascule.sol` - Bridge hack prevention
  - `NativeLBTC.sol` - LBTC token (native)
  - `BaseLBTC.sol` - Base ERC20 token
  - `StakeAndBake.sol` - Stake + deposit convenience
  - `Actions.sol` - Payload encoding/decoding library
- **Assessment:** Complex bridge system with consortium signature verification. Multiple potential attack surfaces.

### 1.4 DeXe Protocol ($500K max bounty)
- **Max Critical:** $500,000 (min $10,000)
- **High:** $5,000-$10,000
- **Medium:** $1,000
- **Status:** Active, last updated 13 November 2024
- **GitHub:** https://github.com/dexe-network/DeXe-Protocol
- **Contracts analyzed:**
  - `PoolFactory.sol` - DAO pool deployment factory
  - `GovPool.sol` - Core governance contract
- **Assessment:** Complex governance system with delegation, voting, and treasury management. Multiple interaction paths.

---

## 2. Vulnerability Analysis

### FINDING 1: SSV Staking - Potential Rounding-Based Reward Theft (SSVStaking.sol)
**Severity:** Medium-High
**Contract:** `SSVStaking.sol`
**Bounty:** SSV Network ($10,000-$30,000)

**Description:**
In the `claimEthRewards()` function, there is a rounding mechanism that truncates rewards:

```solidity
uint256 payout = claimable - (claimable % ETH_DEDUCTED_DIGITS);
```

And then:
```solidity
uint256 remainder = claimable - payout;
s.accrued[msg.sender] = (remainder != 0 && userBalance == 0) ? 0 : remainder;
```

The issue: when a user has `userBalance == 0` (they burned all their CSSV), the remainder is set to 0, effectively destroying dust. However, the more concerning pattern is in `_syncFees()`:

```solidity
s.accEthPerShare += uint128((newFeesWei * PRECISION) / totalStaked);
```

If `totalStaked` is very large relative to `newFeesWei`, the division can round down to zero, meaning fees are lost (never distributed). This is particularly relevant because `syncFees()` is called before staking, so an attacker could:

1. Flash loan a massive amount of SSV tokens
2. Stake them (increasing `totalStaked` massively)
3. `syncFees()` rounds down to 0 for that period
4. Unstake

This would effectively steal fee distributions from legitimate stakers for the duration of the manipulation.

**Likelihood of exploitation:** Medium. Requires significant capital or flash loan capability. Impact depends on the magnitude of fees accumulated between syncs.

**Status:** Needs deeper analysis of `PRECISION` value and `ETH_DEDUCTED_DIGITS` to confirm economic viability.

---

### FINDING 2: SSV Staking - Missing Access Control on `rescueERC20` (SSVStaking.sol)
**Severity:** Medium (likely controlled by proxy)
**Contract:** `SSVStaking.sol`

**Description:**
The `rescueERC20()` function has no `onlyOwner` modifier:

```solidity
function rescueERC20(address token, address to, uint256 amount) external nonReentrant {
    if (token == address(0) || to == address(0)) revert ZeroAddress();
    if (token == address(SSVStorage.load().token) || token == CSSV_ADDRESS) {
        revert InvalidToken();
    }
    if (amount == 0) {
        revert ZeroAmount();
    }
    IERC20(token).safeTransfer(to, amount);
    emit ERC20Rescued(token, to, amount);
}
```

However, looking at `SSVNetwork.sol`:
```solidity
function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
    _delegate(SSVStorage.load().ssvContracts[SSVModules.SSV_STAKING]);
}
```

The `onlyOwner` check is on the proxy facade, **not** the implementation. Since calls go through `delegatecall`, `msg.sender` context is preserved and the `onlyOwner` check on the proxy should protect this. However, if someone calls the `SSVStaking` implementation contract directly (not via the proxy), this function has NO access control and anyone could drain any non-SSV/CSSV tokens from the implementation contract itself.

**Assessment:** This is a known pattern (checking auth on the proxy not the implementation), but if the implementation contract somehow holds tokens (e.g., accidentally sent), they could be drained by anyone. Low severity unless the implementation address holds tokens directly.

---

### FINDING 3: Lombard Bridge - Approve Without Prior Reset (Bridge.sol)
**Severity:** Low-Medium
**Contract:** `Bridge.sol`

**Description:**
In the `_deposit()` function:

```solidity
IERC20(address(lbtc())).approve(
    address(config.adapter),
    amountWithoutFee
);
```

This uses `approve()` rather than `safeApprove()` or a pattern that first sets allowance to 0. Some ERC20 tokens (notably USDT) require the allowance to be set to 0 before changing it. While LBTC is Lombard's own token and likely doesn't have this behavior, if the adapter doesn't fully consume the allowance on a failed deposit, subsequent deposits could fail or leave dangling allowances.

More importantly: this approve-then-external-call pattern means the adapter has approval to spend from the Bridge contract. If the adapter is compromised or has a vulnerability, it could drain more than the intended amount.

**Assessment:** Low severity because LBTC is their own well-controlled token, but worth noting as a defense-in-depth concern.

---

### FINDING 4: Lombard Consortium - Signature Malleability in checkProof (Consortium.sol)
**Severity:** Medium
**Contract:** `Consortium.sol`

**Description:**
The `_checkProof()` function tries ECDSA recovery with both v=27 and v=28:

```solidity
(address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(_payloadHash, 27, r, s);
if (err != ECDSA.RecoverError.NoError) {
    continue;
}
if (signer != validators[i]) {
    (signer, err, ) = ECDSA.tryRecover(_payloadHash, 28, r, s);
    // ...
}
```

This approach means for each valid signature there could be two valid (r, s, v) tuples. While this doesn't directly enable double-spending (the signatures are checked against specific validator addresses), it does create signature malleability -- the same logical signature can be represented in two ways.

However, looking at the actual usage, signatures are positionally mapped to validators (signatures[i] corresponds to validators[i]), so malleability here doesn't create a direct vulnerability since:
1. The signer MUST match validators[i] regardless of which v value works
2. Weight accumulation is additive and can't be gamed by submitting the same validator's signature twice (they're in fixed positions)

**Assessment:** Not directly exploitable due to the positional mapping design. The dual-v-value approach is actually correct for Cosmos-style signatures that don't include v. False positive.

---

### FINDING 5: Lombard StakeAndBake - Gas Limit-Based Selective Failure (StakeAndBake.sol)
**Severity:** Low
**Contract:** `StakeAndBake.sol`

**Description:**
The `batchStakeAndBake()` function uses a configurable gas limit:

```solidity
try this.stakeAndBakeInternal{gas: $.gasLimit}(data[i]) returns (bytes memory b) {
    ret[i] = b;
} catch Error(string memory message) {
    emit BatchStakeAndBakeReverted(i, message, "");
} catch (bytes memory lowLevelData) {
    emit BatchStakeAndBakeReverted(i, "", lowLevelData);
}
```

A CLAIMER_ROLE holder could set the gas limit to a value that causes some transactions to fail while others succeed. This is by design (the role is trusted), but the gas limit could be manipulated to selectively fail certain users' stake-and-bake operations while processing others, potentially for MEV or preferential treatment.

**Assessment:** Low severity - requires trusted role compromise.

---

### FINDING 6: Lombard NativeLBTC - Legacy Hash Used for Bascule Validation (NativeLBTC.sol)
**Severity:** Medium-High (MOST PROMISING)
**Contract:** `NativeLBTC.sol`

**Description:**
In the `_validateAndMint()` function, there are TWO different hashes computed from the same payload:

```solidity
bytes32 payloadHash = sha256(payload);
bytes32 legacyHash = keccak256(payload[4:]); // TODO: remove when bascule support sha256
```

The `payloadHash` (sha256) is used for:
1. Checking `usedPayloads` mapping (replay protection)
2. Consortium proof verification

The `legacyHash` (keccak256 of payload WITHOUT the 4-byte selector) is used for:
1. Bascule deposit validation

**The vulnerability:** These two hashes are derived differently -- `payloadHash` is `sha256(full_payload)` while `legacyHash` is `keccak256(payload[4:])`. This means:

1. Two different payloads that have different selectors but the same body (payload[4:]) would produce the SAME legacyHash but different payloadHashes. However, the Actions library validates the selector, so this specific attack path is blocked.

2. More critically: the Bascule validates using `legacyHash`, but replay protection uses `payloadHash`. If there were a way to create a valid payload that passes consortium verification with a different sha256 hash but the same keccak256(body), you could bypass the Bascule's "already withdrawn" check. This is essentially a hash collision attack between sha256 and keccak256, which is computationally infeasible.

3. However, the TODO comment explicitly acknowledges this is a transitional state. If the Bascule is upgraded to sha256 while the legacy code remains, there could be a window where withdrawals validated under the old keccak256 scheme are not recognized by the new sha256 Bascule, potentially allowing re-minting.

**Assessment:** The dual-hash approach is a code smell and the TODO indicates known technical debt. Not immediately exploitable due to hash collision infeasibility, but the transitional state creates risk during Bascule upgrades.

---

### FINDING 7: SSV Network - Potential Storage Collision Risk in Proxy Pattern (SSVNetwork.sol + SSVProxy.sol)
**Severity:** Medium
**Contract:** `SSVNetwork.sol`, `SSVProxy.sol`

**Description:**
SSVNetwork uses a custom proxy pattern where:
1. The main contract inherits from `SSVProxy` and `UUPSUpgradeable`
2. Functions delegate to module contracts stored in `SSVStorage.load().ssvContracts`
3. The `fallback()` always delegates to `SSV_VIEWS` module

The `_delegate()` function in SSVProxy uses inline assembly that overwrites memory from position 0:

```solidity
calldatacopy(0, 0, calldatasize())
let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
returndatacopy(0, 0, returndatasize())
```

This is standard proxy behavior, but the concern is that `SSVNetwork` has functions that return values (e.g., `registerOperator` returns `uint64 id`) yet the implementation uses `_delegate()` which doesn't properly propagate return values through the Solidity return mechanism -- it uses raw assembly return. This means:

1. The `registerOperator` function signature says it returns `uint64 id`, but the delegate call bypasses Solidity's return data handling
2. The return data comes directly from the delegated module's execution

This SHOULD work correctly because the assembly `return` overwrites the entire execution, but it means the Solidity compiler's expectations about return data encoding are bypassed. If a module returns data in an unexpected format, it could be misinterpreted by callers.

**Assessment:** Architectural concern but likely works correctly in practice. The pattern is similar to OpenZeppelin's Proxy.sol.

---

### FINDING 8: SSV Clusters - Potential Liquidation Front-Running (SSVClusters.sol)
**Severity:** Medium
**Contract:** `SSVClusters.sol`

**Description:**
The `liquidate()` function allows any external caller to liquidate an undercollateralized cluster and receive the cluster's balance:

```solidity
if (balanceLiquidatable > 0) {
    CoreLib.transferBalance(liquidator, balanceLiquidatable);
}
```

When `clusterOwner != msg.sender`, the function checks if the cluster is liquidatable. When `clusterOwner == msg.sender`, there is NO such check -- the owner can self-liquidate at any time.

The concern: liquidation is incentivized (the liquidator receives the remaining balance). This creates a front-running opportunity where:
1. A cluster approaches the liquidation threshold
2. Multiple bots compete to liquidate it
3. The cluster owner sees a pending `deposit()` transaction to top up collateral
4. A MEV bot front-runs the deposit with a `liquidate()` call

This is a known DeFi pattern and not unique to SSV, but the economic impact could be significant.

**Assessment:** Known MEV vector. Not a novel vulnerability.

---

### FINDING 9: DeXe GovPool - tx.origin Usage in PoolFactory (PoolFactory.sol)
**Severity:** Low-Medium
**Contract:** `PoolFactory.sol`

**Description:**
The `PoolFactory` uses `tx.origin` in multiple places:

```solidity
bytes32 salt = _calculateGovSalt(tx.origin, poolName);
```

```solidity
if (_babt.balanceOf(tx.origin) > 0) {
    babtId = _babt.tokenIdOf(tx.origin);
}
```

Using `tx.origin` means:
1. If a user interacts through a contract (like a multisig or proxy), the salt and BABT check use the EOA, not the contract
2. A phishing contract could trick a user into deploying a pool through it, and the salt would be computed with the victim's address

For the salt computation, this means the pool addresses are deterministic based on the EOA that initiates the transaction, not necessarily the contract that calls the factory. This could be used to front-run pool creation or predict pool addresses.

**Assessment:** Low-medium. The `tx.origin` pattern is intentional for pool address prediction but creates phishing vectors.

---

### FINDING 10: Lombard Bridge - Nonce Increment Without Failure Rollback (Bridge.sol)
**Severity:** Low
**Contract:** `Bridge.sol`

**Description:**
In `_deposit()`:
```solidity
bytes memory payload = abi.encodeWithSelector(
    Actions.DEPOSIT_BRIDGE_ACTION,
    bytes32(block.chainid),
    bytes32(uint256(uint160(address(this)))),
    toChain,
    config.bridgeContract,
    toAddress,
    amountWithoutFee,
    $.crossChainOperationsNonce++
);
```

The nonce is incremented before the adapter deposit call:
```solidity
config.adapter.deposit{value: msg.value}(
    fromAddress,
    toChain,
    config.bridgeContract,
    toAddress,
    amountWithoutFee,
    payload
);
```

If the adapter deposit reverts, the entire transaction reverts and the nonce is rolled back (due to transaction atomicity). This is actually fine due to Solidity's revert behavior. No issue here.

**Assessment:** False positive - nonce is protected by transaction atomicity.

---

## 3. Summary of Most Promising Leads

| # | Finding | Protocol | Severity | Bounty Potential | Confidence |
|---|---------|----------|----------|-----------------|------------|
| 1 | Staking reward dilution via flash loan | SSV Network | Medium-High | $10K-$30K | Medium |
| 6 | Dual-hash Bascule validation | Lombard Finance | Medium-High | $2.5K-$50K | Medium |
| 2 | Missing access control on implementation | SSV Network | Medium | $10K | Low-Medium |
| 8 | Liquidation front-running | SSV Network | Medium | Known vector | Low |
| 9 | tx.origin usage in factory | DeXe Protocol | Low-Medium | $1K | Medium |

---

## 4. Recommended Next Steps

### Immediate Actions (Highest ROI):

1. **SSV Staking Flash Loan Analysis (Finding 1):** 
   - Determine the value of `PRECISION` and `ETH_DEDUCTED_DIGITS` constants
   - Calculate the minimum flash loan size needed to zero out `accEthPerShare` increments
   - Check if SSV token can be flash-loaned from any DEX
   - Build a PoC on a local fork

2. **Lombard Bascule Hash Migration Risk (Finding 6):**
   - Monitor Lombard's GitHub for Bascule upgrade commits
   - Analyze whether the transitional state between keccak256 and sha256 could be exploited during an upgrade
   - Check if there are any deployed payloads where `sha256(full_payload)` differs meaningfully from `keccak256(payload[4:])`

3. **Broader Ethena Analysis:**
   - The highest-paying program ($3M) was not deeply analyzed because contract addresses were not readily available on the bounty page
   - Investigate Ethena's deployed contracts on Etherscan (search for USDe, sUSDe, EthenaMinting)
   - Focus on their minting/redeeming mechanism and yield distribution

### Medium-Term Actions:

4. **Deep-dive SSV Storage Layout:**
   - Verify storage slot calculations across all modules
   - Check for potential storage collision between `SSVStorageProtocol`, `SSVStorageStaking`, `SSVStorageEB`, and `SSVStorage`
   - Each uses a different storage position, but verify the hash computations

5. **Lombard Cross-Chain Interaction:**
   - Analyze the adapter implementations (not reviewed in this pass)
   - Check for reentrancy vectors in the adapter.deposit() callback
   - Review the RateLimits library for edge cases

6. **DeXe Governance Attack Vectors:**
   - Analyze flash-loan governance attacks (borrow tokens, vote, return)
   - Check the `BlockGuard` protection mechanism
   - Review the reward calculation in `GovPoolRewards.sol` library

### Tools Needed for Next Phase:
- Foundry/Hardhat for local fork testing
- Flash loan infrastructure (Aave/dYdX)
- Transaction simulation tools (Tenderly)
- Bytecode verification against deployed contracts (to confirm source code matches)

---

## 5. Contracts Source Code References

| Protocol | Contract | Source |
|----------|----------|--------|
| SSV Network | SSVNetwork.sol | github.com/ssvlabs/ssv-network/main/contracts/SSVNetwork.sol |
| SSV Network | SSVProxy.sol | github.com/ssvlabs/ssv-network/main/contracts/SSVProxy.sol |
| SSV Network | SSVStorage.sol | github.com/ssvlabs/ssv-network/main/contracts/libraries/storage/SSVStorage.sol |
| SSV Network | SSVStaking.sol | github.com/ssvlabs/ssv-network/main/contracts/modules/SSVStaking.sol |
| SSV Network | SSVClusters.sol | github.com/ssvlabs/ssv-network/main/contracts/modules/SSVClusters.sol |
| SSV Network | CoreLib.sol | github.com/ssvlabs/ssv-network/main/contracts/libraries/CoreLib.sol |
| Lombard | Bridge.sol | github.com/lombard-finance/evm-smart-contracts/main/contracts/bridge/Bridge.sol |
| Lombard | Consortium.sol | github.com/lombard-finance/evm-smart-contracts/main/contracts/consortium/Consortium.sol |
| Lombard | Bascule.sol | github.com/lombard-finance/evm-smart-contracts/main/contracts/bascule/Bascule.sol |
| Lombard | NativeLBTC.sol | github.com/lombard-finance/evm-smart-contracts/main/contracts/LBTC/NativeLBTC.sol |
| Lombard | BaseLBTC.sol | github.com/lombard-finance/evm-smart-contracts/main/contracts/LBTC/BaseLBTC.sol |
| Lombard | StakeAndBake.sol | github.com/lombard-finance/evm-smart-contracts/main/contracts/stakeAndBake/StakeAndBake.sol |
| Lombard | Actions.sol | github.com/lombard-finance/evm-smart-contracts/main/contracts/libs/Actions.sol |
| DeXe | PoolFactory.sol | github.com/dexe-network/DeXe-Protocol/master/contracts/factory/PoolFactory.sol |
| DeXe | GovPool.sol | github.com/dexe-network/DeXe-Protocol/master/contracts/gov/GovPool.sol |

---

*This report represents an initial automated analysis. All findings require manual verification and Proof-of-Concept development before submission to Immunefi. False positives are expected at this stage.*
