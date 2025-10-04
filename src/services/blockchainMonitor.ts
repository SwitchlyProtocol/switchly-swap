import { ethers } from 'ethers';

// Types for better type safety
interface EthereumTxStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber: number;
}

interface StellarTxStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  ledger: number;
  timestamp: number;
}

interface SwitchlyAction {
  date: string;
  height: string;
  status: 'pending' | 'success' | 'failed';
  type: string;
  in: Array<{
    address: string;
    txID: string;
    coins: Array<{
      amount: string;
      asset: string;
    }>;
  }>;
  out: Array<{
    address: string;
    txID: string;
    coins: Array<{
      amount: string;
      asset: string;
    }>;
  }>;
  metadata?: any;
}

// Clean logging utility
class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`🔍 ${message}`, data || '');
    }
  }

  static info(message: string, data?: any) {
    console.log(`ℹ️ ${message}`, data || '');
  }

  static warn(message: string, data?: any) {
    console.warn(`⚠️ ${message}`, data || '');
  }

  static error(message: string, error?: any) {
    console.error(`❌ ${message}`, error || '');
  }
}

export class BlockchainMonitor {
  private ethereumProvider: ethers.JsonRpcProvider;
  private ethereumRpcUrl: string;
  private stellarHorizonUrl: string;
  // private switchlyMidgardUrl: string; // Reserved for future use

  constructor() {
    // Initialize Ethereum provider
    this.ethereumRpcUrl = import.meta.env.VITE_ETHEREUM_RPC_URL || 
      `http://${import.meta.env.VITE_SWITCHLY_HOST || '64.23.228.195'}:8545`;
    
    this.ethereumProvider = new ethers.JsonRpcProvider(this.ethereumRpcUrl);
    
    this.stellarHorizonUrl = import.meta.env.VITE_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    
    // Use proxy in production to avoid CORS issues
    // const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
    // this.switchlyMidgardUrl = isProduction ? '/api/midgard' : (import.meta.env.VITE_SWITCHLY_MIDGARD_BASE_URL || '/api/midgard');
  }

  // Monitor Ethereum transaction with proper error handling
  async monitorEthereumTransaction(txHash: string): Promise<EthereumTxStatus> {
    try {
      Logger.debug('Checking Ethereum transaction', { txHash, rpc: this.ethereumRpcUrl });
      
      const tx = await this.ethereumProvider.getTransaction(txHash);
      if (!tx) {
        Logger.warn('Ethereum transaction not found', txHash);
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0,
          blockNumber: 0
        };
      }

      const receipt = await this.ethereumProvider.getTransactionReceipt(txHash);
      if (!receipt) {
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0,
          blockNumber: tx.blockNumber || 0
        };
      }

      const currentBlock = await this.ethereumProvider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      Logger.error('Error monitoring Ethereum transaction', error);
      return {
        hash: txHash,
        status: 'failed',
        confirmations: 0,
        blockNumber: 0
      };
    }
  }

  // Monitor Stellar transaction with proper error handling
  async monitorStellarTransaction(txHash: string): Promise<StellarTxStatus> {
    try {
      Logger.debug('Checking Stellar transaction', { txHash, horizon: this.stellarHorizonUrl });
      
      const response = await fetch(`${this.stellarHorizonUrl}/transactions/${txHash}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            hash: txHash,
            status: 'pending',
            ledger: 0,
            timestamp: Date.now()
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const txData = await response.json();
      
      return {
        hash: txHash,
        status: txData.successful ? 'confirmed' : 'failed',
        ledger: txData.ledger,
        timestamp: new Date(txData.created_at).getTime()
      };
    } catch (error) {
      Logger.error('Error monitoring Stellar transaction', error);
      return {
        hash: txHash,
        status: 'pending',
        ledger: 0,
        timestamp: Date.now()
      };
    }
  }

  // Monitor Switchly outbound queue with proper error handling and reduced polling
  async monitorSwitchlyActions(sourceTxHash: string): Promise<SwitchlyAction | null> {
    try {
      const url = `/api/switchly/queue/outbound`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Clean source tx hash for matching
      const cleanSourceTxHash = sourceTxHash.startsWith('0x') 
        ? sourceTxHash.slice(2).toUpperCase() 
        : sourceTxHash.toUpperCase();
      
      // Find matching transaction
      const outboundTxs = Array.isArray(data) ? data : [];
      const matchingTx = outboundTxs.find((tx: any) => 
        tx.in_hash?.toUpperCase() === cleanSourceTxHash
      );

      if (!matchingTx) {
        return null;
      }

      Logger.debug('Found matching transaction in outbound queue', matchingTx);
      
      // Determine status based on memo
      let switchlyStatus: 'pending' | 'success' | 'failed' = 'pending';
      let txType = 'swap';
      
      if (matchingTx.coin?.asset) {
        if (matchingTx.memo?.startsWith('REFUND')) {
          switchlyStatus = 'failed';
          txType = 'refund';
        } else if (matchingTx.memo?.startsWith('OUT')) {
          switchlyStatus = 'success';
          txType = 'out';
        }
      }

      return {
        date: matchingTx.scheduled_outbound_height || Date.now().toString(),
        height: matchingTx.scheduled_outbound_height || '0',
        status: switchlyStatus,
        type: txType,
        in: [{
          address: matchingTx.in_hash || '',
          txID: sourceTxHash,
          coins: []
        }],
        out: matchingTx.coin ? [{
          address: matchingTx.to_address || '',
          txID: matchingTx.out_hash || '',
          coins: [{
            amount: matchingTx.coin.amount || '0',
            asset: matchingTx.coin.asset || ''
          }]
        }] : [],
        metadata: {
          memo: matchingTx.memo,
          maxGas: matchingTx.max_gas,
          gasRate: matchingTx.gas_rate
        }
      };
    } catch (error) {
      Logger.error('Error monitoring Switchly outbound queue', error);
      return null;
    }
  }

  // Monitor destination address for incoming transactions
  async monitorDestinationAddress(
    destinationAddress: string, 
    targetChain: 'ethereum' | 'stellar', 
    sourceTxHash: string
  ): Promise<EthereumTxStatus | StellarTxStatus | undefined> {
    try {
      if (targetChain === 'stellar') {
        // Monitor Stellar destination address for transactions with OUT memo
        console.log('🔍 Monitoring Stellar destination address:', destinationAddress, 'for source tx:', sourceTxHash);
        const response = await fetch(`${this.stellarHorizonUrl}/accounts/${destinationAddress}/transactions?order=desc&limit=10`);
        
        if (!response.ok) {
          console.log('❌ Failed to fetch Stellar transactions:', response.status, response.statusText);
          return undefined;
        }

        const data = await response.json();
        const cleanSourceTxHash = sourceTxHash.startsWith('0x') 
          ? sourceTxHash.slice(2).toUpperCase() 
          : sourceTxHash.toUpperCase();

        console.log('🔍 Looking for source tx hash:', cleanSourceTxHash);
        console.log('🔍 Found', data._embedded?.records?.length || 0, 'transactions');

        // Look for transactions with OUT memo matching our source transaction
        for (const tx of data._embedded?.records || []) {
          console.log('🔍 Checking transaction:', tx.id, 'memo:', tx.memo);
          if (tx.memo && tx.memo.includes('OUT:')) {
            const memoHash = tx.memo.slice(tx.memo.indexOf('OUT:') + 4);
            console.log('🔍 Extracted memo hash:', memoHash);
            
            // Handle truncated memos (Stellar truncates with ...)
            if (memoHash.includes('...')) {
              // Stellar shows beginning...end format, e.g., "CA501D7C...7C1FAD1D4E2A"
              const parts = memoHash.split('...');
              const beginning = parts[0];
              const ending = parts[1];
              console.log('🔍 Truncated memo - beginning:', beginning, 'ending:', ending);
              
              // Check if source hash starts with beginning and ends with ending
              if (cleanSourceTxHash.startsWith(beginning) && cleanSourceTxHash.endsWith(ending)) {
                console.log('✅ Found matching Stellar destination transaction (truncated):', tx.id);
                return {
                  hash: tx.id,
                  status: tx.successful ? 'confirmed' : 'failed',
                  ledger: tx.ledger,
                  timestamp: new Date(tx.created_at).getTime()
                };
              }
            } else if (memoHash.toUpperCase() === cleanSourceTxHash) {
              console.log('✅ Found matching Stellar destination transaction (exact):', tx.id);
              return {
                hash: tx.id,
                status: tx.successful ? 'confirmed' : 'failed',
                ledger: tx.ledger,
                timestamp: new Date(tx.created_at).getTime()
              };
            }
          }
        }
        
        console.log('❌ No matching destination transaction found');
      } else if (targetChain === 'ethereum') {
        // Monitor Ethereum router contract for TransferOut events
        console.log('🔍 Monitoring Ethereum router for TransferOut events to:', destinationAddress);
        return await this.monitorEthereumRouterEvents(destinationAddress, sourceTxHash);
      }

      return undefined;
    } catch (error) {
      Logger.error('Error monitoring destination address', error);
      return undefined;
    }
  }

  // Monitor Ethereum router contract for TransferOut events
  async monitorEthereumRouterEvents(
    destinationAddress: string,
    sourceTxHash: string
  ): Promise<EthereumTxStatus | undefined> {
    try {
      const routerAddress = "0x5DB9A7629912EBF95876228C24A848de0bfB43A9";
      const cleanSourceTxHash = sourceTxHash.startsWith('0x') 
        ? sourceTxHash.slice(2).toUpperCase() 
        : sourceTxHash.toUpperCase();

      console.log('🔍 Checking Ethereum router events for destination:', destinationAddress);
      console.log('🔍 Looking for source tx hash in memo:', cleanSourceTxHash);

      // Get recent blocks to search for TransferOut events
      const currentBlock = await this.ethereumProvider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100); // Search last 100 blocks

      // TransferOut event signature
      const transferOutTopic = ethers.id("TransferOut(address,address,address,uint256,string)");
      
      // Get logs for TransferOut events
      const logs = await this.ethereumProvider.getLogs({
        address: routerAddress,
        topics: [transferOutTopic],
        fromBlock: fromBlock,
        toBlock: 'latest'
      });

      console.log(`🔍 Found ${logs.length} TransferOut events in blocks ${fromBlock}-${currentBlock}`);

      // Try multiple event signatures for decoding
      const possibleSignatures = [
        "event TransferOut(address indexed sender, address indexed to, address asset, uint256 amount, string memo)",
        "event TransferOut(address sender, address to, address asset, uint256 amount, string memo)",
        "event TransferOut(address indexed sender, address indexed to, address indexed asset, uint256 amount, string memo)"
      ];

      for (const log of logs) {
        console.log('🔍 Checking TransferOut event:', log.transactionHash);
        
        let decoded: ethers.LogDescription | null = null;
        for (const signature of possibleSignatures) {
          try {
            const iface = new ethers.Interface([signature]);
            decoded = iface.parseLog(log);
            break;
          } catch (e) {
            continue;
          }
        }

        if (decoded && decoded.args) {
          const toAddress = decoded.args[1] || decoded.args.to;
          const memo = decoded.args[4] || decoded.args.memo;
          
          console.log('🔍 TransferOut event details:', {
            to: toAddress,
            memo: memo,
            txHash: log.transactionHash
          });

          // Check if this event is to our destination address
          if (toAddress && toAddress.toLowerCase() === destinationAddress.toLowerCase()) {
            console.log('✅ Found TransferOut to our destination address!');
            
            // Check if memo contains our source transaction hash
            if (memo && typeof memo === 'string' && memo.includes('OUT:')) {
              const memoHash = memo.slice(memo.indexOf('OUT:') + 4).toUpperCase();
              console.log('🔍 Memo hash from TransferOut:', memoHash);
              
              if (memoHash === cleanSourceTxHash || cleanSourceTxHash.includes(memoHash)) {
                console.log('✅ Found matching Ethereum destination transaction:', log.transactionHash);
                
                // Get transaction receipt for confirmation status
                const receipt = await this.ethereumProvider.getTransactionReceipt(log.transactionHash);
                
                return {
                  hash: log.transactionHash,
                  status: receipt && receipt.status === 1 ? 'confirmed' : 'failed',
                  confirmations: currentBlock - (receipt?.blockNumber || 0),
                  blockNumber: receipt?.blockNumber || 0
                };
              }
            }
          }
        }
      }

      console.log('❌ No matching Ethereum TransferOut event found');
      return undefined;

    } catch (error) {
      Logger.error('Error monitoring Ethereum router events', error);
      return undefined;
    }
  }

  // Comprehensive monitoring with optimized polling intervals
  async startComprehensiveMonitoring(
    sourceTxHash: string,
    sourceChain: 'ethereum' | 'stellar',
    destinationAddress: string,
    onUpdate: (update: {
      source: EthereumTxStatus | StellarTxStatus;
      switchly: SwitchlyAction | null;
      target?: EthereumTxStatus | StellarTxStatus;
    }) => void
  ): Promise<() => void> {
    
    let isMonitoring = true;
    let targetTxHash: string | null = null;
    let targetChain: 'ethereum' | 'stellar' = sourceChain === 'ethereum' ? 'stellar' : 'ethereum';
    
    // Optimized polling intervals
    const INITIAL_INTERVAL = 2000; // 2 seconds initially
    const NORMAL_INTERVAL = 5000;  // 5 seconds normally
    const SLOW_INTERVAL = 10000;   // 10 seconds when confirmed
    
    let currentInterval = INITIAL_INTERVAL;

    const monitor = async () => {
      if (!isMonitoring) {
        Logger.debug('Monitoring stopped', sourceTxHash);
        return;
      }

      try {
        // Monitor source transaction
        const sourceStatus = sourceChain === 'ethereum' 
          ? await this.monitorEthereumTransaction(sourceTxHash)
          : await this.monitorStellarTransaction(sourceTxHash);

        // Monitor Switchly actions
        const switchlyAction = await this.monitorSwitchlyActions(sourceTxHash);

        // Get target transaction hash from outbound queue
        if (switchlyAction?.out && switchlyAction.out.length > 0 && !targetTxHash) {
          targetTxHash = switchlyAction.out[0].txID;
        }

        // Monitor target transaction if we have a hash
        let targetStatus: EthereumTxStatus | StellarTxStatus | undefined;
        if (targetTxHash) {
          targetStatus = targetChain === 'ethereum'
            ? await this.monitorEthereumTransaction(targetTxHash)
            : await this.monitorStellarTransaction(targetTxHash);
        } else if (switchlyAction?.status === 'success') {
          // If we don't have a target hash but Switchly is successful, 
          // try to find the destination transaction by monitoring the destination address
          console.log('🔍 Switchly successful but no target hash, monitoring destination address...');
          targetStatus = await this.monitorDestinationAddress(destinationAddress, targetChain, sourceTxHash);
          
          // If we found a transaction through destination monitoring, set the targetTxHash
          if (targetStatus && !targetTxHash) {
            targetTxHash = targetStatus.hash;
            console.log('✅ Set target hash from destination monitoring:', targetTxHash);
          }
        }

        // Update callback
        onUpdate({
          source: sourceStatus,
          switchly: switchlyAction,
          target: targetStatus
        });

        // Adjust polling interval based on status
        if (sourceStatus.status === 'confirmed' && switchlyAction?.status === 'success' && targetStatus?.status === 'confirmed') {
          // All confirmed - stop monitoring
          isMonitoring = false;
          return;
        } else if (sourceStatus.status === 'confirmed') {
          currentInterval = NORMAL_INTERVAL;
        } else {
          currentInterval = SLOW_INTERVAL;
        }

        // Continue monitoring
        if (isMonitoring) {
          setTimeout(monitor, currentInterval);
        }

      } catch (error) {
        Logger.error('Monitoring error', error);
        if (isMonitoring) {
          setTimeout(monitor, NORMAL_INTERVAL); // Retry with normal interval
        }
      }
    };

    // Start monitoring
    monitor();

    // Return cleanup function
    return () => {
      isMonitoring = false;
      Logger.debug('Monitoring cleanup called', sourceTxHash);
    };
  }
}

// Singleton instance
export const blockchainMonitor = new BlockchainMonitor();
