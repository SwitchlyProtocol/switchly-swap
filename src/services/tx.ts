import freighterApi from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { ethers } from "ethers";
import { 
  Transaction, 
  Asset, 
  ChainId, 
  TxStatus,
  ApiResponse
} from "../types";
import {
  ETHEREUM_ROUTER_FALLBACK,
  STELLAR_ROUTER_FALLBACK,
  ETHEREUM_VAULT_FALLBACK,
  STELLAR_VAULT_FALLBACK,
  ETHEREUM_CHAIN_ID,
  STELLAR_NETWORK_PASSPHRASE,
  GAS_LIMITS,
} from "../constants/assets";
import { generateSwapMemo, parseAssetAmount } from "../utils/assets";
import { switchlyAPI } from "./api";

// Legacy interface for backward compatibility
import { Tx } from "../types";

/**
 * Enhanced transaction service for Switchly Network
 */
export class SwitchlyTransactionService {
  
  /**
   * Create a swap transaction on Ethereum
   */
  async createEthereumSwap(
    fromAsset: Asset,
    toAsset: Asset,
    amount: string,
    destinationAddress: string,
    routerAddress?: string,
    vaultAddress?: string
  ): Promise<ApiResponse<Transaction>> {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request account access
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const fromAddress = await signer.getAddress();

      // Verify we're on the correct network
      const network = await provider.getNetwork();
      if (network.chainId.toString() !== parseInt(ETHEREUM_CHAIN_ID, 16).toString()) {
        throw new Error("Please switch to Ethereum Sepolia testnet");
      }

      // Use provided addresses or fallback to defaults
      const router = routerAddress || ETHEREUM_ROUTER_FALLBACK;
      const vault = vaultAddress || ETHEREUM_VAULT_FALLBACK;

      const memo = generateSwapMemo(toAsset.ticker, destinationAddress);
      const amountInBaseUnits = parseAssetAmount(amount, fromAsset);
      const expiryTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      let txResponse: any;

      if (fromAsset.isNative) {
        // Native ETH deposit
        const routerAbi = [
          "function depositWithExpiry(address payable vault, address asset, uint amount, string memory memo, uint expiration) external payable"
        ];
        
        const routerContract = new ethers.Contract(router, routerAbi, signer);
        
        txResponse = await routerContract.depositWithExpiry(
          vault,
          "0x0000000000000000000000000000000000000000", // ETH address
          amountInBaseUnits,
          memo,
          expiryTime,
          { 
            value: amountInBaseUnits,
            gasLimit: GAS_LIMITS.ETH_ROUTER_DEPOSIT 
          }
        );
      } else {
        // ERC-20 token deposit (USDC)
        const tokenAbi = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) external view returns (uint256)"
        ];

        const routerAbi = [
          "function depositWithExpiry(address payable vault, address asset, uint amount, string memory memo, uint expiration) external payable"
        ];

        const tokenContract = new ethers.Contract(fromAsset.address!, tokenAbi, signer);
        const routerContract = new ethers.Contract(router, routerAbi, signer);

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(fromAddress, router);
        
        // Approve if necessary
        if (currentAllowance < BigInt(amountInBaseUnits)) {
          const approveTx = await tokenContract.approve(router, amountInBaseUnits);
          await approveTx.wait();
        }

        // Deposit tokens
        txResponse = await routerContract.depositWithExpiry(
          vault,
          fromAsset.address,
          amountInBaseUnits,
          memo,
          expiryTime,
          { gasLimit: GAS_LIMITS.ETH_ROUTER_DEPOSIT }
        );
      }

      const transaction: Transaction = {
        id: `${fromAddress}-${Date.now()}`,
        from_asset: fromAsset,
        to_asset: toAsset,
        from_address: fromAddress,
        to_address: destinationAddress,
        from_amount: amountInBaseUnits,
        from_tx_hash: txResponse.hash,
        status: "pending",
        memo,
        created_at: new Date().toISOString(),
      };

      return {
        success: true,
        data: transaction,
      };

    } catch (error) {
      console.error("Ethereum swap error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create a swap transaction on Stellar using Soroban contract
   */
  async createStellarSwap(
    fromAsset: Asset,
    toAsset: Asset,
    amount: string,
    destinationAddress: string,
    routerAddress?: string,
    vaultAddress?: string
  ): Promise<ApiResponse<Transaction>> {
    try {
      const SERVER_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
      const server = new StellarSdk.Horizon.Server(SERVER_URL);

      // Get user's public key from Freighter
      const sourceAccount = await freighterApi.getPublicKey();
      const account = await server.loadAccount(sourceAccount);

      // Use provided addresses or fallback to defaults
      const router = routerAddress || STELLAR_ROUTER_FALLBACK;
      const vault = vaultAddress || STELLAR_VAULT_FALLBACK;

      const memo = generateSwapMemo(toAsset.ticker, destinationAddress);
      const amountInBaseUnits = parseAssetAmount(amount, fromAsset);

      // Build Soroban contract invocation transaction
      let transaction: StellarSdk.Transaction;

      if (fromAsset.isNative) {
        // Native XLM deposit via Soroban contract
        transaction = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
        })
          .addOperation(
            StellarSdk.Operation.invokeHostFunction({
              func: StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(
                new StellarSdk.xdr.InvokeContractArgs({
                  contractAddress: StellarSdk.Address.fromString(router).toScAddress(),
                  functionName: "deposit",
                  args: [
                    StellarSdk.Address.fromString(sourceAccount).toScVal(), // from
                    StellarSdk.Address.fromString(vault).toScVal(), // vault
                    StellarSdk.nativeToScVal("native"), // asset (native XLM)
                    StellarSdk.nativeToScVal(BigInt(amountInBaseUnits)), // amount
                    StellarSdk.nativeToScVal(memo), // memo
                  ],
                })
              ),
              auth: [],
            })
          )
          .setTimeout(300)
          .build();
      } else {
        // Token deposit (USDC) via Soroban contract
        const assetContract = StellarSdk.Address.fromString(fromAsset.address!);
        
        transaction = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
        })
          .addOperation(
            StellarSdk.Operation.invokeHostFunction({
              func: StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(
                new StellarSdk.xdr.InvokeContractArgs({
                  contractAddress: StellarSdk.Address.fromString(router).toScAddress(),
                  functionName: "deposit",
                  args: [
                    StellarSdk.Address.fromString(sourceAccount).toScVal(), // from
                    StellarSdk.Address.fromString(vault).toScVal(), // vault
                    assetContract.toScVal(), // asset contract
                    StellarSdk.nativeToScVal(BigInt(amountInBaseUnits)), // amount
                    StellarSdk.nativeToScVal(memo), // memo
                  ],
                })
              ),
              auth: [],
            })
          )
          .setTimeout(300)
          .build();
      }

      // Sign transaction with Freighter
      const xdr = transaction.toXDR(); 
      const signedXdr = await freighterApi.signTransaction(xdr, {
        network: "TESTNET",
        accountToSign: sourceAccount,
      });

      // Submit transaction
      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        SERVER_URL
      );

      const response = await server.submitTransaction(signedTransaction);

      const transactionData: Transaction = {
        id: `${sourceAccount}-${Date.now()}`,
        from_asset: fromAsset,
        to_asset: toAsset,
        from_address: sourceAccount,
        to_address: destinationAddress,
        from_amount: amountInBaseUnits,
        from_tx_hash: response.hash,
        status: "pending",
        memo,
        created_at: new Date().toISOString(),
      };

      return {
        success: true,
        data: transactionData,
      };

    } catch (error) {
      console.error("Stellar swap error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get transaction status from blockchain
   */
  async getTransactionStatus(txHash: string, chainId: ChainId): Promise<ApiResponse<TxStatus>> {
    try {
      if (chainId === "ETH") {
        return await this.getEthereumTransactionStatus(txHash);
      } else if (chainId === "XLM") {
        return await this.getStellarTransactionStatus(txHash);
      } else {
        throw new Error(`Unsupported chain: ${chainId}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Ethereum transaction status
   */
  private async getEthereumTransactionStatus(txHash: string): Promise<ApiResponse<TxStatus>> {
    try {
      const ethereumRpcUrl = import.meta.env.VITE_ETHEREUM_RPC_URL || 
        "https://sepolia.infura.io/v3/demo"; // fallback to public endpoint
      
      const provider = new ethers.JsonRpcProvider(ethereumRpcUrl);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { success: true, data: "pending" };
      }

      const status: TxStatus = receipt.status === 1 ? "observed" : "failed";
      return { success: true, data: status };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get Stellar transaction status
   */
  private async getStellarTransactionStatus(txHash: string): Promise<ApiResponse<TxStatus>> {
    try {
      const stellarHorizonUrl = import.meta.env.VITE_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
      const server = new StellarSdk.Horizon.Server(stellarHorizonUrl);
      const transaction = await server.transactions().transaction(txHash).call();

      const status: TxStatus = transaction.successful ? "observed" : "failed";
      return { success: true, data: status };

    } catch (error) {
      if (error instanceof StellarSdk.NotFoundError) {
        return { success: true, data: "pending" };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get comprehensive transaction information from multiple sources
   */
  async getTransactionInfo(txHash: string, chainId: ChainId): Promise<ApiResponse<any>> {
    try {
      // Get from blockchain
      const blockchainStatus = await this.getTransactionStatus(txHash, chainId);
      
      // Get from Switchly API
      const switchlyInfo = await switchlyAPI.getTransactionByHash(txHash);

      return {
        success: true,
        data: {
          blockchain: blockchainStatus.data,
          switchly: switchlyInfo.data,
          combined_status: blockchainStatus.data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Create singleton instance
export const switchlyTxService = new SwitchlyTransactionService();

// Legacy function for backward compatibility
export async function createSwap(
  tx: Tx, 
  routerAddresses?: { eth?: string; xlm?: string },
  vaultAddresses?: { eth?: string; xlm?: string }
): Promise<Tx | undefined> {
  try {
    // Convert legacy Tx to new format
    const fromAsset: Asset = {
      chain: tx.from_network as ChainId,
      symbol: tx.from_asset_code as any,
      ticker: `${tx.from_asset_code}.${tx.from_network}`,
      decimals: tx.from_network === "ETH" ? (tx.from_asset_code === "ETH" ? 18 : 6) : 7,
      isNative: tx.from_asset_code === "ETH" || tx.from_asset_code === "XLM",
      address: tx.from_asset_issuer,
    };

    const toAsset: Asset = {
      chain: tx.to_network as ChainId,
      symbol: tx.to_asset_code as any,
      ticker: `${tx.to_asset_code}.${tx.to_network}`,
      decimals: tx.to_network === "ETH" ? (tx.to_asset_code === "ETH" ? 18 : 6) : 7,
      isNative: tx.to_asset_code === "ETH" || tx.to_asset_code === "XLM",
      address: tx.to_asset_issuer,
    };

    let result: ApiResponse<Transaction>;

    if (tx.from_network === "ETH") {
      result = await switchlyTxService.createEthereumSwap(
        fromAsset,
        toAsset,
        tx.from_amount.toString(),
        tx.to_address!,
        routerAddresses?.eth,
        vaultAddresses?.eth
      );
    } else if (tx.from_network === "STELLAR") {
      result = await switchlyTxService.createStellarSwap(
        fromAsset,
        toAsset,
        tx.from_amount.toString(),
        tx.to_address!,
        routerAddresses?.xlm,
        vaultAddresses?.xlm
      );
    } else {
      throw new Error(`Unsupported network: ${tx.from_network}`);
    }

    if (result.success && result.data) {
      // Convert back to legacy format
      return {
        ...tx,
        from_tx_hash: result.data.from_tx_hash,
        tx_status: result.data.status,
      };
    }

    throw new Error(result.error || "Transaction failed");
  } catch (error) {
    console.error("Legacy createSwap error:", error);
    return undefined;
  }
}
