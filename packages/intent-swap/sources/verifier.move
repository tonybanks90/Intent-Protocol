/// Intent Verifier - Hash computation and signature verification
/// 
/// Verifies that swap intents are properly signed by the maker.
module intent_swap::verifier {
    use std::hash;
    use std::bcs;
    use std::vector;
    use aptos_std::ed25519;
    use aptos_framework::account;
    use intent_swap::types::{Self, SwapIntent};

    // ==================== Constants ====================

    /// Domain separator for intent signing
    const DOMAIN_SEPARATOR: vector<u8> = b"MOVE_INTENT_SWAP_V1";

    // ==================== Error Codes ====================

    const E_INVALID_SIGNATURE: u64 = 400;
    const E_SIGNATURE_LENGTH: u64 = 401;
    const E_PUBLIC_KEY_NOT_FOUND: u64 = 402;

    // ==================== Hash Computation ====================

    /// Compute deterministic hash of intent
    /// 
    /// This hash is what the user signs off-chain.
    /// It must match exactly on both client and contract sides.
    public fun compute_intent_hash(intent: &SwapIntent): vector<u8> {
        let data = vector::empty<u8>();

        // Append domain separator
        vector::append(&mut data, DOMAIN_SEPARATOR);

        // Serialize intent fields in deterministic order
        vector::append(&mut data, bcs::to_bytes(&types::get_maker(intent)));
        vector::append(&mut data, bcs::to_bytes(&types::get_nonce(intent)));
        vector::append(&mut data, types::get_sell_token(intent));
        vector::append(&mut data, types::get_buy_token(intent));
        vector::append(&mut data, bcs::to_bytes(&types::get_sell_amount(intent)));
        vector::append(&mut data, bcs::to_bytes(&types::get_start_buy_amount(intent)));
        vector::append(&mut data, bcs::to_bytes(&types::get_end_buy_amount(intent)));
        vector::append(&mut data, bcs::to_bytes(&types::get_start_time(intent)));
        vector::append(&mut data, bcs::to_bytes(&types::get_end_time(intent)));

        // SHA3-256 hash
        hash::sha3_256(data)
    }

    /// Compute hash from raw intent parameters (for testing/verification)
    public fun compute_hash_from_params(
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
    ): vector<u8> {
        let data = vector::empty<u8>();

        vector::append(&mut data, DOMAIN_SEPARATOR);
        vector::append(&mut data, bcs::to_bytes(&maker));
        vector::append(&mut data, bcs::to_bytes(&nonce));
        vector::append(&mut data, sell_token);
        vector::append(&mut data, buy_token);
        vector::append(&mut data, bcs::to_bytes(&sell_amount));
        vector::append(&mut data, bcs::to_bytes(&start_buy_amount));
        vector::append(&mut data, bcs::to_bytes(&end_buy_amount));
        vector::append(&mut data, bcs::to_bytes(&start_time));
        vector::append(&mut data, bcs::to_bytes(&end_time));

        hash::sha3_256(data)
    }

    // ==================== Signature Verification ====================

    /// Verify that a signature is valid for the given intent
    /// 
    /// Returns true if the signature was created by the maker.
    /// Verify that a signature is valid for the given intent
    /// 
    /// Returns true if the signature was created by the maker.
    /// Verify that a signature is valid for the given intent
    /// 
    /// Returns true if the signature was created by the maker.
    public fun verify_signature(
        intent: &SwapIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
    ): bool {
        // Legacy support: use intent nonce as string
        let nonce_str = to_string_u64(types::get_nonce(intent));
        verify_signature_internal(intent, signature_bytes, public_key_bytes, nonce_str)
    }

    public fun verify_signature_with_nonce(
        intent: &SwapIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
        signing_nonce: vector<u8>,
    ): bool {
        verify_signature_internal(intent, signature_bytes, public_key_bytes, signing_nonce)
    }

    fun verify_signature_internal(
        intent: &SwapIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
        signing_nonce: vector<u8>,
    ): bool {
        let maker = types::get_maker(intent);

        // Verify signature length (Ed25519 signatures are 64 bytes)
        if (vector::length(&signature_bytes) != 64) {
            return false
        };

        // Verify public key length (Ed25519 public keys are 32 bytes)
        if (vector::length(&public_key_bytes) != 32) {
            return false
        };

        // Get maker's authentication key
        if (!account::exists_at(maker)) {
            return false
        };

        let on_chain_auth_key = account::get_authentication_key(maker);

        // Verify public key matches address (Scheme 0 - Ed25519)
        let expected_auth_key_scheme0 = vector::empty<u8>();
        vector::append(&mut expected_auth_key_scheme0, public_key_bytes);
        vector::push_back(&mut expected_auth_key_scheme0, 0x00); // Scheme 0
        let derived_auth_key_scheme0 = hash::sha3_256(expected_auth_key_scheme0);

        // Verify public key matches address (Scheme 2 - SingleKey)
        let expected_auth_key_scheme2 = vector::empty<u8>();
        vector::append(&mut expected_auth_key_scheme2, public_key_bytes);
        vector::push_back(&mut expected_auth_key_scheme2, 0x02); // Scheme 2
        let derived_auth_key_scheme2 = hash::sha3_256(expected_auth_key_scheme2);

        if (derived_auth_key_scheme0 != on_chain_auth_key && derived_auth_key_scheme2 != on_chain_auth_key) {
             return false
        };

        // === Construct the Signed Message (AIP-62) ===
        // Format: "APTOS\nmessage: <intent_hash_hex>\nnonce: <nonce>"
        // This matches what Nightly wallet produces in fullMessage
        
        // 1. Get inner intent hash
        let intent_hash = compute_intent_hash(intent);
        
        // 2. Convert to hex string
        let intent_hash_hex = to_hex_string(&intent_hash);
        
        // 3. Use explicit signing nonce
        let nonce_str = signing_nonce;
        
        // 4. Build full message bytes matching wallet's format
        let full_message = vector::empty<u8>();
        vector::append(&mut full_message, b"APTOS\nmessage: ");
        vector::append(&mut full_message, intent_hash_hex);
        vector::append(&mut full_message, b"\nnonce: ");
        vector::append(&mut full_message, nonce_str);
        
        // Create signature and public key objects
        let signature = ed25519::new_signature_from_bytes(signature_bytes);
        let public_key = ed25519::new_unvalidated_public_key_from_bytes(public_key_bytes);

        // Verify signature against the raw full message bytes
        // AIP-62 wallets sign the full message directly, not its hash
        ed25519::signature_verify_strict(
            &signature,
            &public_key,
            full_message,
        )
    }

    // ==================== Helpers ====================

    fun to_hex_string(bytes: &vector<u8>): vector<u8> {
        let len = vector::length(bytes);
        let hex = vector::empty<u8>();
        let i = 0;
        while (i < len) {
            let b = *vector::borrow(bytes, i);
            let hi = b / 16;
            let lo = b % 16;
            vector::push_back(&mut hex, if (hi < 10) hi + 48 else hi + 87);
            vector::push_back(&mut hex, if (lo < 10) lo + 48 else lo + 87);
            i = i + 1;
        };
        hex
    }
    
    public fun to_string_u64(val: u64): vector<u8> {
        if (val == 0) {
            return b"0"
        };
        let buf = vector::empty<u8>();
        let v = val;
        while (v > 0) {
            let digit = v % 10;
            vector::push_back(&mut buf, (digit as u8) + 48);
            v = v / 10;
        };
        vector::reverse(&mut buf);
        buf
    }

    /// Assert that signature is valid (reverts if not)
    public fun assert_valid_signature(
        intent: &SwapIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
    ) {
        assert!(verify_signature(intent, signature_bytes, public_key_bytes), E_INVALID_SIGNATURE);
    }

    /// Assert that signature is valid with explicit nonce (reverts if not)
    public fun assert_valid_signature_with_nonce(
        intent: &SwapIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
        signing_nonce: vector<u8>,
    ) {
        assert!(verify_signature_with_nonce(intent, signature_bytes, public_key_bytes, signing_nonce), E_INVALID_SIGNATURE);
    }

    /// Verify signature and return the hash (for efficiency when both are needed)
    public fun verify_and_get_hash(
        intent: &SwapIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
    ): vector<u8> {
        assert_valid_signature(intent, signature_bytes, public_key_bytes);
        compute_intent_hash(intent)
    }

    // ==================== Utility Functions ====================

    /// Get the domain separator
    public fun get_domain_separator(): vector<u8> {
        DOMAIN_SEPARATOR
    }

    /// Check if an address has been initialized (exists on chain)
    public fun is_valid_maker(maker: address): bool {
        account::exists_at(maker)
    }

    // ==================== Tests ====================

    #[test]
    fun test_hash_determinism() {
        let intent = types::new_intent(
            @0x1,
            0,
            b"0x1::aptos_coin::AptosCoin",
            b"0x1::usdc::USDC",
            100_00000000,
            85_000000,
            80_000000,
            1000,
            2000,
        );

        let hash1 = compute_intent_hash(&intent);
        let hash2 = compute_intent_hash(&intent);

        assert!(hash1 == hash2, 0);
        assert!(vector::length(&hash1) == 32, 1); // SHA3-256 produces 32 bytes
    }

    #[test]
    fun test_different_intents_different_hashes() {
        let intent1 = types::new_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100, 85, 80, 1000, 2000,
        );

        let intent2 = types::new_intent(
            @0x1, 1, b"MOVE", b"USDC", // Different nonce
            100, 85, 80, 1000, 2000,
        );

        let hash1 = compute_intent_hash(&intent1);
        let hash2 = compute_intent_hash(&intent2);

        assert!(hash1 != hash2, 0);
    }

    #[test]
    fun test_hash_from_params_matches() {
        let intent = types::new_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100, 85, 80, 1000, 2000,
        );

        let hash1 = compute_intent_hash(&intent);
        let hash2 = compute_hash_from_params(
            @0x1, 0, b"MOVE", b"USDC",
            100, 85, 80, 1000, 2000,
        );

        assert!(hash1 == hash2, 0);
    }
}
