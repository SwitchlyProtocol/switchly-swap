import React, { useState, useRef, useEffect } from 'react';
import AssetIcon from './AssetIcon';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    network: string;
    disabled?: boolean;
    hasPool?: boolean;
  }>;
  disabled?: boolean;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSelect = (optionValue: string) => {
    if (!disabled) {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Selected value display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-0 bg-transparent border-none text-left focus:outline-none ${
          disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center space-x-2">
          <AssetIcon asset={value} size="sm" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {selectedOption?.label || value.split(' ')[0]}
          </span>
        </div>
        
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown options */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          {/* Group by network */}
          {['Ethereum', 'Stellar'].map(networkType => {
            const networkOptions = options.filter(opt => opt.network.includes(networkType));
            if (networkOptions.length === 0) return null;

            return (
              <div key={networkType}>
                {/* Network header */}
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {networkType} {networkType === 'Ethereum' ? 'Sepolia' : 'Testnet'}
                  </span>
                </div>
                
                {/* Network options */}
                {networkOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      option.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer'
                    } ${
                      option.value === value 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : ''
                    }`}
                  >
                    <AssetIcon asset={option.value} size="sm" />
                    <span className={`text-sm ${
                      option.disabled 
                        ? 'text-gray-400 dark:text-gray-500' 
                        : option.hasPool === false
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {option.label}
                      {option.disabled && ' (Same Network)'}
                    </span>
                    {option.hasPool === false && (
                      <span className="text-xs text-orange-500 dark:text-orange-400 ml-auto">
                        No Pool
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;