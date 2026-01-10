# 🚀 Intent Protocol Deployment Guide

This guide covers the deployment of the complete Intent Protocol stack:
1.  **Movement Network Contracts** (Porto Testnet)
2.  **EVM Contracts** (Sepolia/Anvil)
3.  **Relayer Service**

---

## 📋 Prerequisites
*   **Movement CLI** (v7.4.0+)
*   **Foundry** (Forge)
*   **Node.js** (v18+)
*   **Wallets**:
    *   Aptos/Movement Wallet (Movement Testnet)
    *   EVM Wallet (Sepolia ETH)

---

## 1. Deploy Movement Contracts

1.  **Configure CLI**:
    ```bash
    movement init
    # Select 'testnet' (Porto)
    # Use your private key
    ```

2.  **Deploy**:
    ```bash
    cd packages/contracts-movement
    ./scripts/deploy.sh
    ```
    *   *Note*: Takes ~1-2 mins.
    *   *Copy the output address* (e.g., `0xabc...`).

3.  **Initialize**:
    ```bash
    ./scripts/init_protocol.sh
    ```
    *   This registers the first resolver and adds initial liquidity.

---

## 2. Deploy EVM Contracts

1.  **Setup Environment**:
    Create `packages/contracts-evm/.env`:
    ```bash
    PRIVATE_KEY=0x...
    ETH_RPC_URL=https://rpc.sepolia.org
    ETHERSCAN_API_KEY=...
    ```

2.  **Deploy**:
    ```bash
    cd packages/contracts-evm
    source .env
    forge script script/Deploy.s.sol:DeployScript --rpc-url $ETH_RPC_URL --broadcast --verify
    ```
    *   *Copy the factory address* (e.g., `0x123...`).

---

## 3. Start Relayer

1.  **Configure**:
    Edit `packages/relayer/.env`:
    ```bash
    # Relayer Key (Correspond to a registered Relayer on EVM)
    RELAYER_PRIVATE_KEY=0x...
    
    # EVM Settings
    EVM_RPC_URL=...
    EVM_FACTORY_ADDRESS=0x... (From Step 2)
    
    # Movement Settings
    MOVEMENT_RPC_URL=https://aptos.testnet.porto.movementlabs.xyz/v1
    MOVEMENT_REGISTRY_ADDRESS=0x... (From Step 1)
    ```

2.  **Run**:
    ```bash
    cd packages/relayer
    npm run build
    npm run start
    ```

---

## ✅ Verification Checklist
*   [ ] **Movement**: `IntentCreated` event emitted when running `create_test_intent.sh`.
*   [ ] **Relayer**: Logs "Vault Created" when user deposits on EVM.
*   [ ] **Relayer**: Logs "Intent Fulfilled" when Movement event occurs.
*   [ ] **EVM**: Funds released to recipient.
