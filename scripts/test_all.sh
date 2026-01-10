#!/bin/bash
set -e

echo "🧪 Running All Tests..."
echo "======================================="

# 1. Test EVM Contracts
echo "🔹 Testing EVM Contracts (Foundry)..."
cd packages/contracts-evm
forge test
cd ../..

echo "---------------------------------------"

# 2. Test Movement Contracts
echo "🔹 Testing Movement Contracts (Aptos Move)..."
cd packages/contracts-movement
movement move test --named-addresses intent_protocol=default
cd ../..

# 3. Test Relayer (Build Check)
echo "---------------------------------------"
echo "🔹 Verifying Relayer Build..."
cd packages/relayer
npm run build
cd ../..

echo "======================================="
echo "✅ All Tests Passed!"
