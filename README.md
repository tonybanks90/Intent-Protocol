# Intent Protocol

**The Intent Layer for everything. Stop signing transactions. Start signing outcomes.**

Intent Protocol is a comprehensive DeFi solution built on the **Movement Network** that unifies gasless intent-based swaps and seamless cross-chain bridging into a single, cohesive experience.

## 🌟 Core Features

### 1. Movement Intent Swap
A next-generation DEX that prioritizes user experience and execution quality.
- **Gasless**: Users sign messages, not transactions. Relayers pay the gas.
- **Dutch Auctions**: Prices start high and decay over time. Resolvers compete to fill orders at the best possible price, ensuring fair market discovery.
- **MEV Protection**: Intents are opaque to sandwich bots. Only whitelisted resolvers execute trades.
- **Partial Fills**: Large orders can be filled by multiple resolvers.

### 2. Cross-Chain Swap (HTLC)
Instant, secure bridging between Movement and other major chains (Ethereum, BSC, Aptos).
- **No Bridges, No Wrapping**: Uses Hash Time Locked Contracts (HTLCs) for atomic swaps.
- **Trustless**: Funds are released only when the swap is confirmed on both chains.
- **Supported Chains**:
    - Movement (Mainnet/Testnet)
    - Ethereum (Sepolia)
    - BSC (Testnet)
    - Aptos

### 3. Unified Frontend
A single "Pro-DeFi" style interface for all protocol interactions.
- **Swap**: Intent-based token swapping.
- **Bridge**: Cross-chain asset transfers.
- **Visuals**: Modern, responsive design with live market rates and real-time updates.

---

## 🏗️ Project Structure

This monorepo houses all components of the protocol:

### Contracts
| Package | Description | Status |
|---------|-------------|--------|
| `packages/intent-swap` | Core Move contracts for Intent Swaps (Auctions, Escrows) | ✅ Live |
| `packages/contracts-movement` | Move contracts for Cross-Chain HTLCs | ✅ Live |
| `packages/contracts-evm` | Solidity contracts for EVM chains (HTLCs) | ✅ Live |
| `packages/contracts-solana` | Anchor programs for Solana integration | 🚧 Planned |

### Services
| Package | Description | Status |
|---------|-------------|--------|
| `packages/intent-relayer` | Backend service that listens for signed intents and broadcasts them to resolvers | ✅ Live |
| `packages/relayer` | Bridge relayer that monitors cross-chain HTLC events and unlocks funds | ✅ Live |
| `packages/intent-resolver` | Bot implementation that actively fills auctions | ✅ Live |

### Clients
| Package | Description | Status |
|---------|-------------|--------|
| `packages/frontend` | The main React/Vite web application | ✅ Live |
| `packages/intent-client` | SDK for communicating with the Intent Protocol | ✅ Stable |
| `packages/intent-common` | Shared types and utilities | ✅ Stable |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Rust (for Move compilation)
- Movement CLI

### Installation

```bash
# Install dependencies
npm install
```

### Running the Frontend

The centralized UI for both swapping and bridging.

```bash
cd packages/frontend
npm run dev
```
Visit `http://localhost:5173` to launch the app.

---

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- **[Architecture](docs/official/architecture.md)**: High-level system design.
- **[Contracts](docs/official/crosschain/contracts.md)**: Smart contract references.
- **[Relayers](docs/official/crosschain/monitor_relayer.md)**: How off-chain components work.
- **[SDK](docs/official/sdk/common.md)**: Developer guide for building on top of Intent Protocol.

---

## 🧪 Testing

We value stability. Each package has its own test suite.

```bash
# Run Move tests
cd packages/contracts-movement
movement move test

# Run EVM tests
cd packages/contracts-evm
npx hardhat test
```

## 📄 License

MIT © 2026 Intent Protocol
