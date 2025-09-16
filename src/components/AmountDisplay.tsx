import React, { useEffect, useState } from 'react';

interface AmountDisplayProps {
  amount: string;
  currency: string;
  label: string;
  isOutput?: boolean;
  exchangeRate?: number;
  className?: string;
}

const AmountDisplay: React.FC<AmountDisplayProps> = ({ 
  amount, 
  currency, 
  label, 
  isOutput = false, 
  exchangeRate,
  className = '' 
}) => {
  const [displayAmount, setDisplayAmount] = useState('0.00');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const numAmount = parseFloat(amount || '0');
    const finalAmount = isOutput ? (numAmount * 0.999).toFixed(6) : numAmount.toFixed(6);
    
    if (displayAmount !== finalAmount) {
      setIsAnimating(true);
      setDisplayAmount(finalAmount);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [amount, isOutput, displayAmount]);

  const formatAmount = (amt: string) => {
    const num = parseFloat(amt);
    if (num === 0) return '0.00';
    if (num < 0.001) return num.toExponential(2);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        {/* Label */}
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        
        {/* Amount container */}
        <div className="relative group">
          <div className={`input-premium ${isOutput ? 'cursor-not-allowed bg-gray-50/50 dark:bg-gray-900/50' : 'hover-lift'} ${isAnimating ? 'animate-pulse-gentle' : ''}`}>
            <div className="flex items-center justify-between">
              {/* Amount */}
              <div className="flex-1">
                <div className={`text-2xl font-bold text-gray-900 dark:text-white transition-all duration-300 ${isAnimating ? 'scale-105' : 'scale-100'}`}>
                  {formatAmount(displayAmount)}
                </div>
                
                {/* Exchange rate hint */}
                {exchangeRate && !isOutput && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ≈ ${(parseFloat(displayAmount) * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
              
              {/* Currency badge */}
              <div className="ml-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  currency.includes('ETH') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  currency.includes('XLM') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {currency.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
          
          {/* Shimmer effect for loading */}
          {isAnimating && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="shimmer-loading w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          )}
        </div>
        
        {/* Network badge */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className={`network-badge ${
            currency.includes('Ethereum') ? 'network-ethereum' : 
            currency.includes('Stellar') ? 'network-stellar' : ''
          }`}>
            {currency.includes('Ethereum') ? '🔷 Ethereum Sepolia' : '⭐ Stellar Testnet'}
          </span>
          
          {isOutput && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              -0.1% fee
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmountDisplay;