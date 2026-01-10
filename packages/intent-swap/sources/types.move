/// Intent Swap Types - Data structures for gasless token swaps with Dutch auction
/// 
/// This module defines the core types for the intent-based swap system:
/// - SwapIntent: User's off-chain signed swap request
/// - SwapOrder: On-chain order record
/// - AuctionConfig: Dutch auction parameters
module intent_swap::types {
    use std::option::{Self, Option};

    // ==================== Error Codes ====================
    
    const E_INVALID_STATUS_TRANSITION: u64 = 100;
    const E_ALREADY_FILLED: u64 = 101;
    const E_NOT_OPEN: u64 = 102;

    // ==================== Status Constants ====================
    
    const STATUS_OPEN: u8 = 0;
    const STATUS_FILLED: u8 = 1;
    const STATUS_EXPIRED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    // ==================== Structs ====================

    /// Intent signed by user off-chain
    /// This represents the user's swap request with Dutch auction parameters
    struct SwapIntent has store, drop, copy {
        /// Maker's address (user who wants to swap)
        maker: address,
        /// Unique nonce to prevent replay attacks
        nonce: u64,
        /// Token type to sell (as type info bytes)
        sell_token: vector<u8>,
        /// Token type to buy
        buy_token: vector<u8>,
        /// Amount of sell token
        sell_amount: u64,
        /// Dutch auction: maximum buy amount (at auction start)
        start_buy_amount: u64,
        /// Dutch auction: minimum buy amount (at auction end)
        end_buy_amount: u64,
        /// Unix timestamp when auction starts
        start_time: u64,
        /// Unix timestamp when auction ends
        end_time: u64,
    }

    /// On-chain order record tracking an intent's state
    struct SwapOrder has store, drop, copy {
        /// Hash of the intent (unique identifier)
        order_hash: vector<u8>,
        /// The original intent
        intent: SwapIntent,
        /// Current status
        status: u8,
        /// Resolver who filled (if filled)
        filled_by: Option<address>,
        /// Actual buy amount paid (if filled)
        fill_amount: Option<u64>,
        /// Timestamp when filled
        filled_at: Option<u64>,
        /// Timestamp when order was created on-chain
        created_at: u64,
    }

    /// Dutch auction configuration
    struct AuctionConfig has store, drop, copy {
        /// Default auction duration in seconds
        default_duration: u64,
        /// Minimum allowed duration
        min_duration: u64,
        /// Maximum allowed duration
        max_duration: u64,
        /// Minimum price drop percentage (basis points, e.g., 50 = 0.5%)
        min_price_drop_bps: u64,
        /// Maximum price drop percentage (basis points, e.g., 500 = 5%)
        max_price_drop_bps: u64,
    }

    // ==================== Intent Creation ====================

    /// Create a new swap intent
    public fun new_intent(
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
    ): SwapIntent {
        SwapIntent {
            maker,
            nonce,
            sell_token,
            buy_token,
            sell_amount,
            start_buy_amount,
            end_buy_amount,
            start_time,
            end_time,
        }
    }

    /// Create a new swap order from an intent
    public fun new_order(
        order_hash: vector<u8>,
        intent: SwapIntent,
        created_at: u64,
    ): SwapOrder {
        SwapOrder {
            order_hash,
            intent,
            status: STATUS_OPEN,
            filled_by: option::none(),
            fill_amount: option::none(),
            filled_at: option::none(),
            created_at,
        }
    }

    /// Create default auction config
    public fun default_auction_config(): AuctionConfig {
        AuctionConfig {
            default_duration: 300,        // 5 minutes
            min_duration: 60,             // 1 minute
            max_duration: 3600,           // 1 hour
            min_price_drop_bps: 10,       // 0.1%
            max_price_drop_bps: 1000,     // 10%
        }
    }

    /// Create custom auction config
    public fun new_auction_config(
        default_duration: u64,
        min_duration: u64,
        max_duration: u64,
        min_price_drop_bps: u64,
        max_price_drop_bps: u64,
    ): AuctionConfig {
        AuctionConfig {
            default_duration,
            min_duration,
            max_duration,
            min_price_drop_bps,
            max_price_drop_bps,
        }
    }

    // ==================== Status Constants Accessors ====================

    public fun status_open(): u8 { STATUS_OPEN }
    public fun status_filled(): u8 { STATUS_FILLED }
    public fun status_expired(): u8 { STATUS_EXPIRED }
    public fun status_cancelled(): u8 { STATUS_CANCELLED }

    // ==================== Order Status Queries ====================

    public fun is_open(order: &SwapOrder): bool {
        order.status == STATUS_OPEN
    }

    public fun is_filled(order: &SwapOrder): bool {
        order.status == STATUS_FILLED
    }

    public fun is_expired_status(order: &SwapOrder): bool {
        order.status == STATUS_EXPIRED
    }

    public fun is_cancelled(order: &SwapOrder): bool {
        order.status == STATUS_CANCELLED
    }

    // ==================== Status Transitions ====================

    /// Mark order as filled
    public fun set_order_filled(
        order: &mut SwapOrder,
        resolver: address,
        fill_amount: u64,
        timestamp: u64,
    ) {
        assert!(order.status == STATUS_OPEN, E_NOT_OPEN);
        order.status = STATUS_FILLED;
        order.filled_by = option::some(resolver);
        order.fill_amount = option::some(fill_amount);
        order.filled_at = option::some(timestamp);
    }

    /// Mark order as expired
    public fun set_order_expired(order: &mut SwapOrder) {
        assert!(order.status == STATUS_OPEN, E_NOT_OPEN);
        order.status = STATUS_EXPIRED;
    }

    /// Mark order as cancelled
    public fun set_order_cancelled(order: &mut SwapOrder) {
        assert!(order.status == STATUS_OPEN, E_NOT_OPEN);
        order.status = STATUS_CANCELLED;
    }

    // ==================== Intent Getters ====================

    public fun get_maker(intent: &SwapIntent): address { intent.maker }
    public fun get_nonce(intent: &SwapIntent): u64 { intent.nonce }
    public fun get_sell_token(intent: &SwapIntent): vector<u8> { intent.sell_token }
    public fun get_buy_token(intent: &SwapIntent): vector<u8> { intent.buy_token }
    public fun get_sell_amount(intent: &SwapIntent): u64 { intent.sell_amount }
    public fun get_start_buy_amount(intent: &SwapIntent): u64 { intent.start_buy_amount }
    public fun get_end_buy_amount(intent: &SwapIntent): u64 { intent.end_buy_amount }
    public fun get_start_time(intent: &SwapIntent): u64 { intent.start_time }
    public fun get_end_time(intent: &SwapIntent): u64 { intent.end_time }

    // ==================== Order Getters ====================

    public fun get_order_hash(order: &SwapOrder): vector<u8> { order.order_hash }
    public fun get_order_intent(order: &SwapOrder): SwapIntent { order.intent }
    public fun get_order_status(order: &SwapOrder): u8 { order.status }
    public fun get_order_created_at(order: &SwapOrder): u64 { order.created_at }
    
    public fun get_filled_by(order: &SwapOrder): Option<address> { order.filled_by }
    public fun get_fill_amount(order: &SwapOrder): Option<u64> { order.fill_amount }
    public fun get_filled_at(order: &SwapOrder): Option<u64> { order.filled_at }

    // ==================== Auction Config Getters ====================

    public fun get_default_duration(config: &AuctionConfig): u64 { config.default_duration }
    public fun get_min_duration(config: &AuctionConfig): u64 { config.min_duration }
    public fun get_max_duration(config: &AuctionConfig): u64 { config.max_duration }
    public fun get_min_price_drop_bps(config: &AuctionConfig): u64 { config.min_price_drop_bps }
    public fun get_max_price_drop_bps(config: &AuctionConfig): u64 { config.max_price_drop_bps }

    // ==================== Utility Functions ====================

    /// Check if intent timing is valid
    public fun is_intent_active(intent: &SwapIntent, current_time: u64): bool {
        current_time >= intent.start_time && current_time <= intent.end_time
    }

    /// Check if intent has started
    public fun has_started(intent: &SwapIntent, current_time: u64): bool {
        current_time >= intent.start_time
    }

    /// Check if intent has expired
    public fun has_expired(intent: &SwapIntent, current_time: u64): bool {
        current_time > intent.end_time
    }

    /// Get remaining time until expiry
    public fun remaining_time(intent: &SwapIntent, current_time: u64): u64 {
        if (current_time >= intent.end_time) {
            0
        } else {
            intent.end_time - current_time
        }
    }

    /// Get auction duration
    public fun get_duration(intent: &SwapIntent): u64 {
        intent.end_time - intent.start_time
    }

    /// Validate intent parameters are sound
    public fun validate_intent(intent: &SwapIntent): bool {
        // Check amounts are positive
        intent.sell_amount > 0 &&
        intent.start_buy_amount > 0 &&
        intent.end_buy_amount > 0 &&
        // Check Dutch auction bounds (start >= end)
        intent.start_buy_amount >= intent.end_buy_amount &&
        // Check timing (start < end)
        intent.start_time < intent.end_time
    }
}
