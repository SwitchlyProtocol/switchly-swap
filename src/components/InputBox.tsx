import React, { useId } from "react";
import { Asset } from "../types";
import AssetSelector from "./AssetSelector";
import { validateAssetAmount, TRANSACTION_LIMITS } from "../utils/assets";

interface InputBoxProps {
  label: string;
  amount: string;
  selectedAsset: Asset | null;
  onAmountChange?: (amount: string) => void;
  onAssetChange?: (asset: Asset) => void;
  excludeAsset?: Asset | null;
  amountDisable?: boolean;
  assetDisable?: boolean;
  showBalance?: boolean;
  balance?: string;
  error?: string | null;
}

const InputBox: React.FC<InputBoxProps> = ({
  label,
  amount,
  selectedAsset,
  onAmountChange,
  onAssetChange,
  excludeAsset,
  amountDisable = false,
  assetDisable = false,
  showBalance = false,
  balance,
  error
}) => {
  const amountInputId = useId();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onAmountChange) {
      onAmountChange(value);
    }
  };

  const handleAssetChange = (asset: Asset) => {
    if (onAssetChange) {
      onAssetChange(asset);
    }
  };

  // Validate amount if asset is selected
  const validation = selectedAsset && amount 
    ? validateAssetAmount(amount, selectedAsset, TRANSACTION_LIMITS[selectedAsset.ticker])
    : { isValid: true };

  const hasError = error || !validation.isValid;
  const errorMessage = error || validation.error;

  // Get min/max values for the input
  const limits = selectedAsset ? TRANSACTION_LIMITS[selectedAsset.ticker] : null;
  const minValue = limits && selectedAsset 
    ? (parseFloat(limits.min) / Math.pow(10, selectedAsset.decimals)).toString()
    : "0.01";
  const maxValue = limits && selectedAsset 
    ? (parseFloat(limits.max) / Math.pow(10, selectedAsset.decimals)).toString()
    : "10000";

  return (
    <div className="space-y-2">
      <div className="flex">
        <div className="w-1/3">
          <label
            htmlFor={amountInputId}
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            {label}
          </label>
          <input
            id={amountInputId}
            className={`bg-gray-50 border ${
              hasError 
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-primary-600 focus:border-primary-600'
            } text-gray-900 sm:text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:opacity-50`}
            type="number"
            min={minValue}
            max={maxValue}
            step="any"
            placeholder="0.00"
            disabled={amountDisable}
            value={amount}
            onChange={handleAmountChange}
          />
          
          {/* Balance display */}
          {showBalance && balance && selectedAsset && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Balance: {parseFloat(balance).toFixed(6)} {selectedAsset.symbol}
            </div>
          )}
        </div>

        <AssetSelector
          selectedAsset={selectedAsset}
          onAssetChange={handleAssetChange}
          excludeAsset={excludeAsset}
          label="Asset"
          disabled={assetDisable}
        />
      </div>

      {/* Error message */}
      {hasError && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Asset limits info */}
      {selectedAsset && limits && !hasError && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Min: {(parseFloat(limits.min) / Math.pow(10, selectedAsset.decimals)).toFixed(6)} {selectedAsset.symbol} • 
          Max: {(parseFloat(limits.max) / Math.pow(10, selectedAsset.decimals)).toFixed(0)} {selectedAsset.symbol}
        </div>
      )}
    </div>
  );
};

export default InputBox;