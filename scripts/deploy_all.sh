#!/bin/bash
set -e

echo "📦 Starting Full Protocol Deployment..."
echo "======================================="

# 1. Deploy Movement Side
./scripts/deploy_movement.sh

echo "---------------------------------------"

# 2. Deploy EVM Side
./scripts/deploy_evm.sh

echo "======================================="
echo "✅ Full Protocol Deployment Complete!"
