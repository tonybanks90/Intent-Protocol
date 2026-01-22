# Limit Orders

Intent Protocol supports non-custodial Limit Orders, allowing users to specify the exact price at which they wish to buy or sell assets. Unlike traditional order books where users deposit funds into a contract, Intent Protocol Limit Orders utilize the same signature-based intent architecture as swaps.

## How it Works

1.  **Creation**: The user specifies a `Buy Amount` and a `Sell Amount`, effectively defining a fixed exchange rate.
2.  **Signing**: The user signs an intent with these parameters. The intent includes an `expiration` time (default 1 hour, up to 7 days).
3.  **Storage**: The signed intent is stored in the Relayer's off-chain Order Book. Funds remain in the user's wallet (or the non-custodial escrow balance).
4.  **Monitoring**: Relayers monitor market prices via oracles (Pyth) and DEXs.
5.  **Execution**: When the market price moves to match (or better) the user's limit price, a Relayer captures the order and executes it on-chain.
6.  **Settlement**: The execution is atomic. The user receives exactly the requested `Buy Amount` (or more), and the Relayer takes the input tokens.

## Key Features

*   **Non-Custodial**: Funds are not locked in a bespoke "Limit Order Contract" that can be hacked. They rely on the standard Intent verification.
*   **Gasless Creation**: Users sign a message to create an order. No gas required until execution (paid by Relayer).
*   **Partial Fills**: Currently, the protocol supports **Fill-or-Kill** (complete fills) for simplicity, with partial fills planned for V2.

## Comparison: Market vs Limit

| Feature | Market Order (Swap) | Limit Order |
| :--- | :--- | :--- |
| **Price** | Dynamic (Dutch Auction) | Fixed |
| **Execution** | Immediate (usually) | Conditional (when price matches) |
| **Slippage** | User defined tolerance | Exact price guaranteed |
| **Use Case** | Instant liquidity | Strategic entry/exit |
