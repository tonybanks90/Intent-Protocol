#!/bin/bash
set -e

# Load environment variables if present
if [ -f "packages/contracts-evm/.env" ]; then
    source packages/contracts-evm/.env
fi

echo "🚀 Deploying EVM Contracts..."

if [ -z "$ETH_RPC_URL" ]; then
    echo "⚠️  ETH_RPC_URL not set. Please set it in packages/contracts-evm/.env"
    exit 1
fi

cd packages/contracts-evm

# Run Foundry Deployment
forge script script/Deploy.s.sol:DeployScript --rpc-url $ETH_RPC_URL --broadcast --verify

echo "✅ EVM Contracts Deployed Successfully"
