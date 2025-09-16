import { Asset, ChainId } from '../types';
import { SUPPORTED_ASSETS, ASSET_DISPLAY_NAMES, TRANSACTION_LIMITS } from '../constants/assets';

// Export TRANSACTION_LIMITS for use in components
export { TRANSACTION_LIMITS };

/**
 * Get asset by ticker
 */
export function getAssetByTicker(ticker: string): Asset | undefined {
  return SUPPORTED_ASSETS[ticker];
}

/**
 * Get display name for asset
 */
export function getAssetDisplayName(ticker: string): string {
  return ASSET_DISPLAY_NAMES[ticker] || ticker;
}

/**
 * Get all assets for a specific chain
 */
export function getAssetsByChain(chainId: ChainId): Asset[] {
  return Object.values(SUPPORTED_ASSETS).filter(asset => asset.chain === chainId);
}

/**
 * Get all supported asset tickers
 */
export function getAllAssetTickers(): string[] {
  return Object.keys(SUPPORTED_ASSETS);
}

/**
 * Check if two assets form a valid swap pair
 */
export function isValidSwapPair(fromTicker: string, toTicker: string): boolean {
  const fromAsset = getAssetByTicker(fromTicker);
  const toAsset = getAssetByTicker(toTicker);
  
  if (!fromAsset || !toAsset) return false;
  if (fromTicker === toTicker) return false;
  
  // Must be on different chains for cross-chain swaps
  return fromAsset.chain !== toAsset.chain;
}

/**
 * Format amount with proper decimals for display
 */
export function formatAssetAmount(amount: string | number, asset: Asset, precision = 6): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const divisor = Math.pow(10, asset.decimals);
  const displayAmount = numAmount / divisor;
  
  return displayAmount.toFixed(Math.min(precision, asset.decimals));
}

/**
 * Parse display amount to base units
 */
export function parseAssetAmount(displayAmount: string | number, asset: Asset): string {
  const numAmount = typeof displayAmount === 'string' ? parseFloat(displayAmount) : displayAmount;
  const multiplier = Math.pow(10, asset.decimals);
  const baseAmount = Math.floor(numAmount * multiplier);
  
  return baseAmount.toString();
}

/**
 * Validate amount against asset limits
 */
export function validateAssetAmount(amount: string, asset: Asset, limits?: { min: string; max: string }): {
  isValid: boolean;
  error?: string;
} {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be a positive number'
    };
  }
  
  if (limits) {
    const minAmount = parseFloat(formatAssetAmount(limits.min, asset));
    const maxAmount = parseFloat(formatAssetAmount(limits.max, asset));
    
    if (numAmount < minAmount) {
      return {
        isValid: false,
        error: `Minimum amount is ${minAmount} ${asset.symbol}`
      };
    }
    
    if (numAmount > maxAmount) {
      return {
        isValid: false,
        error: `Maximum amount is ${maxAmount} ${asset.symbol}`
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Get asset icon URL or fallback
 */
export function getAssetIconUrl(asset: Asset): string {
  // For now, return a placeholder - in production, you'd have actual icon URLs
  const iconMap: Record<string, string> = {
    ETH: '/icons/eth.svg',
    USDC: '/icons/usdc.svg',
    XLM: '/icons/xlm.svg',
  };
  
  return iconMap[asset.symbol] || '/icons/default.svg';
}

/**
 * Generate memo for swap transaction
 */
export function generateSwapMemo(outputAsset: string, destinationAddress: string): string {
  return `SWAP:${outputAsset}:${destinationAddress}`;
}

/**
 * Parse memo to extract swap information
 */
export function parseSwapMemo(memo: string): {
  action: string;
  asset?: string;
  address?: string;
} | null {
  const parts = memo.split(':');
  
  if (parts.length < 2) return null;
  
  return {
    action: parts[0],
    asset: parts[1],
    address: parts[2],
  };
}

/**
 * Calculate estimated output amount with slippage
 */
export function calculateOutputWithSlippage(
  outputAmount: string,
  slippageBps: number
): string {
  const amount = parseFloat(outputAmount);
  const slippageMultiplier = (10000 - slippageBps) / 10000;
  const minOutput = amount * slippageMultiplier;
  
  return minOutput.toString();
}

/**
 * Format transaction fee for display
 */
export function formatTransactionFee(fee: string, asset: Asset): string {
  const formattedAmount = formatAssetAmount(fee, asset, 8);
  return `${formattedAmount} ${asset.symbol}`;
}

/**
 * Check if address is valid for given chain
 */
export function isValidAddress(address: string, chainId: ChainId): boolean {
  switch (chainId) {
    case 'ETH':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'XLM':
      return /^G[A-Z2-7]{55}$/.test(address);
    default:
      return false;
  }
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}