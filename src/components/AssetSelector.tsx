import React from "react";
import { Asset } from "../types";
import { SUPPORTED_ASSETS, ASSET_DISPLAY_NAMES } from "../constants/assets";

interface AssetSelectorProps {
  selectedAsset: Asset | null;
  onAssetChange: (asset: Asset) => void;
  excludeAsset?: Asset | null;
  label: string;
  disabled?: boolean;
}

const AssetSelector: React.FC<AssetSelectorProps> = ({
  selectedAsset,
  onAssetChange,
  excludeAsset,
  label,
  disabled = false
}) => {
  const availableAssets = Object.values(SUPPORTED_ASSETS).filter(
    asset => !excludeAsset || asset.ticker !== excludeAsset.ticker
  );

  return (
    <div className="w-2/3 ml-2 flex flex-wrap justify-end text-right">
      <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </label>
      <select
        disabled={disabled}
        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:opacity-50"
        value={selectedAsset?.ticker || ""}
        onChange={(e) => {
          const asset = SUPPORTED_ASSETS[e.target.value];
          if (asset) {
            onAssetChange(asset);
          }
        }}
      >
        {!selectedAsset && (
          <option value="">Select Asset</option>
        )}
        {availableAssets.map((asset) => (
          <option key={asset.ticker} value={asset.ticker}>
            {ASSET_DISPLAY_NAMES[asset.ticker] || asset.ticker}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AssetSelector;