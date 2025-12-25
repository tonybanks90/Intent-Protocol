import axios from 'axios';
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// Relayer Configuration
const RELAYER_URL = "http://localhost:3000/intents";

async function main() {
    console.log("🚀 Starting Relayer Integration Test...");

    // 1. Generate Maker Account
    const account = Account.generate();
    console.log(`Maker Address: ${account.accountAddress.toString()}`);

    // 2. Define Intent Data
    const intent: any = {
        maker: account.accountAddress.toString(),
        nonce: "0",
        sell_token: "0xcafe::scenario_tests::MOVE",
        buy_token: "0xcafe::scenario_tests::USDC",
        sell_token_type: "0x1::aptos_coin::AptosCoin",
        buy_token_type: "0x1::aptos_coin::AptosCoin",
        sell_amount: "100",
        start_buy_amount: "200",
        end_buy_amount: "150",
        start_time: "10000",
        end_time: "20000",
        buy_amount: "200"
    };

    const encoder = new TextEncoder();
    intent.sell_token = Buffer.from(encoder.encode(intent.sell_token)).toString('hex');
    intent.buy_token = Buffer.from(encoder.encode(intent.buy_token)).toString('hex');

    // 3. Sign dummy message for connection test
    // To properly sign an intent, we need BCS serialization which is complex here.
    // However, the RelayerService checks `signature` length.
    // We will just sign a dummy buffer to prove connectivity.
    // The on-chain validation will fail, but the Relayer should TRY to submit.

    // In SDK v2, account.sign(data) signs the data directly.
    // We'll sign the stringified intent just to have *something*
    const dataToSign = new TextEncoder().encode("DUMMY_INTENT_DATA_FOR_TEST");
    const signature = account.sign(dataToSign);

    // signature is { hex: ... }? No, it's Ed25519Signature
    const signatureHex = signature.toString(); // Hex string with 0x?

    try {
        const response = await axios.post(RELAYER_URL, {
            intent: intent,
            signature: signatureHex,
            publicKey: account.publicKey.toString()
        });
        console.log("✅ Response:", response.data);
    } catch (error: any) {
        if (error.response) {
            console.log("❌ Server Error:", error.response.data);
        } else {
            console.log("❌ Connection Error:", error.message);
        }
    }
}

main();
