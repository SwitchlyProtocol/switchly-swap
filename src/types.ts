// Switchly Network Protocol Types

export type ChainId = "ETH" | "XLM" | "SWITCHLY";
export type AssetSymbol = "ETH" | "USDC" | "XLM";
export type TxStatus = "pending" | "observed" | "swap" | "success" | "failed" | "refunded";

export interface Asset {
  chain: ChainId;
  symbol: AssetSymbol;
  ticker: string; // Format: SYMBOL.CHAIN (e.g., "ETH.ETH", "USDC.ETH", "XLM.XLM")
  address?: string; // Contract address for tokens (ETH) or SEP-41 contract (Stellar)
  issuer?: string; // Traditional Stellar asset issuer (for non-native assets)
  decimals: number;
  isNative: boolean;
}

export interface InboundAddress {
  chain: ChainId;
  pub_key: string;
  address: string;
  router?: string;
  halted: boolean;
  global_trading_paused: boolean;
  chain_trading_paused: boolean;
  chain_lp_actions_paused: boolean;
  gas_rate: string;
  gas_rate_units: string;
  outbound_fee: string;
  dust_threshold: string;
}

export interface VaultInfo {
  block_height: number;
  pub_key: string;
  type: string;
  status: string;
  chains: string[];
  routers: Array<{
    chain: string;
    router: string;
  }>;
  addresses: Array<{
    chain: string;
    address: string;
  }>;
}

export interface SwapQuote {
  input_asset: string;
  output_asset: string;
  input_amount: string;
  output_amount: string;
  fees: {
    asset: string;
    amount: string;
  }[];
  slippage_bps: number;
  streaming_swap_blocks?: number;
  streaming_swap_seconds?: number;
  total_swap_seconds: number;
  warning?: string;
  error?: string;
}

export interface SwitchlyPool {
  asset: string;
  short_code?: string;
  status: string;
  pending_inbound_asset: string;
  pending_inbound_switch: string;
  balance_asset: string;
  balance_switch: string;
  asset_switch_price: string;
  pool_units: string;
  LP_units: string;
  synth_units: string;
  synth_supply: string;
  savers_depth: string;
  savers_units: string;
  savers_fill_bps: string;
  savers_capacity_remaining: string;
  synth_mint_paused: boolean;
  synth_supply_remaining: string;
  loan_collateral: string;
  loan_collateral_remaining: string;
  loan_cr: string;
  derived_depth_bps: string;
  trading_halted: boolean;
}

export interface Transaction {
  id: string;
  from_asset: Asset;
  to_asset: Asset;
  from_address: string;
  to_address: string;
  from_amount: string;
  to_amount?: string;
  from_tx_hash?: string;
  to_tx_hash?: string;
  status: TxStatus;
  memo: string;
  created_at: string;
  updated_at?: string;
  fees?: {
    asset: Asset;
    amount: string;
  }[];
  error_message?: string;
}

// Legacy interface for backward compatibility
export interface Tx {
  from_network: string;
  from_address?: string;
  from_asset_code: string;
  from_asset_issuer?: string;
  from_amount: number;
  from_tx_hash?: string;
  to_network?: string;
  to_address?: string;
  to_asset_code?: string;
  to_asset_issuer?: string;
  to_amount?: number;
  to_tx_hash?: string;
  tx_status?: TxStatus;
  tx_fee?: number;
}

// Wallet Connection Types
export interface WalletConnection {
  isConnected: boolean;
  address?: string;
  chainId?: string;
  balance?: string;
}

export interface EthereumWallet extends WalletConnection {
  provider?: any;
  signer?: any;
}

export interface StellarWallet extends WalletConnection {
  publicKey?: string;
  networkPassphrase?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface NetworkStatus {
  status: "live" | "maintenance" | "degraded";
  inbound_addresses: InboundAddress[];
  vaults: VaultInfo[];
  last_updated: string;
}
