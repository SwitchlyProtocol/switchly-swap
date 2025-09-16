import { useEffect, useState } from "react";
import { Tx } from "../types";
import { createSwap } from "../services/tx";
import useInboundAddresses from "./useInboundAddresses";

const apiUrl = import.meta.env.VITE_SWITCHLY_MIDGARD_BASE_URL || 'http://64.23.228.195:8080';
const websocketUrl = import.meta.env.VITE_SWITCHLY_SERVICE_WS || 'ws://64.23.228.195:8080';

function useTransactions() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const { getRouter, getVault, isLoading: addressesLoading } = useInboundAddresses();

  useEffect(() => {
    // Function to handle incoming WebSocket messages
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const newTransaction = JSON.parse(event.data) as Tx;

        // Update transactions state based on the incoming transaction
        setTransactions((prevTransactions) => {
          const existingTransactionIndex = prevTransactions.findIndex(
            (transaction) =>
              transaction.from_tx_hash === newTransaction.from_tx_hash
          );

          if (existingTransactionIndex !== -1) {
            // If the transaction already exists, update its status
            const updatedTransactions = [...prevTransactions];
            updatedTransactions[existingTransactionIndex].tx_status =
              newTransaction.tx_status;
              updatedTransactions[existingTransactionIndex].to_tx_hash =
              newTransaction.to_tx_hash
            return updatedTransactions;
          } else {
            // If it's a new transaction, add it to the list
            return [...prevTransactions, newTransaction];
          }
        });
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    // Open WebSocket connection
    const socket = new WebSocket(websocketUrl);

    // Add event listeners
    socket.onopen = () => {
      console.log("WebSocket connection established.");
    };

    socket.onmessage = handleWebSocketMessage;

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed. Attempting to reconnect...");
      // You might want to implement reconnection logic here
    };

    // Fetch initial transactions when the component mounts
    const fetchInitialTransactions = async () => {
      try {
        const response = await fetch(`${apiUrl}/transactions`);
        if (response.ok) {
          const initialTransactions = await response.json();
          setTransactions(initialTransactions.reverse());
        }
      } catch (error) {
        console.error("Error fetching initial transactions:", error);
      }
    };

    fetchInitialTransactions();

    // Clean up WebSocket connection
    return () => {
      console.log("Closing WebSocket connection...");
      socket.close();
    };
  }, []);

  // Function to handle creating a new transaction
  const handleCreateTransaction = async (
    fromToken: string,
    amount: number,
    toToken: string,
    toAddress: string
  ) => {
    // Create a new transaction with pending status
    const newTransaction: Tx = {
      from_network: fromToken === "USDC (Ethereum Sepolia)" ? "ETH" : "STELLAR",
      from_asset_code: "USDC",
      from_amount: amount,
      to_network: toToken === "USDC (Ethereum Sepolia)" ? "ETH" : "STELLAR",
      to_address: toAddress,
      to_asset_code: "USDC",
      tx_status: "pending",
      to_tx_hash: "",
      // Add other properties as needed
    };

    try {
      // Don't proceed if addresses are still loading
      if (addressesLoading) {
        throw new Error("Network addresses are still loading. Please try again.");
      }

      // Get dynamic router and vault addresses
      const routerAddresses = {
        eth: getRouter('ETH'),
        xlm: getRouter('XLM'),
      };
      
      const vaultAddresses = {
        eth: getVault('ETH'),
        xlm: getVault('XLM'),
      };

      // Make API call to create the swap with dynamic addresses
      const txResponse = await createSwap(newTransaction, routerAddresses, vaultAddresses);
      newTransaction.from_tx_hash = txResponse?.from_tx_hash;

      // Update transactions state to include the new transaction
      setTransactions((prevTransactions) => [
        newTransaction,
        ...prevTransactions,
      ]);

      return txResponse;
    } catch (error) {
      console.error("Error creating swap:", error);
      // Handle error if swap creation fails
      throw error;
    }
  };

  return { transactions, handleCreateTransaction };
}

export default useTransactions;
