# Relayer Guide

Relayers are the engine of the Movement Intent Swap protocol. They monitor for user intents and compete to execute them on-chain.

## How Relayers Work

1.  **Monitor**: Connect to the off-chain Order Book API to receive new signed intents.
2.  **Evaluate**: Check if an order is profitable.
    *   `Profit = (SellAmount * MarketPrice) - (BuyAmount + GasFees)`
3.  **Execute**: If profitable, submit a `fill_order` transaction to the Movement Network.

## Profitability Logic

The protocol uses a Dutch Auction.
*   **Start**: The required `buyAmount` is high (Start Price).
*   **End**: The required `buyAmount` is low (Reserve Price).
*   **Process**: As time passes, the required `buyAmount` drops. A relayer waits until the required amount + gas costs is less than the value of the tokens they receive.

## Running a Relayer

### Prerequisites
*   Node.js v18+
*   Movement Network Account (with funds for gas)
*   Access to an Order Book API endpoint

### Configuration

Create a `.env` file or config object:

```typescript
export const config = {
  movement: {
    rpcUrl: 'https://aptos.testnet.porto.movementlabs.xyz/v1',
    contractAddress: '0x...', 
  },
  wallet: {
    privateKey: 'YOUR_PRIVATE_KEY',
  },
  profitability: {
    minProfitBps: 10,   // Minimum 0.1% profit margin
  }
};
```

### Execution Loop (Pseudo-code)

```typescript
orderMonitor.on('newOrder', async (order) => {
    // 1. Check if order is valid (time, signature)
    if (!isValid(order)) return;

    // 2. Calculate current Dutch Auction price
    const requiredBuyAmount = calculateCurrentPrice(order);

    // 3. Check market rates for the token pair
    const marketValue = await getMarketValue(order.sellToken, order.sellAmount);

    // 4. Estimate transaction cost
    const gasCost = await estimateGas(order);

    // 5. Submit if profitable
    if (marketValue > requiredBuyAmount + gasCost) {
        await executeSwap(order, requiredBuyAmount);
    }
});
```

## Inventory Management

Relayers must hold balances of "Buy Tokens" (e.g., USDC) to fill orders. When they fill an order, they spend USDC and receive "Sell Tokens" (e.g., MOVE).

To rebalance:
1.  **Sell Inventory**: Periodically sell accumulated "Sell Tokens" on an AMM (e.g., Liquidswap) back to "Buy Tokens".
2.  **Just-in-Time (JIT)**: More advanced relayers can flash loan or swap atomically in the same transaction using a "flash swap" pattern if supported.
