import { ethers } from 'ethers';

// Types for transaction monitoring
export interface EthereumTxStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  timestamp?: number;
}

export interface StellarTxStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  ledger?: number;
  timestamp?: number;
  operationCount?: number;
}

export interface SwitchlyAction {
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

export class BlockchainMonitor {
  private ethereumProvider: ethers.JsonRpcProvider;
  private stellarHorizonUrl: string;
  private switchlyMidgardUrl: string;

  constructor() {
    // Initialize Ethereum provider - using Switchly's Ethereum node
    this.ethereumProvider = new ethers.JsonRpcProvider(
      import.meta.env.VITE_ETHEREUM_RPC_URL || 'http://64.23.228.195:8545'
    );
    
    this.stellarHorizonUrl = import.meta.env.VITE_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    this.switchlyMidgardUrl = import.meta.env.VITE_SWITCHLY_MIDGARD_BASE_URL || 'http://64.23.228.195:8080';
  }

  // Monitor Ethereum transaction status
  async monitorEthereumTransaction(txHash: string): Promise<EthereumTxStatus> {
    try {
      console.log('🔍 Checking Ethereum tx on 64.23.228.195:8545:', txHash);
      const tx = await this.ethereumProvider.getTransaction(txHash);
      if (!tx) {
        console.log('❌ Ethereum tx not found:', txHash);
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0
        };
      }

      const receipt = await this.ethereumProvider.getTransactionReceipt(txHash);
      if (!receipt) {
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0,
          blockNumber: tx.blockNumber || undefined
        };
      }

      const currentBlock = await this.ethereumProvider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      // Get block timestamp
      const block = await this.ethereumProvider.getBlock(receipt.blockNumber);
      
      return {
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: block?.timestamp ? block.timestamp * 1000 : undefined
      };
    } catch (error) {
      console.error('Error monitoring Ethereum transaction:', error);
      return {
        hash: txHash,
        status: 'failed',
        confirmations: 0
      };
    }
  }

  // Monitor Stellar transaction status
  async monitorStellarTransaction(txHash: string): Promise<StellarTxStatus> {
    try {
      const response = await fetch(`${this.stellarHorizonUrl}/transactions/${txHash}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            hash: txHash,
            status: 'pending'
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const txData = await response.json();
      
      return {
        hash: txHash,
        status: txData.successful ? 'confirmed' : 'failed',
        ledger: parseInt(txData.ledger),
        timestamp: new Date(txData.created_at).getTime(),
        operationCount: txData.operation_count
      };
    } catch (error) {
      console.error('Error monitoring Stellar transaction:', error);
      return {
        hash: txHash,
        status: 'pending'
      };
    }
  }

  // Monitor destination address for incoming transactions with OUT:txhash memo
  async monitorDestinationAddress(
    destinationAddress: string, 
    sourceTxHash: string, 
    chain: 'ethereum' | 'stellar'
  ): Promise<{ hash: string; status: 'pending' | 'confirmed' | 'failed' } | null> {
    try {
      const cleanSourceTxHash = sourceTxHash.startsWith('0x') 
        ? sourceTxHash.slice(2).toUpperCase() 
        : sourceTxHash.toUpperCase();

      if (chain === 'stellar') {
        // Monitor Stellar address for incoming transactions
        console.log('🔍 Monitoring Stellar address for OUT memo:', destinationAddress);
        const response = await fetch(
          `${this.stellarHorizonUrl}/accounts/${destinationAddress}/transactions?order=desc&limit=20`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const transactions = data._embedded?.records || [];

        // Look for transaction with memo containing OUT:txhash (may be truncated with ...)
        for (const tx of transactions) {
          if (tx.memo && tx.memo_type === 'text') {
            const memo = tx.memo;
            if (memo.startsWith('OUT:')) {
              const memoTxHash = memo.slice(4); // Remove 'OUT:' prefix
              console.log('🔍 Checking memo:', memo, 'against source:', cleanSourceTxHash);
              
              // Handle truncated memo format: OUT:5CBA0D14...8DB2DB1EA46E
              if (memoTxHash.includes('...')) {
                const [start, end] = memoTxHash.split('...');
                // Check if source tx hash starts with the beginning part and ends with the end part
                if (cleanSourceTxHash.startsWith(start) && cleanSourceTxHash.endsWith(end)) {
                  console.log('✅ Found destination transaction with truncated OUT memo:', tx.hash, 'memo:', memo);
                  return {
                    hash: tx.hash,
                    status: tx.successful ? 'confirmed' : 'failed'
                  };
                }
              } else {
                // Handle non-truncated memo (full hash)
                if (cleanSourceTxHash === memoTxHash) {
                  console.log('✅ Found destination transaction with full OUT memo:', tx.hash, 'memo:', memo);
                  return {
                    hash: tx.hash,
                    status: tx.successful ? 'confirmed' : 'failed'
                  };
                }
              }
            }
          }
        }
      } else if (chain === 'ethereum') {
        // Monitor Ethereum router contract for transfer_out events
        console.log('🔍 Monitoring Ethereum router for transfer_out events to:', destinationAddress);
        
        const routerAddress = '0x5DB9A7629912EBF95876228C24A848de0bfB43A9';
        
        // Define the transfer_out event signature based on actual contract
        // emit TransferOut(msg.sender, to, asset, safeAmount, memo);
        const transferOutTopic = ethers.id("TransferOut(address,address,address,uint256,string)");
        
        try {
          // Get recent blocks to search for events
          const currentBlock = await this.ethereumProvider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 100); // Check last 100 blocks
          
          console.log('🔍 Searching blocks', fromBlock, 'to', currentBlock, 'for transfer_out events');
          
          // Filter for TransferOut events to our destination address
          // Note: Only the first 3 topics can be indexed, but the event signature suggests none are indexed
          // So we'll search all TransferOut events and filter by destination address in the decoded data
          const filter = {
            address: routerAddress,
            topics: [transferOutTopic], // Only filter by event signature
            fromBlock: fromBlock,
            toBlock: currentBlock
          };
          
          const logs = await this.ethereumProvider.getLogs(filter);
          console.log('📋 Found', logs.length, 'TransferOut events for address:', destinationAddress);
          
          // Check each event for matching destination address and OUT:TXHASH memo
          for (const log of logs) {
            try {
              // Decode the event - based on actual contract signature
              const iface = new ethers.Interface([
                "event TransferOut(address sender, address to, address asset, uint256 amount, string memo)"
              ]);
              const decoded = iface.parseLog(log);
              
              if (decoded) {
                const eventTo = decoded.args.to;
                const memo = decoded.args.memo;
                
                console.log('🔍 TransferOut event - to:', eventTo, 'memo:', memo, 'looking for:', destinationAddress);
                
                // First check if this event is for our destination address
                if (eventTo.toLowerCase() === destinationAddress.toLowerCase()) {
                  console.log('🔍 Checking TransferOut memo:', memo, 'for OUT:', cleanSourceTxHash);
                  
                  // Check if memo matches OUT:TXHASH format with our source transaction hash
                  if (memo && memo.startsWith('OUT:')) {
                    const memoTxHash = memo.slice(4); // Remove 'OUT:' prefix
                    
                    // Handle truncated memo format: OUT:5CBA0D14...8DB2DB1EA46E (same as Stellar)
                    if (memoTxHash.includes('...')) {
                      const [start, end] = memoTxHash.split('...');
                      if (cleanSourceTxHash.startsWith(start) && cleanSourceTxHash.endsWith(end)) {
                        console.log('✅ Found matching TransferOut event with truncated memo:', log.transactionHash, 'memo:', memo);
                        return {
                          hash: log.transactionHash,
                          status: 'confirmed'
                        };
                      }
                    } else {
                      // Handle full hash
                      if (cleanSourceTxHash === memoTxHash.toUpperCase()) {
                        console.log('✅ Found matching TransferOut event with full memo:', log.transactionHash, 'memo:', memo);
                        return {
                          hash: log.transactionHash,
                          status: 'confirmed'
                        };
                      }
                    }
                  }
                }
              }
            } catch (decodeError) {
              console.error('Error decoding TransferOut event:', decodeError);
            }
          }
          
          console.log('❌ No matching TransferOut events found for source tx:', cleanSourceTxHash);
          return null;
          
        } catch (error) {
          console.error('Error monitoring Ethereum router events:', error);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('Error monitoring destination address:', error);
      return null;
    }
  }

  // Monitor Switchly outbound queue for real-time transaction status
  async monitorSwitchlyActions(sourceTxHash: string): Promise<SwitchlyAction | null> {
    try {
      const response = await fetch(`${this.switchlyMidgardUrl.replace(':8080', ':1317')}/switchly/queue/outbound`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Switchly outbound queue response:', data);
      
      // Remove 0x prefix from Ethereum tx hash for matching
      const cleanSourceTxHash = sourceTxHash.startsWith('0x') 
        ? sourceTxHash.slice(2).toUpperCase() 
        : sourceTxHash.toUpperCase();
      
      console.log('🔍 Looking for tx hash:', cleanSourceTxHash);
      
      // Find transaction in outbound queue - API returns array directly
      const outboundTxs = Array.isArray(data) ? data : [];
      const matchingTx = outboundTxs.find((tx: any) => 
        tx.in_hash?.toUpperCase() === cleanSourceTxHash
      );

      if (matchingTx) {
        console.log('✅ Found matching transaction in outbound queue:', matchingTx);
        
        // Map the status based on outbound queue
        let switchlyStatus: 'pending' | 'success' | 'failed' = 'pending';
        let txType = 'swap';
        
        if (matchingTx.coin?.asset) {
          // Transaction is in outbound queue - check memo for type
          if (matchingTx.memo?.startsWith('REFUND')) {
            switchlyStatus = 'failed';
            txType = 'refund';
          } else if (matchingTx.memo?.startsWith('OUT')) {
            // Transaction processed successfully and going to destination chain
            switchlyStatus = 'success';
            txType = 'out';
          } else {
            // Other memo types - treat as processing
            switchlyStatus = 'pending';
            txType = 'processing';
          }
        } else {
          switchlyStatus = 'pending';
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
      }

      console.log('❌ No matching transaction found in outbound queue for:', sourceTxHash);
      return null;
    } catch (error) {
      console.error('Error monitoring Switchly outbound queue:', error);
      return null;
    }
  }

  // Get current block/ledger heights for progress indication
  async getNetworkHeights(): Promise<{
    ethereum: number;
    stellar: number;
    switchly: number;
  }> {
    try {
      const [ethBlock, stellarResponse, switchlyResponse] = await Promise.all([
        this.ethereumProvider.getBlockNumber(),
        fetch(`${this.stellarHorizonUrl}/ledgers?order=desc&limit=1`),
        fetch(`${this.switchlyMidgardUrl}/v2/network`)
      ]);

      let stellarHeight = 0;
      if (stellarResponse.ok) {
        const stellarData = await stellarResponse.json();
        stellarHeight = stellarData._embedded?.records?.[0]?.sequence || 0;
      }

      let switchlyHeight = 0;
      if (switchlyResponse.ok) {
        const switchlyData = await switchlyResponse.json();
        switchlyHeight = parseInt(switchlyData.blockHeight || '0');
      }

      return {
        ethereum: ethBlock,
        stellar: stellarHeight,
        switchly: switchlyHeight
      };
    } catch (error) {
      console.error('Error getting network heights:', error);
      return { ethereum: 0, stellar: 0, switchly: 0 };
    }
  }

  // Comprehensive cross-chain monitoring
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

    const monitor = async () => {
      if (!isMonitoring) return;

      try {
        // Monitor source transaction
        const sourceStatus = sourceChain === 'ethereum' 
          ? await this.monitorEthereumTransaction(sourceTxHash)
          : await this.monitorStellarTransaction(sourceTxHash);

        // Monitor Switchly actions
        const switchlyAction = await this.monitorSwitchlyActions(sourceTxHash);

        // Check if we have a target transaction from outbound queue
        if (switchlyAction?.out && switchlyAction.out.length > 0 && !targetTxHash) {
          targetTxHash = switchlyAction.out[0].txID;
        }

        // If no target tx from outbound queue, monitor destination address for OUT memo
        let targetStatus: EthereumTxStatus | StellarTxStatus | undefined;
        if (!targetTxHash && switchlyAction?.status === 'success') {
          // Look for destination transaction by monitoring address for OUT:txhash memo
          const destinationTx = await this.monitorDestinationAddress(
            destinationAddress,
            sourceTxHash,
            targetChain
          );
          
          if (destinationTx) {
            targetTxHash = destinationTx.hash;
            targetStatus = {
              hash: destinationTx.hash,
              status: destinationTx.status,
              ...(targetChain === 'ethereum' 
                ? { confirmations: 1, blockNumber: 0 } 
                : { ledger: 0, timestamp: Date.now() })
            } as EthereumTxStatus | StellarTxStatus;
          }
        } else if (targetTxHash) {
          // Monitor known target transaction
          targetStatus = targetChain === 'ethereum'
            ? await this.monitorEthereumTransaction(targetTxHash)
            : await this.monitorStellarTransaction(targetTxHash);
        }

        // Send update
        console.log('📡 Blockchain monitor update:', {
          source: sourceStatus,
          switchly: switchlyAction,
          target: targetStatus
        });
        
        onUpdate({
          source: sourceStatus,
          switchly: switchlyAction,
          target: targetStatus
        });

        // Continue monitoring if not completed
        if (
          sourceStatus.status === 'pending' ||
          !switchlyAction ||
          switchlyAction.status === 'pending' ||
          (switchlyAction.status === 'success' && (!targetStatus || targetStatus.status === 'pending'))
        ) {
          setTimeout(monitor, 3000); // Poll every 3 seconds
        } else {
          isMonitoring = false;
        }

      } catch (error) {
        console.error('Monitoring error:', error);
        if (isMonitoring) {
          setTimeout(monitor, 5000); // Retry after 5 seconds on error
        }
      }
    };

    // Start monitoring
    monitor();

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
  }
}

// Singleton instance
export const blockchainMonitor = new BlockchainMonitor();
