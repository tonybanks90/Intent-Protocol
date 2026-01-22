# Movement Intent SDKs

The official Monorepo for the Movement Intent Protocol SDKs. These packages allow developers to interact with the protocol from both the Client (Frontend/Wallet) and Resolver (Relayer/Bot) sides.

## 📦 Packages

| Package | Description | Version |
| :--- | :--- | :--- |
| [**@intent-protocol/client**](./client.md) | **Frontend / Wallet**: Building, signing, and submitting intents. | `0.1.0` |
| [**@intent-protocol/resolver**](./resolver.md) | **Relayer / Bot**: Polling, validating, and filling orders. | `0.1.0` |
| [**@intent-protocol/common**](./common.md) | **Shared**: Core types (`Intent`) and crypto utilities. | `0.1.0` |

## 🏗️ Architecture

```mermaid
graph TD
    A[Frontend/dApp] -->|Uses| B[@intent-protocol/client]
    B -->|Submit Intent| C[Rest API / Orderbook]
    
    D[Relayer Bot] -->|Uses| E[@intent-protocol/resolver]
    E -->|Poll Orders| C
    
    B -.->|Depend| F[@intent-protocol/common]
    E -.->|Depend| F
```

## 🚀 Installation

Install the package relevant to your use case:

```bash
# For a dApp
npm install @intent-protocol/client

# For a Relayer
npm install @intent-protocol/resolver
```
