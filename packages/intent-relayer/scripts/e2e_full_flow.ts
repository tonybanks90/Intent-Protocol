import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import axios from 'axios';
import { sha3_256 } from 'js-sha3';

// 1. Setup Client
const config = new AptosConfig({ network: Network.CUSTOM, fullnode: "https://testnet.movementnetwork.xyz/v1" });
const aptos = new Aptos(config);

const RELAYER_URL = "http://localhost:3000";

// BCS Logic (Mirrors Frontend)
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
    // Basic BCS construction for simulation
    const enc = new TextEncoder();
    const data: number[] = [];
    const pushBytes = (arr: Uint8Array) => arr.forEach(b => data.push(b));
    const pushU64 = (val: bigint) => {
        const buf = new ArrayBuffer(8);
        new DataView(buf).setBigUint64(0, val, true);
        pushBytes(new Uint8Array(buf));
    }
    const pushStringBytes = (str: string) => pushBytes(enc.encode(str));
    // Hex string to bytes (32 bytes)
    const pushAddr = (hex: string) => {
        const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
        const bytes = new Uint8Array(clean.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        // Pad
        const padded = new Uint8Array(32);
        padded.set(bytes, 32 - bytes.length);
        pushBytes(padded);
    }

    pushStringBytes("MOVE_INTENT_SWAP_V1");
    pushAddr(maker); // Maker
    pushU64(BigInt(nonce));
    pushStringBytes(sellToken);
    pushStringBytes(buyToken);
    pushU64(BigInt(sellAmount));
    pushU64(BigInt(startBuyAmount));
    pushU64(BigInt(endBuyAmount));
    pushU64(BigInt(startTime));
    pushU64(BigInt(endTime));

    return new Uint8Array(data);
}


async function main() {
    console.log("Starting E2E Flow...");

    // 2. Create User
    // 2. Create User
    const user = Account.generate();
    console.log("User Address:", user.accountAddress.toString());

    // 2b. Fund User (Required for account::exists_at check in verifier)
    require("dotenv").config();
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (relayerKey) {
        console.log("Funding User from Relayer...");
        const relayer = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(relayerKey) });
        const tx = await aptos.transaction.build.simple({
            sender: relayer.accountAddress,
            data: {
                function: "0x1::aptos_account::transfer",
                functionArguments: [user.accountAddress, 50_000_000] // 0.5 MOVE
            }
        });
        const committed = await aptos.signAndSubmitTransaction({ signer: relayer, transaction: tx });
        await aptos.waitForTransaction({ transactionHash: committed.hash });
        console.log("User Funded.");

        // Check Relayer Balance
        const relayerBal = await aptos.getAccountCoinAmount({ accountAddress: relayer.accountAddress, coinType: "0x1::aptos_coin::AptosCoin" });
        console.log("Relayer Remaining Balance:", relayerBal);
    } else {
        console.warn("No RELAYER_PRIVATE_KEY found. User might not exist on chain, verifying signature usually requires existing account.");
    }

    // 2c. Deposit to Escrow (Required for Execution)
    console.log("Depositing to Escrow...");
    const depositTx = await aptos.transaction.build.simple({
        sender: user.accountAddress,
        data: {
            function: "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611::escrow::deposit",
            typeArguments: ["0x1::aptos_coin::AptosCoin"],
            functionArguments: [1000] // More than 100 sell amount
        }
    });
    const depositCommitted = await aptos.signAndSubmitTransaction({ signer: user, transaction: depositTx });
    await aptos.waitForTransaction({ transactionHash: depositCommitted.hash });
    console.log("Escrow Deposited.");

    // Verify Escrow Balance
    try {
        const balanceResult = await aptos.view({
            payload: {
                function: "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611::escrow::get_balance",
                typeArguments: ["0x1::aptos_coin::AptosCoin"],
                functionArguments: [user.accountAddress]
            }
        });
        console.log("Escrow Balance Verified:", balanceResult[0]);
    } catch (e) {
        console.error("Failed to view escrow balance", e);
    }


    // 3. Create Intent
    const now = Math.floor(Date.now() / 1000);
    const intent = {
        maker: user.accountAddress.toString(),
        nonce: "0",
        sellToken: "0x1::aptos_coin::AptosCoin",
        buyToken: "0x1::aptos_coin::AptosCoin", // Self swap for test
        sellAmount: 100,
        startBuyAmount: 95,
        endBuyAmount: 90,
        startTime: now,
        endTime: now + 300
    };

    const serialized = serializeIntent(
        intent.maker, intent.nonce, intent.sellToken, intent.buyToken,
        intent.sellAmount, intent.startBuyAmount, intent.endBuyAmount,
        intent.startTime, intent.endTime
    );

    const hashHexString = sha3_256(serialized); // hex string

    // 4. Sign (Simulate Wallet Behavior with Prefix)
    // Standard Wallet: Sig = Sign(SHA3("APTOS\nmessage: " + message))
    // Here message is the hex string of the intent hash? Or bytes?
    // Frontend passes `hashHexString` to `signMessage`.
    // Aptos standard: `application/x-aptos-signature` usually signs the string bytes.

    const fullMessage = `APTOS\nmessage: ${hashHexString}`;
    // WAIT: Frontend uses `signMessage` with nonce?
    // SwapContext: signMessage({ message: intentHash, nonce: nonce })
    // Aptos Wallet Buffer:
    // "APTOS\nmessage:\nnonce: <nonce>\nmessage: <message>"
    const fullMessageWithNonce = `APTOS\nmessage:\nnonce: ${intent.nonce}\nmessage: ${hashHexString}`;
    const prefixBytes = new TextEncoder().encode(fullMessageWithNonce);
    // Aptos signMessage signs SHA3(prefixBytes)
    // Actually SDK Account.sign signs the bytes provided.
    // So we must hash first?
    // Wallet Adapter says: "signMessage ... returns signature"
    // The signature is over the HASH of the message.

    // So we hash the full text string:
    const toSign = new Uint8Array(Buffer.from(sha3_256(prefixBytes), 'hex'));

    // user.sign expects bytes to sign. Ed25519 signs the bytes.
    // standard is Sign(SHA3(Message)).
    const sigResult = user.sign(toSign);

    // Also update buy_amount to satisfy auction
    // ... logic below ...

    console.log("Submitting to Relayer...");

    try {
        const response = await axios.post(`${RELAYER_URL}/intents`, {
            intent: {
                maker: intent.maker,
                nonce: intent.nonce,
                sell_token_type: intent.sellToken,
                buy_token_type: intent.buyToken,
                sell_token: Buffer.from(intent.sellToken).toString('hex'),
                buy_token: Buffer.from(intent.buyToken).toString('hex'),
                sell_amount: intent.sellAmount.toString(),
                start_buy_amount: intent.startBuyAmount.toString(),
                end_buy_amount: intent.endBuyAmount.toString(),
                start_time: intent.startTime.toString(),
                end_time: intent.endTime.toString(),
                buy_amount: "100" // VALID AMOUNT
            },
            signature: sigResult.toString(), // Hex string of 64 bytes
            publicKey: user.publicKey.toString()
        });

        console.log("Relayer Response:", response.data);
    } catch (e: any) {
        console.error("Relayer Error:", e.response ? e.response.data : e.message);
    }
}

main();
