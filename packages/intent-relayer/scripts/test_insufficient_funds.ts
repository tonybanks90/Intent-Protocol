import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import axios from "axios";
import { sha3_256 } from "js-sha3";

const RELAYER_URL = "http://localhost:3001";
const INTENT_SWAP_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";

// Helper for BCS serialization of Intent
function serializeIntent(
    maker: string,
    nonce: string,
    sellToken: string,
    buyToken: string,
    sellAmount: number,
    startBuyAmount: number,
    endBuyAmount: number,
    startTime: number,
    endTime: number
): Uint8Array {
    // Basic mock serialization - in real app use proper BCS
    // For this test, we construct the hash manually or rely on what the relayer expects
    // But Relayer verifies signature against the intent data. 
    // We need to match the Relayer/Contract serialization exactly.
    // For simplicity, we'll assume the Relayer uses the same logic as our previous tests.
    return new TextEncoder().encode("mock_bcs");
}

// Just copy the serialize/hash logic from frontend to be safe, or use a simplified valid mock if signature validation is skipped in this specific test branch? 
// No, Relayer validates signature. Accessing the real serialize/hash from 'intent-relayer' src or copying it is best.
// I'll assume we can't easily import from 'src' in a script without compilation.
// Im providing a simplified "valid" intent for the Relayer to accept into the book.

async function main() {
    console.log("🧪 Testing Insufficient Funds Pruning...");

    const config = new AptosConfig({ network: Network.CUSTOM, fullnode: "https://testnet.movementnetwork.xyz/v1" });
    const aptos = new Aptos(config);

    // 1. Create Maker Account
    const maker = Account.generate();
    console.log(`👤 Maker: ${maker.accountAddress.toString()}`);

    // 2. Fund Maker (We need SOME funds to pay gas for approval if we were doing it right, 
    // but here we are just submitting an intent signature).
    // The Relayer checks ESCROW balance.
    // We will NOT deposit to Escrow. So Escrow Balance = 0.

    // 3. Create Intent (Sell 100 MOVE)
    const now = Math.floor(Date.now() / 1000);
    const intent = {
        maker: maker.accountAddress.toString(),
        nonce: "0",
        sell_token_type: "0x1::aptos_coin::AptosCoin",
        buy_token_type: "0x1::aptos_coin::AptosCoin", // Swapping for same just to test
        sell_token: "0x1::aptos_coin::AptosCoin",
        buy_token: "0x1::aptos_coin::AptosCoin",
        sell_amount: "100000000", // 1 MOVE
        start_buy_amount: "90000000",
        end_buy_amount: "90000000",
        start_time: (now + 10).toString(), // Future start time (so it queues)
        end_time: (now + 3600).toString(),
        buy_amount: "90000000"
    };

    // 4. Sign Intent
    // Use the hashing logic (replicated simplified or use a library)
    // Actually, creating a valid signature is hard without the BCS imports.
    // BUT, `Relayer.submitOrder` does strict checks?
    // It calls `executeOrder` -> `fill_order` -> Fails on chain.
    // It catches error. 
    // Then it queues.
    // IT DOES NOT VERIFY SIGNATURE OFFCHAIN (commented out in code).
    // So any signature works for this specific test of "Pruning Logic"!
    const signature = "0x" + "00".repeat(64);
    const publicKey = maker.publicKey.toString();

    console.log("📤 Submitting Order (Escrow Balance = 0, Sell Amount = 1 MOVE)...");
    try {
        const res = await axios.post(`${RELAYER_URL}/intents`, {
            intent,
            signature,
            publicKey,
            signingNonce: "0x0"
        });
        console.log("Response:", res.data);

        if (res.data.status === 'PENDING') {
            console.log("✅ Order Queued successfully (Expected because start_time is in future)");
        } else {
            // If it executed (impossible with 0 balance), we fail
            console.log("⚠️ Order executed? Unexpected.");
        }

    } catch (e: any) {
        if (e.response && e.response.data && e.response.data.status === 'PENDING') {
            console.log("✅ Order Queued (via Catch block return)");
        } else {
            console.error("❌ Submission failed unexpectedly:", e.message);
        }
    }

    // 5. Wait for Pruning
    console.log("⏳ Waiting 10s for Relayer Loop to check balance (0 < 100000000)...");
    await new Promise(r => setTimeout(r, 10000));

    // 6. Check Orders
    console.log("🔍 Checking OrderBook...");
    const ordersRes = await axios.get(`${RELAYER_URL}/orders`);
    const orders = ordersRes.data.orders;
    console.log(`Orders Count: ${orders.length}`);

    // We expect 0 orders for this maker (pruned)
    const myOrder = orders.find((o: any) => o.intent.maker === maker.accountAddress.toString());

    if (!myOrder) {
        console.log("✅ SUCCESS: Order was pruned due to insufficient funds.");
    } else {
        console.error("❌ FAILURE: Order still exists in book via API.");
    }

}

main();
