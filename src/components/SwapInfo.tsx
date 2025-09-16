import React from "react";
import { Asset } from "../types";

interface SwapInfoProps {
  fromAsset: Asset | null;
  toAsset: Asset | null;
  outputAmount: string;
  exchangeRate: string;
  priceImpact: number;
  fees: Array<{ asset: string; amount: string }>;
  estimatedTime: number;
  isLoading: boolean;
  error?: string | null;
}

const SwapInfo: React.FC<SwapInfoProps> = ({
  fromAsset,
  toAsset,
  outputAmount,
  exchangeRate,
  priceImpact,
  fees,
  estimatedTime,
  isLoading,
  error
}) => {
  if (!fromAsset || !toAsset) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getPriceImpactColor = (impact: number): string => {
    if (impact < 1) return "text-green-600 dark:text-green-400";
    if (impact < 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatFee = (fee: { asset: string; amount: string }): string => {
    // Convert from base units to display units
    const asset = fromAsset.ticker === fee.asset ? fromAsset : toAsset;
    const displayAmount = parseFloat(fee.amount) / Math.pow(10, asset.decimals);
    return `${displayAmount.toFixed(6)} ${asset.symbol}`;
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        Swap Details
      </h3>
      
      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          {/* Exchange Rate */}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Exchange Rate:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              1 {fromAsset.symbol} = {exchangeRate} {toAsset.symbol}
            </span>
          </div>

          {/* Output Amount */}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">You Receive:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {parseFloat(outputAmount).toFixed(6)} {toAsset.symbol}
            </span>
          </div>

          {/* Price Impact */}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Price Impact:</span>
            <span className={`font-medium ${getPriceImpactColor(priceImpact)}`}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>

          {/* Fees */}
          {fees.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Network Fee:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {fees.map((fee, index) => (
                  <span key={index}>
                    {formatFee(fee)}
                    {index < fees.length - 1 && ", "}
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* Estimated Time */}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Est. Time:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formatTime(estimatedTime)}
            </span>
          </div>

          {/* Route Information */}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Route:</span>
            <span className="text-gray-900 dark:text-white font-medium text-xs">
              {fromAsset.symbol} → RUNE → {toAsset.symbol}
            </span>
          </div>

          {/* Warning for high price impact */}
          {priceImpact > 5 && (
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-yellow-800 dark:text-yellow-200">
                  High price impact. Consider reducing swap amount.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwapInfo;