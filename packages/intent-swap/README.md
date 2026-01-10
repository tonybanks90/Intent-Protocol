# Intent Swap Contracts

Move smart contracts for gasless intent-based token swaps on Movement Network.

## Features

- **Gasless Swaps**: Users sign off-chain, resolvers pay gas
- **Dutch Auction**: Price decreases over time for fair price discovery
- **Escrow**: Secure token holding for atomic swaps
- **Signature Verification**: Ed25519 signature validation

## Modules

| Module | Description |
|--------|-------------|
| `types` | Core type definitions (SwapIntent, SwapOrder) |
| `escrow` | User token escrow for gasless swaps |
| `dutch_auction` | Price calculation for Dutch auctions |
| `verifier` | Intent hash and signature verification |
| `swap` | Main swap execution logic |
| `events` | Event definitions |

## Build

```bash
# Compile
movement move compile --move-2

# Test
movement move test --move-2

# Deploy to testnet
movement move publish --move-2 --named-addresses intent_swap=default
```

## Network

- **Testnet**: Bardock (`https://aptos.testnet.bardock.movementnetwork.xyz/v1`)
- **Mainnet**: Movement (`https://mainnet.movementnetwork.xyz/v1`)
