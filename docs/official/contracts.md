# Smart Contract Reference

The Movement Intent Swap protocol is implemented using a set of Move 2.0 smart contracts.

## Modules Overview

| Module | Address | Description |
| :--- | :--- | :--- |
| `intent_swap::types` | `0x...` | Defines core data structures (Intent, OrderFilled, etc.) |
| `intent_swap::swap` | `0x...` | Main entry point for filling orders and executing swaps. |
| `intent_swap::registry` | `0x...` | Manages global state, nonces, and order status. |
| `intent_swap::verifier` | `0x...` | Handles Ed25519 signature verification and intent hashing. |
| `intent_swap::escrow` | `0x...` | Manages user token deposits/withdrawals for trading. |
| `intent_swap::views` | `0x...` | Read-only functions for UI and indexers. |

## Core Data Structures

### `Intent`
The primary struct representing a user's trade request.

```move
struct Intent has copy, drop, store {
    maker: address,           // User initiating the swap
    nonce: u64,               // Unique ID to prevent replay
    sell_token: address,      // Token to sell
    buy_token: address,       // Token to buy
    sell_amount: u64,         // Amount of sell_token
    start_buy_amount: u64,    // Dutch auction start price
    end_buy_amount: u64,      // Dutch auction end price
    start_time: u64,          // Auction start timestamp
    end_time: u64,            // Auction end timestamp
}
```

### Events
*   `OrderFilled`: Emitted when an order is successfully executed.
*   `OrderCancelled`: Emitted when a user voids an order by incrementing their nonce.

## Main Functions

### `intent_swap::swap::fill_order`
```move
public entry fun fill_order<SellCoin, BuyCoin>(
    relayer: &signer,
    maker: address,
    nonce: u64,
    sell_amount: u64,
    start_buy_amount: u64,
    end_buy_amount: u64,
    start_time: u64,
    end_time: u64,
    buy_amount: u64,
    signature: vector<u8>,
)
```
**Description**: The core function called by relayers to execute a swap.
*   Validates the current time is within `[start_time, end_time]`.
*   Calculates the required `buy_amount` based on the Dutch Auction curve.
*   Verifies the `signature` against the reconstructed `Intent` hash.
*   Transfers `buy_amount` from the `relayer` to the `maker`.
*   Transfers `sell_amount` from the `maker` (via escrow) to the `relayer`.

### `intent_swap::swap::cancel_order`
```move
public entry fun cancel_order(maker: &signer)
```
**Description**: Invalidates all current open orders for a user by incrementing their on-chain nonce.

### `intent_swap::escrow::deposit`
```move
public entry fun deposit<CoinType>(user: &signer, amount: u64)
```
**Description**: Deposits tokens into the protocol escrow to be used for future swaps.

### `intent_swap::escrow::withdraw`
```move
public entry fun withdraw<CoinType>(user: &signer, amount: u64)
```
**Description**: Withdraws tokens from the protocol escrow back to the user's wallet.

## View Functions

*   `get_user_nonce(user: address): u64`: Returns the current nonce for a user.
*   `get_escrowed_balance<CoinType>(user: address): u64`: Checks user's deposited balance.
*   `is_order_filled(order_hash: vector<u8>): bool`: Checks if a specific order hash has already been executed.
*   `get_current_price(...)`: helper to calculate the current required buy amount for an ongoing auction.
