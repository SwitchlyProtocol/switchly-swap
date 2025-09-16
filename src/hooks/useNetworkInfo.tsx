import { useEffect, useState, useCallback } from "react";
import { NetworkStatus, InboundAddress, VaultInfo } from "../types";
import { switchlyAPI } from "../services/api";
import { REFRESH_INTERVALS } from "../constants/assets";

interface UseNetworkInfoReturn {
  networkStatus: NetworkStatus | null;
  inboundAddresses: InboundAddress[];
  vaults: VaultInfo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useNetworkInfo(): UseNetworkInfoReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [inboundAddresses, setInboundAddresses] = useState<InboundAddress[]>([]);
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await switchlyAPI.getNetworkStatus();

      if (response.success && response.data) {
        setNetworkStatus(response.data);
        setInboundAddresses(response.data.inbound_addresses);
        setVaults(response.data.vaults);
      } else {
        setError(response.error || "Failed to fetch network status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Network info fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkInfo();

    // Set up periodic refresh
    const interval = setInterval(fetchNetworkInfo, REFRESH_INTERVALS.NETWORK_STATUS);

    return () => clearInterval(interval);
  }, [fetchNetworkInfo]);

  return {
    networkStatus,
    inboundAddresses,
    vaults,
    isLoading,
    error,
    refetch: fetchNetworkInfo,
  };
}

export default useNetworkInfo;
