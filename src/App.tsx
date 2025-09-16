import { useState, useEffect } from "react";
import logo from "./assets/logo.svg";
import ThemeToggle from "./components/ThemeToggle";
import PremiumInput from "./components/PremiumInput";
import SwapButton from "./components/SwapButton";
import AssetIcon from "./components/AssetIcon";
import { usePools } from "./hooks/usePools";
import { getCurrentStellarAddress, SUPPORTED_ASSETS } from "./constants/assets";
import { ethers } from 'ethers';
import * as StellarSdk from '@stellar/stellar-sdk';
import { blockchainMonitor } from './services/blockchainMonitor';

// Wallet API type declarations
declare global {
  interface Window {
    freighterApi?: any;
  }
}

function App() {
  // Debug: Log environment variables on app load
  useEffect(() => {
    console.log('🔧 Environment Variables Check:');
    console.log('VITE_ETHEREUM_RPC_URL:', import.meta.env.VITE_ETHEREUM_RPC_URL);
    console.log('VITE_SWITCHLY_API_BASE_URL:', import.meta.env.VITE_SWITCHLY_API_BASE_URL);
    console.log('VITE_SWITCHLY_MIDGARD_BASE_URL:', import.meta.env.VITE_SWITCHLY_MIDGARD_BASE_URL);
    console.log('VITE_STELLAR_HORIZON_URL:', import.meta.env.VITE_STELLAR_HORIZON_URL);
    console.log('VITE_STELLAR_SOROBAN_URL:', import.meta.env.VITE_STELLAR_SOROBAN_URL);
  }, []);

  // Basic state
  const [amount, setAmount] = useState("1.0");
  const [fromToken, setFromToken] = useState("ETH (Ethereum Sepolia)");
  const [toToken, setToToken] = useState("XLM (Stellar Testnet)");
  const [toAddress, setToAddress] = useState("");
  // Removed unused lastRateUpdate state
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string>("");
  // Enhanced cross-chain transaction tracking
  const [crossChainTx, setCrossChainTx] = useState<{
    sourceChain: 'ethereum' | 'stellar';
    targetChain: 'ethereum' | 'stellar';
    fromAsset: string;
    toAsset: string;
    amount: string;
    toAddress: string;
    status: 'sent' | 'confirmed' | 'processing' | 'awaiting' | 'received' | 'completed' | 'failed';
    sourceTx: {
      hash: string;
      explorerUrl: string;
      timestamp: Date;
      confirmations?: number;
      blockNumber?: number;
      status: 'pending' | 'confirmed' | 'failed';
    } | null;
    switchlyAction?: {
      status: 'pending' | 'success' | 'failed';
      type: string;
      height: string;
      inAmount?: string;
      outAmount?: string;
    };
    targetTx: {
      hash: string;
      explorerUrl: string;
      timestamp: Date;
      confirmations?: number;
      blockNumber?: number;
      status: 'pending' | 'confirmed' | 'failed';
    } | null;
    startTime: Date;
    monitoringCleanup?: () => void;
  } | null>(null);

  // Wallet state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string>("");
  const [walletType, setWalletType] = useState<'metamask' | 'freighter' | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Cleanup monitoring on unmount
  useEffect(() => {
    return () => {
      if (crossChainTx?.monitoringCleanup) {
        crossChainTx.monitoringCleanup();
      }
    };
  }, [crossChainTx?.monitoringCleanup]);

  // Add pool data with default refresh rate initially
  const { calculateSwapOutput, pools, isLoading: poolsLoading, error: poolsError } = usePools();

  if (poolsError) console.error("Pool error:", poolsError);

  // Map UI asset names to pool asset names (moved up first)
  const getPoolAssetName = (uiAssetName: string): string => {
    const mapping: Record<string, string> = {
      "ETH (Ethereum Sepolia)": "ETH.ETH",
      "USDC (Ethereum Sepolia)": "ETH.USDC", // USDC on Ethereum chain
      "XLM (Stellar Testnet)": "XLM.XLM", 
      "USDC (Stellar Testnet)": "XLM.USDC" // USDC on Stellar chain
    };
    return mapping[uiAssetName] || uiAssetName;
  };

  // Check if a pool exists for the given asset
  const isPoolAvailable = (assetName: string): boolean => {
    const poolAsset = getPoolAssetName(assetName);
    return pools.hasOwnProperty(poolAsset);
  };

  // Helper functions (moved up before usage)
  const arePoolsAvailable = (fromAsset: string, toAsset: string): boolean => {
    return isPoolAvailable(fromAsset) && isPoolAvailable(toAsset);
  };

  const needsWalletForToken = (token: string): boolean => {
    if (token.includes("Ethereum") && walletType !== 'metamask') return true;
    if (token.includes("Stellar") && walletType !== 'freighter') return true;
    return false;
  };

  
  const buttonDisabled = isSwapping ||
    !isWalletConnected ||
    !amount || 
    parseFloat(amount || "0") <= 0 || 
    !toAddress || 
    !arePoolsAvailable(fromToken, toToken) ||
    poolsLoading ||
    needsWalletForToken(fromToken);
    
  console.log("🔒 Send button should be disabled:", buttonDisabled);

  // Check for existing wallet connections on app load (only MetaMask - passive check)
  useEffect(() => {
    const checkExistingConnections = async () => {
      try {
        // Only check MetaMask connection (passive check - doesn't trigger popup)
        const ethereum = (window as any).ethereum;
        if (ethereum && ethereum.selectedAddress) {
          setIsWalletConnected(true);
          setConnectedWalletAddress(ethereum.selectedAddress);
          setWalletType('metamask');
          console.log('🔄 Restored MetaMask connection:', ethereum.selectedAddress);
        }
        
        // Note: Freighter connection is NOT checked automatically to avoid popup
        // Users must explicitly connect via the Connect Wallet button
      } catch (error) {
        console.log('No existing wallet connections found:', error);
      }
    };

    checkExistingConnections();
  }, []);

  // Update timestamp when pools change
  useEffect(() => {
    if (Object.keys(pools).length > 0 && !poolsLoading) {
        // setLastRateUpdate(new Date()); // Removed unused state
      console.log("🔄 Exchange rates updated:", new Date().toLocaleTimeString());
    }
  }, [pools, poolsLoading]);

  // Removed continuous refresh - rates will only update on manual refresh or initial load

  // Duplicate functions removed - already defined above

  // Function moved up - removing duplicate

  // Get missing pool information
  const getMissingPoolInfo = (fromAsset: string, toAsset: string): string | null => {
    const fromPoolAsset = getPoolAssetName(fromAsset);
    const toPoolAsset = getPoolAssetName(toAsset);
    const fromAvailable = pools.hasOwnProperty(fromPoolAsset);
    const toAvailable = pools.hasOwnProperty(toPoolAsset);
    
    if (!fromAvailable && !toAvailable) {
      return `Pools not available for ${fromPoolAsset} and ${toPoolAsset}`;
    } else if (!fromAvailable) {
      return `Pool not available for ${fromPoolAsset}`;
    } else if (!toAvailable) {
      return `Pool not available for ${toPoolAsset}`;
    }
    return null;
  };

  // Calculate receive amount based on send amount - dynamically updates with pool changes
  const getReceiveAmount = (): string => {
    // Return loading state if pools are still loading
    if (poolsLoading) return "⏳ Loading...";
    
    if (!amount || parseFloat(amount) <= 0) return "0.0000";
    
    const fromPoolAsset = getPoolAssetName(fromToken);
    const toPoolAsset = getPoolAssetName(toToken);
    
    console.log(`🔄 App: Calculating ${amount} ${fromPoolAsset} → ${toPoolAsset}`);
    console.log(`🔄 App: Available pools:`, Object.keys(pools));
    
    // Check if pools are available
    if (!arePoolsAvailable(fromToken, toToken)) {
      const missingInfo = getMissingPoolInfo(fromToken, toToken);
      console.log(`❌ App: ${missingInfo}`);
      return "⚠️ N/A";
    }
    
    const swapResult = calculateSwapOutput(fromPoolAsset, toPoolAsset, amount);
    
    if (swapResult) {
      console.log(`✅ App: Result: ${swapResult.outputAmount} (rate: ${swapResult.exchangeRate})`);
      return parseFloat(swapResult.outputAmount).toFixed(4);
    } else {
      console.log(`❌ App: No swap result for ${fromPoolAsset} → ${toPoolAsset}`);
      return poolsError ? "❌ Error" : "0.0000";
    }
  };

  // Wallet connection functions
  const connectMetaMask = async () => {
    try {
      setIsConnecting(true);
      const ethereum = (window as any).ethereum;
      
      if (!ethereum) {
        alert('Please install MetaMask!');
        return;
      }
      
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setIsWalletConnected(true);
        setConnectedWalletAddress(accounts[0]);
        setWalletType('metamask');
        setShowWalletModal(false);
        console.log('✅ MetaMask connected:', accounts[0]);
      }
    } catch (error) {
      console.error('❌ Error connecting to MetaMask:', error);
      alert('Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectFreighter = async () => {
    try {
      setIsConnecting(true);
      
      // Import Freighter API functions with requestAccess
      const { getPublicKey, isConnected } = await import('@stellar/freighter-api');
      
      // Check if Freighter is installed and connected
      let connected = await isConnected();
      console.log('🔌 Initial Freighter connection status:', connected);
      
      if (!connected) {
        console.log('🚪 Freighter not connected, will try to get public key...');
      }
      
      // Get the public key
      console.log('🔑 Getting public key...');
      const publicKey = await getPublicKey();
      console.log('🔑 Freighter public key:', publicKey);
      
      if (publicKey) {
        setIsWalletConnected(true);
        setConnectedWalletAddress(publicKey);
        setWalletType('freighter');
        setShowWalletModal(false);
        console.log('✅ Freighter wallet connected successfully:', publicKey);
      } else {
        throw new Error('No public key received from Freighter');
      }
    } catch (error) {
      console.error('❌ Error connecting to Freighter:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // More specific error messages
      if (errorMessage.includes('User declined access')) {
        alert('Please allow access to Freighter wallet to continue');
      } else if (errorMessage.includes('Freighter is not installed')) {
        alert('Please install Freighter wallet extension first');
      } else {
        alert(`Failed to connect to Freighter: ${errorMessage}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsWalletConnected(false);
    setConnectedWalletAddress("");
    setWalletType(null);
    console.log('Wallet disconnected');
  };

  const openWalletModal = () => {
    setShowWalletModal(true);
  };

  // Enhanced cross-chain monitoring using real blockchain APIs
  const startCrossChainMonitoring = async (sourceTxHash: string, sourceChain: 'ethereum' | 'stellar') => {
    try {
      // Clean up any existing monitoring
      if (crossChainTx?.monitoringCleanup) {
        crossChainTx.monitoringCleanup();
      }

      // Start comprehensive monitoring
      const cleanup = await blockchainMonitor.startComprehensiveMonitoring(
        sourceTxHash,
        sourceChain,
        toAddress, // Pass destination address for monitoring
        (update) => {
          setCrossChainTx(prev => {
            if (!prev) return null;

            // Determine overall status with better logic
            let overallStatus: typeof prev.status = 'sent';
            
            console.log('🔄 Cross-chain status update:', {
              sourceStatus: update.source.status,
              switchlyStatus: update.switchly?.status,
              targetStatus: update.target?.status,
              currentStatus: prev.status
            });
            
            if (update.source.status === 'failed') {
              overallStatus = 'failed';
            } else if (update.source.status === 'confirmed') {
              // Source is confirmed, now check Switchly
              if (update.switchly) {
                console.log('🔄 Switchly action details:', {
                  type: update.switchly.type,
                  status: update.switchly.status,
                  hasOut: update.switchly.out?.length > 0
                });
                
                if (update.switchly.status === 'success') {
                  // Switchly processed successfully
                  if (update.target?.status === 'confirmed') {
                    overallStatus = 'completed';
                  } else {
                    overallStatus = 'awaiting';
                  }
                } else if (update.switchly.status === 'failed' || update.switchly.type === 'refund') {
                  // Switchly failed, but source transaction succeeded
                  overallStatus = 'failed';
                } else {
                  // Switchly is still pending
                  overallStatus = 'processing';
                }
              } else {
                // Source confirmed but Switchly hasn't seen it yet
                overallStatus = 'processing';
              }
            } else if (update.source.status === 'pending') {
              overallStatus = 'sent';
            }

            // Update source transaction details
            const updatedSourceTx = prev.sourceTx ? {
              ...prev.sourceTx,
              confirmations: 'confirmations' in update.source ? update.source.confirmations : undefined,
              blockNumber: 'blockNumber' in update.source ? update.source.blockNumber : undefined,
              status: update.source.status
            } : null;

            // Update Switchly action details
            const switchlyAction = update.switchly ? {
              status: update.switchly.status,
              type: update.switchly.type,
              height: update.switchly.height,
              inAmount: update.switchly.in?.[0]?.coins?.[0]?.amount,
              outAmount: update.switchly.out?.[0]?.coins?.[0]?.amount
            } : prev.switchlyAction;

            // Update target transaction details
            let updatedTargetTx = prev.targetTx;
            
            // Set target tx from outbound queue even if destination monitoring hasn't found it yet
            if (update.switchly?.out?.[0] && !updatedTargetTx) {
              const targetTxHash = update.switchly.out[0].txID;
              const targetExplorerUrl = sourceChain === 'ethereum' 
                ? `https://stellar.expert/explorer/testnet/tx/${targetTxHash}`
                : `https://sepolia.etherscan.io/tx/${targetTxHash}`;

              updatedTargetTx = {
                hash: targetTxHash,
                explorerUrl: targetExplorerUrl,
                timestamp: new Date(),
                confirmations: undefined,
                blockNumber: undefined,
                status: 'pending' // Initially pending until destination monitoring confirms
              };
              
              console.log('🎯 Target transaction detected from outbound queue:', targetTxHash);
            }
            
            // Update target tx details if destination monitoring provides more info
            if (update.target) {
              if (updatedTargetTx) {
                // Update existing target tx with destination monitoring details
                updatedTargetTx = {
                  ...updatedTargetTx,
                  hash: update.target.hash, // Use the actual destination tx hash from monitoring
                  confirmations: 'confirmations' in update.target ? update.target.confirmations : updatedTargetTx.confirmations,
                  blockNumber: 'blockNumber' in update.target ? update.target.blockNumber : updatedTargetTx.blockNumber,
                  status: update.target.status
                };
                
                // Update explorer URL with the actual destination tx hash
                const actualTargetExplorerUrl = sourceChain === 'ethereum' 
                  ? `https://stellar.expert/explorer/testnet/tx/${update.target.hash}`
                  : `https://sepolia.etherscan.io/tx/${update.target.hash}`;
                updatedTargetTx.explorerUrl = actualTargetExplorerUrl;
                
                console.log('🎯 Target transaction confirmed by destination monitoring:', update.target.hash);
              } else {
                // Create target tx from destination monitoring if not set from outbound queue
                const targetExplorerUrl = sourceChain === 'ethereum' 
                  ? `https://stellar.expert/explorer/testnet/tx/${update.target.hash}`
                  : `https://sepolia.etherscan.io/tx/${update.target.hash}`;

                updatedTargetTx = {
                  hash: update.target.hash,
                  explorerUrl: targetExplorerUrl,
                  timestamp: new Date(),
                  confirmations: 'confirmations' in update.target ? update.target.confirmations : undefined,
                  blockNumber: 'blockNumber' in update.target ? update.target.blockNumber : undefined,
                  status: update.target.status
                };
                
                console.log('🎯 Target transaction detected by destination monitoring:', update.target.hash);
              }
            }

            return {
              ...prev,
              status: overallStatus,
              sourceTx: updatedSourceTx,
              switchlyAction,
              targetTx: updatedTargetTx,
              monitoringCleanup: cleanup
            };
          });
        }
      );

      // Store cleanup function
      setCrossChainTx(prev => prev ? { ...prev, monitoringCleanup: cleanup } : null);
      
    } catch (error) {
      console.error("Cross-chain monitoring error:", error);
      setCrossChainTx(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };


  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isWalletConnected || !amount || !toAddress || !arePoolsAvailable(fromToken, toToken)) {
      return;
    }

    setIsSwapping(true);
    setSwapStatus("Preparing transaction...");

    try {
      const isEthereumSource = fromToken.includes("Ethereum");

      if (isEthereumSource) {
        await handleEthereumSwap();
      } else {
        await handleStellarSwap();
      }
    } catch (error) {
      console.error("Swap failed:", error);
      setSwapStatus(`Swap failed: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setSwapStatus(""), 5000);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleEthereumSwap = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("MetaMask not found");

      setSwapStatus("Building transaction...");
      
      const routerAddress = "0x5DB9A7629912EBF95876228C24A848de0bfB43A9";
      const vaultAddress = "0xd58610f89265a2fb637ac40edf59141ff873b266";

      const getEthereumAssetAddress = (tokenName: string): string => {
        const poolAssetName = getPoolAssetName(tokenName);
        const supportedAsset = SUPPORTED_ASSETS[poolAssetName];
        
        if (supportedAsset?.address) {
          return supportedAsset.address;
        }
        
        if (tokenName.includes("USDC")) {
          return "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
        } else {
          return "0x0000000000000000000000000000000000000000";
        }
      };

      const ethereumAssetAddress = getEthereumAssetAddress(fromToken);
      const supportedAsset = SUPPORTED_ASSETS[getPoolAssetName(fromToken)];
      const decimals = supportedAsset?.decimals || 18;
      const amountWei = Math.floor(parseFloat(amount) * Math.pow(10, decimals));
      
      const targetAsset = getPoolAssetName(toToken);
      const memo = `SWAP:${targetAsset}:${toAddress}`;
      const expiry = 1788178213;

      const iface = new ethers.Interface([
        "function depositWithExpiry(address payable vault, address asset, uint amount, string memory memo, uint expiration) external payable"
      ]);
      
      const callData = iface.encodeFunctionData("depositWithExpiry", [
        vaultAddress,
        ethereumAssetAddress,
        amountWei.toString(),
        memo,
        expiry
      ]);

      const txParams = {
        to: routerAddress,
        value: `0x${amountWei.toString(16)}`,
        data: callData,
        from: connectedWalletAddress
      };

      setSwapStatus("Requesting MetaMask signature...");

      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setSwapStatus(`Transaction submitted! Hash: ${txHash}`);
      
      // Initialize cross-chain tracking
      setTimeout(() => {
        setSwapStatus("");
        console.log('🚀 Starting cross-chain tracking for ETH->XLM:', txHash);
        setCrossChainTx({
          sourceChain: 'ethereum',
          targetChain: 'stellar',
          fromAsset: fromToken,
          toAsset: toToken,
          amount: amount,
          toAddress: toAddress,
          status: 'sent',
          sourceTx: {
            hash: txHash,
            explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
            timestamp: new Date(),
            status: 'pending'
          },
          targetTx: null,
          startTime: new Date()
        });
        
        // Start monitoring for cross-chain completion
        startCrossChainMonitoring(txHash, 'ethereum');
      }, 2000);

    } catch (error) {
      throw error;
    }
  };

  const handleStellarSwap = async () => {
    try {
      const freighterApi = await import('@stellar/freighter-api');
      const sourceAccount = await freighterApi.getPublicKey();
      
      setSwapStatus("Building transaction...");

      const vaultResponse = await fetch(`${import.meta.env.VITE_SWITCHLY_API_BASE_URL}/switchly/inbound_addresses`);
      const vaultData = await vaultResponse.json();
      const vaultAddress = vaultData.find((addr: any) => addr.chain === 'XLM')?.address;

      if (!vaultAddress) throw new Error("Vault address not found");

      const targetAsset = getPoolAssetName(toToken);
      const memo = `SWAP:${targetAsset}:${toAddress}`;
      const contractId = "CA2LDIRKDFHX2WPWKL7C3CNTFICTOH5E6RG6MP74TT56F7QQ6LXCMBHN";
      
      const getAssetContractAddress = (tokenName: string): string => {
        const poolAssetName = getPoolAssetName(tokenName);
        const supportedAsset = SUPPORTED_ASSETS[poolAssetName];
        
        if (supportedAsset?.address) {
          return supportedAsset.address;
        }
        
        if (tokenName.includes("USDC")) {
          return getCurrentStellarAddress('USDC') || "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
        } else {
          return getCurrentStellarAddress('XLM') || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
        }
      };
      
      const assetAddress = getAssetContractAddress(fromToken);
      const amountStroops = Math.floor(parseFloat(amount) * 1e7);

      const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
      const account = await server.getAccount(sourceAccount);
      const contract = new StellarSdk.Contract(contractId);

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
      .addOperation(
        contract.call(
          'deposit',
          StellarSdk.nativeToScVal(sourceAccount, { type: 'address' }),
          StellarSdk.nativeToScVal(vaultAddress, { type: 'address' }),
          StellarSdk.nativeToScVal(assetAddress, { type: 'address' }),
          StellarSdk.nativeToScVal(amountStroops, { type: 'i128' }),
          StellarSdk.nativeToScVal(memo, { type: 'string' })
        )
      )
      .setTimeout(180)
      .build();
      
      setSwapStatus("Simulating transaction...");
      const simulationResult = await server.simulateTransaction(transaction);

      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
        throw new Error(`Simulation failed: ${simulationResult.error}`);
      }

      setSwapStatus("Assembling transaction...");
      const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulationResult
      ).build();

      setSwapStatus("Requesting wallet signature...");

      const userSignTransaction = async (xdr: string, networkPassphrase: string, signWith: string) => {
        try {
          const signedTransaction = await freighterApi.signTransaction(xdr, {
            network: networkPassphrase,
            accountToSign: signWith,
          });
          return signedTransaction;
        } catch (e: any) {
          console.error("Signing error:", e);
          throw e;
        }
      };

      const xdr = preparedTransaction.toXDR();
      const userSignedTransaction = await userSignTransaction(xdr, "TESTNET", sourceAccount);

      setSwapStatus("Submitting transaction...");

      const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
        userSignedTransaction,
        StellarSdk.Networks.TESTNET
      );

      const response = await server.sendTransaction(transactionToSubmit);
      
      setSwapStatus(`Transaction submitted! Hash: ${response.hash}`);
      
      setTimeout(() => {
        setSwapStatus("");
        console.log('🚀 Starting cross-chain tracking for XLM->ETH:', response.hash);
        setCrossChainTx({
          sourceChain: 'stellar',
          targetChain: 'ethereum',
          fromAsset: fromToken,
          toAsset: toToken,
          amount: amount,
          toAddress: toAddress,
          status: 'sent',
          sourceTx: {
            hash: response.hash,
            explorerUrl: `https://stellar.expert/explorer/testnet/tx/${response.hash}`,
            timestamp: new Date(),
            status: 'pending'
          },
          targetTx: null,
          startTime: new Date()
        });
        
        // Start monitoring for cross-chain completion
        startCrossChainMonitoring(response.hash, 'stellar');
      }, 2000);

    } catch (error) {
      console.error("❌ Stellar swap error:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      setSwapStatus("");
      throw error;
    }
  };

  // Duplicate function removed - already defined above

  // Removed unused handleRefreshRates function

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-900/10 dark:to-purple-900/10" />
      </div>

      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <div></div>
          <div className="flex items-center space-x-3">
            {isWalletConnected ? (
              <button 
                onClick={disconnectWallet}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <div className="w-2 h-2 bg-green-200 rounded-full animate-pulse"></div>
                <span>{connectedWalletAddress.slice(0, 6)}...{connectedWalletAddress.slice(-4)}</span>
              </button>
            ) : (
              <button 
                onClick={openWalletModal}
                className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Connect Wallet
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 mx-auto">
        <div className="w-full max-w-md space-y-6 mb-16">
          {/* Logo */}
          <div className="flex justify-center">
            <img className="w-24 h-24 invert dark:invert-0" src={logo} alt="Switchly" />
          </div>

          {/* Main swap card */}
          <div className="animate-slide-up">
            <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border transition-all duration-300 p-6 ${
              !arePoolsAvailable(fromToken, toToken) && !poolsLoading
                ? 'border-orange-200 dark:border-orange-800 shadow-orange-100/50 dark:shadow-orange-900/20'
                : arePoolsAvailable(fromToken, toToken) && !poolsLoading
                ? 'border-green-200/30 dark:border-green-800/30 shadow-green-100/20 dark:shadow-green-900/10 hover:shadow-2xl hover:shadow-green-100/30 dark:hover:shadow-green-900/20'
                : 'border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:border-gray-300/50 dark:hover:border-gray-600/50'
            }`}>
              {/* Subtle background gradient for active pools */}
              {arePoolsAvailable(fromToken, toToken) && !poolsLoading && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 via-transparent to-blue-50/30 dark:from-green-900/5 dark:via-transparent dark:to-blue-900/5 rounded-2xl pointer-events-none"></div>
              )}
              <form onSubmit={handleSwap} className="relative space-y-4 z-10">
                {/* From input */}
                <PremiumInput
                    label="You Send"
                    amount={amount}
                  onAmountChange={setAmount}
                  selectedAsset={fromToken}
                  onAssetChange={setFromToken}
                  showBalance={false}
                  availablePools={Object.keys(pools)}
                />

                {/* Swap button */}
                <SwapButton onClick={() => {
                  const temp = fromToken;
                  setFromToken(toToken);
                  setToToken(temp);
                }} className="-my-3" />

                {/* To input */}
                <PremiumInput
                  label="You Receive"
                  amount={getReceiveAmount()}
                  onAmountChange={() => {}} // Read-only - calculated automatically
                  selectedAsset={toToken}
                  onAssetChange={setToToken}
                  excludeAsset={fromToken}
                  isOutput={true}
                  availablePools={Object.keys(pools)}
                />

                {/* Cross-chain info */}
                <div className="text-center py-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {fromToken.includes("Ethereum") ? "Ethereum Sepolia" : "Stellar Testnet"} → {toToken.includes("Ethereum") ? "Ethereum Sepolia" : "Stellar Testnet"}
                  </div>
                </div>

                {/* Pool availability warning */}
                {!arePoolsAvailable(fromToken, toToken) && !poolsLoading && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs shadow-sm">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-amber-800 dark:text-amber-200 font-medium">
                          Liquidity Pool Unavailable
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 mt-1">
                          {getMissingPoolInfo(fromToken, toToken)}
                        </div>
                        <div className="text-amber-600 dark:text-amber-400 mt-1 text-xs">
                          Try selecting different assets or check back later
                        </div>
                      </div>
                    </div>
                </div>
                )}

                {/* Receiving address */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Receiving Address
                  </label>
                  <div className="relative group">
                  <input
                    type="text"
                    placeholder={
                        toToken.includes("Stellar")
                          ? "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                          : "0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      }
                      className="input-premium pr-16"
                    required
                      value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                  />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <AssetIcon asset={toToken} size="sm" />
                    </div>
                  </div>
                </div>


                {/* Submit button */}
                <button
                  type="submit"
                  disabled={
                    isSwapping ||
                    !isWalletConnected ||
                    !amount || 
                    parseFloat(amount || "0") <= 0 || 
                    !toAddress || 
                    !arePoolsAvailable(fromToken, toToken) ||
                    poolsLoading ||
                    needsWalletForToken(fromToken)
                  }
                  className={`relative w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                    isSwapping || !isWalletConnected || !amount || parseFloat(amount || "0") <= 0 || !toAddress || !arePoolsAvailable(fromToken, toToken) || poolsLoading || needsWalletForToken(fromToken)
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isSwapping ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{swapStatus || "Processing..."}</span>
                    </div>
                  ) : (
                    "Send"
                  )}
                  
                  {/* Shimmer effect for active state */}
                  {isWalletConnected && arePoolsAvailable(fromToken, toToken) && !poolsLoading && amount && parseFloat(amount) > 0 && toAddress && !needsWalletForToken(fromToken) && (
                    <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse"></div>
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Compact Cross-Chain Tracker */}
          {crossChainTx && (
            <div className="mt-4 animate-fadeIn">
              <div className="bg-gray-800/90 border border-gray-700/50 rounded-xl p-4">
                
                {/* Compact Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-white">
                      {crossChainTx.amount} {crossChainTx.fromAsset.split(' ')[0]} → {crossChainTx.toAsset.split(' ')[0]}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      crossChainTx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      crossChainTx.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      crossChainTx.status === 'awaiting' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {crossChainTx.status === 'completed' ? 'Complete' :
                       crossChainTx.status === 'failed' ? (
                         crossChainTx.switchlyAction?.type === 'refund' ? 'Insufficient Liquidity' : 'Failed'
                       ) :
                       crossChainTx.status === 'awaiting' ? 'Awaiting' :
                       crossChainTx.status === 'processing' ? 'Processing' :
                       'Sent'}
                    </div>
                  </div>
                  <button
                    onClick={() => setCrossChainTx(null)}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* Simplified Progress Flow */}
                <div className="flex items-center justify-between relative">
                  {/* Progress Line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-600">
                    <div className={`h-0.5 transition-all duration-1000 ${
                      crossChainTx.status === 'completed' ? 'bg-green-500 w-full' :
                      crossChainTx.status === 'failed' ? 'bg-red-500 w-1/3' :
                      crossChainTx.status === 'awaiting' ? 'bg-yellow-500 w-2/3' :
                      'bg-blue-500 w-1/3'
                    }`}></div>
                  </div>
                  
                  {/* Step Circles */}
                  <div className="flex justify-between w-full relative z-10">
                    {/* Source */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        crossChainTx.sourceTx?.status === 'confirmed' ? 'bg-green-500 text-white' :
                        crossChainTx.sourceTx?.status === 'failed' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white animate-pulse'
                      }`}>
                        {crossChainTx.sourceTx?.status === 'confirmed' ? '✓' :
                         crossChainTx.sourceTx?.status === 'failed' ? '✗' : '1'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {crossChainTx.sourceChain === 'ethereum' ? 'ETH' : 'XLM'}
                      </div>
                    </div>

                    {/* Switchly */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        crossChainTx.switchlyAction?.status === 'success' ? 'bg-green-500 text-white' :
                        crossChainTx.switchlyAction?.status === 'failed' ? 'bg-red-500 text-white' :
                        'bg-yellow-500 text-white animate-pulse'
                      }`}>
                        {crossChainTx.switchlyAction?.status === 'success' ? '✓' :
                         crossChainTx.switchlyAction?.status === 'failed' ? '✗' : '2'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">SWITCH</div>
                    </div>

                    {/* Target */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        crossChainTx.targetTx?.status === 'confirmed' || crossChainTx.status === 'completed' ? 'bg-green-500 text-white' :
                        crossChainTx.targetTx?.status === 'failed' || crossChainTx.status === 'failed' ? 'bg-red-500 text-white' :
                        crossChainTx.status === 'awaiting' ? 'bg-blue-500 text-white animate-pulse' :
                        'bg-gray-600 text-gray-400'
                      }`}>
                        {crossChainTx.targetTx?.status === 'confirmed' || crossChainTx.status === 'completed' ? '✓' :
                         crossChainTx.targetTx?.status === 'failed' || crossChainTx.status === 'failed' ? '✗' :
                         crossChainTx.status === 'awaiting' ? '⏳' : '3'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {crossChainTx.targetChain === 'ethereum' ? 'ETH' : 'XLM'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Links */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-700/50">
                  {crossChainTx.sourceTx && (
                    <div className="flex flex-col">
                      <a
                        href={crossChainTx.sourceTx.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {crossChainTx.sourceChain === 'ethereum' ? 'Ethereum' : 'Stellar'} Tx ↗
                      </a>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">
                        {crossChainTx.sourceTx.hash.slice(0, 8)}...{crossChainTx.sourceTx.hash.slice(-6)}
                      </div>
                    </div>
                  )}
                  
                  {crossChainTx.targetTx ? (
                    <div className="flex flex-col text-right">
                      <a
                        href={crossChainTx.targetTx.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {crossChainTx.targetChain === 'ethereum' ? 'Ethereum' : 'Stellar'} Tx ↗
                      </a>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">
                        {crossChainTx.targetTx.hash.slice(0, 8)}...{crossChainTx.targetTx.hash.slice(-6)}
                      </div>
                    </div>
                  ) : crossChainTx.status === 'awaiting' || crossChainTx.status === 'processing' ? (
                    <div className="flex flex-col text-right">
                      <div className="text-xs text-gray-500">
                        {crossChainTx.targetChain === 'ethereum' ? 'Ethereum' : 'Stellar'} Tx
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Awaiting...
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Connect Wallet</h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* MetaMask */}
              <button
                onClick={connectMetaMask}
                disabled={isConnecting}
                className="w-full flex items-center space-x-4 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-orange-300"></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">MetaMask</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">For Ethereum assets</div>
                </div>
                {isConnecting && (
                  <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>

              {/* Freighter */}
              <button
                onClick={connectFreighter}
                disabled={isConnecting}
                className="w-full flex items-center space-x-4 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-purple-300"></div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Freighter</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">For Stellar assets</div>
                </div>
                {isConnecting && (
                  <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose the wallet for the blockchain you want to trade from
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

export default App;