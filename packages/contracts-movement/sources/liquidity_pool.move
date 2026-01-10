/// Liquidity pool for instant intent fulfillment
module intent_protocol::liquidity_pool {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use intent_protocol::events;

    /// Error codes
    const ENOT_INITIALIZED: u64 = 1;
    const EALREADY_INITIALIZED: u64 = 2;
    const EUNAUTHORIZED: u64 = 3;
    const EINSUFFICIENT_LIQUIDITY: u64 = 4;
    const EINSUFFICIENT_SHARES: u64 = 5;
    const EZERO_AMOUNT: u64 = 6;
    const EPAUSED: u64 = 7;
    const ENO_SHARES: u64 = 8;

    /// Liquidity pool for a specific coin type
    struct LiquidityPool<phantom CoinType> has key {
        admin: address,
        total_liquidity: Coin<CoinType>,
        total_shares: u64,
        lp_shares: Table<address, u64>,
        fees_collected: u64,
        paused: bool,
        created_at: u64,
    }

    /// Initialize a liquidity pool
    public entry fun initialize<CoinType>(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<LiquidityPool<CoinType>>(admin_addr), EALREADY_INITIALIZED);

        let pool = LiquidityPool<CoinType> {
            admin: admin_addr,
            total_liquidity: coin::zero<CoinType>(),
            total_shares: 0,
            lp_shares: table::new(),
            fees_collected: 0,
            paused: false,
            created_at: timestamp::now_seconds(),
        };

        move_to(admin, pool);
    }

    /// Deposit liquidity and receive shares
    public entry fun deposit<CoinType>(
        lp: &signer,
        pool_addr: address,
        amount: u64,
    ) acquires LiquidityPool {
        let lp_addr = signer::address_of(lp);
        assert!(exists<LiquidityPool<CoinType>>(pool_addr), ENOT_INITIALIZED);
        assert!(amount > 0, EZERO_AMOUNT);

        let pool = borrow_global_mut<LiquidityPool<CoinType>>(pool_addr);
        assert!(!pool.paused, EPAUSED);

        // Withdraw coins from LP
        let deposit = coin::withdraw<CoinType>(lp, amount);
        
        // Calculate shares
        let shares_to_mint = if (pool.total_shares == 0) {
            // First deposit: 1:1 ratio
            amount
        } else {
            // shares = (deposit_amount * total_shares) / total_liquidity
            let current_liquidity = coin::value(&pool.total_liquidity);
            (amount * pool.total_shares) / current_liquidity
        };

        // Merge deposit into pool
        coin::merge(&mut pool.total_liquidity, deposit);
        pool.total_shares = pool.total_shares + shares_to_mint;

        // Track LP shares
        if (!table::contains(&pool.lp_shares, lp_addr)) {
            table::add(&mut pool.lp_shares, lp_addr, 0);
        };
        let lp_balance = table::borrow_mut(&mut pool.lp_shares, lp_addr);
        *lp_balance = *lp_balance + shares_to_mint;

        let now = timestamp::now_seconds();
        events::emit_liquidity_deposited(lp_addr, amount, shares_to_mint, now);
    }

    /// Withdraw liquidity by burning shares
    public entry fun withdraw<CoinType>(
        lp: &signer,
        pool_addr: address,
        shares: u64,
    ) acquires LiquidityPool {
        let lp_addr = signer::address_of(lp);
        assert!(exists<LiquidityPool<CoinType>>(pool_addr), ENOT_INITIALIZED);
        assert!(shares > 0, EZERO_AMOUNT);

        let pool = borrow_global_mut<LiquidityPool<CoinType>>(pool_addr);
        assert!(!pool.paused, EPAUSED);
        assert!(table::contains(&pool.lp_shares, lp_addr), ENO_SHARES);

        let lp_balance = table::borrow_mut(&mut pool.lp_shares, lp_addr);
        assert!(*lp_balance >= shares, EINSUFFICIENT_SHARES);

        // Calculate withdrawal amount
        // amount = (shares * total_liquidity) / total_shares
        let current_liquidity = coin::value(&pool.total_liquidity);
        let amount_to_withdraw = (shares * current_liquidity) / pool.total_shares;

        assert!(current_liquidity >= amount_to_withdraw, EINSUFFICIENT_LIQUIDITY);

        // Burn shares
        *lp_balance = *lp_balance - shares;
        pool.total_shares = pool.total_shares - shares;

        // Transfer coins to LP
        let withdrawal = coin::extract(&mut pool.total_liquidity, amount_to_withdraw);
        coin::deposit(lp_addr, withdrawal);

        let now = timestamp::now_seconds();
        events::emit_liquidity_withdrawn(lp_addr, amount_to_withdraw, shares, now);
    }

    /// Fulfill intent from pool (called by intent registry)
    public fun fulfill_from_pool<CoinType>(
        pool_addr: address,
        recipient: address,
        amount: u64,
        fee: u64,
    ) acquires LiquidityPool {
        assert!(exists<LiquidityPool<CoinType>>(pool_addr), ENOT_INITIALIZED);

        let pool = borrow_global_mut<LiquidityPool<CoinType>>(pool_addr);
        assert!(!pool.paused, EPAUSED);

        let current_liquidity = coin::value(&pool.total_liquidity);
        assert!(current_liquidity >= amount, EINSUFFICIENT_LIQUIDITY);

        // Extract amount for recipient
        let payment = coin::extract(&mut pool.total_liquidity, amount);
        coin::deposit(recipient, payment);

        // Track fees (they stay in the pool, increasing LP value)
        pool.fees_collected = pool.fees_collected + fee;
    }

    /// Pause pool (admin only)
    public entry fun pause<CoinType>(
        admin: &signer,
        pool_addr: address
    ) acquires LiquidityPool {
        let admin_addr = signer::address_of(admin);
        assert!(exists<LiquidityPool<CoinType>>(pool_addr), ENOT_INITIALIZED);

        let pool = borrow_global_mut<LiquidityPool<CoinType>>(pool_addr);
        assert!(pool.admin == admin_addr, EUNAUTHORIZED);

        pool.paused = true;
    }

    /// Unpause pool (admin only)
    public entry fun unpause<CoinType>(
        admin: &signer,
        pool_addr: address
    ) acquires LiquidityPool {
        let admin_addr = signer::address_of(admin);
        assert!(exists<LiquidityPool<CoinType>>(pool_addr), ENOT_INITIALIZED);

        let pool = borrow_global_mut<LiquidityPool<CoinType>>(pool_addr);
        assert!(pool.admin == admin_addr, EUNAUTHORIZED);

        pool.paused = false;
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_total_liquidity<CoinType>(pool_addr: address): u64 acquires LiquidityPool {
        let pool = borrow_global<LiquidityPool<CoinType>>(pool_addr);
        coin::value(&pool.total_liquidity)
    }

    #[view]
    public fun get_total_shares<CoinType>(pool_addr: address): u64 acquires LiquidityPool {
        let pool = borrow_global<LiquidityPool<CoinType>>(pool_addr);
        pool.total_shares
    }

    #[view]
    public fun get_lp_shares<CoinType>(
        pool_addr: address,
        lp_addr: address
    ): u64 acquires LiquidityPool {
        let pool = borrow_global<LiquidityPool<CoinType>>(pool_addr);
        if (table::contains(&pool.lp_shares, lp_addr)) {
            *table::borrow(&pool.lp_shares, lp_addr)
        } else {
            0
        }
    }

    #[view]
    public fun get_fees_collected<CoinType>(pool_addr: address): u64 acquires LiquidityPool {
        let pool = borrow_global<LiquidityPool<CoinType>>(pool_addr);
        pool.fees_collected
    }

    #[view]
    public fun is_paused<CoinType>(pool_addr: address): bool acquires LiquidityPool {
        let pool = borrow_global<LiquidityPool<CoinType>>(pool_addr);
        pool.paused
    }
}