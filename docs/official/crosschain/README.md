# Cross-Chain Intent Protocol

The **Cross-Chain Intent Protocol** enables trustless, non-custodial bridging between EVM chains (Ethereum, Arbitrum, Base, etc.), Solana, and the Movement Mainnet.

Unlike traditional bridges that rely on liquidity pools and centralized validators, this protocol uses **hashed timelock contracts (HTLCs)** and an **intent-based architecture** to ensure atomic execution.

## 🌟 Key Features

### 1. Atomic Execution
Swaps are "all-or-nothing". Either the user receives their assets on the destination chain, or their original funds are returned. There is no risk of funds getting stuck in a bridge contract indefinitely.

### 2. Trustless Design
The protocol uses cryptographically verifiable locks. The Relayer facilitates the transfer but never takes custody of user funds. Security is guaranteed by smart contracts, not by the honesty of the bridge operator.

### 3. Self-Custody
Users maintain ownership of their assets in a dedicated Vault until the swap is proven effectively. This eliminates the risk of a central "honeypot" (pool) hack draining all user funds.

### 4. Dutch Auction Pricing
Resolvers (Market Makers) compete in a Dutch Auction to fulfill your intent. This competition ensures users get the best possible exchange rate and execution speed, minimizing MEV (Maximal Extractable Value).

## 🌍 Supported Networks

| Ecosystem | Role | Status |
| :--- | :--- | :--- |
| **EVM** (Sepolia, Base, Arb) | Source / Destination | ✅ Live |
| **Movement** | Settlement / Registry | ✅ Live |
| **Solana** | Source / Destination | 🚧 In Progress |

## 📚 Documentation

*   [**Architecture**](./architecture.md): Deep dive into the EVM -> Relayer -> Movement flow.
*   [**Smart Contracts**](./contracts.md): Technical details of `IntentVaultFactory` and `IntentRegistry`.
*   [**Relayer Guide**](./monitor_relayer.md): How to operate a relayer node and earn fees.
