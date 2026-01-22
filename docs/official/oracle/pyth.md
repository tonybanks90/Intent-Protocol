# Pyth Oracle Integration

The **Intent Protocol** leverages the [Pyth Network](https://pyth.network) for high-fidelity, real-time price feeds.

Pyth is an oracle that publishes financial market data to multiple blockchains. Our protocol uses it to determine fair market rates for **Dutch Auction** validation and to provide accurate quotes to users on the frontend.

## 🎯 Why Pyth?

*   **Low Latency**: Pyth updates prices sub-second, which is critical for minimizing slippage in intent-based swaps.
*   **Confidence Intervals**: Each price comes with a confidence interval (`conf`), allowing our system to reject prices during times of high volatility.
*   **Cross-Chain**: Pyth is available on both **EVM** (Ethereum, Base, Arbitrum) and **Movement**, ensuring consistent pricing across the bridge.

## 🛠️ Integration

### 1. Frontend Integration

The frontend uses the **Hermes API** to fetch the latest price updates for the relevant tokens.

**Endpoint**: `https://hermes.pyth.network/v2/updates/price/latest`

#### Supported Feeds (Mainnet Beta IDs)

| Symbol | Price Feed ID |
| :--- | :--- |
| **MOVE** (Proxy: APT) | `0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5` |
| **ETH** | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| **USDC** | `0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a` |
| **USDT** | `0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b` |

*Note: For bridged assets (e.g., `WETH.e`, `USDC.e`), we mapping them to their underlying asset's feed.*

### 2. Relayer Validation

Relayers query Pyth to validate the profitability of an intent before attempting to fill it.

```typescript
// Example Logic
const intentPrice = intent.startBuyAmount / intent.sellAmount;
const pythPrice = await pyth.getPrice(intent.sellToken, intent.buyToken);

// If the user's asking price is significantly better than market, 
// the relayer can profit by filling it.
if (pythPrice < intentPrice * (1 - MIN_PROFIT_MARGIN)) {
    await fillIntent(intent);
}
```

### 3. On-Chain Verification (Optional)

In some advanced flows, Solvers can push price updates on-chain to prove that a settlement occurred within acceptable market bounds.

## 📦 Usage Example

Fetching prices in the frontend:

```typescript
import axios from 'axios';

const PRICE_FEEDS = {
    ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    USDC: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
};

async function getEthPrice() {
    const response = await axios.get('https://hermes.pyth.network/v2/updates/price/latest', {
        params: {
            ids: [PRICE_FEEDS.ETH],
            encoding: "hex",
            parsed: true
        }
    });
    
    const priceData = response.data.parsed[0].price;
    return Number(priceData.price) * Math.pow(10, priceData.expo);
}
```
