import { ethers } from "ethers";
import * as StellarSdk from "@stellar/stellar-sdk";
import { ChainId, TxStatus, ApiResponse } from "../types";

/**
 * Blockchain explorer service for fetching transaction information
 * from Ethereum (via QuickNode) and Stellar (via public Horizon)
 */
export class BlockchainExplorerService {
  private ethereumProvider: ethers.JsonRpcProvider;
  private stellarServer: StellarSdk.Horizon.Server;
  private sorobanServer: StellarSdk.SorobanRpc.Server;

  constructor() {
    // Initialize Ethereum provider with QuickNode RPC from environment variable
    const ethereumRpcUrl = import.meta.env.VITE_ETHEREUM_RPC_URL || 
      "https://sepolia.infura.io/v3/demo"; // fallback to public endpoint
    
    this.ethereumProvider = new ethers.JsonRpcProvider(ethereumRpcUrl);

    // Initialize Stellar Horizon server (configurable testnet)
    const stellarHorizonUrl = import.meta.env.VITE_STELLAR_HORIZON_URL || 
      "https://horizon-testnet.stellar.org";
    this.stellarServer = new StellarSdk.Horizon.Server(stellarHorizonUrl);

    // Initialize Soroban RPC server (configurable testnet)
    const stellarSorobanUrl = import.meta.env.VITE_STELLAR_SOROBAN_URL || 
      "https://soroban-testnet.stellar.org";
    this.sorobanServer = new StellarSdk.SorobanRpc.Server(stellarSorobanUrl);
  }

  /**
   * Get Ethereum transaction details
   */
  async getEthereumTransaction(txHash: string): Promise<ApiResponse<any>> {
    try {
      const [transaction, receipt] = await Promise.all([
        this.ethereumProvider.getTransaction(txHash),
        this.ethereumProvider.getTransactionReceipt(txHash)
      ]);

      if (!transaction) {
        return {
          success: false,
          error: "Transaction not found"
        };
      }

      const block = receipt ? await this.ethereumProvider.getBlock(receipt.blockNumber) : null;

      return {
        success: true,
        data: {
          hash: transaction.hash,
          from: transaction.from,
          to: transaction.to,
          value: transaction.value.toString(),
          gasLimit: transaction.gasLimit.toString(),
          gasPrice: transaction.gasPrice?.toString(),
          nonce: transaction.nonce,
          data: transaction.data,
          blockNumber: receipt?.blockNumber,
          blockHash: receipt?.blockHash,
          transactionIndex: receipt?.transactionIndex,
          confirmations: transaction.confirmations,
          status: receipt?.status,
          gasUsed: receipt?.gasUsed?.toString(),
          effectiveGasPrice: receipt?.gasPrice?.toString(),
          timestamp: block?.timestamp,
          logs: receipt?.logs,
          contractAddress: receipt?.contractAddress,
          isPending: !receipt,
          isSuccessful: receipt?.status === 1,
          explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`
        }
      };
    } catch (error) {
      console.error("Error fetching Ethereum transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get Stellar transaction details
   */
  async getStellarTransaction(txHash: string): Promise<ApiResponse<any>> {
    try {
      const transaction = await this.stellarServer.transactions()
        .transaction(txHash)
        .call();

      const operations = await this.stellarServer.operations()
        .forTransaction(txHash)
        .call();

      const effects = await this.stellarServer.effects()
        .forTransaction(txHash)
        .call();

      return {
        success: true,
        data: {
          hash: transaction.hash,
          ledger: transaction.ledger,
          account: transaction.source_account,
          fee_charged: transaction.fee_charged,
          max_fee: transaction.max_fee,
          operation_count: transaction.operation_count,
          envelope_xdr: transaction.envelope_xdr,
          result_xdr: transaction.result_xdr,
          result_meta_xdr: transaction.result_meta_xdr,
          fee_meta_xdr: transaction.fee_meta_xdr,
          memo_type: transaction.memo_type,
          memo: transaction.memo,
          signatures: transaction.signatures,
          valid_after: transaction.valid_after,
          valid_before: transaction.valid_before,
          preconditions: transaction.preconditions,
          created_at: transaction.created_at,
          successful: transaction.successful,
          paging_token: transaction.paging_token,
          operations: operations.records,
          effects: effects.records,
          explorerUrl: `https://testnet.stellarchain.io/transactions/${txHash}`
        }
      };
    } catch (error) {
      if (error instanceof StellarSdk.NotFoundError) {
        return {
          success: false,
          error: "Transaction not found"
        };
      }

      console.error("Error fetching Stellar transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get Soroban contract transaction details
   */
  async getSorobanTransaction(txHash: string): Promise<ApiResponse<any>> {
    try {
      const transaction = await this.sorobanServer.getTransaction(txHash);

      return {
        success: true,
        data: {
          hash: txHash,
          status: transaction.status,
          ledger: transaction.ledger,
          created_at: transaction.createdAt,
          application_order: transaction.applicationOrder,
          fee_charged: transaction.feeCharged,
          envelope_xdr: transaction.envelopeXdr,
          result_xdr: transaction.resultXdr,
          result_meta_xdr: transaction.resultMetaXdr,
          successful: transaction.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS,
          explorerUrl: `https://testnet.stellarchain.io/transactions/${txHash}`
        }
      };
    } catch (error) {
      console.error("Error fetching Soroban transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get transaction status from blockchain
   */
  async getTransactionStatus(txHash: string, chainId: ChainId): Promise<ApiResponse<TxStatus>> {
    try {
      if (chainId === "ETH") {
        const result = await this.getEthereumTransaction(txHash);
        if (!result.success) {
          return { success: false, error: result.error };
        }

        const tx = result.data;
        let status: TxStatus;

        if (tx.isPending) {
          status = "pending";
        } else if (tx.isSuccessful) {
          status = "observed";
        } else {
          status = "failed";
        }

        return { success: true, data: status };

      } else if (chainId === "XLM") {
        const result = await this.getStellarTransaction(txHash);
        if (!result.success) {
          // Try Soroban if regular transaction not found
          const sorobanResult = await this.getSorobanTransaction(txHash);
          if (!sorobanResult.success) {
            return { success: true, data: "pending" }; // Assume pending if not found
          }
          
          const status: TxStatus = sorobanResult.data.successful ? "observed" : "failed";
          return { success: true, data: status };
        }

        const status: TxStatus = result.data.successful ? "observed" : "failed";
        return { success: true, data: status };

      } else {
        return {
          success: false,
          error: `Unsupported chain: ${chainId}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get account balance for Ethereum
   */
  async getEthereumBalance(address: string, tokenAddress?: string): Promise<ApiResponse<string>> {
    try {
      if (tokenAddress) {
        // ERC-20 token balance
        const tokenAbi = [
          "function balanceOf(address owner) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ];
        
        const contract = new ethers.Contract(tokenAddress, tokenAbi, this.ethereumProvider);
        const [balance, decimals] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals()
        ]);

        return {
          success: true,
          data: ethers.formatUnits(balance, decimals)
        };
      } else {
        // Native ETH balance
        const balance = await this.ethereumProvider.getBalance(address);
        return {
          success: true,
          data: ethers.formatEther(balance)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get account balance for Stellar
   */
  async getStellarBalance(address: string): Promise<ApiResponse<any[]>> {
    try {
      const account = await this.stellarServer.loadAccount(address);
      
      const balances = account.balances.map(balance => ({
        asset_type: balance.asset_type,
        asset_code: balance.asset_code,
        asset_issuer: balance.asset_issuer,
        balance: balance.balance,
        limit: balance.limit,
        buying_liabilities: balance.buying_liabilities,
        selling_liabilities: balance.selling_liabilities
      }));

      return {
        success: true,
        data: balances
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get recent transactions for an address
   */
  async getAddressTransactions(address: string, chainId: ChainId, limit = 10): Promise<ApiResponse<any[]>> {
    try {
      if (chainId === "ETH") {
        // For Ethereum, we'd need to use an indexing service like Etherscan API
        // or implement our own transaction scanning logic
        return {
          success: false,
          error: "Ethereum address transaction history requires additional indexing service"
        };

      } else if (chainId === "XLM") {
        const transactions = await this.stellarServer.transactions()
          .forAccount(address)
          .order("desc")
          .limit(limit)
          .call();

        return {
          success: true,
          data: transactions.records
        };

      } else {
        return {
          success: false,
          error: `Unsupported chain: ${chainId}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Monitor transaction status with polling
   */
  async monitorTransaction(
    txHash: string, 
    chainId: ChainId, 
    onStatusChange: (status: TxStatus) => void,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<void> {
    let attempts = 0;
    
    const poll = async () => {
      try {
        const result = await this.getTransactionStatus(txHash, chainId);
        
        if (result.success && result.data) {
          onStatusChange(result.data);
          
          // Stop polling if transaction is final
          if (result.data !== "pending") {
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, intervalMs);
        } else {
          onStatusChange("failed"); // Assume failed after max attempts
        }
      } catch (error) {
        console.error("Error monitoring transaction:", error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, intervalMs);
        } else {
          onStatusChange("failed");
        }
      }
    };

    poll();
  }

  /**
   * Get network information
   */
  async getNetworkInfo(chainId: ChainId): Promise<ApiResponse<any>> {
    try {
      if (chainId === "ETH") {
        const [network, blockNumber, gasPrice] = await Promise.all([
          this.ethereumProvider.getNetwork(),
          this.ethereumProvider.getBlockNumber(),
          this.ethereumProvider.getFeeData()
        ]);

        return {
          success: true,
          data: {
            chainId: network.chainId.toString(),
            name: network.name,
            blockNumber,
            gasPrice: gasPrice.gasPrice?.toString(),
            maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
          }
        };

      } else if (chainId === "XLM") {
        const ledger = await this.stellarServer.ledgers()
          .order("desc")
          .limit(1)
          .call();

        return {
          success: true,
          data: {
            network: "testnet",
            latestLedger: ledger.records[0],
            baseFee: StellarSdk.BASE_FEE,
            baseReserve: "0.5" // XLM
          }
        };

      } else {
        return {
          success: false,
          error: `Unsupported chain: ${chainId}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

// Export singleton instance
export const blockchainExplorer = new BlockchainExplorerService();

// Export class for testing
export { BlockchainExplorerService };