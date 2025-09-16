import React, { useEffect, useState } from 'react';

interface SwapStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  network?: 'ethereum' | 'stellar' | 'switchly';
  txHash?: string;
  estimatedTime?: string;
}

interface SwapFlowVisualizationProps {
  isActive: boolean;
  fromNetwork: 'ethereum' | 'stellar';
  toNetwork: 'ethereum' | 'stellar';
  fromAsset: string;
  toAsset: string;
  amount: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const SwapFlowVisualization: React.FC<SwapFlowVisualizationProps> = ({
  isActive,
  fromNetwork,
  toNetwork,
  fromAsset,
  toAsset,
  amount,
  onComplete,
  onError: _onError
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SwapStep[]>([]);

  // Initialize steps based on swap direction
  useEffect(() => {
    const swapSteps: SwapStep[] = [
      {
        id: 'wallet-sign',
        title: 'Sign Transaction',
        description: `Sign the ${fromAsset} transaction in your ${fromNetwork === 'ethereum' ? 'MetaMask' : 'Freighter'} wallet`,
        status: 'pending',
        network: fromNetwork,
        estimatedTime: '~30 seconds'
      },
      {
        id: 'source-broadcast',
        title: 'Broadcasting to Network',
        description: `Broadcasting transaction to ${fromNetwork === 'ethereum' ? 'Ethereum Sepolia' : 'Stellar Testnet'}`,
        status: 'pending',
        network: fromNetwork,
        estimatedTime: '~1 minute'
      },
      {
        id: 'source-confirm',
        title: 'Network Confirmation',
        description: `Waiting for confirmation on ${fromNetwork === 'ethereum' ? 'Ethereum' : 'Stellar'} network`,
        status: 'pending',
        network: fromNetwork,
        estimatedTime: '~2 minutes'
      },
      {
        id: 'switchly-process',
        title: 'Switchly Processing',
        description: 'Switchly validators are processing your cross-chain swap',
        status: 'pending',
        network: 'switchly',
        estimatedTime: '~3 minutes'
      },
      {
        id: 'dest-initiate',
        title: 'Initiating Destination',
        description: `Initiating ${toAsset} transfer on ${toNetwork === 'ethereum' ? 'Ethereum Sepolia' : 'Stellar Testnet'}`,
        status: 'pending',
        network: toNetwork,
        estimatedTime: '~2 minutes'
      },
      {
        id: 'dest-confirm',
        title: 'Final Confirmation',
        description: `${toAsset} successfully received on ${toNetwork === 'ethereum' ? 'Ethereum' : 'Stellar'} network`,
        status: 'pending',
        network: toNetwork,
        estimatedTime: 'Complete!'
      }
    ];

    setSteps(swapSteps);
    setCurrentStep(0);
  }, [fromNetwork, toNetwork, fromAsset, toAsset]);

  // Simulate step progression when active
  useEffect(() => {
    if (!isActive || steps.length === 0) return;

    const progressInterval = setInterval(() => {
      setSteps(prevSteps => {
        const newSteps = [...prevSteps];
        const activeStepIndex = newSteps.findIndex(step => step.status === 'active');
        const nextPendingIndex = newSteps.findIndex(step => step.status === 'pending');

        if (activeStepIndex !== -1) {
          // Complete current active step
          newSteps[activeStepIndex].status = 'completed';
        }

        if (nextPendingIndex !== -1) {
          // Activate next pending step
          newSteps[nextPendingIndex].status = 'active';
          setCurrentStep(nextPendingIndex);
        } else if (activeStepIndex === newSteps.length - 1) {
          // All steps completed
          onComplete?.();
          return newSteps;
        }

        return newSteps;
      });
    }, 3000); // Progress every 3 seconds for demo

    // Start first step
    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      if (newSteps[0]) {
        newSteps[0].status = 'active';
      }
      return newSteps;
    });

    return () => clearInterval(progressInterval);
  }, [isActive, steps.length, onComplete]);

  const getNetworkIcon = (network?: 'ethereum' | 'stellar' | 'switchly') => {
    switch (network) {
      case 'ethereum':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-900">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0L5.5 12.25l6.5 3.75 6.5-3.75L12 0z"/>
              <path d="M12 16.5L5.5 12.75 12 24l6.5-11.25L12 16.5z"/>
            </svg>
          </div>
        );
      case 'stellar':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center dark:bg-purple-900">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        );
      case 'switchly':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center dark:bg-green-900">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14l3-3 3 3 5-5-1.5-1.5L12 12 9.5 9.5 7 12l-3-3-1.5 1.5 5 5z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-700">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          </div>
        );
    }
  };

  const getStatusIcon = (status: SwapStep['status']) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'active':
        return (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
        );
      case 'failed':
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center dark:bg-gray-600">
            <div className="w-2 h-2 bg-gray-500 rounded-full dark:bg-gray-400"></div>
          </div>
        );
    }
  };

  if (!isActive) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Cross-Chain Swap in Progress
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Swapping {amount} {fromAsset} → {toAsset}</span>
          <span className="text-blue-600 dark:text-blue-400">
            Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Network Flow Visualization */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="text-center">
          {getNetworkIcon(fromNetwork)}
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400 capitalize">
            {fromNetwork}
          </p>
        </div>
        
        <div className="flex-1 mx-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-dashed border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center">
              {getNetworkIcon('switchly')}
            </div>
          </div>
          <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
            Switchly
          </p>
        </div>
        
        <div className="text-center">
          {getNetworkIcon(toNetwork)}
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400 capitalize">
            {toNetwork}
          </p>
        </div>
      </div>

      {/* Step Details */}
      <div className="space-y-4">
        {steps.map((step, _index) => (
          <div key={step.id} className={`flex items-start space-x-4 p-3 rounded-lg transition-all duration-300 ${
            step.status === 'active' ? 'bg-blue-50 dark:bg-blue-900/20' : 
            step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' :
            'bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(step.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-medium ${
                  step.status === 'active' ? 'text-blue-900 dark:text-blue-100' :
                  step.status === 'completed' ? 'text-green-900 dark:text-green-100' :
                  'text-gray-900 dark:text-gray-100'
                }`}>
                  {step.title}
                </h4>
                {step.status === 'active' && step.estimatedTime && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {step.estimatedTime}
                  </span>
                )}
              </div>
              
              <p className={`text-sm mt-1 ${
                step.status === 'active' ? 'text-blue-700 dark:text-blue-300' :
                step.status === 'completed' ? 'text-green-700 dark:text-green-300' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {step.description}
              </p>
              
              {step.txHash && (
                <div className="mt-2">
                  <a 
                    href={`#`} 
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View Transaction: {step.txHash.slice(0, 10)}...
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Step Highlight */}
      {steps[currentStep] && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {steps[currentStep].title}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Please wait while we process your transaction...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapFlowVisualization;