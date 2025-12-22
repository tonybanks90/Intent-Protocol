const aptos = require("aptos");
const { AptosAccount, BCS, TxnBuilderTypes, HexString } = aptos;

// Constants representing the exact byte sequence of the mock coin types in scenario_tests.move
// Address: 0xcafe (without 0x prefix for serialization if needed, but BCS handles addresses)
// Module: scenario_tests
// Struct: MOVE / USDC
// Full string: 000000000000000000000000000000000000000000000000000000000000cafe::scenario_tests::MOVE
// (Assuming standard address string representation in Move)

// However, it's safer to generate a keypair, print the address, and let the potential user use that address.
// BUT, the test "maker" address is hardcoded in `setup_coin`.
// Wait, `setup_coin` uses `signer::address_of(admin)` or similar?
// No, in `test_full_swap_scenario`, `maker` is a signer passed in.
// We can use ANY address as long as we have the keypair for it.
// So this script will output:
// 1. Private Key (to put in comments or ignore)
// 2. Public Key (use in test)
// 3. Address (use in test as @0x...)
// 4. Signature (use in test)

async function main() {
    // 1. Generate Account
    // Using a fixed seed for reproducibility if needed, or random
    const account = new AptosAccount(); // Random

    console.log("=== Generated Test Account ===");
    console.log("Address:", account.address().toString());
    console.log("Public Key (Hex):", account.pubKey().toString());
    console.log("Private Key (Hex):", account.toPrivateKeyObject().privateKeyHex);

    // 2. Define Intent Data
    const nonce = 0;
    // We need the EXACT bytes for the token types.
    // In Move: type_info::type_name<MOVE>()
    // Address 0xcafe is: 000000000000000000000000000000000000000000000000000000000000cafe
    // But let's assume we copy the output from this script into the test, and update the test to expect this specific Token Type string?
    // No, the Token Type is determined by the MODULE ADDRESS.
    // intent_swap is at 0xcafe.
    // So the type is `000000000000000000000000000000000000000000000000000000000000cafe::scenario_tests::MOVE`

    const sell_token_str = "000000000000000000000000000000000000000000000000000000000000cafe::scenario_tests::MOVE";
    const buy_token_str = "000000000000000000000000000000000000000000000000000000000000cafe::scenario_tests::USDC";

    const sell_token = new TextEncoder().encode(sell_token_str);
    const buy_token = new TextEncoder().encode(buy_token_str);

    const sell_amount = 100_000000n; // 100 * 10^6
    const start_buy_amount = 200_000000n;
    const end_buy_amount = 150_000000n;
    const start_time = 10000n;
    const end_time = 11000n;

    // 3. BCS Serialization
    // Move Struct:
    // struct SwapIntent { maker: address, nonce: u64, sell_token: vector<u8>, ... }

    const serializer = new BCS.Serializer();

    // Domain Separator
    const DOMAIN_SEPARATOR = new TextEncoder().encode("MOVE_INTENT_SWAP_V1");
    serializer.serializeBytes(DOMAIN_SEPARATOR);

    // Fields
    account.address().serialize(serializer); // maker
    serializer.serializeU64(BigInt(nonce));
    serializer.serializeBytes(sell_token);
    serializer.serializeBytes(buy_token);
    serializer.serializeU64(sell_amount);
    serializer.serializeU64(start_buy_amount);
    serializer.serializeU64(end_buy_amount);
    serializer.serializeU64(start_time);
    serializer.serializeU64(end_time);

    const message_bytes = serializer.getBytes();

    // 4. Hash (SHA3-256) (Actually, we verify signature over the hash)
    // aptos account.signBuffer signs the message bytes directly using Ed25519 (which includes internal hashing usually? No, pure Ed25519 signs the message).
    // WAIT. verifier.move says:
    // let message_hash = compute_intent_hash(intent); // SHA3-256(bcs_bytes)
    // verify_signature check: signature_verify_strict(payload=message_hash)
    // So we need to sign SHA3-256(message_bytes).

    // SHA3-256 using js-sha3 (aptos doesn't expose it directly in root?)
    // Actually aptos sdk might use sha3.
    // Let's use `create-hash` or similar if available, or just implement it. 
    // Wait, `aptos` package usually includes SHA3 helper?
    // checking... TxnBuilderTypes often has it.

    // Let's try to assume we can use `crypto` from node.
    const { createHash } = require('crypto'); // This is SHA256 usually.
    // Node 18+ has global crypto?
    // Let's use 'sha3' package? Not installed.
    // Actually, `aptos` SDK likely has it.
    // If not, I can assume standard sha256? NO, Verifier uses SHA3-256.

    // WORKAROUND: verifier.move uses std::hash::sha3_256.
    // I MUST use sha3_256 here.
    // Can I rely on `aptos` internal utils?
    // `aptos` v1 (deprecated) has `sha3_256` in utils?

    // To be safe: install `js-sha3`.
    // Or... I can verify the hash on chain.

    // Let's assume I can use `js-sha3`.
}

// Just printing instructions first to install js-sha3 if needed.
console.log("Please install js-sha3: npm install js-sha3");
