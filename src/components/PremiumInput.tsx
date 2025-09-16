import React, { useState } from 'react';
import AssetIcon from './AssetIcon';
import CustomSelect from './CustomSelect';

interface PremiumInputProps {
  label: string;
  amount: string;
  onAmountChange: (value: string) => void;
  selectedAsset: string;
  onAssetChange: (asset: string) => void;
  excludeAsset?: string;
  disabled?: boolean;
  placeholder?: string;
  showBalance?: boolean;
  balance?: string;
  isOutput?: boolean;
  availablePools?: string[]; // Array of available pool asset names
}

const PremiumInput: React.FC<PremiumInputProps> = ({
  label,
  amount,
  onAmountChange,
  selectedAsset,
  onAssetChange,
  excludeAsset,
  disabled = false,
  placeholder = "0.00",
  showBalance = false,
  balance,
  isOutput = false,
  availablePools = []
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const assets = [
    "ETH (Ethereum Sepolia)",
    "USDC (Ethereum Sepolia)", 
    "XLM (Stellar Testnet)",
    "USDC (Stellar Testnet)"
  ];

  // Map UI asset names to pool asset names (same as in App.tsx)
  const getPoolAssetName = (uiAssetName: string): string => {
    const mapping: Record<string, string> = {
      "ETH (Ethereum Sepolia)": "ETH.ETH",
      "USDC (Ethereum Sepolia)": "ETH.USDC",
      "XLM (Stellar Testnet)": "XLM.XLM",
      "USDC (Stellar Testnet)": "XLM.USDC"
    };
    return mapping[uiAssetName] || uiAssetName;
  };

  // Check if an asset has a pool available
  const hasPool = (asset: string): boolean => {
    const poolAsset = getPoolAssetName(asset);
    return availablePools.includes(poolAsset);
  };

  const getAvailableAssets = () => {
    if (!excludeAsset) return assets;
    
    const excludeNetwork = excludeAsset.includes('Ethereum') ? 'Ethereum' : 'Stellar';
    return assets.filter(asset => !asset.includes(excludeNetwork));
  };

  const getNetworkIcon = (asset: string) => {
    if (asset.includes('Ethereum')) {
      return (
        <div className="flex items-center space-x-1">
          <img 
            src="/icons/ethereum-network.svg" 
            alt="Ethereum" 
            className="w-4 h-4"
          />
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ethereum</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1">
          <img 
            src="/icons/stellar-network.svg" 
            alt="Stellar" 
            className="w-4 h-4"
          />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Stellar</span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-2">
      {/* Header with label and balance */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {showBalance && balance && balance !== "0.0000" && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Balance:</span>
            <button
              onClick={() => onAmountChange(balance)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {parseFloat(balance).toFixed(4)} {selectedAsset.split(' ')[0]}
            </button>
          </div>
        )}
      </div>

      {/* Main input container */}
      <div className={`relative group ${disabled ? 'opacity-75' : ''}`}>
        <div className={`bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-3 transition-all duration-200 ${
          isFocused ? 'ring-2 ring-blue-500/30 border-blue-400' : ''
        } ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:border-gray-300 dark:hover:border-gray-500'}`}>
          
          <div className="flex items-center space-x-4">
            {/* Asset selection */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="flex-1 min-w-0">
                <CustomSelect
                  value={selectedAsset}
                  onChange={onAssetChange}
                  disabled={disabled}
                  options={
                    isOutput 
                      ? [
                          // Only show cross-chain options (opposite network from excludeAsset)
                          ...(excludeAsset?.includes("Stellar") 
                            ? [
                                { value: "ETH (Ethereum Sepolia)", label: "ETH", network: "Ethereum", hasPool: hasPool("ETH (Ethereum Sepolia)") },
                                { value: "USDC (Ethereum Sepolia)", label: "USDC", network: "Ethereum", hasPool: hasPool("USDC (Ethereum Sepolia)") }
                              ]
                            : [
                                { value: "XLM (Stellar Testnet)", label: "XLM", network: "Stellar", hasPool: hasPool("XLM (Stellar Testnet)") },
                                { value: "USDC (Stellar Testnet)", label: "USDC", network: "Stellar", hasPool: hasPool("USDC (Stellar Testnet)") }
                              ]
                          )
                        ]
                      : [
                          // All options for input
                          { value: "ETH (Ethereum Sepolia)", label: "ETH", network: "Ethereum", hasPool: hasPool("ETH (Ethereum Sepolia)") },
                          { value: "USDC (Ethereum Sepolia)", label: "USDC", network: "Ethereum", hasPool: hasPool("USDC (Ethereum Sepolia)") },
                          { value: "XLM (Stellar Testnet)", label: "XLM", network: "Stellar", hasPool: hasPool("XLM (Stellar Testnet)") },
                          { value: "USDC (Stellar Testnet)", label: "USDC", network: "Stellar", hasPool: hasPool("USDC (Stellar Testnet)") }
                        ]
                  }
                />
              </div>
            </div>

            {/* Amount input */}
            <div className="flex-1 text-right">
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  // Don't allow changes if this is an output field
                  if (isOutput) return;
                  
                  // Only allow valid decimal numbers
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    onAmountChange(value);
                  }
                }}
                onFocus={() => !isOutput && setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                placeholder={placeholder}
                readOnly={isOutput}
                inputMode={isOutput ? "none" : "decimal"}
                autoComplete="off"
                spellCheck="false"
                className={`w-full text-right text-lg font-semibold bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  isOutput 
                    ? 'text-gray-900 dark:text-white cursor-default' 
                    : 'text-gray-900 dark:text-white'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Glow effect on focus */}
        {isFocused && !disabled && (
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl -z-10 animate-glow" />
        )}
      </div>
    </div>
  );
};

export default PremiumInput;