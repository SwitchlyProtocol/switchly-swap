import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import freighterApi from "@stellar/freighter-api";
import { EthereumWallet, StellarWallet, ChainId } from "../types";
import { ETHEREUM_CHAIN_ID } from "../constants/assets";
// import { blockchainExplorer } from "../services/explorer"; // Disabled for now

interface UseWalletReturn {
  ethereumWallet: EthereumWallet;
  stellarWallet: StellarWallet;
  connectEthereum: () => Promise<void>;
  connectStellar: () => Promise<void>;
  disconnectEthereum: () => void;
  disconnectStellar: () => void;
  getBalance: (chainId: ChainId, tokenAddress?: string) => Promise<string | null>;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet(): UseWalletReturn {
  const [ethereumWallet, setEthereumWallet] = useState<EthereumWallet>({
    isConnected: false,
  });
  
  const [stellarWallet, setStellarWallet] = useState<StellarWallet>({
    isConnected: false,
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkExistingConnections = useCallback(async () => {
    try {
      // Check if user has explicitly disconnected Ethereum wallet
      const ethereumDisconnected = localStorage.getItem('ethereum_wallet_disconnected') === 'true';
      
      // Check Ethereum connection
      if (window.ethereum && !ethereumDisconnected) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();

          setEthereumWallet({
            isConnected: true,
            address,
            chainId: network.chainId.toString(),
            provider,
            signer,
          });
        }
      }

      // Check if user has explicitly disconnected Stellar wallet
      const stellarDisconnected = localStorage.getItem('stellar_wallet_disconnected') === 'true';
      
      // Check Stellar connection
      if (await freighterApi.isConnected() && !stellarDisconnected) {
        const publicKey = await freighterApi.getPublicKey();
        setStellarWallet({
          isConnected: true,
          address: publicKey,
          publicKey,
          networkPassphrase: "Test SDF Network ; September 2015",
        });
      }
    } catch (err) {
      console.error("Error checking existing connections:", err);
    }
  }, []);

  // Check if wallets are already connected on mount
  useEffect(() => {
    const initConnections = async () => {
      try {
        await checkExistingConnections();
      } catch (error) {
        console.error("Failed to check existing connections:", error);
      }
    };
    
    initConnections();
  }, [checkExistingConnections]);

  const connectEthereum = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("MetaMask not installed. Please install MetaMask to continue.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await provider.send("eth_requestAccounts", []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      // Log the current network for debugging
      console.log('🔗 Connected to Ethereum network:', {
        chainId: network.chainId.toString(),
        name: network.name,
        rpcUrl: import.meta.env.VITE_ETHEREUM_RPC_URL
      });
      
      // Check if we're on the correct private network
      if (network.chainId.toString() !== parseInt(ETHEREUM_CHAIN_ID, 16).toString()) {
        try {
          // Try to switch to your private network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ETHEREUM_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added, add the configured network
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: ETHEREUM_CHAIN_ID,
                chainName: 'Switchly Private Network',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                  rpcUrls: [import.meta.env.VITE_ETHEREUM_RPC_URL || `http://${import.meta.env.VITE_SWITCHLY_HOST || '64.23.228.195'}:8545`],
                  blockExplorerUrls: [`http://${import.meta.env.VITE_SWITCHLY_HOST || '64.23.228.195'}:8545`],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Get balance
      const balance = await provider.getBalance(address);

      // Clear disconnect flag when user explicitly connects
      localStorage.removeItem('ethereum_wallet_disconnected');

      setEthereumWallet({
        isConnected: true,
        address,
        chainId: network.chainId.toString(),
        balance: ethers.formatEther(balance),
        provider,
        signer,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Ethereum wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectStellar = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!await freighterApi.isAllowed()) {
        // await freighterApi.requestAccess(); // Not available in newer versions
      }

      const publicKey = await freighterApi.getPublicKey();

      // Clear disconnect flag when user explicitly connects
      localStorage.removeItem('stellar_wallet_disconnected');

      setStellarWallet({
        isConnected: true,
        address: publicKey,
        publicKey,
        networkPassphrase: "Test SDF Network ; September 2015",
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Stellar wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectEthereum = useCallback(() => {
    console.log('Disconnecting Ethereum wallet...');
    
    // Set disconnect flag in localStorage to prevent auto-reconnect on page refresh
    localStorage.setItem('ethereum_wallet_disconnected', 'true');
    
    // Clear the wallet state
    setEthereumWallet({ isConnected: false });
    
    // Note: MetaMask doesn't have a programmatic disconnect method
    // The user would need to disconnect manually in MetaMask extension
    // But we clear our app's connection state and prevent auto-reconnect
    console.log('Ethereum wallet disconnected from app');
  }, []);

  const disconnectStellar = useCallback(() => {
    console.log('Disconnecting Stellar wallet...');
    
    // Set disconnect flag in localStorage to prevent auto-reconnect on page refresh
    localStorage.setItem('stellar_wallet_disconnected', 'true');
    
    // Clear the wallet state
    setStellarWallet({ isConnected: false });
    
    // Note: Freighter doesn't have a programmatic disconnect method either
    // The user would need to disconnect manually in Freighter extension
    // But we clear our app's connection state and prevent auto-reconnect
    console.log('Stellar wallet disconnected from app');
  }, []);

  const getBalance = useCallback(async (chainId: ChainId, tokenAddress?: string): Promise<string | null> => {
    try {
      // TODO: Implement balance checking when explorer service is available
      console.log("Balance check requested for", chainId, tokenAddress);
      return null;
    } catch (err) {
      console.error("Error getting balance:", err);
      return null;
    }
  }, [ethereumWallet.address, stellarWallet.address]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectEthereum();
        } else {
          // Reconnect with new account
          connectEthereum();
        }
      };

      const handleChainChanged = () => {
        // Reconnect when chain changes
        connectEthereum();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [connectEthereum, disconnectEthereum]);

  return {
    ethereumWallet,
    stellarWallet,
    connectEthereum,
    connectStellar,
    disconnectEthereum,
    disconnectStellar,
    getBalance,
    isConnecting,
    error,
  };
}