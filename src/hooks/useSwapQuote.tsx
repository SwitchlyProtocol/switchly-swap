import { useState, useEffect, useCallback } from "react";
import { Asset, SwapQuote } from "../types";
import { switchlyAPI } from "../services/api";
import { usePools } from "./usePools";
import { REFRESH_INTERVALS } from "../constants/assets";

interface UseSwapQuoteParams {
  fromAsset: Asset | null;
  toAsset: Asset | null;
  amount: string;
  destinationAddress?: string;
}

interface UseSwapQuoteReturn {
  quote: SwapQuote | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  outputAmount: string;
  fees: Array<{ asset: string; amount: string }>;
  slippageBps: number;
  estimatedTime: number;
  priceImpact: number;
  exchangeRate: string;
}

export function useSwapQuote({
  fromAsset,
  toAsset,
  amount,
  destinationAddress
}: UseSwapQuoteParams): UseSwapQuoteReturn {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { calculateSwapOutput, isLoading: poolsLoading } = usePools();

  const fetchQuote = useCallback(async () => {
    if (!fromAsset || !toAsset || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try to get quote from Switchly API first
      const amountInBaseUnits = (parseFloat(amount) * Math.pow(10, fromAsset.decimals)).toString();

      const apiResponse = await switchlyAPI.getSwapQuote(
        fromAsset.ticker,
        toAsset.ticker,
        amountInBaseUnits,
        destinationAddress
      );

      if (apiResponse.success && apiResponse.data) {
        setQuote(apiResponse.data);
      } else {
        // Fallback to pool-based calculation if API fails
        const poolCalculation = calculateSwapOutput(
          fromAsset.ticker,
          toAsset.ticker,
          amount
        );

        if (poolCalculation) {
          // Create a synthetic quote from pool data
          const syntheticQuote: SwapQuote = {
            input_asset: fromAsset.ticker,
            output_asset: toAsset.ticker,
            input_amount: amountInBaseUnits,
            output_amount: (parseFloat(poolCalculation.outputAmount) * Math.pow(10, toAsset.decimals)).toString(),
            fees: [{
              asset: toAsset.ticker,
              amount: (parseFloat(poolCalculation.fee) * Math.pow(10, toAsset.decimals)).toString()
            }],
            slippage_bps: Math.round(poolCalculation.priceImpact * 100), // Convert % to basis points
            total_swap_seconds: 60, // Estimate 1 minute
            warning: poolCalculation.priceImpact > 5 ? "High price impact" : undefined,
          };

          setQuote(syntheticQuote);
        } else {
          setError("Unable to calculate swap quote");
          setQuote(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [fromAsset, toAsset, amount, destinationAddress, calculateSwapOutput]);

  // Auto-refresh quotes periodically
  useEffect(() => {
    if (!fromAsset || !toAsset || !amount || parseFloat(amount) <= 0 || poolsLoading) {
      return;
    }

    fetchQuote();

    const interval = setInterval(fetchQuote, REFRESH_INTERVALS.QUOTE_UPDATE);
    return () => clearInterval(interval);
  }, [fetchQuote, poolsLoading]);

  // Calculate display values
  const outputAmount = quote && toAsset 
    ? (parseFloat(quote.output_amount) / Math.pow(10, toAsset.decimals)).toFixed(6)
    : "0";

  const priceImpact = quote ? (quote.slippage_bps / 100) : 0; // Convert basis points to percentage

  const exchangeRate = fromAsset && toAsset && amount && parseFloat(amount) > 0 && parseFloat(outputAmount) > 0
    ? (parseFloat(outputAmount) / parseFloat(amount)).toFixed(6)
    : "0";

  return {
    quote,
    isLoading: isLoading || poolsLoading,
    error,
    refetch: fetchQuote,
    outputAmount,
    fees: quote?.fees || [],
    slippageBps: quote?.slippage_bps || 0,
    estimatedTime: quote?.total_swap_seconds || 0,
    priceImpact,
    exchangeRate,
  };
}