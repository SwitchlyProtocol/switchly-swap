import { useState, useEffect } from 'react';

export interface NetworkData {
  bond_reward_switch: string;
  total_bond_units: string;
  available_pools_switch: string;
  vaults_liquidity_switch: string;
  effective_security_bond: string;
  total_reserve: string;
  vaults_migrating: boolean;
  gas_spent_switch: string;
  gas_withheld_switch: string;
  outbound_fee_multiplier: string;
  native_outbound_fee_switch: string;
  native_tx_fee_switch: string;
  switchlyname_register_fee_switch: string;
  switchlyname_fee_per_block_switch: string;
  switch_price_in_switchly: string;
  switchly_price_in_switch: string;
  switchly_price_halted: boolean;
}

export interface UseNetworkDataReturn {
  networkData: NetworkData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNetworkData(): UseNetworkDataReturn {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use proxy path in production, direct URL in development
      const baseUrl = window.location.protocol === 'https:' 
        ? '/api/switchly' 
        : import.meta.env.VITE_SWITCHLY_API_BASE_URL || '/api/switchly';
      
      const response = await fetch(`${baseUrl}/switchly/network`);
      
      if (!response.ok) {
        throw new Error(`Network request failed: ${response.status}`);
      }

      const data = await response.json();
      setNetworkData(data);
      
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Failed to fetch network data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
    
    // Refresh network data every 30 seconds for real-time fee updates
    const interval = setInterval(fetchNetworkData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    networkData,
    isLoading,
    error,
    refetch: fetchNetworkData,
  };
}
