# Relayer Operation Guide

Relayers are the off-chain infrastructure that powers the protocol. They act as witnesses, verifying events across chains and signing release authorizations.

## ⚙️ Setup

The Relayer is a Node.js service located in `packages/relayer`.

### Prerequisites
*   Node.js v18+
*   Private Key (authorized by the DAO/Factory)
*   RPC Endpoints (EVM & Movement)

### Configuration (`.env`)

```bash
# Identity
RELAYER_PRIVATE_KEY=0xYourPrivateKey...

# Monitoring Configuration
EVM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
EVM_FACTORY_ADDRESS=0x...
MOVEMENT_RPC_URL=https://aptos.testnet.porto.movementlabs.xyz/v1
MOVEMENT_REGISTRY_ADDRESS=0x...

# Indexing Strategy
POLL_INTERVAL_MS=2000
START_BLOCK=5000000
```

## 🖥️ Monitoring & Logs

When running the relayer (`npm run start`), monitor the following log patterns to ensure health:

### 1. Inbound Detection
```text
[Watcher:EVM] Detected VaultCreated for Intent 0x123... Amount: 100 USDC
```
*   **Success**: Means the relayer is correctly connected to the EVM RPC and filtering for Factory events.

### 2. Fulfillment Witness
```text
[Watcher:Movement] Detected IntentFulfilled for Intent 0x123... Recipient: 0xabc...
```
*   **Success**: The Resolver successfully executed the swap on Movement.

### 3. Signing Release
```text
[Signer] Signing Release verification for Intent 0x123...
[Executor] Submitting releaseFromVault transaction... Hash: 0xdef...
```
*   **Success**: The Relayer verified the fulfillment and submitted the proof to unlock EVM funds.

## ⚠️ Troubleshooting

*   **Missed Events**: Check `START_BLOCK` in `.env`. If it's too recent, you might miss confirmed events.
*   **Gas Errors**: Ensure the `RELAYER_PRIVATE_KEY` has ETH (on Sepolia/Base) to pay for `releaseFromVault` transactions.
*   **RPC Limits**: Increase `POLL_INTERVAL_MS` if you are getting 429 Too Many Requests errors from your RPC provider.
