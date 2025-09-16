import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import freighterApi from "@stellar/freighter-api";
import { EthereumWallet, StellarWallet, ChainId } from "../types";
import { ETHEREUM_CHAIN_ID } from "../constants/assets";
import { blockchainExplorer } from "../services/explorer";

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
      // Check Ethereum connection
      if (window.ethereum) {
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

      // Check Stellar connection
      if (await freighterApi.isConnected()) {
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

      // Check if we're on the correct network
      if (network.chainId.toString() !== parseInt(ETHEREUM_CHAIN_ID, 16).toString()) {
        try {
          // Try to switch to Sepolia
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ETHEREUM_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added, add it
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: ETHEREUM_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Get balance
      const balance = await provider.getBalance(address);

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
        await freighterApi.requestAccess();
      }

      const publicKey = await freighterApi.getPublicKey();

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
    setEthereumWallet({ isConnected: false });
  }, []);

  const disconnectStellar = useCallback(() => {
    setStellarWallet({ isConnected: false });
  }, []);

  const getBalance = useCallback(async (chainId: ChainId, tokenAddress?: string): Promise<string | null> => {
    try {
      if (chainId === "ETH" && ethereumWallet.address) {
        const result = await blockchainExplorer.getEthereumBalance(ethereumWallet.address, tokenAddress);
        return result.success ? result.data : null;
      } else if (chainId === "XLM" && stellarWallet.address) {
        const result = await blockchainExplorer.getStellarBalance(stellarWallet.address);
        if (result.success) {
          // Find the specific asset balance
          const balances = result.data;
          if (tokenAddress) {
            // Token balance
            const tokenBalance = balances.find(b => 
              b.asset_code && b.asset_issuer === tokenAddress
            );
            return tokenBalance ? tokenBalance.balance : "0";
          } else {
            // Native XLM balance
            const xlmBalance = balances.find(b => b.asset_type === "native");
            return xlmBalance ? xlmBalance.balance : "0";
          }
        }
      }
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