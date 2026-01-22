# Welcome to Movement Intent Swap

> **The native intent-layer for the Movement Network.**
>
> *Enable gasless, fast, and capital-efficient swaps natively on Movement and across chains.*

---

## 🏗️ What is Movement Intent Swap?

Movement Intent Swap is the **native execution protocol** for the Movement ecosystem. It decouples the *intent* (what users want) from the *execution* (how it happens), enabling a superior DeFi experience compared to traditional AMMs.

Instead of submitting transactions directly to the blockchain, users just **sign off-chain messages**. Sophisticated **Solvers** then compete to execute these intents, guaranteeing the optimal price and speed.

### Why Build with Intent Protocol?

*   **⚡ True Gasless Swaps**: Users pay transaction fees in the output token, not the native gas token.
*   **🔷 Native Movement Integration**: Optimized for the Move execution model and parallel processing.
*   **🛡️ MEV Protection**: Intents are auctioned off-chain, protecting users from sandwich attacks and front-running.
*   **🌉 Cross-Chain Ready**: Seamlessly extends to support atomic bridging from EVM chains to Movement.

---

## 📚 Documentation Index

### 🚀 Getting Started
*   [**Architecture**](./architecture.md): High-level system design and security model.
*   [**User Flow**](./user_flow.md): Step-by-step lifeycle of a swap (User Stories & Diagrams).
*   [**Token Integration**](./integration.md): How to add Intent Swap to your custom tokens.

### 🌐 Cross-Chain & Oracle
*   [**Cross-Chain Bridge**](./crosschain/README.md): Deep dive into the EVM <-> Movement atomic bridge.
    *   [Architecture](./crosschain/architecture.md) | [Contracts](./crosschain/contracts.md) | [Relayer Ops](./crosschain/monitor_relayer.md)
*   [**Price Oracles**](./oracle/pyth.md): How we use Pyth Network for real-time validation.

### 🛠️ Developer Resources
*   [**SDK Reference**](./sdk/README.md): TypeScript client for building dApps.
    *   [Client](./sdk/client.md) | [Resolver](./sdk/resolver.md) | [Common](./sdk/common.md)
*   [**API Reference**](./api_reference.md): Order Book API endpoints.
*   [**Smart Contracts**](./contracts.md): Move module specifications.

---

## ⚡ Quick Start for Developers

**Install the Client SDK:**

```bash
npm install @intent-protocol/client
```

**Sign an Intent:**

```typescript
import { IntentBuilder } from '@intent-protocol/client';

const intent = new IntentBuilder(signer)
  .setSellToken("MOVE")
  .setBuyToken("USDC")
  .setSellAmount(100)
  .build();
```

---

## 🤝 Community & Support

*   **GitHub**: [Contribute to the Core](https://github.com/movementlabsxyz/intent-protocol)
*   **Discord**: Join the #dev-chat channel
*   **Twitter**: Follow @movementlabsxyz

> *Built with ❤️ for the Move ecosystem.*
