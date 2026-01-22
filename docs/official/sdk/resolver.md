# Resolver SDK (`@intent-protocol/resolver`)

The Resolver SDK is built for **Relayers**, **Solvers**, and **Arbitrage Bots**. It provides the tools needed to monitor the order book efficiently and validate orders before attempting execution.

## Installation

```bash
npm install @intent-protocol/resolver
```

## Core Components

### 1. `ResolverAPI`
Fetching orders with advanced filtering capabilities.

```typescript
import { ResolverAPI } from '@intent-protocol/resolver';

const api = new ResolverAPI('https://api.intent.movement');

// Get all open orders for MOVE -> USDC pair
const orders = await api.getOpenOrders({
    sellToken: 'MOVE',
    buyToken: 'USDC'
});
```

### 2. `OrderValidator`
Static utilities for checking order integrity off-chain. This saves gas by preventing failed transactions.

```typescript
import { OrderValidator } from '@intent-protocol/resolver';

for (const order of orders) {
    
    // 1. Check Expiry
    if (OrderValidator.isExpired(order)) {
        console.log(`Order ${order.id} is expired.`);
        continue;
    }
    
    // 2. Validate Hash & Signature
    const isValid = OrderValidator.validateHash(order);
    if (!isValid) {
        console.warn(`Order ${order.id} has invalid signature!`);
        continue;
    }
    
    // 3. Profitability Check (Custom Logic)
    // ...
}
```
