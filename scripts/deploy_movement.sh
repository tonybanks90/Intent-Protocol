#!/bin/bash
set -e

echo "🚀 Deploying Movement Contracts..."

cd packages/contracts-movement

# Ensure internal scripts are executable
chmod +x scripts/*.sh

# Run the package-level deployment script
./scripts/deploy.sh

# Run initialization
./scripts/init_protocol.sh

echo "✅ Movement Contracts Deployed & Initialized"
