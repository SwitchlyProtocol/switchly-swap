import React from 'react';

interface AssetIconProps {
  asset: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

const AssetIcon: React.FC<AssetIconProps> = ({ asset, size = 'md', className = '', showBadge = false }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const getAssetIcon = (asset: string) => {
    if (asset.includes('ETH')) {
      return (
        <div className={`${sizeClasses[size]} ${className} relative`}>
          <img 
            src="/icons/eth.svg" 
            alt="ETH" 
            className="w-full h-full object-contain"
          />
          {showBadge && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-blue-800">E</span>
            </div>
          )}
        </div>
      );
    }
    
    if (asset.includes('XLM')) {
      return (
        <div className={`${sizeClasses[size]} ${className} relative`}>
          <img 
            src="/icons/xlm.svg" 
            alt="XLM" 
            className="w-full h-full object-contain"
          />
          {showBadge && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-purple-800">S</span>
            </div>
          )}
        </div>
      );
    }
    
    if (asset.includes('USDC')) {
      const isEthereum = asset.includes('Ethereum');
      return (
        <div className={`${sizeClasses[size]} ${className} relative`}>
          <img 
            src="/icons/usdc.svg" 
            alt="USDC" 
            className="w-full h-full object-contain"
          />
          {showBadge && (
            <div className={`absolute -top-1 -right-1 w-4 h-4 ${isEthereum ? 'bg-blue-100' : 'bg-purple-100'} rounded-full flex items-center justify-center`}>
              <span className={`text-xs font-bold ${isEthereum ? 'text-blue-800' : 'text-purple-800'}`}>
                {isEthereum ? 'E' : 'S'}
              </span>
            </div>
          )}
        </div>
      );
    }
    
    // Default fallback
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg ${className}`}>
        <div className={`${iconSize[size]} bg-white rounded-full`}></div>
      </div>
    );
  };

  return (
    <div className="relative">
      {getAssetIcon(asset)}
    </div>
  );
};

export default AssetIcon;