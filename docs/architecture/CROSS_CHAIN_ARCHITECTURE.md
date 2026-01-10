# Cross-Chain Architecture: Bi-Directional Bridging

**Complete Guide to Multi-Chain Intent Protocol Implementation**

---

## 🌐 Overview

Intent Protocol requires **contracts on every supported chain** plus an **off-chain relay network** to enable bi-directional bridging.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTENT PROTOCOL ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  Ethereum    │    │     BSC      │    │   Polygon    │          │
│  │  Lock/Unlock │    │  Lock/Unlock │    │  Lock/Unlock │          │
│  │  Contract    │    │   Contract   │    │   Contract   │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                    │                   │                  │
│         └────────────────────┼───────────────────┘                  │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │   Off-Chain       │                            │
│                    │   Relay Network   │                            │
│                    │   (Resolvers)     │                            │
│                    └─────────┬─────────┘                            │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │    Movement       │                            │
│                    │  Intent Registry  │                            │
│                    │  (Core Protocol)  │                            │
│                    └───────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Required Components Per Chain

### For EVM Chains (Ethereum, BSC, Polygon, Arbitrum, etc.)

| Component | Purpose | Location |
|-----------|---------|----------|
| **LockContract** | Hold locked tokens, verify & release | On-chain (Solidity) |
| **RelayerService** | Watch events, submit proofs | Off-chain |
| **Indexer** | Track deposits & withdrawals | Off-chain |

### For Movement (Core Protocol)

| Component | Purpose | Location |
|-----------|---------|----------|
| **IntentRegistry** | Manage intent lifecycle | On-chain (Move) |
| **LiquidityPool** | Provide instant liquidity | On-chain (Move) |
| **ResolverManager** | Manage resolver network | On-chain (Move) |

### For Non-EVM Chains (Solana, Sui, etc.)

| Component | Purpose | Location |
|-----------|---------|----------|
| **LockProgram** | Chain-specific lock mechanism | On-chain (Rust/Move) |
| **CustomAdapter** | Translate to standard format | Off-chain |

---

## 🔷 EVM Chain Contracts (Solidity)

### Master Lock Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract IntentLockContract is ReentrancyGuard {
    
    // ============ State ============
    
    struct Deposit {
        address depositor;
        address token;
        uint256 amount;
        uint256 targetChainId;
        bytes32 targetAddress;  // Movement address as bytes32
        uint256 timestamp;
        bool released;
        bool refunded;
    }
    
    mapping(bytes32 => Deposit) public deposits;  // depositId => Deposit
    mapping(address => bool) public authorizedRelayers;
    
    uint256 public depositNonce;
    uint256 public constant EXPIRY_TIME = 24 hours;
    
    // ============ Events ============
    
    event TokensLocked(
        bytes32 indexed depositId,
        address indexed depositor,
        address token,
        uint256 amount,
        uint256 targetChainId,
        bytes32 targetAddress,
        uint256 timestamp
    );
    
    event TokensReleased(
        bytes32 indexed depositId,
        address indexed recipient,
        uint256 amount
    );
    
    event TokensRefunded(
        bytes32 indexed depositId,
        address indexed depositor,
        uint256 amount
    );
    
    // ============ Lock Functions ============
    
    /// @notice Lock tokens for cross-chain transfer TO Movement
    function lockTokens(
        address token,
        uint256 amount,
        uint256 targetChainId,
        bytes32 targetAddress
    ) external nonReentrant returns (bytes32 depositId) {
        require(amount > 0, "Amount must be > 0");
        
        // Generate unique deposit ID
        depositId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            amount,
            block.chainid,
            depositNonce++
        ));
        
        // Transfer tokens to this contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Store deposit
        deposits[depositId] = Deposit({
            depositor: msg.sender,
            token: token,
            amount: amount,
            targetChainId: targetChainId,
            targetAddress: targetAddress,
            timestamp: block.timestamp,
            released: false,
            refunded: false
        });
        
        emit TokensLocked(
            depositId,
            msg.sender,
            token,
            amount,
            targetChainId,
            targetAddress,
            block.timestamp
        );
    }
    
    // ============ Release Functions ============
    
    /// @notice Release tokens FROM Movement (fulfill reverse intent)
    /// @dev Called by authorized relayer with proof from Movement
    function releaseTokens(
        bytes32 depositId,
        address recipient,
        bytes calldata proof
    ) external nonReentrant {
        require(authorizedRelayers[msg.sender], "Not authorized");
        require(verifyProof(depositId, recipient, proof), "Invalid proof");
        
        Deposit storage deposit = deposits[depositId];
        require(!deposit.released && !deposit.refunded, "Already processed");
        
        deposit.released = true;
        
        IERC20(deposit.token).transfer(recipient, deposit.amount);
        
        emit TokensReleased(depositId, recipient, deposit.amount);
    }
    
    /// @notice Refund expired deposit
    function refundExpired(bytes32 depositId) external nonReentrant {
        Deposit storage deposit = deposits[depositId];
        
        require(deposit.depositor == msg.sender, "Not depositor");
        require(!deposit.released && !deposit.refunded, "Already processed");
        require(
            block.timestamp > deposit.timestamp + EXPIRY_TIME,
            "Not expired yet"
        );
        
        deposit.refunded = true;
        
        IERC20(deposit.token).transfer(deposit.depositor, deposit.amount);
        
        emit TokensRefunded(depositId, deposit.depositor, deposit.amount);
    }
    
    // ============ Proof Verification ============
    
    function verifyProof(
        bytes32 depositId,
        address recipient,
        bytes calldata proof
    ) internal view returns (bool) {
        // In production: Verify ZK proof or multi-sig from relayers
        // For MVP: Check signatures from N-of-M relayers
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            depositId,
            recipient,
            block.chainid
        ));
        
        // Verify threshold signatures
        return verifyThresholdSignatures(messageHash, proof);
    }
    
    function verifyThresholdSignatures(
        bytes32 messageHash,
        bytes calldata proof
    ) internal view returns (bool) {
        // Decode signatures and verify N-of-M
        // Implementation depends on your relayer setup
        return true; // Placeholder
    }
}
```

---

## � Per-Intent Subaccounts (Fund Isolation)

### Why Subaccounts?

The basic lock contract above puts **all funds in one address**. If compromised, ALL funds are lost! 

**Better approach**: Create a **unique deposit address per intent** using CREATE2.

```
┌─────────────────────────────────────────────────────────────────┐
│              FUND ISOLATION COMPARISON                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ SHARED POOL (Risky):                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │          Main Contract                   │                    │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │                    │
│  │  │1000 │ │5000 │ │50K  │ │100K │       │  ALL funds here!   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘       │  Hack = lose ALL   │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
│  ✅ SUBACCOUNTS (Safe):                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │0x001 │ │0x002 │ │0x003 │ │0x004 │                           │
│  │1000  │ │5000  │ │50K   │ │100K  │   Each intent isolated!   │
│  └──────┘ └──────┘ └──────┘ └──────┘   Hack 1 = lose only 1    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### CREATE2 Factory Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IntentVaultFactory
/// @notice Creates unique deposit vaults per intent using CREATE2
contract IntentVaultFactory {
    using Clones for address;
    
    // ============ State ============
    
    address public immutable vaultImplementation;
    address public owner;
    mapping(address => bool) public authorizedRelayers;
    mapping(bytes32 => address) public intentToVault;
    
    // ============ Events ============
    
    event VaultCreated(
        bytes32 indexed intentId,
        address indexed vault,
        address indexed user
    );
    
    event DepositReceived(
        bytes32 indexed intentId,
        address indexed vault,
        address token,
        uint256 amount
    );
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        vaultImplementation = address(new DepositVault());
    }
    
    // ============ Address Derivation ============
    
    /// @notice Compute deposit address WITHOUT deploying (deterministic)
    /// @param user The depositor's address
    /// @param intentId Unique intent identifier
    /// @return vault The address where user should send funds
    function getDepositAddress(
        address user,
        bytes32 intentId
    ) public view returns (address vault) {
        bytes32 salt = _computeSalt(user, intentId);
        vault = vaultImplementation.predictDeterministicAddress(salt);
    }
    
    /// @notice Check if vault is already deployed
    function isVaultDeployed(address vault) public view returns (bool) {
        return vault.code.length > 0;
    }
    
    // ============ Vault Creation ============
    
    /// @notice Deploy vault for user+intent (or get existing)
    /// @dev Uses EIP-1167 minimal proxy for gas efficiency (~45k vs ~100k)
    function createVault(
        address user,
        bytes32 intentId
    ) external returns (address vault) {
        bytes32 salt = _computeSalt(user, intentId);
        
        // Check if already deployed
        vault = vaultImplementation.predictDeterministicAddress(salt);
        if (vault.code.length > 0) {
            return vault;
        }
        
        // Deploy minimal proxy
        vault = vaultImplementation.cloneDeterministic(salt);
        
        // Initialize vault
        DepositVault(vault).initialize(user, intentId, address(this));
        
        // Store mapping
        intentToVault[intentId] = vault;
        
        emit VaultCreated(intentId, vault, user);
    }
    
    // ============ Fund Release ============
    
    /// @notice Release funds from vault (called by relayer with proof)
    /// @param intentId The intent to release funds for
    /// @param token Token address to release
    /// @param recipient Where to send the funds
    /// @param proof Multi-sig proof from relayers
    function releaseFromVault(
        bytes32 intentId,
        address token,
        address recipient,
        bytes calldata proof
    ) external {
        require(authorizedRelayers[msg.sender], "Not authorized");
        require(_verifyProof(intentId, recipient, proof), "Invalid proof");
        
        address vault = intentToVault[intentId];
        require(vault != address(0), "Vault not found");
        
        DepositVault(vault).release(token, recipient);
    }
    
    /// @notice Allow user to refund expired intent
    function refundFromVault(
        bytes32 intentId,
        address token
    ) external {
        address vault = intentToVault[intentId];
        require(vault != address(0), "Vault not found");
        
        // Vault handles authorization (only original user after expiry)
        DepositVault(vault).refund(token, msg.sender);
    }
    
    // ============ Internal ============
    
    function _computeSalt(
        address user,
        bytes32 intentId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, intentId));
    }
    
    function _verifyProof(
        bytes32 intentId,
        address recipient,
        bytes calldata proof
    ) internal view returns (bool) {
        // Verify N-of-M signatures from relayers
        // Implementation depends on your setup
        return true; // Placeholder
    }
}

/// @title DepositVault
/// @notice Isolated vault for a single intent
contract DepositVault {
    
    // ============ State ============
    
    address public user;
    bytes32 public intentId;
    address public factory;
    uint256 public createdAt;
    bool public released;
    bool public refunded;
    bool public initialized;
    
    uint256 public constant EXPIRY_TIME = 24 hours;
    
    // ============ Events ============
    
    event Released(address token, address recipient, uint256 amount);
    event Refunded(address token, address user, uint256 amount);
    
    // ============ Initialize ============
    
    function initialize(
        address _user,
        bytes32 _intentId,
        address _factory
    ) external {
        require(!initialized, "Already initialized");
        initialized = true;
        
        user = _user;
        intentId = _intentId;
        factory = _factory;
        createdAt = block.timestamp;
    }
    
    // ============ Release ============
    
    /// @notice Release funds to recipient (only factory can call)
    function release(address token, address recipient) external {
        require(msg.sender == factory, "Only factory");
        require(!released && !refunded, "Already processed");
        
        released = true;
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        
        IERC20(token).transfer(recipient, balance);
        
        emit Released(token, recipient, balance);
    }
    
    /// @notice Refund to original user (after expiry)
    function refund(address token, address caller) external {
        require(msg.sender == factory, "Only factory");
        require(!released && !refunded, "Already processed");
        require(caller == user, "Not original user");
        require(
            block.timestamp > createdAt + EXPIRY_TIME,
            "Not expired yet"
        );
        
        refunded = true;
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        
        IERC20(token).transfer(user, balance);
        
        emit Refunded(token, user, balance);
    }
    
    // ============ View ============
    
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    function isExpired() external view returns (bool) {
        return block.timestamp > createdAt + EXPIRY_TIME;
    }
}
```

### User Flow with Subaccounts

```
┌─────────────────────────────────────────────────────────────────┐
│           DEPOSIT WITH ISOLATED SUBACCOUNT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Alice requests deposit address                               │
│     └─→ Frontend: factory.getDepositAddress(alice, intentId)    │
│     └─→ Returns: 0xUniqueVault789 (deterministic!)              │
│                                                                  │
│  2. Alice sends 1000 USDC to 0xUniqueVault789                   │
│     └─→ Simple ERC20 transfer (no contract interaction!)        │
│     └─→ Funds stored ONLY at this unique address                │
│                                                                  │
│  3. Relayer detects deposit & creates vault contract            │
│     └─→ factory.createVault(alice, intentId)                    │
│     └─→ Minimal proxy deployed to same address                  │
│                                                                  │
│  4. Intent fulfilled → Release funds                             │
│     └─→ factory.releaseFromVault(intentId, token, recipient)    │
│     └─→ ONLY this vault's funds move                            │
│                                                                  │
│  5. If expired → Alice refunds herself                          │
│     └─→ factory.refundFromVault(intentId, token)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Comparison Table

| Aspect | Shared Pool | Per-Intent Vault |
|--------|-------------|------------------|
| **Fund Isolation** | ❌ All together | ✅ Each separate |
| **Hack Impact** | 💀 Lose ALL | ⚠️ Lose only 1 |
| **Gas (Lock)** | ~80k | ~125k (+45k for clone) |
| **Gas (Release)** | ~60k | ~65k |
| **User Experience** | Interact with contract | Just send to address |
| **Complexity** | Simple | Medium |
| **Auditability** | Harder | Easier (isolated state) |

### Address Generation Example

```typescript
// Frontend/Backend code to get deposit address
async function getUniqueDepositAddress(
    userAddress: string,
    intentId: string
): Promise<string> {
    const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        IntentVaultFactoryABI,
        provider
    );
    
    // Compute address WITHOUT gas (view function)
    const depositAddress = await factory.getDepositAddress(
        userAddress,
        ethers.utils.id(intentId)  // Convert to bytes32
    );
    
    return depositAddress;
    // User sends tokens HERE
    // Address is deterministic - same inputs = same address
}

// Example output:
// getUniqueDepositAddress("0xAlice...", "intent-001")
// → "0x7F8e2A9b4C3D1E5F..." (unique per user+intent)
```

---

## �🔶 Chain-Specific Implementations

### 1. Ethereum Mainnet

```
Chain ID: 1
Contract: IntentLockContract.sol
Tokens: USDC, USDT, ETH (wrapped), DAI
Gas: ~150k for lock, ~100k for release
Finality: 12 confirmations (~3 minutes)
```

**Deployment:**
```bash
# Deploy to Ethereum
forge create --rpc-url $ETH_RPC \
  --private-key $DEPLOYER_KEY \
  src/IntentLockContract.sol:IntentLockContract
```

### 2. BSC (Binance Smart Chain)

```
Chain ID: 56
Contract: IntentLockContract.sol (same code)
Tokens: BUSD, USDT, BNB (wrapped)
Gas: ~100k for lock, ~70k for release
Finality: 15 confirmations (~45 seconds)
```

**Differences from Ethereum:**
- Faster finality
- Lower gas costs
- Different RPC endpoints

### 3. Polygon

```
Chain ID: 137
Contract: IntentLockContract.sol (same code)
Tokens: USDC, USDT, MATIC (wrapped)
Gas: ~100k for lock, ~70k for release
Finality: 256 confirmations (~9 minutes for full security)
```

**Considerations:**
- Reorgs more common, need more confirmations
- Very cheap gas

### 4. Arbitrum

```
Chain ID: 42161
Contract: IntentLockContract.sol (same code)
Tokens: USDC, ARB, ETH
Gas: ~50k for lock (L2 efficient)
Finality: Inherits Ethereum finality
```

### 5. Optimism

```
Chain ID: 10
Contract: IntentLockContract.sol (same code)
Tokens: USDC, OP, ETH
Gas: ~50k for lock
Finality: ~7 days for withdrawals to L1 (not relevant for intent)
```

---

## 🟣 Solana Integration (Non-EVM)

Solana requires a **Rust program** instead of Solidity:

```rust
// programs/intent_lock/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("IntentLock111111111111111111111111111111111");

#[program]
pub mod intent_lock {
    use super::*;
    
    pub fn lock_tokens(
        ctx: Context<LockTokens>,
        amount: u64,
        target_chain_id: u64,
        target_address: [u8; 32],
    ) -> Result<()> {
        let deposit = &mut ctx.accounts.deposit;
        
        deposit.depositor = ctx.accounts.depositor.key();
        deposit.token_mint = ctx.accounts.token_mint.key();
        deposit.amount = amount;
        deposit.target_chain_id = target_chain_id;
        deposit.target_address = target_address;
        deposit.timestamp = Clock::get()?.unix_timestamp;
        deposit.released = false;
        deposit.refunded = false;
        
        // Transfer tokens to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;
        
        emit!(TokensLocked {
            deposit_id: deposit.key(),
            depositor: deposit.depositor,
            amount,
            target_chain_id,
            target_address,
        });
        
        Ok(())
    }
    
    pub fn release_tokens(
        ctx: Context<ReleaseTokens>,
        recipient: Pubkey,
    ) -> Result<()> {
        // Verify relayer signature
        require!(
            ctx.accounts.relayer.is_authorized,
            ErrorCode::Unauthorized
        );
        
        let deposit = &mut ctx.accounts.deposit;
        require!(!deposit.released, ErrorCode::AlreadyReleased);
        
        deposit.released = true;
        
        // Transfer from vault to recipient
        // ... (PDA signing logic)
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct LockTokens<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    #[account(
        init,
        payer = depositor,
        space = 8 + Deposit::LEN
    )]
    pub deposit: Account<'info, Deposit>,
    
    pub token_mint: Account<'info, token::Mint>,
    
    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Deposit {
    pub depositor: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub target_chain_id: u64,
    pub target_address: [u8; 32],
    pub timestamp: i64,
    pub released: bool,
    pub refunded: bool,
}

#[event]
pub struct TokensLocked {
    pub deposit_id: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub target_chain_id: u64,
    pub target_address: [u8; 32],
}
```

---

## 🔄 Complete Bi-Directional Flow

### Direction 1: Ethereum → Movement

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETH → MOVEMENT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Alice locks 1000 USDC on Ethereum                           │
│     └─→ IntentLockContract.lockTokens()                         │
│     └─→ Emits: TokensLocked(depositId, alice, 1000, movement)   │
│                                                                  │
│  2. Relayer detects deposit event                               │
│     └─→ Verifies 12 confirmations                               │
│     └─→ Generates proof                                         │
│                                                                  │
│  3. Relayer creates intent on Movement                          │
│     └─→ intent_registry::create_intent()                        │
│     └─→ Assigns resolver (round-robin)                          │
│                                                                  │
│  4. Resolver Bob verifies & fulfills                            │
│     └─→ Checks Ethereum event (off-chain)                       │
│     └─→ intent_registry::fulfill_intent()                       │
│                                                                  │
│  5. Alice receives 997 MOVE-USDC on Movement                    │
│     └─→ From liquidity pool                                     │
│                                                                  │
│  Timeline: ~3-5 minutes total                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Direction 2: Movement → Ethereum

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOVEMENT → ETH FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Bob locks 1000 MOVE-USDC on Movement                        │
│     └─→ intent_registry::create_outbound_intent()               │
│     └─→ Stores bob's MOVE-USDC in protocol                      │
│                                                                  │
│  2. Relayer detects intent event                                │
│     └─→ Reads intent details from Movement                      │
│     └─→ Generates multi-sig proof                               │
│                                                                  │
│  3. Relayer submits proof to Ethereum                           │
│     └─→ IntentLockContract.releaseTokens()                      │
│     └─→ Verifies threshold signatures                           │
│                                                                  │
│  4. Bob receives 997 USDC on Ethereum                           │
│     └─→ From lock contract reserves                             │
│                                                                  │
│  5. Movement intent marked fulfilled                            │
│     └─→ Relayer confirms on Movement                            │
│                                                                  │
│  Timeline: ~5-10 minutes total                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌍 Multi-Chain Support Matrix

| Source Chain | Target Chain | Contract Type | Finality | Fee |
|--------------|--------------|---------------|----------|-----|
| Ethereum | Movement | Solidity → Move | 3 min | 0.3% |
| BSC | Movement | Solidity → Move | 45 sec | 0.3% |
| Polygon | Movement | Solidity → Move | 9 min | 0.3% |
| Arbitrum | Movement | Solidity → Move | 3 min | 0.3% |
| Solana | Movement | Rust → Move | 30 sec | 0.3% |
| Movement | Ethereum | Move → Solidity | 10 min | 0.3% |
| Movement | BSC | Move → Solidity | 2 min | 0.3% |
| Movement | Polygon | Move → Solidity | 2 min | 0.3% |

---

## 🔐 Security Architecture

### Proof Verification Options

#### Option 1: Multi-Sig Relayers (Current)
```
N-of-M relayers must sign to release funds
- Simple to implement
- Requires trusted relayer set
- Fast execution
```

#### Option 2: ZK Proofs (Future)
```
ZK proof of source chain state
- Trustless verification
- Complex implementation
- Higher gas costs
```

#### Option 3: Optimistic with Fraud Proofs
```
Assume valid, allow challenges
- Lower gas costs
- Delay for challenge period
- Good for high-value transfers
```

### Relayer Trust Model

```
┌─────────────────────────────────────────────┐
│           RELAYER REQUIREMENTS              │
├─────────────────────────────────────────────┤
│ • Stake: 100,000 USDC (slashable)          │
│ • Uptime: 99.9% required                    │
│ • Response Time: < 60 seconds              │
│ • Multi-chain: Must run nodes on all       │
│   supported chains                          │
│ • Threshold: 5-of-7 signatures required    │
└─────────────────────────────────────────────┘
```

---

## 📁 Repository Structure for Multi-Chain

```
intent-protocol/
├── contracts/
│   ├── ethereum/           # EVM contracts
│   │   ├── IntentLockContract.sol
│   │   ├── test/
│   │   └── deployments/
│   │       ├── mainnet.json
│   │       ├── goerli.json
│   │       └── sepolia.json
│   │
│   ├── bsc/                # Same Solidity, different deployment
│   │   └── deployments/
│   │
│   ├── polygon/
│   │   └── deployments/
│   │
│   ├── solana/             # Anchor program
│   │   ├── programs/
│   │   │   └── intent_lock/
│   │   ├── tests/
│   │   └── Anchor.toml
│   │
│   └── movement/           # Move contracts (current)
│       ├── sources/
│       ├── tests/
│       └── Move.toml
│
├── relayer/                # Off-chain infrastructure
│   ├── src/
│   │   ├── chains/
│   │   │   ├── ethereum.ts
│   │   │   ├── bsc.ts
│   │   │   ├── polygon.ts
│   │   │   └── solana.ts
│   │   ├── proof/
│   │   │   └── generator.ts
│   │   └── index.ts
│   └── package.json
│
└── docs/
    ├── CROSS_CHAIN_ARCHITECTURE.md  # This file
    ├── USER_FLOWS.md
    └── README.md
```

---

## 🚀 Deployment Checklist

### Per-Chain Deployment

- [ ] Deploy IntentLockContract
- [ ] Set initial relayer addresses
- [ ] Verify contract on explorer
- [ ] Fund relayer gas wallets
- [ ] Add to relayer config
- [ ] Test deposit flow
- [ ] Test release flow
- [ ] Test refund flow
- [ ] Add to frontend

### Movement Core

- [x] Deploy IntentRegistry
- [x] Deploy LiquidityPool
- [x] Deploy ResolverManager
- [x] Deploy DepositManager
- [ ] Add outbound intent support
- [ ] Add cross-chain proofs

---

## 💡 Summary

| Layer | What It Does | Where |
|-------|--------------|-------|
| **Lock Contracts** | Hold tokens on source chains | Each EVM/Non-EVM chain |
| **Intent Registry** | Coordinate intent lifecycle | Movement |
| **Relayer Network** | Verify & relay proofs | Off-chain |
| **Liquidity Pool** | Provide instant tokens | Movement |
| **Resolvers** | Verify & fulfill intents | Off-chain + Movement |

**Key Insight**: Cross-chain requires contracts on EVERY supported chain, with an off-chain network to bridge the gap between them. No single blockchain can "control" another!

---

*Architecture Document v1.0 - Intent Protocol Multi-Chain*
