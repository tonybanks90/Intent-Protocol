# ⚡ Verified Cross-Chain Intent Flow

This document demonstrates the successful execution of the **Intent Protocol** flow using the E2E Integration Test. It maps the real logs from our local simulation to the architectural steps.

## 🔄 High-Level Flow
1.  **User** (Alice) locks funds on EVM.
2.  **Relayer** detects funds & creates Vault.
3.  **(Simulated)** Movement Chain event occurs.
4.  **Relayer** signs release authorization (EIP-712).
5.  **EVM** verifies signature and releases funds to Relayer.

---

## 🧾 Execution Trace

### Step 1: Initialization
We start a local EVM chain (Anvil) and authorize the Relayer details.
```text
🚀 Starting Local E2E Test (Token Flow)
👤 Alice: 0xf39... (User)
👤 Relayer: 0x709... (Lidquidity Provider)

🔌 Initializing Relayer Service...
   Relayer authorized on Factory
   Chain 336 (Movement) authorized
   🔑 Signer initialized
```

### Step 2: User Intent (Locking Funds)
Alice generates an Intent ID and sends **100 USDC** to her deterministic deposit address.
```text
💸 Executing Bridge Flow...
   Target Deposit Address: 0x34fA8D6411227643a26fFC415B0Ed7D72F9E45e3
   Minted 100000000 to Alice
   Transferred to Vault. Tx: 0xae0...
```
> **Status**: Funds are now sitting in a deterministic address, but the Vault contract does NOT exist yet.

### Step 3: Relayer Discovery & Vault Creation
The Relayer detects the deposit (simulating an API/Indexer signal) and creates the Vault to lock the funds formally.
```text
📡 Simulating Relayer Discovery...
Processing deposit for intent 0x39d...
Relayer submitted createVault: 0xb00...

⏳ Waiting for Vault creation on-chain...
✅ Vault Created!
```
> **Status**: The `DepositVault` proxy is now deployed at `0x34fA...` and holds the 100 USDC.

### Step 4: Settlement (Outbound)
This step simulates the completion of the intent on the Movement Chain. The Relayer provides a signature proving they fulfilled the intent, allowing them to claim the locked funds.
```text
🌍 Simulating Movement Fulfillment (Outbound Flow)...
   Current Nonce: 0
   Signing release for 100000000 tokens to 0x709... (Relayer)
   Signature: 0x9bf... (EIP-712 Typed Data)
   
   Submitting 'releaseFromVault' to EVM...
   Relayer submitted releaseFromVault: 0xecc...
```

### Step 5: Verification
We verify the blockchain state changed correctly.
```text
💰 Verifying Settlement...
   Vault Balance: 0
   Relayer Balance: 100000000

✅ SUCCESS: Full Cross-Chain Lifecycle Verified!
```

---

## 🛠️ How to Replicate
You can run this full demonstration locally in seconds:

1.  **Start Anvil**:
    ```bash
    anvil
    ```
2.  **Run Test**:
    ```bash
    cd packages/relayer && npm run test:e2e
    ```
