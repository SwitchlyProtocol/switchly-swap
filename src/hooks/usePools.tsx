import { useState, useEffect, useCallback } from "react";
import { switchlyAPI } from "../services/api";
// import { REFRESH_INTERVALS } from "../constants/assets"; // Not used
import { SwitchlyPool } from "../types";
import { useNetworkData } from "./useNetworkData";

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
  
  // Get real-time network data for dynamic fee calculations
  const { networkData } = useNetworkData();

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
      // Get normalized pool balances (convert to 8-decimal format like calculateSwapOutput)
      let fromAssetBalance: number;
      let toAssetBalance: number;
      
      // Convert FROM asset balance to Switchly 8-decimal units
      if (fromAsset === "ETH.ETH") {
        fromAssetBalance = parseFloat(fromPool.balance_asset);
      } else if (fromAsset === "ETH.USDC") {
        fromAssetBalance = parseFloat(fromPool.balance_asset) * 100; // 6-decimal to 8-decimal
      } else if (fromAsset === "XLM.XLM" || fromAsset === "XLM.USDC") {
        fromAssetBalance = parseFloat(fromPool.balance_asset) * 10; // 7-decimal to 8-decimal
      } else {
        fromAssetBalance = parseFloat(fromPool.balance_asset);
      }
      
      // Convert TO asset balance to Switchly 8-decimal units
      if (toAsset === "ETH.ETH") {
        toAssetBalance = parseFloat(toPool.balance_asset);
      } else if (toAsset === "ETH.USDC") {
        toAssetBalance = parseFloat(toPool.balance_asset) * 100; // 6-decimal to 8-decimal
      } else if (toAsset === "XLM.XLM" || toAsset === "XLM.USDC") {
        toAssetBalance = parseFloat(toPool.balance_asset) * 10; // 7-decimal to 8-decimal
      } else {
        toAssetBalance = parseFloat(toPool.balance_asset);
      }
      
      const fromSwitchBalance = parseFloat(fromPool.balance_switch);
      const toSwitchBalance = parseFloat(toPool.balance_switch);

      if (fromAssetBalance <= 0 || fromSwitchBalance <= 0 || toAssetBalance <= 0 || toSwitchBalance <= 0) {
        return null;
      }

      // Calculate exchange rate using the same logic as calculateSwapOutput
      // Use 1 unit as test input to get the effective rate including dynamic fees
      const testInputAmount = 1;
      const inputInSwitchlyUnits = testInputAmount * 1e8; // Convert to 8-decimal Switchly units
      
      // Step 1: Calculate SWITCH output from input asset
      const switchOutput = (inputInSwitchlyUnits * fromSwitchBalance) / fromAssetBalance;
      
      // Step 2: Calculate final asset output from SWITCH
      const finalOutputInSwitchlyUnits = (switchOutput * toAssetBalance) / toSwitchBalance;
      
      // Convert output back to human units
      const finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      
      // Calculate dynamic liquidity fee using SWITCHLYChain's formula: (x² * Y) / (x + X)²
      const x = inputInSwitchlyUnits;
      const X = fromAssetBalance;
      const Y = toAssetBalance;
      const liquidityFeeInSwitchlyUnits = (x * x * Y) / Math.pow(x + X, 2);
      const liquidityFeeInHumanUnits = liquidityFeeInSwitchlyUnits / 1e8;
      
      // Calculate dynamic outbound fee using real-time network data
      let outboundFeeInHumanUnits = 0;
      if (networkData) {
        const feeMultiplier = parseFloat(networkData.outbound_fee_multiplier) / 10000;
        
        // Convert SWITCH fee to target asset using realistic network costs
        // Scale base costs with the dynamic fee multiplier
        let baseCostUSD = 16; // Base cost in USD equivalent
        const dynamicCostUSD = baseCostUSD * feeMultiplier; // Apply network multiplier
        
        if (toAsset === "ETH.ETH") {
          // ETH: Convert USD cost to ETH (assuming ~$4000/ETH)
          outboundFeeInHumanUnits = dynamicCostUSD / 4000;
        } else if (toAsset === "ETH.USDC") {
          // USDC on Ethereum: Direct USD equivalent
          outboundFeeInHumanUnits = dynamicCostUSD;
        } else if (toAsset === "XLM.XLM") {
          // XLM: Adjust base cost to better match actual results
          const xlmBaseCostUSD = 1.2; // Fine-tuned to $1.2 base cost for optimal accuracy
          const xlmDynamicCostUSD = xlmBaseCostUSD * feeMultiplier;
          outboundFeeInHumanUnits = xlmDynamicCostUSD / 0.1; // Assuming ~$0.1/XLM
        } else if (toAsset === "XLM.USDC") {
          // USDC on Stellar: Similar low cost as XLM
          const usdcBaseCostUSD = 1; // $1 base cost
          outboundFeeInHumanUnits = usdcBaseCostUSD * feeMultiplier;
        }
      } else {
        // Fallback static estimates if network data unavailable
        if (toAsset === "ETH.ETH") {
          outboundFeeInHumanUnits = 0.002;
        } else if (toAsset === "ETH.USDC") {
          outboundFeeInHumanUnits = 8.0;
        } else if (toAsset === "XLM.XLM") {
          outboundFeeInHumanUnits = 0.00001;
        } else if (toAsset === "XLM.USDC") {
          outboundFeeInHumanUnits = 0.01;
        }
      }
      
      // Calculate total fees and final output
      const totalFeeInHumanUnits = liquidityFeeInHumanUnits + outboundFeeInHumanUnits;
      const outputAfterFees = Math.max(0, finalOutputInHumanUnits - totalFeeInHumanUnits);
      
      // Calculate effective exchange rate (after fees)
      const effectiveRate = outputAfterFees / testInputAmount;
      
      // Debug logging in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Exchange rate ${fromAsset} → ${toAsset}: ${effectiveRate.toFixed(6)}`);
      }
      
      return effectiveRate.toFixed(8);
    } catch (err) {
      console.error("Error calculating exchange rate:", err);
      return null;
    }
  }, [pools, networkData]);

  const calculateSwapOutput = useCallback((
    fromAsset: string, 
    toAsset: string, 
    inputAmount: string
  ): { outputAmount: string; priceImpact: number; exchangeRate: string; fee: string } | null => {
    const fromPool = pools[fromAsset];
    const toPool = pools[toAsset];

    if (!fromPool || !toPool || !inputAmount || parseFloat(inputAmount) <= 0) {
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
        // ETH: Human ETH → Switchly 8 decimals
        // ETH has 18 decimals natively, Switchly uses 8 decimals
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      } else if (fromAsset === "XLM.XLM") {
        // XLM: Human XLM → 8-decimal SWITCHLYChain format
        // All assets standardized to 8 decimals in SWITCHLYChain pools
        inputInSwitchlyUnits = inputInHumanUnits * 1e8; // Convert to 8-decimal format
      } else if (fromAsset === "ETH.USDC") {
        // ETH.USDC: Native 6 decimals → SWITCHLYChain 8 decimals (padded)
        // Human input (1.0 USDC) → 8-decimal format (100000000)
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      } else if (fromAsset === "XLM.USDC") {
        // USDC on Stellar: Uses same 7-decimal format as XLM, converted to 8-decimal in SWITCHLYChain
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      } else {
        // All assets standardized to 8 decimals in Switchly
        inputInSwitchlyUnits = inputInHumanUnits * 1e8;
      }
      
      // Get pool balances and normalize to Switchly's 8-decimal standardization
      // The API might return balances in native formats, need to convert
      let fromAssetBalance: number;
      let toAssetBalance: number;
      
      // Convert FROM asset balance to Switchly 8-decimal units
      if (fromAsset === "ETH.ETH") {
        // ETH pool balance might be in Wei (18 decimals) or Switchly format (8 decimals)
        // If it's Wei: divide by 10^10 to get to 8 decimals
        // If it's already 8 decimals: use as-is
        // Based on pool size, it seems to be in 8-decimal format already
        fromAssetBalance = parseFloat(fromPool.balance_asset);
      } else if (fromAsset === "ETH.USDC") {
        // ETH.USDC: Native 6 decimals → SWITCHLYChain 8 decimals (padded)
        // If API returns in 6-decimal format: multiply by 100 to get 8-decimal
        // Based on your docs: 1000000 (6-decimal) → 100000000 (8-decimal)
        fromAssetBalance = parseFloat(fromPool.balance_asset) * 100; // Convert 6-decimal to 8-decimal
      } else if (fromAsset === "XLM.XLM" || fromAsset === "XLM.USDC") {
        // XLM assets (XLM, USDC) pool balance should be in 8-decimal format per SWITCHLYChain spec
        // But API returns them in 7-decimal format, so convert: 7-decimal * 10 = 8-decimal
        fromAssetBalance = parseFloat(fromPool.balance_asset) * 10; // Convert 7-decimal to 8-decimal
      } else {
        fromAssetBalance = parseFloat(fromPool.balance_asset);
      }
      
      // Convert TO asset balance to Switchly 8-decimal units  
      if (toAsset === "ETH.ETH") {
        toAssetBalance = parseFloat(toPool.balance_asset);
      } else if (toAsset === "ETH.USDC") {
        // ETH.USDC: Native 6 decimals → SWITCHLYChain 8 decimals (padded)
        // If API returns in 6-decimal format: multiply by 100 to get 8-decimal
        // Based on your docs: 1000000 (6-decimal) → 100000000 (8-decimal)
        toAssetBalance = parseFloat(toPool.balance_asset) * 100; // Convert 6-decimal to 8-decimal
      } else if (toAsset === "XLM.XLM" || toAsset === "XLM.USDC") {
        // XLM assets (XLM, USDC) pool balance should be in 8-decimal format per SWITCHLYChain spec
        // But API returns them in 7-decimal format, so convert: 7-decimal * 10 = 8-decimal
        toAssetBalance = parseFloat(toPool.balance_asset) * 10; // Convert 7-decimal to 8-decimal
      } else {
        toAssetBalance = parseFloat(toPool.balance_asset);
      }
      
      // Switch balances are always in Switchly 8-decimal format
      const fromSwitchBalance = parseFloat(fromPool.balance_switch);
      const toSwitchBalance = parseFloat(toPool.balance_switch);

      if (fromAssetBalance <= 0 || fromSwitchBalance <= 0 || toAssetBalance <= 0 || toSwitchBalance <= 0) {
        return null;
      }

      // Step 1: Calculate SWITCH output from input asset using SWITCHLYChain's ratio method
      // Backend formula: switchAmount = ethAmount * (ETH_Pool.BalanceSwitch / ETH_Pool.BalanceAsset)
      const switchOutput = (inputInSwitchlyUnits * fromSwitchBalance) / fromAssetBalance;
      
      // Step 2: Calculate final asset output from SWITCH using SWITCHLYChain's ratio method
      // Backend formula: xlmAmount = switchAmount * (XLM_Pool.BalanceAsset / XLM_Pool.BalanceSwitch)
      const finalOutputInSwitchlyUnits = (switchOutput * toAssetBalance) / toSwitchBalance;

      // Switch output calculation complete

      // Convert output back to human units from Switchly's 8-decimal standardization
      let finalOutputInHumanUnits: number;
      
      // Determine asset type and chain for proper conversion back to human units
      if (toAsset === "ETH.ETH") {
        // ETH: Switchly 8 decimals → Human ETH
        // ETH has 18 decimals natively, Switchly uses 8 decimals
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      } else if (toAsset === "XLM.XLM") {
        // XLM: Switchly 8 decimals → Human XLM 
        // XLM natively uses 7 decimals, so Switchly 8-decimal to XLM 7-decimal
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8; // Standard 8-decimal conversion
      } else if (toAsset === "XLM.USDC") {
        // XLM.USDC: Switchly 8 decimals → Human USDC
        // USDC on Stellar uses same 7-decimal format as XLM
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8; // Standard 8-decimal conversion
      } else if (toAsset === "ETH.USDC") {
        // USDC on Ethereum: Switchly 8 decimals → Human USDC (6 decimals)
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      } else {
        // Universal 8-decimal conversion back to human units
        finalOutputInHumanUnits = finalOutputInSwitchlyUnits / 1e8;
      }

      // Calculate theoretical exchange rate (before fees) for reference
      // const theoreticalExchangeRate = finalOutputInHumanUnits / inputInHumanUnits; // Reserved for future use

      // Calculate price impact using expected vs actual output
      const expectedRate = (fromSwitchBalance / fromAssetBalance) * (toAssetBalance / toSwitchBalance);
      const expectedOutputInSwitchlyUnits = inputInSwitchlyUnits * expectedRate;
      const priceImpact = expectedOutputInSwitchlyUnits > 0 ? ((expectedOutputInSwitchlyUnits - finalOutputInSwitchlyUnits) / expectedOutputInSwitchlyUnits) * 100 : 0;

      // Calculate liquidity fee using SWITCHLYChain's formula: (x² * Y) / (x + X)²
      // Where: x = input amount, X = pool depth of input asset, Y = pool depth of output asset
      const x = inputInSwitchlyUnits;
      const X = fromAssetBalance;
      const Y = toAssetBalance;
      
      // Liquidity fee in Switchly units
      const liquidityFeeInSwitchlyUnits = (x * x * Y) / Math.pow(x + X, 2);
      
      // Liquidity fee calculation using backend formula
      
      // Convert liquidity fee to human units (same conversion as output asset)
      let liquidityFeeInHumanUnits: number;
      if (toAsset === "ETH.ETH") {
        liquidityFeeInHumanUnits = liquidityFeeInSwitchlyUnits / 1e8;
      } else if (toAsset === "XLM.XLM" || toAsset === "XLM.USDC") {
        liquidityFeeInHumanUnits = liquidityFeeInSwitchlyUnits / 1e8; // Standard 8-decimal conversion
      } else if (toAsset === "ETH.USDC") {
        liquidityFeeInHumanUnits = liquidityFeeInSwitchlyUnits / 1e8;
      } else {
        liquidityFeeInHumanUnits = liquidityFeeInSwitchlyUnits / 1e8;
      }

      // Calculate dynamic outbound fee using real-time network data
      let outboundFeeInHumanUnits = 0;
      
      if (networkData) {
        // Get base outbound fee in SWITCH (8-decimal format)
        const baseOutboundFeeSwitch = parseFloat(networkData.native_outbound_fee_switch) / 1e8; // Convert to human SWITCH
        const feeMultiplier = parseFloat(networkData.outbound_fee_multiplier) / 10000; // Convert basis points to decimal
        
        // Calculate dynamic outbound fee: baseFee * multiplier
        const dynamicOutboundFeeSwitch = baseOutboundFeeSwitch * feeMultiplier;
        
        // Dynamic outbound fee calculation
        
        // Convert SWITCH fee to target asset using pool rates
        // For now, use approximations based on typical SWITCH/asset ratios
        if (toAsset === "ETH.ETH") {
          // Assume 1 SWITCH ≈ 0.1 ETH (adjust based on actual pool rates)
          outboundFeeInHumanUnits = dynamicOutboundFeeSwitch * 0.1;
        } else if (toAsset === "ETH.USDC") {
          // Assume 1 SWITCH ≈ $400 USDC (adjust based on actual pool rates)
          outboundFeeInHumanUnits = dynamicOutboundFeeSwitch * 400;
        } else if (toAsset === "XLM.XLM") {
          // Assume 1 SWITCH ≈ 4000 XLM (adjust based on actual pool rates)
          outboundFeeInHumanUnits = dynamicOutboundFeeSwitch * 4000;
        } else if (toAsset === "XLM.USDC") {
          // Assume 1 SWITCH ≈ $400 USDC (same as ETH.USDC)
          outboundFeeInHumanUnits = dynamicOutboundFeeSwitch * 400;
        }
      } else {
        // Fallback to static estimates if network data unavailable
        if (toAsset === "ETH.ETH") {
          outboundFeeInHumanUnits = 0.002; // ~0.002 ETH
        } else if (toAsset === "ETH.USDC") {
          outboundFeeInHumanUnits = 8.0; // ~$8 USDC
        } else if (toAsset === "XLM.XLM") {
          outboundFeeInHumanUnits = 0.00001; // ~0.00001 XLM
        } else if (toAsset === "XLM.USDC") {
          outboundFeeInHumanUnits = 0.01; // ~$0.01 USDC
        }
      }
      
      // Total fee = liquidity fee + outbound fee
      const totalFeeInHumanUnits = liquidityFeeInHumanUnits + outboundFeeInHumanUnits;
      const fee = totalFeeInHumanUnits.toString();
      const outputAfterFees = Math.max(0, finalOutputInHumanUnits - totalFeeInHumanUnits);

      // Calculate actual exchange rate based on output after fees
      const actualExchangeRate = outputAfterFees / inputInHumanUnits;
      
      // Debug logging in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`💱 Swap calculation: ${inputInHumanUnits} ${fromAsset} → ${outputAfterFees.toFixed(6)} ${toAsset}`);
      }

      return {
        outputAmount: outputAfterFees.toString(),
        priceImpact: Math.max(0, priceImpact),
        exchangeRate: actualExchangeRate.toFixed(8),
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