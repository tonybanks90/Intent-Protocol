# Intent Protocol

Cross-chain intent protocol for instant bridging to Movement Network.

## 🏗️ Project Structure

```
intent-protocol/
├── packages/
│   ├── contracts-movement/   # Move contracts (✅ Complete)
│   ├── contracts-evm/        # Solidity contracts (🚧 Planned)
│   ├── contracts-solana/     # Anchor programs (🚧 Planned)
│   ├── relayer/              # Off-chain relay service (🚧 Planned)
│   └── frontend/             # Web application (🚧 Planned)
│
├── docs/
│   ├── architecture/         # Technical documentation
│   └── guides/               # User guides
│
└── scripts/                  # Root-level scripts
```

## 🚀 Quick Start

### Movement Contracts

```bash
cd packages/contracts-movement

# Build
movement move compile

# Test
movement move test

# Deploy
./scripts/deploy.sh
./scripts/init_protocol.sh
```

## 📦 Packages

| Package | Description | Status |
|---------|-------------|--------|
| `contracts-movement` | Core Move contracts | ✅ Complete |
| `contracts-evm` | Ethereum/BSC/Polygon lock contracts | 🚧 Planned |
| `contracts-solana` | Solana anchor programs | 🚧 Planned |
| `relayer` | Off-chain relay service | 🚧 Planned |
| `frontend` | Web application | 🚧 Planned |

## 📚 Documentation

- [Cross-Chain Architecture](docs/architecture/CROSS_CHAIN_ARCHITECTURE.md)
- [User Flows](docs/guides/USER_FLOWS.md)
- [Project Flow](docs/guides/projectflow.md)

## 🧪 Test Results

- **Movement Contracts**: 10/10 tests passing ✅
- See [Test Results](docs/E2E_TEST_RESULTS_2.md)

## 📄 License

MIT
