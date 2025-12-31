# ⚡ Verified Cross-Chain Intent Flow (EVM Side Verified)

This document demonstrates the successful execution of the **Intent Protocol** flow using the E2E Integration Test. It maps the real logs from our local simulation to the architectural steps.

## ⚠️ Scope Verification
*   **Checked**: user locking on EVM, relayer creation of vault, & event simulation.
*   **Simulated**: The actual transfer on Movement was *simulated* in this test. In production, the Relayer/Solver sends funds to Alice on Movement to generate the proof needed for Step 4.

---

## 🔄 High-Level Flow
1.  **User** (Alice) locks funds on EVM.
2.  **Relayer** detects funds & creates Vault.
3.  **Solver** pays Alice on Movement. (**Simulated in Test**)
4.  **Relayer** observes completion & signs release authorization.
5.  **EVM** verifies signature and releases funds to Relayer.

---

## 🧾 Execution Trace

### Step 1: Initialization
We start a local EVM chain (Anvil) and authorize the Relayer details.
```text
🚀 Starting Local E2E Test (Token Flow)
👤 Alice: 0xf39... (User)
👤 Relayer: 0x709... (Lidquidity Provider)
```

### Step 2: User Intent (Locking Funds)
Alice generates an Intent ID and sends **100 USDC** to her deterministic deposit address.
```text
💸 Executing Bridge Flow...
   Target Deposit Address: 0x34fA...
   Minted 100000000 to Alice
   Transferred to Vault. Tx: 0xae0...
```
> **Status**: Funds are now sitting in a deterministic address.

### Step 3: Relayer Discovery & Vault Creation
The Relayer detects the deposit and creates the Vault.
```text
📡 Simulating Relayer Discovery...
Relayer submitted createVault: 0xb00...
✅ Vault Created!
```

### Step 4: Settlement (Outbound)
We simulate the Relayer observing Alice get paid on Movement. The Relayer then signs the release.
```text
🌍 Simulating Movement Fulfillment (Outbound Flow)...
   Signing release for 100000000 tokens to 0x709... (Relayer)
   Signature: 0x9bf... (EIP-712 Typed Data)
   Submitting 'releaseFromVault' to EVM...
```

### Step 5: Verification
We verify the EVM released the funds to the Relayer (reimbursement).
```text
💰 Verifying Settlement...
   Vault Balance: 0
   Relayer Balance: 100000000
✅ SUCCESS: Full Cross-Chain Lifecycle Verified!
```
