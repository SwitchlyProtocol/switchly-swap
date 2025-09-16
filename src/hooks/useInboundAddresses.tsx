import { useMemo } from "react";
import { InboundAddress, ChainId } from "../types";
import { 
  getRouterAddress, 
  getVaultAddress, 
  getAllRouterAddresses, 
  getAllVaultAddresses,
  isChainHalted,
  getGasRate
} from "../constants/assets";
import useNetworkInfo from "./useNetworkInfo";

interface UseInboundAddressesReturn {
  // Individual address getters
  getRouter: (chainId: ChainId) => string;
  getVault: (chainId: ChainId) => string;
  
  // Bulk address getters
  getAllRouters: () => Record<string, string>;
  getAllVaults: () => Record<string, string>;
  
  // Chain status
  isHalted: (chainId: ChainId) => boolean;
  getChainGasRate: (chainId: ChainId) => { rate: string; units: string };
  
  // Raw data
  inboundAddresses: InboundAddress[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for accessing dynamic router and vault addresses from Switchly API
 */
function useInboundAddresses(): UseInboundAddressesReturn {
  const { inboundAddresses, isLoading, error } = useNetworkInfo();

  // Memoized address getters
  const getRouter = useMemo(() => 
    (chainId: ChainId) => getRouterAddress(inboundAddresses, chainId),
    [inboundAddresses]
  );

  const getVault = useMemo(() => 
    (chainId: ChainId) => getVaultAddress(inboundAddresses, chainId),
    [inboundAddresses]
  );

  const getAllRouters = useMemo(() => 
    () => getAllRouterAddresses(inboundAddresses),
    [inboundAddresses]
  );

  const getAllVaults = useMemo(() => 
    () => getAllVaultAddresses(inboundAddresses),
    [inboundAddresses]
  );

  const isHalted = useMemo(() => 
    (chainId: ChainId) => isChainHalted(inboundAddresses, chainId),
    [inboundAddresses]
  );

  const getChainGasRate = useMemo(() => 
    (chainId: ChainId) => getGasRate(inboundAddresses, chainId),
    [inboundAddresses]
  );

  return {
    getRouter,
    getVault,
    getAllRouters,
    getAllVaults,
    isHalted,
    getChainGasRate,
    inboundAddresses,
    isLoading,
    error,
  };
}

export default useInboundAddresses;
