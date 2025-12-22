const aptos = require("aptos");
const { AptosAccount, BCS, TxnBuilderTypes, HexString } = aptos;
const { sha3_256 } = require("js-sha3");
const nacl = require("tweetnacl"); // Check if available, or try aptos internal

async function main() {
    // 1. Generate Account
    const account = new AptosAccount();

    console.log("// Generated Test Account Data");
    console.log("// Private Key:", account.toPrivateKeyObject().privateKeyHex);
    console.log("const MAKER_ADDR_BYTES: vector<u8> = x\"" + account.address().toString().substring(2) + "\";");
    console.log("const MAKER_PUBKEY: vector<u8> = x\"" + account.pubKey().toString().substring(2) + "\";");

    // 2. Define Intent Data
    const nonce = 0;

    // Updated to match Move output: 0xcafe::scenario_tests::MOVE
    const sell_token_str = "0xcafe::scenario_tests::MOVE";
    const buy_token_str = "0xcafe::scenario_tests::USDC";

    const sell_token = new TextEncoder().encode(sell_token_str);
    const buy_token = new TextEncoder().encode(buy_token_str);

    const sell_amount = 100_000000n;
    const start_buy_amount = 200_000000n;
    const end_buy_amount = 150_000000n;
    const start_time = 10000n;
    const end_time = 11000n;

    // 3. BCS Serialization
    const DOMAIN_SEPARATOR_BYTES = new TextEncoder().encode("MOVE_INTENT_SWAP_V1");

    let data = new Uint8Array(0);
    const append = (arr) => {
        const merged = new Uint8Array(data.length + arr.length);
        merged.set(data);
        merged.set(arr, data.length);
        data = merged;
    };

    append(DOMAIN_SEPARATOR_BYTES);

    // Maker Address (32 bytes)
    append(account.address().toUint8Array());

    // Nonce (u64 little endian)
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(BigInt(nonce));
    append(nonceBuf);

    // Sell Token (Raw bytes)
    append(sell_token);

    // Buy Token (Raw bytes)
    append(buy_token);

    // Amounts & Times (u64 little endian)
    const writeU64 = (val) => {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(val);
        append(buf);
    };

    writeU64(sell_amount);
    writeU64(start_buy_amount);
    writeU64(end_buy_amount);
    writeU64(start_time);
    writeU64(end_time);

    // 4. Hash (SHA3-256)
    const hash = sha3_256.create();
    hash.update(data);
    const digest = hash.hex();
    console.log("// Digest: 0x" + digest);

    // 5. Sign
    // Use TweetNaCl if AptosAccount.signBuffer is dubious
    // Aptos SDK actually depends on nacl.
    // Try to access signing key directly.
    const digestBytes = new Uint8Array(Buffer.from(digest, 'hex'));

    // account.signBuffer signs buffer. 
    // If it's pure Ed25519 it should work.
    // We can test if verify works locally.
    const signatureHexString = account.signBuffer(digestBytes);

    console.log("const SIGNATURE: vector<u8> = x\"" + signatureHexString.toString().substring(2) + "\";");
}

main().catch(console.error);
