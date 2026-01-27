import axios from 'axios';

// Pyth Hermes API Endpoint
const HERMES_URL = "https://hermes.pyth.network";

// Price Feed IDs (Mainnet Beta)
// Note: effectively using Mainnet prices for Testnet display is standard practice for demos unless specific testnet feeds are required/available.
export const PRICE_FEEDS: Record<string, string> = {
    "MOVE": "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5", // Using APT/USD as proxy for MOVE on Testnet
    "WETH.e": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
    "USDC.e": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", // USDC/USD
    "USDT.e": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b", // USDT/USD
};

// Map Move Types to Symbols
export const TYPE_TO_SYMBOL: Record<string, string> = {
    "0x1::aptos_coin::AptosCoin": "MOVE",
    "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb": "WETH.e",
    "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489": "USDC.e",
    "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de": "USDT.e"
};

export interface PriceData {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
}

export class PriceService {
    private prices: Record<string, PriceData> = {};
    private lastUpdate: number = 0;
    private CACHE_TTL = 3000; // 3 seconds

    /**
     * Get price for a specific token type (e.g. 0x1::aptos_coin::AptosCoin)
     */
    async getPrice(tokenType: string): Promise<number> {
        await this.updatePricesIfNeeded();

        // Handle FA addresses if they are not in the map? 
        // For now, assume we only handle the known types or fallback
        const symbol = TYPE_TO_SYMBOL[tokenType];

        if (!symbol || !this.prices[symbol]) {
            console.warn(`No price for token type: ${tokenType} (Symbol: ${symbol})`);
            return 0;
        }

        const priceData = this.prices[symbol];
        return Number(priceData.price) * Math.pow(10, priceData.expo);
    }

    /**
     * Update prices if cache is stale
     */
    private async updatePricesIfNeeded() {
        if (Date.now() - this.lastUpdate < this.CACHE_TTL) {
            return;
        }

        try {
            const ids = Object.values(PRICE_FEEDS);
            const response = await axios.get(`${HERMES_URL}/v2/updates/price/latest`, {
                params: {
                    ids: ids,
                    encoding: "hex",
                    parsed: true,
                }
            });

            const parsed = response.data.parsed;
            if (parsed) {
                for (const [symbol, id] of Object.entries(PRICE_FEEDS)) {
                    const feed = parsed.find((p: any) => p.id === id.replace("0x", ""));
                    if (feed) {
                        this.prices[symbol] = feed.price;
                    }
                }
            }
            this.lastUpdate = Date.now();
        } catch (error) {
            console.error("Failed to fetch Pyth prices:", error);
        }
    }
}
