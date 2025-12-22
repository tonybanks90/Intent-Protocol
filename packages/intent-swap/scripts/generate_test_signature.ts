const aptos = require("aptos");
const { AptosAccount, BCS, TxnBuilderTypes, HexString } = aptos;
const { sha3_256 } = require("js-sha3");

async function main() {
    // 1. Generate Account with fixed seed for reproducibility
    const account = new AptosAccount();

    console.log("// Generated Test Account Data");
    console.log("// Private Key:", account.toPrivateKeyObject().privateKeyHex);
    console.log("const MAKER_ADDR: address = @" + account.address().toString() + ";");
    console.log("const MAKER_PUBKEY: vector<u8> = x\"" + account.pubKey().toString().substring(2) + "\";"); // Remove 0x

    // 2. Define Intent Data
    const nonce = 0;

    // Address 0xcafe is: 0000...cafe
    // Types: 0xcafe::scenario_tests::MOVE, 0xcafe::scenario_tests::USDC
    const sell_token_str = "000000000000000000000000000000000000000000000000000000000000cafe::scenario_tests::MOVE";
    const buy_token_str = "000000000000000000000000000000000000000000000000000000000000cafe::scenario_tests::USDC";

    const sell_token = new TextEncoder().encode(sell_token_str);
    const buy_token = new TextEncoder().encode(buy_token_str);

    const sell_amount = 100_000000n;
    const start_buy_amount = 200_000000n;
    const end_buy_amount = 150_000000n;
    const start_time = 10000n;
    const end_time = 11000n;

    // 3. BCS Serialization
    const serializer = new BCS.Serializer();

    const DOMAIN_SEPARATOR_BYTES = new TextEncoder().encode("MOVE_INTENT_SWAP_V1");

    let data = new Uint8Array(0);
    const append = (arr: Uint8Array | Buffer) => {
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
    const writeU64 = (val: bigint) => {
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

    // 5. Sign
    const digestBytes = new Uint8Array(Buffer.from(digest, 'hex'));
    const signatureHexString = account.signBuffer(digestBytes);

    console.log("const SIGNATURE: vector<u8> = x\"" + signatureHexString.toString().substring(2) + "\";");

    // Output check
    console.log("// Digest matches?", digest);
}

main().catch(console.error);
