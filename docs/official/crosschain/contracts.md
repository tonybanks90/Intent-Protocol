# Contract Reference

## EVM Contracts

### 🏭 IntentVaultFactory
**Address**: *(See deployments)*

The main entry point for users on EVM chains. It manages the deployment of individual vaults and the coordination of relayer signatures.

#### Key Functions

*   `createVault(address user, bytes32 intentId, uint256 targetChainId)`: Deploys a new `DepositVault` clone.
*   `releaseFromVault(...)`: Authenticated by Relayer signatures (EIP-712). Unlocks funds to the Resolver/Winner.
*   `refundFromVault(...)`: Permissionless (timelocked). Returns funds to the User if the intent expires.

#### Events
*   `VaultCreated`: Emitted when a user locks funds. Relayers listen to this to index new orders.
*   `FundsReleased`: Emitted when an intent is successfully bridged.
*   `FundsRefunded`: Emitted when a swap fails/expires.

### 🔒 DepositVault
**Address**: *(Deterministic per intent)*

An ephemeral, isolated contract deployed for a **single** intent.
*   **Immutable Owner**: Hardcoded to the `user` and `intentId` at creation.
*   **Timelock**: Defaults to `24 hours`. Hard-enforced by the blockchain.
*   **Minimal Proxy**: Uses EIP-1167 to cost ~45k gas to deploy, making it cheaper than standard bridge deposits.

## Movement Contracts

### 📜 IntentRegistry

The settlement contract on the Movement network.

*   **Verification**: Checks that the Resolver has transferred the correct assets to the User on Movement.
*   **State**: Tracks the status of every `intentId` (`PENDING` -> `FILLED`).
*   **Events**: Emits `IntentFulfilled` which Relayers listen to as proof to unlock the EVM Vault.
