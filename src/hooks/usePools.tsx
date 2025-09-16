import { useState, useEffect, useCallback } from "react";
import { switchlyAPI } from "../services/api";
import { REFRESH_INTERVALS } from "../constants/assets";
import { SwitchlyPool } from "../types";

interface UsePoolsReturn {
  pools: Record<string, SwitchlyPool>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getPoolByAsset: (asset: string) => SwitchlyPool | null;
  calculateSwapOutput: (fromAsset: string, toAsset: string, inputAmount: string) => {
    outputAmount: string;
    priceImpact: number;
    exchangeRate: string;
    fee: string;
  } | null;
  getExchangeRate: (fromAsset: string, toAsset: string) => string | null;
}

export function usePools(): UsePoolsReturn {
  const [pools, setPools] = useState<Record<string, SwitchlyPool>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await switchlyAPI.getPools();

      if (response.success && response.data) {
        // Convert array to object keyed by asset
        const poolsMap: Record<string, SwitchlyPool> = {};
        
        if (Array.isArray(response.data)) {
          response.data.forEach((pool: SwitchlyPool) => {
            poolsMap[pool.asset] = pool;
          });
        }

        setPools(poolsMap);
      } else {
        setError(response.error || "Failed to fetch pools");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Pools fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
    // Only fetches on initial load - no continuous refresh
  }, [fetchPools]);

  const getPoolByAsset = useCallback((asset: string): SwitchlyPool | null => {
    return pools[asset] || null;
  }, [pools]);

  const getExchangeRate = useCallback((fromAsset: string, toAsset: string): string | null => {
    const fromPool = pools[fromAsset];
    const toPool = pools[toAsset];

    if (!fromPool || !toPool) {
      return null;
    }

    try {
      // Get pool balances (in base units)
      const fromAssetBalance = parseFloat(fromPool.balance_asset);
      const fromSwitchBalance = parseFloat(fromPool.balance_switch);
      const toAssetBalance = parseFloat(toPool.balance_asset);
      const toSwitchBalance = parseFloat(toPool.balance_switch);

      if (fromAssetBalance <= 0 || fromSwitchBalance <= 0 || toAssetBalance <= 0 || toSwitchBalance <= 0) {
        return null;
      }

      // Calculate exchange rate via SWITCH token
      // Rate = (fromAsset/SWITCH) * (SWITCH/toAsset) = (fromSwitchBalance/fromAssetBalance) * (toAssetBalance/toSwitchBalance)
      const rate = (fromSwitchBalance / fromAssetBalance) * (toAssetBalance / toSwitchBalance);
      
      return rate.toFixed(8);
    } catch (err) {
      console.error("Error calculating exchange rate:", err);
      return null;
    }
  }, [pools]);

  const calculateSwapOutput = useCallback((
    fromAsset: string, 
    toAsset: string, 
    inputAmount: string
  ): { outputAmount: string; priceImpact: number; exchangeRate: string; fee: string } | null => {
    const fromPool = pools[fromAsset];
    const toPool = pools[toAsset];

    if (!fromPool || !toPool || !inputAmount || parseFloat(inputAmount) <= 0) {
      console.log(`❌ Missing pool data or invalid input: fromPool=${!!fromPool}, toPool=${!!toPool}, inputAmount=${inputAmount}`);
      return null;
    }

    try {
      // Convert input amount to base units
      const inputInHumanUnits = parseFloat(inputAmount);
      
      // Convert user input to Switchly's standardized 8-decimal units
      // All assets in Switchly pools use 8-decimal precision regardless of native decimals
      let inputInSwitchlyUnits: number;
      
      // Determine asset type and chain for proper conversion
      if (fromAsset === "ETH.ETH") {
        // ETH: Native 18 decimals → Switchly 8 decimals (divide by 10^10)
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      } else if (fromAsset === "XLM.XLM") {
        // XLM: Native 7 decimals → Switchly 8 decimals (multiply by 10)
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      } else if (fromAsset === "ETH.USDC") {
        // USDC on Ethereum: Native 6 decimals → Switchly 8 decimals (multiply by 100)
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      } else if (fromAsset === "XLM.USDC") {
        // USDC on Stellar: Native 7 decimals → Switchly 8 decimals (multiply by 10)
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      } else {
        // All assets standardized to 8 decimals in Switchly
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      }
      
      // Get pool balances (in base units)
      const fromAssetBalance = parseFloat(fromPool.balance_asset);
      const fromSwitchBalance = parseFloat(fromPool.balance_switch);
      const toAssetBalance = parseFloat(toPool.balance_asset);
      const toSwitchBalance = parseFloat(toPool.balance_switch);

      console.log(`🔄 Pool data for ${fromAsset} → ${toAsset}:`);
      console.log(`  From pool: ${fromAssetBalance} asset, ${fromSwitchBalance} switch`);
      console.log(`  To pool: ${toAssetBalance} asset, ${toSwitchBalance} switch`);
      console.log(`  Input: ${inputInHumanUnits} human units = ${inputInSwitchlyUnits} Switchly units`);

      if (fromAssetBalance <= 0 || fromSwitchBalance <= 0 || toAssetBalance <= 0 || toSwitchBalance <= 0) {
        console.log(`❌ Invalid pool balances`);
        return null;
      }

      // Step 1: Calculate SWITCH output from input asset using constant product formula
      // Output = (input * switchDepth) / (assetDepth + input)
      const switchOutput = (inputInSwitchlyUnits * fromSwitchBalance) / (fromAssetBalance + inputInSwitchlyUnits);
      
      // Step 2: Calculate final asset output from SWITCH
      const finalOutputInSwitchlyUnits = (switchOutput * toAssetBalance) / (toSwitchBalance + switchOutput);

      console.log(`  Switch output: ${switchOutput}`);
      console.log(`  Final output (Switchly units): ${finalOutputInSwitchlyUnits}`);

      // Convert output back to human units from Switchly's 8-decimal standardization
      let finalOutputInHumanUnits: number;
      
      // Determine asset type and chain for proper conversion back to human units
      if (toAsset === "ETH.ETH") {
        // ETH: Switchly 8 decimals → Human ETH (divide by 10^8)
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      } else if (toAsset === "XLM.XLM") {
        // XLM: Switchly 8 decimals → Human XLM (divide by 10^8)
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      } else if (toAsset === "ETH.USDC") {
        // USDC on Ethereum: Switchly 8 decimals → Human USDC (divide by 10^8)
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      } else if (toAsset === "XLM.USDC") {
        // USDC on Stellar: Switchly 8 decimals → Human USDC (divide by 10^8)
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      } else {
        // Universal 8-decimal conversion back to human units
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      }

      console.log(`  Final output (human units): ${finalOutputInHumanUnits}`);

      // Calculate exchange rate in human units
      const exchangeRate = finalOutputInHumanUnits / inputInHumanUnits;

      // Calculate price impact
      const expectedRate = (fromSwitchBalance / fromAssetBalance) * (toAssetBalance / toSwitchBalance);
      const expectedOutputInSwitchlyUnits = inputInSwitchlyUnits * expectedRate;
      const priceImpact = expectedOutputInSwitchlyUnits > 0 ? ((expectedOutputInSwitchlyUnits - finalOutputInSwitchlyUnits) / expectedOutputInSwitchlyUnits) * 100 : 0;

      // Calculate fee (typically around 0.3% in THORChain-like systems)
      const feeRate = 0.003; // 0.3%
      const fee = (finalOutputInHumanUnits * feeRate).toString();
      const outputAfterFees = Math.max(0, finalOutputInHumanUnits - parseFloat(fee));

      console.log(`✅ Final calculation: ${inputInHumanUnits} ${fromAsset} → ${outputAfterFees.toFixed(6)} ${toAsset} (rate: ${exchangeRate.toFixed(6)})`);

      return {
        outputAmount: outputAfterFees.toString(),
        priceImpact: Math.max(0, priceImpact),
        exchangeRate: exchangeRate.toFixed(8),
        fee,
      };
    } catch (err) {
      console.error("Error calculating swap output:", err);
      return null;
    }
  }, [pools]);

  return {
    pools,
    isLoading,
    error,
    refetch: fetchPools,
    getPoolByAsset,
    calculateSwapOutput,
    getExchangeRate,
  };
}