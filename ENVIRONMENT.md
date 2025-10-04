# Environment Configuration

This document describes all environment variables used in the Switchly Swap application.

## Core Switchly Network Configuration

These variables define the core Switchly network services:

```bash
# Primary Switchly host (IP or domain)
VITE_SWITCHLY_HOST=64.23.228.195

# Switchly API port (validator node)
VITE_SWITCHLY_API_PORT=1317

# Switchly Midgard port (indexer/API)
VITE_SWITCHLY_MIDGARD_PORT=8080
```

## Ethereum Configuration

```bash
# Ethereum RPC URL (your private network)
VITE_ETHEREUM_RPC_URL=http://64.23.228.195:8545

# Ethereum chain ID (hex format)
VITE_ETHEREUM_CHAIN_ID=0x539

# Note: Block explorer URL is automatically derived from VITE_SWITCHLY_HOST
```

## Stellar Configuration

```bash
# Stellar Horizon API (testnet)
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Stellar Soroban RPC (testnet)
VITE_STELLAR_SOROBAN_URL=https://soroban-testnet.stellar.org
```

## API Base URLs

These are automatically configured based on environment:

```bash
# Development: uses direct URLs
# Production: uses proxy paths to avoid CORS
VITE_SWITCHLY_API_BASE_URL=/api/switchly
VITE_SWITCHLY_MIDGARD_BASE_URL=/api/midgard
```

## WebSocket Configuration

```bash
# WebSocket URL for real-time updates
VITE_SWITCHLY_SERVICE_WS=ws://64.23.228.195:8080
```

## Development Server

```bash
# Development server port
VITE_DEV_SERVER_PORT=8080
```

## Usage

### Local Development

Create a `.env` file in the project root with your configuration:

```bash
# Copy from .env.example and modify as needed
cp .env.example .env
```

### Production Deployment

Environment variables are configured in:
- **DigitalOcean**: `.do/app.yaml`
- **Docker**: Pass via `-e` flags or docker-compose
- **Other platforms**: Configure in platform settings

## Benefits of Environment Variables

1. **Flexibility**: Easy to change service endpoints without code changes
2. **Security**: Sensitive URLs not hardcoded in source
3. **Multi-environment**: Different configs for dev/staging/prod
4. **Maintainability**: Centralized configuration management
5. **Deployment**: Easy to deploy to different networks/providers

## Fallback Values

All environment variables have sensible fallbacks to the current Switchly network configuration, so the app will work even if some variables are not set.
