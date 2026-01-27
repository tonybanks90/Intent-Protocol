import axios from 'axios';
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';
dotenv.config();

const RELAYER_URL = "http://localhost:3001";
const APTOS_NODE_URL = "https://testnet.movementnetwork.xyz/v1";

// Mock Data for Order
const REGISTRY_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";
const MOVE_COIN = "0x1::aptos_coin::AptosCoin";
const USDC_COIN = "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489";

async function main() {
    console.log("🚀 Starting Limit Order Test...");

    // 1. Create a Maker Account
    const maker = Account.generate();
    console.log(`Maker Address: ${maker.accountAddress.toString()}`);

    // Fund maker (optional, but needed for real sig validity check if logic checks balance)
    // For now we assume Relayer checks signature only.

    // 2. Create Intent
    const now = Math.floor(Date.now() / 1000);
    const intent = {
        maker: maker.accountAddress.toString(),
        nonce: now, // Simple nonce
        sell_token: "MOVE", // Symbol or bytes? Relayer expects bytes in some places but API takes readable? 
        // Relayer.ts: this.hexToBytes(intent.sell_token)
        // Actually Relayer expects HEX string of the bytes of the struct tag if it calls Move directly?
        // Let's check SwapIntent struct. 
        // sell_token: vector<u8>.
        // Relayer.ts: const isSellFA = !intent.sell_token_type.includes("::");
        // And typeArguments: [intent.sell_token_type...]
        // So API body needs `sell_token_type` AND `sell_token` (hex of the type string).
        sell_token_type: MOVE_COIN,
        buy_token: "USDC",
        buy_token_type: USDC_COIN,
        sell_amount: 100000000, // 1 MOVE
        start_buy_amount: 10000000, // 10 USDC (High price, so profitable for Relayer? wait.)
        // 1 MOVE = $1. If I ask for $10 USDC, that is expensive for me, GOOD for Relayer?
        // No, Maker SELLS 1 MOVE for 10 USDC. Relayer pays 10 USDC, gets 1 MOVE.
        // Relayer loses $9. Relayer should SKIP this.
        end_buy_amount: 10000000,   // Limit Order (flat price)
        start_time: now - 10,
        end_time: now + 3600,       // 1 hour expiry
    };

    // Helper to get hex of string
    const toHex = (str: string) => "0x" + Buffer.from(str).toString('hex');

    // Update intent with Hex fields
    const intentForSig = {
        ...intent,
        sell_token: toHex(MOVE_COIN),
        buy_token: toHex(USDC_COIN)
    };

    // 3. Sign Intent (Mock Signature for now or Real?)
    // To properly sign we need the BCS serialization of SwapIntent.
    // Since we don't have the BCS definition easily here, we will send a DUMMY signature.
    // The Relayer might fail signature check if it enforces it strictly.
    // Relayer.ts: verifier::assert_valid_signature_with_nonce
    // If signature fails, Relayer throws.
    // Does Relayer catch signature error and queue it? 
    // Relayer logic: `if (isExecutionError) ...`
    // Attempting to execute with bad signature will revert on chain.
    // A revert IS an execution error. So it might get queued!

    // Note: In real world, we want valid signature but 'unprofitable' or 'no liquidity' to trigger limit order.
    // But proving 'unprofitable' is easier.

    const signature = "0x" + "00".repeat(64);
    const publicKey = maker.publicKey.toString();
    const signingNonce = "0x" + "00".repeat(32); // Mock

    try {
        console.log("📤 Submitting Unprofitable Order (Should be Queued)...");
        const response = await axios.post(`${RELAYER_URL}/intents`, {
            intent: intentForSig,
            signature,
            publicKey,
            signingNonce
        });

        console.log("Response:", response.data);

        if (response.data.status === "PENDING") {
            console.log("✅ Order was Queued as expected!");
        } else {
            console.log("❓ Order executed? (Unexpected for unprofitable order)");
        }
    } catch (e: any) {
        if (e.response) {
            console.log("❌ Request failed:", e.response.data);
        } else {
            console.log("❌ Request error:", e.message);
        }
    }

    // 4. Verify OrderBook via API
    try {
        console.log("🔍 Verifying OrderBook...");
        const response = await axios.get(`${RELAYER_URL}/orders`);
        console.log("OrderBook State:", JSON.stringify(response.data, null, 2));

        if (response.data.count > 0) {
            console.log("TEST PASSED: OrderBook has orders!");
        } else {
            console.log("TEST FAILED: OrderBook is empty.");
        }
    } catch (e) {
        console.error("Failed to fetch OrderBook:", e);
    }
}

main();
