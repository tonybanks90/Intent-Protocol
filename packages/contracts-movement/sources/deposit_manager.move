/// Protocol treasury and fee management
module intent_protocol::deposit_manager {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;

    /// Error codes
    const ENOT_INITIALIZED: u64 = 1;
    const EALREADY_INITIALIZED: u64 = 2;
    const EUNAUTHORIZED: u64 = 3;
    const EINSUFFICIENT_BALANCE: u64 = 4;
    const EZERO_AMOUNT: u64 = 5;

    /// Protocol treasury for collecting fees
    struct Treasury<phantom CoinType> has key {
        admin: address,
        balance: Coin<CoinType>,
        total_collected: u64,
        created_at: u64,
    }

    /// Initialize the treasury
    public entry fun initialize<CoinType>(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<Treasury<CoinType>>(admin_addr), EALREADY_INITIALIZED);

        let treasury = Treasury<CoinType> {
            admin: admin_addr,
            balance: coin::zero<CoinType>(),
            total_collected: 0,
            created_at: timestamp::now_seconds(),
        };

        move_to(admin, treasury);
    }

    /// Deposit fees into treasury
    public fun deposit_fees<CoinType>(
        treasury_addr: address,
        fees: Coin<CoinType>,
    ) acquires Treasury {
        assert!(exists<Treasury<CoinType>>(treasury_addr), ENOT_INITIALIZED);

        let treasury = borrow_global_mut<Treasury<CoinType>>(treasury_addr);
        let amount = coin::value(&fees);
        
        treasury.total_collected = treasury.total_collected + amount;
        coin::merge(&mut treasury.balance, fees);
    }

    /// Withdraw from treasury (admin only)
    public entry fun withdraw<CoinType>(
        admin: &signer,
        treasury_addr: address,
        amount: u64,
    ) acquires Treasury {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Treasury<CoinType>>(treasury_addr), ENOT_INITIALIZED);
        assert!(amount > 0, EZERO_AMOUNT);

        let treasury = borrow_global_mut<Treasury<CoinType>>(treasury_addr);
        assert!(treasury.admin == admin_addr, EUNAUTHORIZED);

        let current_balance = coin::value(&treasury.balance);
        assert!(current_balance >= amount, EINSUFFICIENT_BALANCE);

        let withdrawal = coin::extract(&mut treasury.balance, amount);
        coin::deposit(admin_addr, withdrawal);
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_balance<CoinType>(treasury_addr: address): u64 acquires Treasury {
        let treasury = borrow_global<Treasury<CoinType>>(treasury_addr);
        coin::value(&treasury.balance)
    }

    #[view]
    public fun get_total_collected<CoinType>(treasury_addr: address): u64 acquires Treasury {
        let treasury = borrow_global<Treasury<CoinType>>(treasury_addr);
        treasury.total_collected
    }
}