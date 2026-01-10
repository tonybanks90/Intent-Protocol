/// Resolver network management - registration, assignment, and performance tracking
module intent_protocol::resolver_manager {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use intent_protocol::events;

    /// Error codes
    const ENOT_INITIALIZED: u64 = 1;
    const EALREADY_INITIALIZED: u64 = 2;
    const EUNAUTHORIZED: u64 = 3;
    const EALREADY_REGISTERED: u64 = 4;
    const ENOT_REGISTERED: u64 = 5;
    const EINSUFFICIENT_STAKE: u64 = 6;
    const ENO_ACTIVE_RESOLVERS: u64 = 7;
    const EPAUSED: u64 = 8;
    const EINSUFFICIENT_FEES: u64 = 9;

    /// Resolver information
    struct ResolverInfo has store {
        stake: u64,
        total_volume: u64,
        fulfilled_count: u64,
        failed_count: u64,
        accumulated_fees: u64,
        is_active: bool,
        registered_at: u64,
    }

    /// Main resolver registry
    struct ResolverRegistry has key {
        admin: address,
        resolvers: Table<address, ResolverInfo>,
        active_resolvers: vector<address>,
        next_index: u64,  // For round-robin assignment
        min_stake: u64,
        paused: bool,
        created_at: u64,
    }

    /// Initialize the resolver registry
    public entry fun initialize(
        admin: &signer,
        min_stake: u64,
        max_resolvers: u64,  // Not used but kept for interface compatibility
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<ResolverRegistry>(admin_addr), EALREADY_INITIALIZED);

        let registry = ResolverRegistry {
            admin: admin_addr,
            resolvers: table::new(),
            active_resolvers: vector::empty(),
            next_index: 0,
            min_stake,
            paused: false,
            created_at: timestamp::now_seconds(),
        };

        move_to(admin, registry);
    }

    /// Register as a resolver with stake
    public entry fun register_resolver<CoinType>(
        resolver: &signer,
        registry_addr: address,
        stake_amount: u64,
    ) acquires ResolverRegistry {
        let resolver_addr = signer::address_of(resolver);
        assert!(exists<ResolverRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<ResolverRegistry>(registry_addr);
        assert!(!registry.paused, EPAUSED);
        assert!(!table::contains(&registry.resolvers, resolver_addr), EALREADY_REGISTERED);
        assert!(stake_amount >= registry.min_stake, EINSUFFICIENT_STAKE);

        // Withdraw stake from resolver
        let stake = coin::withdraw<CoinType>(resolver, stake_amount);
        
        // For now, we'll just keep track of the stake amount
        // In production, you'd want to actually hold the coins in escrow
        coin::deposit(resolver_addr, stake);

        let now = timestamp::now_seconds();
        let resolver_info = ResolverInfo {
            stake: stake_amount,
            total_volume: 0,
            fulfilled_count: 0,
            failed_count: 0,
            accumulated_fees: 0,
            is_active: true,
            registered_at: now,
        };

        table::add(&mut registry.resolvers, resolver_addr, resolver_info);
        vector::push_back(&mut registry.active_resolvers, resolver_addr);

        events::emit_resolver_registered(resolver_addr, stake_amount, now);
    }

    /// Deregister as a resolver
    public entry fun deregister_resolver(
        resolver: &signer,
        registry_addr: address,
    ) acquires ResolverRegistry {
        let resolver_addr = signer::address_of(resolver);
        assert!(exists<ResolverRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<ResolverRegistry>(registry_addr);
        assert!(table::contains(&registry.resolvers, resolver_addr), ENOT_REGISTERED);

        let resolver_info = table::borrow_mut(&mut registry.resolvers, resolver_addr);
        assert!(resolver_info.is_active, ENOT_REGISTERED);

        // Mark as inactive
        resolver_info.is_active = false;

        // Remove from active list
        let (found, index) = vector::index_of(&registry.active_resolvers, &resolver_addr);
        if (found) {
            vector::remove(&mut registry.active_resolvers, index);
        };

        let stake_returned = resolver_info.stake;
        let now = timestamp::now_seconds();

        events::emit_resolver_deregistered(resolver_addr, stake_returned, now);
    }

    /// Get next resolver using round-robin assignment
    public fun get_next_resolver(registry_addr: address): address acquires ResolverRegistry {
        assert!(exists<ResolverRegistry>(registry_addr), ENOT_INITIALIZED);
        
        let registry = borrow_global_mut<ResolverRegistry>(registry_addr);
        let active_count = vector::length(&registry.active_resolvers);
        assert!(active_count > 0, ENO_ACTIVE_RESOLVERS);

        let index = registry.next_index % active_count;
        let resolver = *vector::borrow(&registry.active_resolvers, index);
        
        // Update for next assignment
        registry.next_index = registry.next_index + 1;
        
        resolver
    }

    /// Update resolver performance after fulfillment attempt
    public fun update_resolver_performance(
        registry_addr: address,
        resolver_addr: address,
        success: bool,
        volume: u64,
    ) acquires ResolverRegistry {
        assert!(exists<ResolverRegistry>(registry_addr), ENOT_INITIALIZED);
        
        let registry = borrow_global_mut<ResolverRegistry>(registry_addr);
        assert!(table::contains(&registry.resolvers, resolver_addr), ENOT_REGISTERED);

        let resolver_info = table::borrow_mut(&mut registry.resolvers, resolver_addr);
        
        if (success) {
            resolver_info.fulfilled_count = resolver_info.fulfilled_count + 1;
            resolver_info.total_volume = resolver_info.total_volume + volume;
        } else {
            resolver_info.failed_count = resolver_info.failed_count + 1;
        };
    }

    /// Add fees to resolver's accumulated balance
    public fun add_resolver_fees(
        registry_addr: address,
        resolver_addr: address,
        fee_amount: u64,
    ) acquires ResolverRegistry {
        assert!(exists<ResolverRegistry>(registry_addr), ENOT_INITIALIZED);
        
        let registry = borrow_global_mut<ResolverRegistry>(registry_addr);
        assert!(table::contains(&registry.resolvers, resolver_addr), ENOT_REGISTERED);

        let resolver_info = table::borrow_mut(&mut registry.resolvers, resolver_addr);
        resolver_info.accumulated_fees = resolver_info.accumulated_fees + fee_amount;
    }

    /// Claim accumulated fees
    public entry fun claim_resolver_fees<CoinType>(
        resolver: &signer,
        registry_addr: address,
    ) acquires ResolverRegistry {
        let resolver_addr = signer::address_of(resolver);
        assert!(exists<ResolverRegistry>(registry_addr), ENOT_INITIALIZED);
        
        let registry = borrow_global_mut<ResolverRegistry>(registry_addr);
        assert!(table::contains(&registry.resolvers, resolver_addr), ENOT_REGISTERED);

        let resolver_info = table::borrow_mut(&mut registry.resolvers, resolver_addr);
        let fees_to_claim = resolver_info.accumulated_fees;
        assert!(fees_to_claim > 0, EINSUFFICIENT_FEES);

        // Reset accumulated fees
        resolver_info.accumulated_fees = 0;

        // In production, transfer coins from fee pool
        // For now, this is a placeholder
    }

    /// Check if resolver is authorized
    public fun is_authorized_resolver(
        registry_addr: address,
        resolver_addr: address
    ): bool acquires ResolverRegistry {
        if (!exists<ResolverRegistry>(registry_addr)) {
            return false
        };
        
        let registry = borrow_global<ResolverRegistry>(registry_addr);
        if (!table::contains(&registry.resolvers, resolver_addr)) {
            return false
        };

        let resolver_info = table::borrow(&registry.resolvers, resolver_addr);
        resolver_info.is_active
    }

    /// Slash a resolver for misbehavior (admin only)
    public entry fun slash_resolver(
        admin: &signer,
        registry_addr: address,
        resolver_addr: address,
        slash_amount: u64,
        reason: vector<u8>,
    ) acquires ResolverRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(exists<ResolverRegistry>(registry_addr), ENOT_INITIALIZED);

        let registry = borrow_global_mut<ResolverRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, EUNAUTHORIZED);
        assert!(table::contains(&registry.resolvers, resolver_addr), ENOT_REGISTERED);

        let resolver_info = table::borrow_mut(&mut registry.resolvers, resolver_addr);
        
        // Reduce stake by slash amount
        if (slash_amount > resolver_info.stake) {
            resolver_info.stake = 0;
            resolver_info.is_active = false;
        } else {
            resolver_info.stake = resolver_info.stake - slash_amount;
        };

        let now = timestamp::now_seconds();
        events::emit_resolver_slashed(resolver_addr, slash_amount, reason, now);
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_resolver_count(registry_addr: address): u64 acquires ResolverRegistry {
        let registry = borrow_global<ResolverRegistry>(registry_addr);
        vector::length(&registry.active_resolvers)
    }

    #[view]
    public fun get_resolver_info(
        registry_addr: address,
        resolver_addr: address
    ): (u64, u64, u64, u64, bool) acquires ResolverRegistry {
        let registry = borrow_global<ResolverRegistry>(registry_addr);
        assert!(table::contains(&registry.resolvers, resolver_addr), ENOT_REGISTERED);
        
        let info = table::borrow(&registry.resolvers, resolver_addr);
        (info.stake, info.total_volume, info.fulfilled_count, info.failed_count, info.is_active)
    }

    #[view]
    public fun get_min_stake(registry_addr: address): u64 acquires ResolverRegistry {
        let registry = borrow_global<ResolverRegistry>(registry_addr);
        registry.min_stake
    }
}