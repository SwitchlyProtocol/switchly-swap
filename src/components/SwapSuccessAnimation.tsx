import React, { useEffect, useState } from 'react';

interface SwapSuccessAnimationProps {
  isVisible: boolean;
  fromAsset: string;
  toAsset: string;
  amount: string;
  destinationTxHash?: string;
  onClose: () => void;
}

const SwapSuccessAnimation: React.FC<SwapSuccessAnimationProps> = ({
  isVisible,
  fromAsset,
  toAsset,
  amount,
  destinationTxHash,
  onClose
}) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowDetails(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowAnimation(false);
      setShowDetails(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Success Animation */}
        <div className="mb-6">
          <div className={`mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center transition-all duration-1000 ${
            showAnimation ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
          }`}>
            <svg 
              className={`w-10 h-10 text-green-600 dark:text-green-400 transition-all duration-700 delay-300 ${
                showAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <div className={`transition-all duration-700 delay-500 ${
          showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Swap Successful! 🎉
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your cross-chain swap has been completed successfully
          </p>
        </div>

        {/* Swap Details */}
        <div className={`transition-all duration-700 delay-700 ${
          showDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900 dark:text-white">
                  {amount} {fromAsset}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  Sent
                </div>
              </div>
              
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div className="text-center">
                <div className="font-medium text-gray-900 dark:text-white">
                  {(parseFloat(amount) * 0.999).toFixed(6)} {toAsset}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  Received
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Hash */}
          {destinationTxHash && (
            <div className="mb-6">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Destination Transaction:
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <code className="text-xs text-blue-800 dark:text-blue-300 break-all">
                  {destinationTxHash}
                </code>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start New Swap
            </button>
            
            <button
              onClick={() => {
                // Copy transaction hash to clipboard
                if (destinationTxHash) {
                  navigator.clipboard.writeText(destinationTxHash);
                }
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Copy Transaction Hash
            </button>
          </div>
        </div>

        {/* Confetti Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {showAnimation && Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-gradient-to-r ${
                ['from-red-400 to-red-600', 'from-blue-400 to-blue-600', 'from-green-400 to-green-600', 'from-yellow-400 to-yellow-600', 'from-purple-400 to-purple-600'][i % 5]
              } rounded-full animate-bounce`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwapSuccessAnimation;