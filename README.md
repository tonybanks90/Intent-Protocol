# Intent Protocol - Frontend

Web application for interacting with Intent Protocol.

## Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── Bridge/
│   │   ├── Wallet/
│   │   └── common/
│   ├── hooks/            # Custom React hooks
│   │   ├── useIntent.ts
│   │   ├── useWallet.ts
│   │   └── useChain.ts
│   ├── pages/            # Page components
│   │   ├── Home.tsx
│   │   ├── Bridge.tsx
│   │   ├── LP.tsx
│   │   └── Resolver.tsx
│   ├── lib/              # Utilities
│   │   ├── contracts.ts
│   │   └── chains.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Tech Stack

- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **Wallet**: RainbowKit / Petra
- **State**: Zustand / TanStack Query
- **Move SDK**: @aptos-labs/ts-sdk

## Status

🚧 **Planned** - UI development starting soon
