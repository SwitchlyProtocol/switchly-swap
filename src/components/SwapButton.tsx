import React, { useState } from 'react';

interface SwapButtonProps {
  onClick: () => void;
  className?: string;
}

const SwapButton: React.FC<SwapButtonProps> = ({ onClick, className = '' }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    onClick();
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <div className={`flex justify-center ${className}`}>
      <button
        onClick={handleClick}
        className={`group relative w-12 h-12 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 border-2 border-gray-200/50 hover:border-blue-300/50 dark:border-gray-700/50 dark:hover:border-blue-500/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isAnimating ? 'animate-swap-rotate' : ''
        }`}
        aria-label="Swap assets"
      >
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Swap icon */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <svg 
            className={`w-5 h-5 text-gray-600 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 transition-colors duration-300 ${
              isAnimating ? 'animate-spin' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" 
            />
          </svg>
        </div>
        
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/20 transform scale-0 group-active:scale-100 transition-transform duration-200 rounded-2xl" />
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
      </button>
    </div>
  );
};

export default SwapButton;