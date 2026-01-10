/// <reference types="vite/client" />

// Force-cast import.meta to any to avoid "Property 'env' does not exist" build errors
const env = (import.meta as any).env;

export const INTENT_SWAP_ADDRESS = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";

// Check configuration
const envRelayerUrl = env?.VITE_RELAYER_URL;
if (env?.PROD && !envRelayerUrl) {
    console.warn("⚠️  VITE_RELAYER_URL is missing in Production! Defaulting to localhost, which will likely fail.");
}

export const RELAYER_URL = envRelayerUrl || "http://localhost:3001";
export const MOVEMENT_TESTNET_CHAIN_ID = 250; // Bardock Testnet? Adjust if needed

// Token addresses for testing
export const TOKENS = {
    MOVE: "0x1::aptos_coin::AptosCoin",
    USDC: "0x1::aptos_coin::AptosCoin" // Using AptosCoin for testnet verification
};
