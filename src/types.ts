export type TxStatus = "liquidity added" | "swap" | "failed swap" | "pending";
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
