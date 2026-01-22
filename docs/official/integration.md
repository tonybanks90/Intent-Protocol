# Integration Guide

This guide explains how to integrate Movement Intent Swaps into your dApp or wallet.

## User Flow

1.  **Deposits**: User deposits tokens into the protocol escrow (required for Move capability access).
2.  **Intent Creation**: User constructs a swap order locally.
3.  **Signing**: User signs the intent with their wallet (Ed25519).
4.  **Submission**: Frontend submits the signed intent to the Order Book API.
5.  **Tracking**: Frontend polls the API for order status.

## Frontend Integration

### 1. Intent Construction

```typescript
import { sha3_256 } from '@noble/hashes/sha3';

const intent = {
  maker: userAddress,
  nonce: await getNonce(userAddress),
  sellToken: '0x1::aptos_coin::AptosCoin',
  buyToken: '0x...::usdc::USDC',
  sellAmount: 100000000n, // 1 MOVE
  startBuyAmount: 1000000n, // 1 USDC (Example)
  endBuyAmount: 990000n,    // 0.99 USDC (1% slippage)
  startTime: Math.floor(Date.now() / 1000),
  endTime: Math.floor(Date.now() / 1000) + 300, // 5 mins
};
```

### 2. Signing

The intent must be serialized and hashed before signing.

```typescript
// 1. Serialize fields (ensure correct endianness and BCS format)
const serialized = serializeIntent(intent);

// 2. Hash with domain separator
const DOMAIN = new TextEncoder().encode('MOVE_INTENT_SWAP_V1');
const message = new Uint8Array([...DOMAIN, ...serialized]);
const hash = sha3_256(message);

// 3. Sign using wallet adapter
const signature = await wallet.signMessage({
    message: hash,
    nonce: intent.nonce.toString() 
});
```

### 3. API Submission

Submit the JSON object containing the intent fields and the signature to the Order Book.

```typescript
await fetch('https://api.intent.movement/orders', {
    method: 'POST',
    body: JSON.stringify({
        ...intent,
        signature: signature.hex
    })
});
```

## Creating an Escrow Manager

Users must deposit funds into `intent_swap::escrow` before they can be swapped by a relayer. This is a one-time setup per token amount, similar to an "Approve" in EVM, but the funds are moved to a sub-account.

```move
// Call this entry function from your UI
public entry fun deposit<CoinType>(user: &signer, amount: u64)
```

**UI Tip**: Check `intent_swap::views::get_escrowed_balance` before allowing the user to sign a swap. If the balance is insufficient, prompt for a deposit transaction first.
