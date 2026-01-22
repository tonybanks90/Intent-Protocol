# Common Library (`@intent-protocol/common`)

This package contains the **Shared Types** and **Cryptographic Primitives** used by both the Client and Resolver SDKs. It ensures that both sides of the market "speak the same language" regarding data structures and hashing algorithms.

## Installation

```bash
npm install @intent-protocol/common
```

## Type Definitions

### `Intent`
The raw order structure before signing.

```typescript
export interface Intent {
    maker: string;
    sellToken: string;
    buyToken: string;
    sellAmount: string;      // BigInt as string
    startBuyAmount: string;  // Dutch Auction Start
    endBuyAmount: string;    // Dutch Auction End
    startTime: string;       // Unix Timestamp
    endTime: string;         // Unix Timestamp
    nonce: string;           // Unique ID
}
```

### `SignedIntent`
An `Intent` with an attached signature.

```typescript
export interface SignedIntent extends Intent {
    signature: string;
}
```

## Crypto Utilities

### `computeIntentHash(intent: Intent): Uint8Array`
Generates the deterministic EIP-712 (or equivalent) struct hash for an intent. This is the exact payload that the user signs and the contract verifies.

```typescript
import { computeIntentHash, bytesToHex } from '@intent-protocol/common';

const hashBytes = computeIntentHash(myIntent);
console.log("Intent Hash:", bytesToHex(hashBytes));
```
