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

  // High-frequency destination monitoring for real-time transaction detection
  async startHighFrequencyDestinationMonitoring(
    destinationAddress: string,
    sourceTxHash: string,
    chain: 'ethereum' | 'stellar',
    onUpdate: (tx: { hash: string; status: 'pending' | 'confirmed' | 'failed' } | null) => void,
    maxDuration: number = 120000 // 2 minutes max
  ): Promise<() => void> {
    let isMonitoring = true;
    let lastTxHash: string | null = null;
    const startTime = Date.now();

    const monitor = async () => {
      if (!isMonitoring || (Date.now() - startTime) > maxDuration) {
        isMonitoring = false;
        return;
      }

      try {
        const destinationTx = await this.monitorDestinationAddress(destinationAddress, sourceTxHash, chain);
        
        // Only trigger update if we found a new transaction or status changed
        if (destinationTx && destinationTx.hash !== lastTxHash) {
          console.log('🎯 Destination transaction detected:', destinationTx.hash, 'status:', destinationTx.status);
          lastTxHash = destinationTx.hash;
          onUpdate(destinationTx);
        } else if (!destinationTx && lastTxHash !== null) {
          // Transaction disappeared (shouldn't happen but handle it)
          lastTxHash = null;
          onUpdate(null);
        }

        // High-frequency polling for destination detection
        // Stellar: 300ms intervals, Ethereum: 500ms intervals (due to block times)
        const pollInterval = chain === 'stellar' ? 300 : 500;
        setTimeout(monitor, pollInterval);
      } catch (error) {
        console.error('High-frequency destination monitoring error:', error);
        setTimeout(monitor, 2000); // Back off to 2s on error
      }
    };

    // Start monitoring
    monitor();

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
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
          // Get recent blocks to search for events with expanded range
          const currentBlock = await this.ethereumProvider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 500); // Check last 500 blocks for better coverage
          
          console.log('🔍 Searching Ethereum blocks', fromBlock, 'to', currentBlock, 'for TransferOut events');
          console.log('🔍 Router address:', routerAddress);
          console.log('🔍 Destination address:', destinationAddress);
          console.log('🔍 Source tx hash:', cleanSourceTxHash);
          
          // Try multiple approaches to find the event
          
          // Approach 1: Search all TransferOut events (broad search)
          const broadFilter = {
            address: routerAddress,
            topics: [transferOutTopic],
            fromBlock: fromBlock,
            toBlock: currentBlock
          };
          
          const allLogs = await this.ethereumProvider.getLogs(broadFilter);
          console.log('📋 Found', allLogs.length, 'total TransferOut events in range');
          
          // Approach 2: Try to filter by destination address if events are indexed
          let filteredLogs = [];
          try {
            const addressFilter = {
              address: routerAddress,
              topics: [
                transferOutTopic,
                null, // sender (not filtering)
                ethers.zeroPadValue(destinationAddress.toLowerCase(), 32) // to address (try as indexed)
              ],
              fromBlock: fromBlock,
              toBlock: currentBlock
            };
            
            filteredLogs = await this.ethereumProvider.getLogs(addressFilter);
            console.log('📋 Found', filteredLogs.length, 'TransferOut events filtered by destination address');
          } catch (filterError) {
            console.log('⚠️ Address filtering failed, using broad search:', filterError.message);
            filteredLogs = allLogs;
          }
          
          const logs = filteredLogs.length > 0 ? filteredLogs : allLogs;
          
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
                    console.log('🔍 Comparing memo hash:', memoTxHash, 'with source:', cleanSourceTxHash);
                    
                    // Handle truncated memo format: OUT:5CBA0D14...8DB2DB1EA46E (same as Stellar)
                    if (memoTxHash.includes('...')) {
                      const [start, end] = memoTxHash.split('...');
                      console.log('🔍 Truncated memo - start:', start, 'end:', end);
                      if (cleanSourceTxHash.startsWith(start) && cleanSourceTxHash.endsWith(end)) {
                        console.log('✅ Found matching TransferOut event with truncated memo:', log.transactionHash, 'memo:', memo);
                        return {
                          hash: log.transactionHash,
                          status: 'confirmed'
                        };
                      }
                    } else {
                      // Handle full hash - try multiple comparison methods
                      const memoHashUpper = memoTxHash.toUpperCase();
                      if (cleanSourceTxHash === memoHashUpper || 
                          cleanSourceTxHash.includes(memoHashUpper) ||
                          memoHashUpper.includes(cleanSourceTxHash)) {
                        console.log('✅ Found matching TransferOut event with full memo:', log.transactionHash, 'memo:', memo);
                        return {
                          hash: log.transactionHash,
                          status: 'confirmed'
                        };
                      }
                    }
                  } else {
                    console.log('🔍 Event memo does not start with OUT:', memo);
                  }
                }
              }
            } catch (decodeError) {
              console.error('Error decoding TransferOut event:', decodeError);
            }
          }
          
          // Debug: Show all TransferOut events to this destination address for debugging
          console.log('🔍 Debug: Searching for ANY TransferOut events to destination address...');
          for (const log of logs) {
            try {
              const iface = new ethers.Interface([
                "event TransferOut(address sender, address to, address asset, uint256 amount, string memo)"
              ]);
              const decoded = iface.parseLog(log);
              
              if (decoded && decoded.args.to.toLowerCase() === destinationAddress.toLowerCase()) {
                console.log('🔍 Debug: Found TransferOut to destination:', {
                  txHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                  to: decoded.args.to,
                  memo: decoded.args.memo,
                  amount: decoded.args.amount.toString(),
                  asset: decoded.args.asset
                });
              }
            } catch (e) {
              // Ignore decode errors in debug
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

  // High-frequency Switchly monitoring specifically for real-time updates
  async startHighFrequencySwitchlyMonitoring(
    sourceTxHash: string,
    onUpdate: (action: SwitchlyAction | null) => void,
    maxDuration: number = 60000 // 1 minute max
  ): Promise<() => void> {
    let isMonitoring = true;
    let lastActionStatus: string | null = null;
    const startTime = Date.now();

    const monitor = async () => {
      if (!isMonitoring || (Date.now() - startTime) > maxDuration) {
        isMonitoring = false;
        return;
      }

      try {
        const switchlyAction = await this.monitorSwitchlyActions(sourceTxHash);
        
        // Only trigger update if status changed or it's the first time we found an action
        if (switchlyAction && switchlyAction.status !== lastActionStatus) {
          console.log('🚀 Switchly status change detected:', lastActionStatus, '->', switchlyAction.status);
          lastActionStatus = switchlyAction.status;
          onUpdate(switchlyAction);
        } else if (!switchlyAction && lastActionStatus !== null) {
          // Action disappeared from queue (shouldn't happen but handle it)
          lastActionStatus = null;
          onUpdate(null);
        }

        // Very aggressive polling - every 200ms for Switchly updates
        setTimeout(monitor, 200);
      } catch (error) {
        console.error('High-frequency Switchly monitoring error:', error);
        setTimeout(monitor, 1000); // Back off to 1s on error
      }
    };

    // Start monitoring
    monitor();

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
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
    let highFreqSwitchlyCleanup: (() => void) | null = null;
    let highFreqDestinationCleanup: (() => void) | null = null;

    const monitor = async () => {
      if (!isMonitoring) return;

      try {
        // Monitor source transaction
        const sourceStatus = sourceChain === 'ethereum' 
          ? await this.monitorEthereumTransaction(sourceTxHash)
          : await this.monitorStellarTransaction(sourceTxHash);

        // Start high-frequency Switchly monitoring once source is confirmed
        if (sourceStatus.status === 'confirmed' && !highFreqSwitchlyCleanup) {
          console.log('🚀 Starting high-frequency Switchly monitoring for', sourceTxHash);
          highFreqSwitchlyCleanup = await this.startHighFrequencySwitchlyMonitoring(
            sourceTxHash,
            (action) => {
              // Trigger immediate update when Switchly status changes
              console.log('⚡ High-frequency Switchly update:', action?.status);
              onUpdate({
                source: sourceStatus,
                switchly: action,
                target: undefined
              });
            }
          );
        }

        // Monitor Switchly actions (regular polling as backup)
        const switchlyAction = await this.monitorSwitchlyActions(sourceTxHash);

        // Check if we have a target transaction from outbound queue
        if (switchlyAction?.out && switchlyAction.out.length > 0 && !targetTxHash) {
          targetTxHash = switchlyAction.out[0].txID;
        }

        // Start high-frequency destination monitoring when Switchly is successful
        if (switchlyAction?.status === 'success' && !highFreqDestinationCleanup) {
          console.log('🎯 Starting high-frequency destination monitoring for', destinationAddress);
          highFreqDestinationCleanup = await this.startHighFrequencyDestinationMonitoring(
            destinationAddress,
            sourceTxHash,
            targetChain,
            (destinationTx) => {
              if (destinationTx) {
                console.log('⚡ High-frequency destination update:', destinationTx.hash, destinationTx.status);
                const targetStatus = {
                  hash: destinationTx.hash,
                  status: destinationTx.status,
                  ...(targetChain === 'ethereum' 
                    ? { confirmations: 1, blockNumber: 0 } 
                    : { ledger: 0, timestamp: Date.now() })
                } as EthereumTxStatus | StellarTxStatus;
                
                onUpdate({
                  source: sourceStatus,
                  switchly: switchlyAction,
                  target: targetStatus
                });
              }
            }
          );
        }

        // If no target tx from outbound queue, monitor destination address for OUT memo (backup)
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

        // Continue monitoring if not completed with aggressive polling for Switchly
        if (
          sourceStatus.status === 'pending' ||
          !switchlyAction ||
          switchlyAction.status === 'pending' ||
          (switchlyAction.status === 'success' && (!targetStatus || targetStatus.status === 'pending'))
        ) {
          // Use much more frequent polling for better real-time tracking
          // Switchly processing is typically fast, so we need high-frequency monitoring
          const pollInterval = !switchlyAction ? 500 : 1000; // 0.5s if no Switchly action yet, 1s otherwise
          setTimeout(monitor, pollInterval);
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
      if (highFreqSwitchlyCleanup) {
        highFreqSwitchlyCleanup();
      }
      if (highFreqDestinationCleanup) {
        highFreqDestinationCleanup();
      }
    };
  }
}

// Singleton instance
export const blockchainMonitor = new BlockchainMonitor();
