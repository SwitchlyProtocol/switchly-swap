#!/bin/bash

# Nuclear option: Set environment variables and build
export VITE_ETHEREUM_RPC_URL="http://64.23.228.195:8545"
export VITE_SWITCHLY_API_BASE_URL="http://64.23.228.195:1317"
export VITE_SWITCHLY_MIDGARD_BASE_URL="http://64.23.228.195:8080"
export VITE_STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
export VITE_STELLAR_SOROBAN_URL="https://soroban-testnet.stellar.org"
export VITE_SWITCHLY_SERVICE_WS="ws://64.23.228.195:8080"

echo "Building with hardcoded environment variables..."
npm run build
