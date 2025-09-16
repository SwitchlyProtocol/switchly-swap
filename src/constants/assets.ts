import { Asset, ChainId } from '../types';

// Switchly Network Configuration - Use proxy endpoints to avoid CORS issues
// Force proxy usage in production to avoid mixed content and CORS issues
const isProduction = window.location.protocol === 'https:';
export const SWITCHLY_API_BASE_URL = isProduction ? '/api/switchly' : (import.meta.env.VITE_SWITCHLY_API_BASE_URL || '/api/switchly');
export const SWITCHLY_MIDGARD_BASE_URL = isProduction ? '/api/midgard' : (import.meta.env.VITE_SWITCHLY_MIDGARD_BASE_URL || '/api/midgard');

// RPC Endpoints
export const ETHEREUM_RPC_URL = import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/demo';
export const ETHEREUM_WSS_URL = import.meta.env.VITE_ETHEREUM_WSS_URL;

// Stellar Network Configuration  
export const STELLAR_HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
export const STELLAR_SOROBAN_URL = import.meta.env.VITE_STELLAR_SOROBAN_URL || 'https://soroban-testnet.stellar.org';

// Network Configuration
export const ETHEREUM_CHAIN_ID = '0xaa36a7'; // Sepolia testnet
export const STELLAR_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Router Contract Addresses (dynamically fetched from API)
// These are fallback values - actual values should be fetched from /switchly/inbound_addresses
export const ETHEREUM_ROUTER_FALLBACK = '0xa8D1Ff3bfA490cf7890D0D2C0A2f5815744A279F';
export const STELLAR_ROUTER_FALLBACK = 'CC7XNCYBCI2UVAE2A5TUBALEXMZXTYHLMKYOA6FSXVRT42YLR76NQR7R';

// Vault Addresses (dynamically fetched from API)
// These are fallback values - actual values should be fetched from /switchly/inbound_addresses
export const ETHEREUM_VAULT_FALLBACK = '0xd58610f89265a2fb637ac40edf59141ff873b266';
export const STELLAR_VAULT_FALLBACK = 'GAKJPRDGMOXTUFAJPGKXBAQ2BHYGQ6UQ7MW6LWOZUYEVK7D4YR4OIGT4';

// Token Contract Addresses
export const ETHEREUM_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'; // Native ETH (zero address)

// Ethereum USDC Contract Addresses
export const ETHEREUM_USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // Mainnet USDC
export const ETHEREUM_USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC

// Use Sepolia for testnet
export const ETHEREUM_USDC_ADDRESS = ETHEREUM_USDC_SEPOLIA;

// Stellar Asset Contract Addresses (SEP-41 Tokens)
export const STELLAR_XLM_CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // XLM SEP-41 Token on Testnet
export const STELLAR_USDC_CONTRACT = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'; // USDC SEP-41 Token on Testnet

// Stellar Asset Issuer (for non-contract assets)
export const STELLAR_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'; // USDC Issuer

// Network Types
export type NetworkType = 'mainnet' | 'testnet';
export type EthereumNetwork = 'mainnet' | 'sepolia';
export type StellarNetwork = 'mainnet' | 'testnet';

// Current Network Configuration
export const CURRENT_ETHEREUM_NETWORK: EthereumNetwork = 'sepolia';
export const CURRENT_STELLAR_NETWORK: StellarNetwork = 'testnet';

// Ethereum Asset Mappings
export const ETHEREUM_ASSET_MAPPINGS = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
    addresses: {
      mainnet: ETHEREUM_ETH_ADDRESS,
      sepolia: ETHEREUM_ETH_ADDRESS, // Zero address for native ETH
    },
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
    addresses: {
      mainnet: ETHEREUM_USDC_MAINNET,
      sepolia: ETHEREUM_USDC_SEPOLIA,
    },
  },
} as const;

// Stellar Asset Mappings (matching backend configuration)
export const STELLAR_ASSET_MAPPINGS = {
  XLM: {
    assetType: 'native' as const,
    assetCode: 'XLM',
    assetIssuer: '',
    decimals: 7,
    isNative: true,
    contractAddresses: {
      mainnet: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA', // XLM SEP-41 on mainnet
      testnet: STELLAR_XLM_CONTRACT, // XLM SEP-41 on testnet
    },
  },
  USDC: {
    assetType: 'contract' as const,
    assetCode: 'USDC',
    assetIssuer: STELLAR_USDC_ISSUER,
    decimals: 7,
    isNative: false,
    contractAddresses: {
      mainnet: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75', // USDC SEP-41 on mainnet
      testnet: STELLAR_USDC_CONTRACT, // USDC SEP-41 on testnet
    },
  },
} as const;

// Cross-Chain Asset Mappings
export const CROSS_CHAIN_ASSET_MAPPINGS = {
  // ETH equivalents
  ETH: {
    ethereum: 'ETH.ETH',
    stellar: 'XLM.XLM', // Cross-chain equivalent
  },
  // USDC equivalents (same asset on both chains)
  USDC: {
    ethereum: 'USDC.ETH',
    stellar: 'USDC.XLM',
  },
  // XLM equivalents
  XLM: {
    stellar: 'XLM.XLM',
    ethereum: 'ETH.ETH', // Cross-chain equivalent
  },
} as const;

// Helper function to get current network addresses
export const getCurrentEthereumAddress = (symbol: keyof typeof ETHEREUM_ASSET_MAPPINGS): string => {
  return ETHEREUM_ASSET_MAPPINGS[symbol].addresses[CURRENT_ETHEREUM_NETWORK];
};

export const getCurrentStellarAddress = (symbol: keyof typeof STELLAR_ASSET_MAPPINGS): string => {
  return STELLAR_ASSET_MAPPINGS[symbol].contractAddresses[CURRENT_STELLAR_NETWORK];
};

// Supported Assets (using current network configurations)
export const SUPPORTED_ASSETS: Record<string, Asset> = {
  'ETH.ETH': {
    chain: 'ETH',
    symbol: 'ETH',
    ticker: 'ETH.ETH',
    address: getCurrentEthereumAddress('ETH'),
    decimals: ETHEREUM_ASSET_MAPPINGS.ETH.decimals,
    isNative: ETHEREUM_ASSET_MAPPINGS.ETH.isNative,
  },
  'USDC.ETH': {
    chain: 'ETH',
    symbol: 'USDC',
    ticker: 'USDC.ETH',
    address: getCurrentEthereumAddress('USDC'),
    decimals: ETHEREUM_ASSET_MAPPINGS.USDC.decimals,
    isNative: ETHEREUM_ASSET_MAPPINGS.USDC.isNative,
  },
  'XLM.XLM': {
    chain: 'XLM',
    symbol: 'XLM',
    ticker: 'XLM.XLM',
    address: getCurrentStellarAddress('XLM'),
    decimals: STELLAR_ASSET_MAPPINGS.XLM.decimals,
    isNative: STELLAR_ASSET_MAPPINGS.XLM.isNative,
  },
  'USDC.XLM': {
    chain: 'XLM',
    symbol: 'USDC',
    ticker: 'USDC.XLM',
    address: getCurrentStellarAddress('USDC'),
    issuer: STELLAR_ASSET_MAPPINGS.USDC.assetIssuer,
    decimals: STELLAR_ASSET_MAPPINGS.USDC.decimals,
    isNative: STELLAR_ASSET_MAPPINGS.USDC.isNative,
  },
};

// Dynamic Asset Display Names (based on current networks)
export const getAssetDisplayName = (ticker: string): string => {
  const ethNetworkName = CURRENT_ETHEREUM_NETWORK as string === 'mainnet' ? 'Ethereum' : 'Ethereum Sepolia';
  const stellarNetworkName = CURRENT_STELLAR_NETWORK as string === 'mainnet' ? 'Stellar' : 'Stellar Testnet';
  
  const displayNames: Record<string, string> = {
    'ETH.ETH': `ETH (${ethNetworkName})`,
    'USDC.ETH': `USDC (${ethNetworkName})`,
    'XLM.XLM': `XLM (${stellarNetworkName})`,
    'USDC.XLM': `USDC (${stellarNetworkName})`,
  };
  
  return displayNames[ticker] || ticker;
};

// Static Asset Display Names (for backward compatibility)
export const ASSET_DISPLAY_NAMES: Record<string, string> = {
  'ETH.ETH': getAssetDisplayName('ETH.ETH'),
  'USDC.ETH': getAssetDisplayName('USDC.ETH'),
  'XLM.XLM': getAssetDisplayName('XLM.XLM'),
  'USDC.XLM': getAssetDisplayName('USDC.XLM'),
};

// Dynamic Chain Display Names
export const getChainDisplayName = (chainId: ChainId): string => {
  const names: Record<ChainId, string> = {
    ETH: CURRENT_ETHEREUM_NETWORK as string === 'mainnet' ? 'Ethereum' : 'Ethereum Sepolia',
    XLM: CURRENT_STELLAR_NETWORK as string === 'mainnet' ? 'Stellar' : 'Stellar Testnet',
    SWITCHLY: 'Switchly Network',
  };
  return names[chainId];
};

// Chain Display Names (static for backward compatibility)
export const CHAIN_DISPLAY_NAMES: Record<ChainId, string> = {
  ETH: getChainDisplayName('ETH'),
  XLM: getChainDisplayName('XLM'),
  SWITCHLY: getChainDisplayName('SWITCHLY'),
};

// Default swap pairs
export const DEFAULT_SWAP_PAIRS = [
  ['ETH.ETH', 'XLM.XLM'],
  ['USDC.ETH', 'USDC.XLM'],
  ['ETH.ETH', 'USDC.XLM'],
  ['XLM.XLM', 'USDC.ETH'],
];

// Transaction limits (in base units)
export const TRANSACTION_LIMITS = {
  'ETH.ETH': {
    min: '10000000000000000', // 0.01 ETH
    max: '10000000000000000000', // 10 ETH
  },
  'USDC.ETH': {
    min: '10000', // 0.01 USDC
    max: '10000000000', // 10,000 USDC
  },
  'XLM.XLM': {
    min: '1000000', // 0.1 XLM
    max: '100000000000', // 10,000 XLM
  },
  'USDC.XLM': {
    min: '100000', // 0.01 USDC
    max: '100000000000', // 10,000 USDC
  },
};

// Explorer URLs
export const EXPLORER_URLS = {
  ETH: 'https://sepolia.etherscan.io/tx/',
  XLM: 'https://testnet.stellarchain.io/transactions/',
};

// Memo format patterns
export const MEMO_PATTERNS = {
  SWAP: (outputAsset: string, destAddress: string) => `SWAP:${outputAsset}:${destAddress}`,
  ADD: (asset: string, destAddress?: string) => `ADD:${asset}${destAddress ? `:${destAddress}` : ''}`,
  WITHDRAW: (asset: string, basisPoints: number, destAddress?: string) => 
    `WITHDRAW:${asset}:${basisPoints}${destAddress ? `:${destAddress}` : ''}`,
};

// Gas limits and fees
export const GAS_LIMITS = {
  ETH_NATIVE_TRANSFER: 21000,
  ETH_TOKEN_TRANSFER: 65000,
  ETH_ROUTER_DEPOSIT: 200000,
  STELLAR_PAYMENT: 100,
  STELLAR_CONTRACT_INVOKE: 1000000,
};

// Slippage tolerance (basis points)
export const DEFAULT_SLIPPAGE_BPS = 300; // 3%
export const MAX_SLIPPAGE_BPS = 1000; // 10%

// Refresh intervals
export const REFRESH_INTERVALS = {
  NETWORK_STATUS: 30000, // 30 seconds - default when idle
  NETWORK_STATUS_ACTIVE: 60000, // 60 seconds - when user is actively swapping
  TRANSACTION_STATUS: 5000, // 5 seconds
  BALANCE_UPDATE: 10000, // 10 seconds
  QUOTE_UPDATE: 15000, // 15 seconds
};

// Utility Functions for Asset Management

/**
 * Get cross-chain equivalent asset
 */
export const getCrossChainEquivalent = (ticker: string): string | null => {
  const [symbol, chain] = ticker.split('.');
  
  if (symbol === 'ETH' && chain === 'ETH') {
    return 'XLM.XLM'; // ETH -> XLM
  }
  if (symbol === 'XLM' && chain === 'XLM') {
    return 'ETH.ETH'; // XLM -> ETH
  }
  if (symbol === 'USDC') {
    return chain === 'ETH' ? 'USDC.XLM' : 'USDC.ETH'; // USDC cross-chain
  }
  
  return null;
};

/**
 * Get all assets for a specific chain
 */
export const getAssetsForChain = (chainId: ChainId): string[] => {
  return Object.keys(SUPPORTED_ASSETS).filter(ticker => 
    SUPPORTED_ASSETS[ticker].chain === chainId
  );
};

/**
 * Get opposite chain assets for cross-chain swaps
 */
export const getOppositeChainAssets = (currentChain: ChainId): string[] => {
  const oppositeChain = currentChain === 'ETH' ? 'XLM' : 'ETH';
  return getAssetsForChain(oppositeChain);
};

/**
 * Check if two assets are on the same chain
 */
export const isSameChain = (ticker1: string, ticker2: string): boolean => {
  const asset1 = SUPPORTED_ASSETS[ticker1];
  const asset2 = SUPPORTED_ASSETS[ticker2];
  return asset1 && asset2 && asset1.chain === asset2.chain;
};

/**
 * Get asset info by ticker
 */
export const getAssetInfo = (ticker: string): Asset | null => {
  return SUPPORTED_ASSETS[ticker] || null;
};

/**
 * Get contract address for current network
 */
export const getAssetAddress = (ticker: string): string | undefined => {
  const asset = SUPPORTED_ASSETS[ticker];
  return asset?.address;
};

/**
 * Get asset decimals
 */
export const getAssetDecimals = (ticker: string): number => {
  const asset = SUPPORTED_ASSETS[ticker];
  return asset?.decimals || 18;
};

/**
 * Check if asset is native to its chain
 */
export const isNativeAsset = (ticker: string): boolean => {
  const asset = SUPPORTED_ASSETS[ticker];
  return asset?.isNative || false;
};

// Dynamic Address Resolution from Inbound Addresses

/**
 * Extract router address for a specific chain from inbound addresses
 */
export const getRouterAddress = (inboundAddresses: any[], chainId: ChainId): string => {
  const inbound = inboundAddresses.find(addr => addr.chain === chainId);
  if (inbound?.router) {
    return inbound.router;
  }
  
  // Fallback to hardcoded values
  switch (chainId) {
    case 'ETH':
      return ETHEREUM_ROUTER_FALLBACK;
    case 'XLM':
      return STELLAR_ROUTER_FALLBACK;
    default:
      throw new Error(`No router address found for chain ${chainId}`);
  }
};

/**
 * Extract vault address for a specific chain from inbound addresses
 */
export const getVaultAddress = (inboundAddresses: any[], chainId: ChainId): string => {
  const inbound = inboundAddresses.find(addr => addr.chain === chainId);
  if (inbound?.address) {
    return inbound.address;
  }
  
  // Fallback to hardcoded values
  switch (chainId) {
    case 'ETH':
      return ETHEREUM_VAULT_FALLBACK;
    case 'XLM':
      return STELLAR_VAULT_FALLBACK;
    default:
      throw new Error(`No vault address found for chain ${chainId}`);
  }
};

/**
 * Get all available router addresses from inbound addresses
 */
export const getAllRouterAddresses = (inboundAddresses: any[]): Record<string, string> => {
  const routers: Record<string, string> = {};
  
  inboundAddresses.forEach(inbound => {
    if (inbound.router && inbound.chain) {
      routers[inbound.chain] = inbound.router;
    }
  });
  
  return routers;
};

/**
 * Get all available vault addresses from inbound addresses
 */
export const getAllVaultAddresses = (inboundAddresses: any[]): Record<string, string> => {
  const vaults: Record<string, string> = {};
  
  inboundAddresses.forEach(inbound => {
    if (inbound.address && inbound.chain) {
      vaults[inbound.chain] = inbound.address;
    }
  });
  
  return vaults;
};

/**
 * Check if a chain is halted based on inbound addresses
 */
export const isChainHalted = (inboundAddresses: any[], chainId: ChainId): boolean => {
  const inbound = inboundAddresses.find(addr => addr.chain === chainId);
  return inbound?.halted || inbound?.chain_trading_paused || false;
};

/**
 * Get gas rate for a chain from inbound addresses
 */
export const getGasRate = (inboundAddresses: any[], chainId: ChainId): { rate: string; units: string } => {
  const inbound = inboundAddresses.find(addr => addr.chain === chainId);
  return {
    rate: inbound?.gas_rate || '0',
    units: inbound?.gas_rate_units || 'gwei',
  };
};