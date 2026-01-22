import axios from 'axios';
import { Account, Ed25519PublicKey, Ed25519Signature, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { sha3_256 } from 'js-sha3';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const RELAYER_URL = process.env.RELAYER_URL || "http://localhost:3001";

// Persistent Test Maker (Address: 0x5b79d5dd49be022c888d78c8ca05385ce874d2472599130d5d760acefa2c0880)
const TEST_MAKER_PK = "0x51ea785118450d4fb55a61be78b5cc67ec7c2148d519f78f54bf7005d957bce6";

// Token Types
const TOKENS = {
    MOVE: { type: "0x1::aptos_coin::AptosCoin", decimals: 8 },
    WETH: { type: "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb", decimals: 8 },
    USDC: { type: "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489", decimals: 6 },
    USDT: { type: "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de", decimals: 6 }
};

// BCS Helpers (Matching Frontend bcs.ts)
const BCS = {
    append: (data: any, toAppend: any): any => {
        const merged = new Uint8Array(data.length + toAppend.length);
        merged.set(data);
        merged.set(toAppend, data.length);
        return merged;
    },
    serializeU64: (val: bigint): Uint8Array => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, val, true); // LE
        return new Uint8Array(buffer);
    },
    serializeBytes: (str: string): Uint8Array => {
        return new TextEncoder().encode(str);
    }
};

function hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    const len = clean.length;
    const bytes = new Uint8Array(len / 2);
    for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
    }
    return bytes;
}

function canonicalizeType(type: string): string {
    if (type.includes("::")) return type;
    return "@" + type;
}

function serializeIntent(intent: any): any {
    let data: any = new Uint8Array(0);
    // 1. Domain
    data = BCS.append(data, new TextEncoder().encode("MOVE_INTENT_SWAP_V1"));
    // 2. Maker
    data = BCS.append(data, hexToBytes(intent.maker));
    // 3. Nonce
    data = BCS.append(data, BCS.serializeU64(BigInt(intent.nonce)));
    // 4. Tokens
    data = BCS.append(data, BCS.serializeBytes(canonicalizeType(intent.sell_token_type)));
    data = BCS.append(data, BCS.serializeBytes(canonicalizeType(intent.buy_token_type)));
    // 5. Params
    data = BCS.append(data, BCS.serializeU64(BigInt(intent.sell_amount)));
    data = BCS.append(data, BCS.serializeU64(BigInt(intent.start_buy_amount)));
    data = BCS.append(data, BCS.serializeU64(BigInt(intent.end_buy_amount)));
    data = BCS.append(data, BCS.serializeU64(BigInt(intent.start_time)));
    data = BCS.append(data, BCS.serializeU64(BigInt(intent.end_time)));
    return data;
}

async function createLimitOrder(
    maker: Account,
    sellSymbol: keyof typeof TOKENS,
    buySymbol: keyof typeof TOKENS,
    sellAmount: number,
    buyAmount: number,
    duration: number = 3600
) {
    const now = Math.floor(Date.now() / 1000);
    const sToken = TOKENS[sellSymbol];
    const bToken = TOKENS[buySymbol];

    const sRaw = Math.floor(sellAmount * Math.pow(10, sToken.decimals)).toString();
    const bRaw = Math.floor(buyAmount * Math.pow(10, bToken.decimals)).toString();

    // Construct Intent
    const intent = {
        maker: maker.accountAddress.toString(),
        nonce: now,
        sell_token_type: sToken.type,
        buy_token_type: bToken.type,
        sell_amount: sRaw,
        start_buy_amount: bRaw,
        end_buy_amount: bRaw,
        start_time: now.toString(),
        end_time: (now + duration).toString(),
        buy_amount: bRaw
    };

    // Hashing
    const serialized = serializeIntent(intent);
    const intentHash = sha3_256(serialized);

    // Signing
    const signature = maker.sign(hexToBytes(intentHash));

    // Prepare Payload
    const encoder = new TextEncoder();
    const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

    const payload = {
        intent: {
            ...intent,
            sell_token: toHex(encoder.encode(canonicalizeType(sToken.type))),
            buy_token: toHex(encoder.encode(canonicalizeType(bToken.type)))
        },
        signature: signature.toString(),
        publicKey: maker.publicKey.toString(),
        signingNonce: "0x" + toHex(encoder.encode(now.toString()))
    };

    try {
        const res = await axios.post(`${RELAYER_URL}/intents`, payload);
        console.log(chalk.green(`✅ ${sellSymbol}->${buySymbol} Order Submitted! Rate: ${(buyAmount / sellAmount).toFixed(4)} Hash: ${intentHash.slice(0, 10)}...`));
        return res.data;
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to submit ${sellSymbol}->${buySymbol}: ${e.response?.data?.message || e.message}`));
    }
}

async function main() {
    console.log(chalk.blue.bold("\n🚀 Creating Meaningful Limit Orders..."));

    const privateKey = new Ed25519PrivateKey(TEST_MAKER_PK);
    const maker = Account.fromPrivateKey({ privateKey });
    console.log(chalk.gray(`Using persistent maker: ${maker.accountAddress.toString()}`));

    // Scenario 1: MOVE -> USDC (Selling 10 MOVE for 1.05 rate)
    await createLimitOrder(maker, "MOVE", "USDC", 10, 10.5);

    // Scenario 2: WETH -> USDC (Selling 0.5 WETH for $1200)
    await createLimitOrder(maker, "WETH", "USDC", 0.5, 1200);

    // Scenario 3: USDC -> USDT (Stable swap 500 for 501)
    await createLimitOrder(maker, "USDC", "USDT", 500, 501);

    // Scenario 4: MOVE -> WETH (Selling 20 MOVE for WETH at $2400-ish rate)
    await createLimitOrder(maker, "MOVE", "WETH", 20, 0.0083);

    console.log(chalk.blue.bold("\nAll orders submitted! View at http://localhost:5173/resolver"));
}

main();
