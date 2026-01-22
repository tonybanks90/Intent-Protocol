# Client SDK (`@intent-protocol/client`)

The Client SDK is designed for **Frontend Developers** and **Wallet Integrators**. It simplifies the complex process of constructing a spec-compliant intent, handling the EIP-712 signing structure, and submitting it to the order book.

## Installation

```bash
npm install @intent-protocol/client
```

## Core Components

### 1. `IntentBuilder`
A fluent interface for constructing intents. It handles validation of required fields and manages the signing process.

```typescript
import { IntentBuilder } from '@intent-protocol/client';

// 1. Define Signer (e.g., from your Wallet Adapter)
const signer = async (hash: Uint8Array) => {
    return await window.aptos.signMessage(hash);
};

// 2. Build Intent
const intent = await new IntentBuilder(signer)
    .setMaker('0x123...')
    .setSellToken('MOVE')
    .setBuyToken('USDC')
    .setSellAmount(100)
    .setStartBuyAmount(100)  // Initial Ask
    .setEndBuyAmount(99)     // Minimum Ask (Slippage)
    .setStartTime(Date.now() / 1000)
    .setEndTime((Date.now() / 1000) + 600) // 10 mins
    .build();

// Returns: { maker: ..., signature: "0x..." }
```

### 2. `IntentAPI`
A lightweight wrapper around the standard REST API.

```typescript
import { IntentAPI } from '@intent-protocol/client';

const api = new IntentAPI('https://api.intent.movement');

// Submit
await api.submitOrder(intent);

// Track Status
const status = await api.getOrderStatus(orderId);
// -> 'OPEN' | 'FILLED' | 'EXPIRED'
```
