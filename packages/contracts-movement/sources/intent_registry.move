/// Main intent registry - orchestrates the entire protocol
module intent_protocol::intent_registry {
    use std::signer;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use intent_protocol::intent_types::{Self, Intent, FeeConfig};
    use intent_protocol::events;
    use intent_protocol::resolver_manager;
    use intent_protocol::liquidity_pool;

    /// Error codes
    const ENOT_INITIALIZED: u64 = 1;
    const EALREADY_INITIALIZED: u64 = 2;
    const EUNAUTHORIZED: u64 = 3;
    const EINTENT_NOT_FOUND: u64 = 4;
    const EINTENT_ALREADY_FULFILLED: u64 = 5;
    const EINTENT_EXPIRED: u64 = 6;
    const EINVALID_AMOUNT: u64 = 7;
    const EINSUFFICIENT_LIQUIDITY: u64 = 8;
    const EINVALID_RESOLVER: u64 = 9;
    const EPAUSED: u64 = 10;
    const EINVALID_SOURCE_CHAIN: u64 = 11;
    const EDUPLICATE_TX_HASH: u64 = 12;
    const EINVALID_EXPIRY: u64 = 13;

    /// Main registry storing all intents
    struct IntentRegistry has key {
        admin: address,
        
        // Intent storage
        intents: Table<u64, Intent>,
        next_intent_id: u64,
        
        // Tracking
        used_tx_hashes: Table<vector<u8>, bool>,  // Prevent double-spending
        user_intents: Table<address, vector<u64>>,  // User -> Intent IDs
        
        // Configuration
        fee_config: FeeConfig,
        supported_chains: Table<u64, bool>,
        max_expiry_duration: u64,  // Maximum time for intent expiry
        min_expiry_duration: u64,  // Minimum time for intent expiry
        
        // Pool reference
        pool_address: address,
        resolver_registry: address,
        
        // State
        paused: bool,
        created_at: u64,
    }

    /// Initialize the intent registry
    public entry fun initialize(
        admin: &signer,
        pool_address: address,
        resolver_registry: address,
        base_fee_bps: u64,
        resolver_fee_bps: u64,
        protocol_fee_bps: u64,
        min_fee: u64,
        max_fee: u64,
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<IntentRegistry>(admin_addr), EALREADY_INITIALIZED);

        let fee_config = intent_types::new_fee_config(
            base_fee_bps,
            resolver_fee_bps,
            protocol_fee_bps,
            min_fee,
            max_fee,
        );

        let now = timestamp::now_seconds();
        let registry = IntentRegistry {
            admin: admin_addr,
            intents: table::new(),
            next_intent_id: 0,
            used_tx_hashes: table::new(),
            user_intents: table::new(),
            fee_config,
            supported_chains: table::new(),
            max_expiry_duration: 86400,  // 24 hours
            min_expiry_duration: 300,     // 5 minutes
            pool_address,
            resolver_registry,
            paused: false,
            created_at: now,
        };

        move_to(admin, registry);
    }

    /// Add supported chain
    public entry fun add_supported_chain(
        admin: &signer,
        registry_addr: address,
        chain_id: u64,
    ) acquires IntentRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, EUNAUTHORIZED);

        table::add(&mut registry.supported_chains, chain_id, true);
    }

    /// Create a new intent
    public entry fun create_intent<CoinType>(
        requester: &signer,
        registry_addr: address,
        source_chain_id: u64,
        source_token: vector<u8>,
        source_amount: u64,
        source_tx_hash: vector<u8>,
        source_block_number: u64,
        target_amount: u64,
        expiry_duration: u64,  // in seconds
    ) acquires IntentRegistry {
        let requester_addr = signer::address_of(requester);
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(!registry.paused, EPAUSED);
        
        // Validations
        assert!(table::contains(&registry.supported_chains, source_chain_id), EINVALID_SOURCE_CHAIN);
        assert!(target_amount > 0, EINVALID_AMOUNT);
        assert!(!table::contains(&registry.used_tx_hashes, source_tx_hash), EDUPLICATE_TX_HASH);
        assert!(
            expiry_duration >= registry.min_expiry_duration && 
            expiry_duration <= registry.max_expiry_duration,
            EINVALID_EXPIRY
        );

        // target_amount IS the net amount user will receive
        // We don't need to calculate fees from it - that was already done when determining target_amount
        // Fees are implicit: source_amount (on other chain) - target_amount = total_fee
        
        // For tracking purposes, we can calculate what the fee breakdown would be
        // using our fee config, but the actual target_amount is what user gets
        let total_fee = if (source_amount > target_amount) {
            source_amount - target_amount
        } else {
            0  // No fee if amounts are equal or inverted (shouldn't happen in practice)
        };
        
        // Calculate how fees would be split between resolver and protocol
        let resolver_fee_bps = intent_types::get_resolver_fee_bps(&registry.fee_config);
        let resolver_fee = (total_fee * resolver_fee_bps) / 10000;
        let protocol_fee = total_fee - resolver_fee;

        // Get assigned resolver
        let assigned_resolver = resolver_manager::get_next_resolver(registry.resolver_registry);

        // Create intent
        let intent_id = registry.next_intent_id;
        let now = timestamp::now_seconds();
        let expiry_at = now + expiry_duration;

        let intent = intent_types::new_intent(
            intent_id,
            requester_addr,
            source_chain_id,
            source_token,
            source_amount,
            source_tx_hash,
            source_block_number,
            b"0x1::aptos_coin::AptosCoin",  // Movement uses AptosCoin
            target_amount,  // User receives this exact amount
            assigned_resolver,
            now,
            expiry_at,
            total_fee,
            resolver_fee,
            protocol_fee,
        );

        // Store intent
        table::add(&mut registry.intents, intent_id, intent);
        table::add(&mut registry.used_tx_hashes, source_tx_hash, true);
        
        // Track user intents
        if (!table::contains(&registry.user_intents, requester_addr)) {
            table::add(&mut registry.user_intents, requester_addr, vector::empty());
        };
        let user_intent_list = table::borrow_mut(&mut registry.user_intents, requester_addr);
        vector::push_back(user_intent_list, intent_id);

        registry.next_intent_id = intent_id + 1;

        // Emit event
        events::emit_intent_created(
            intent_id,
            requester_addr,
            source_chain_id,
            source_token,
            source_amount,
            source_tx_hash,
            target_amount,
            assigned_resolver,
            expiry_at,
            now
        );
    }

    /// Fulfill an intent (called by resolver after verifying source payment)
    public entry fun fulfill_intent<CoinType>(
        resolver: &signer,
        registry_addr: address,
        intent_id: u64,
    ) acquires IntentRegistry {
        let resolver_addr = signer::address_of(resolver);
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(!registry.paused, EPAUSED);
        assert!(table::contains(&registry.intents, intent_id), EINTENT_NOT_FOUND);

        let intent = table::borrow_mut(&mut registry.intents, intent_id);
        
        // Validations
        assert!(intent_types::is_pending(intent), EINTENT_ALREADY_FULFILLED);
        assert!(
            intent_types::get_assigned_resolver(intent) == resolver_addr,
            EUNAUTHORIZED
        );
        
        let now = timestamp::now_seconds();
        assert!(now <= intent_types::get_expiry(intent), EINTENT_EXPIRED);

        // Verify resolver is authorized
        assert!(
            resolver_manager::is_authorized_resolver(registry.resolver_registry, resolver_addr),
            EINVALID_RESOLVER
        );

        // Get intent details
        let requester = intent_types::get_requester(intent);
        let target_amount = intent_types::get_target_amount(intent);
        let total_fee = intent_types::get_fee_amount(intent);
        let resolver_fee = intent_types::get_resolver_fee(intent);
        let protocol_fee = intent_types::get_protocol_fee(intent);

        // Fulfill from liquidity pool
        liquidity_pool::fulfill_from_pool<CoinType>(
            registry.pool_address,
            requester,
            target_amount,
            total_fee
        );

        // Update intent status
        intent_types::set_intent_fulfilled(intent, resolver_addr, now);

        // Update resolver stats and add fees
        resolver_manager::update_resolver_performance(
            registry.resolver_registry,
            resolver_addr,
            true,
            target_amount
        );
        resolver_manager::add_resolver_fees(
            registry.resolver_registry,
            resolver_addr,
            resolver_fee
        );

        // Emit event
        events::emit_intent_fulfilled(
            intent_id,
            requester,
            resolver_addr,
            target_amount,
            resolver_fee,
            protocol_fee,
            now
        );
    }

    /// Cancel an intent (by user or admin before fulfillment)
    public entry fun cancel_intent(
        caller: &signer,
        registry_addr: address,
        intent_id: u64,
        reason: vector<u8>,
    ) acquires IntentRegistry {
        let caller_addr = signer::address_of(caller);
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(table::contains(&registry.intents, intent_id), EINTENT_NOT_FOUND);

        let intent = table::borrow_mut(&mut registry.intents, intent_id);
        
        // Check authorization (user or admin)
        let requester = intent_types::get_requester(intent);
        assert!(
            caller_addr == requester || caller_addr == registry.admin,
            EUNAUTHORIZED
        );
        
        assert!(intent_types::is_pending(intent), EINTENT_ALREADY_FULFILLED);

        // Update status
        intent_types::set_intent_cancelled(intent);

        let now = timestamp::now_seconds();
        events::emit_intent_cancelled(
            intent_id,
            requester,
            caller_addr,
            now,
            reason
        );
    }

    /// Mark expired intents (can be called by anyone)
    public entry fun mark_expired(
        registry_addr: address,
        intent_id: u64,
    ) acquires IntentRegistry {
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(table::contains(&registry.intents, intent_id), EINTENT_NOT_FOUND);

        let intent = table::borrow_mut(&mut registry.intents, intent_id);
        assert!(intent_types::is_pending(intent), EINTENT_ALREADY_FULFILLED);

        let now = timestamp::now_seconds();
        let expiry = intent_types::get_expiry(intent);
        assert!(now > expiry, EUNAUTHORIZED);

        // Update status
        intent_types::set_intent_expired(intent);

        let requester = intent_types::get_requester(intent);
        events::emit_intent_expired(intent_id, requester, now);
    }

    /// Calculate fees for an intent
    fun calculate_fees(
        amount: u64,
        config: &FeeConfig
    ): (u64, u64, u64) {
        let base_fee_bps = intent_types::get_base_fee_bps(config);
        let resolver_fee_bps = intent_types::get_resolver_fee_bps(config);
        let min_fee = intent_types::get_min_fee(config);
        let max_fee = intent_types::get_max_fee(config);

        let total_fee = (amount * base_fee_bps) / 10000;
        
        // Apply min/max caps
        if (total_fee < min_fee) {
            total_fee = min_fee;
        };
        if (total_fee > max_fee) {
            total_fee = max_fee;
        };

        let resolver_fee = (total_fee * resolver_fee_bps) / 10000;
        let protocol_fee = total_fee - resolver_fee;
        let net_amount = amount - total_fee;

        (net_amount, resolver_fee, protocol_fee)
    }

    /// Update fee configuration (admin only)
    public entry fun update_fee_config(
        admin: &signer,
        registry_addr: address,
        base_fee_bps: u64,
        resolver_fee_bps: u64,
        protocol_fee_bps: u64,
        min_fee: u64,
        max_fee: u64,
    ) acquires IntentRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, EUNAUTHORIZED);

        registry.fee_config = intent_types::new_fee_config(
            base_fee_bps,
            resolver_fee_bps,
            protocol_fee_bps,
            min_fee,
            max_fee,
        );
    }

    /// Pause protocol (admin only)
    public entry fun pause(admin: &signer, registry_addr: address) acquires IntentRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, EUNAUTHORIZED);

        registry.paused = true;
        events::emit_emergency_pause(
            admin_addr,
            timestamp::now_seconds(),
            b"Protocol paused"
        );
    }

    /// Unpause protocol (admin only)
    public entry fun unpause(admin: &signer, registry_addr: address) acquires IntentRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(exists<IntentRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<IntentRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, EUNAUTHORIZED);

        registry.paused = false;
        events::emit_emergency_unpause(admin_addr, timestamp::now_seconds());
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_intent(registry_addr: address, intent_id: u64): Intent acquires IntentRegistry {
        let registry = borrow_global<IntentRegistry>(registry_addr);
        assert!(table::contains(&registry.intents, intent_id), EINTENT_NOT_FOUND);
        *table::borrow(&registry.intents, intent_id)
    }

    #[view]
    public fun get_user_intents(
        registry_addr: address,
        user: address
    ): vector<u64> acquires IntentRegistry {
        let registry = borrow_global<IntentRegistry>(registry_addr);
        if (table::contains(&registry.user_intents, user)) {
            *table::borrow(&registry.user_intents, user)
        } else {
            vector::empty()
        }
    }

    #[view]
    public fun get_next_intent_id(registry_addr: address): u64 acquires IntentRegistry {
        let registry = borrow_global<IntentRegistry>(registry_addr);
        registry.next_intent_id
    }

    #[view]
    public fun is_paused(registry_addr: address): bool acquires IntentRegistry {
        let registry = borrow_global<IntentRegistry>(registry_addr);
        registry.paused
    }

    #[view]
    public fun is_chain_supported(registry_addr: address, chain_id: u64): bool acquires IntentRegistry {
        let registry = borrow_global<IntentRegistry>(registry_addr);
        table::contains(&registry.supported_chains, chain_id)
    }
}