import {
  ApiResponse,
  InboundAddress,
  VaultInfo,
  SwapQuote,
  NetworkStatus,
  SwitchlyPool,
} from '../types';

/**
 * API client for Switchly Network
 */
class SwitchlyAPI {
  private baseUrl: string;
  private midgardUrl: string;

  constructor() {
    // Force proxy usage in production to avoid mixed content and CORS issues
    const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
    this.baseUrl = isProduction ? '/api/switchly' : (import.meta.env.VITE_SWITCHLY_API_BASE_URL || '/api/switchly');
    this.midgardUrl = isProduction ? '/api/midgard' : (import.meta.env.VITE_SWITCHLY_MIDGARD_BASE_URL || '/api/midgard');
    
    // Debug: Log API URLs being used
    console.log('🔧 API Service Configuration:');
    console.log('Base URL (Switchly API):', this.baseUrl);
    console.log('Midgard URL:', this.midgardUrl);
    console.log('Environment VITE_SWITCHLY_API_BASE_URL:', import.meta.env.VITE_SWITCHLY_API_BASE_URL);
    console.log('Environment VITE_SWITCHLY_MIDGARD_BASE_URL:', import.meta.env.VITE_SWITCHLY_MIDGARD_BASE_URL);
  }

  /**
   * Generic API request handler
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      console.log('🌐 API Request:', url);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        console.error('❌ API Request Failed:', {
          url,
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ API Request Exception:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get inbound addresses for all chains
   */
  async getInboundAddresses(): Promise<ApiResponse<InboundAddress[]>> {
    return this.request<InboundAddress[]>(`${this.baseUrl}/switchly/inbound_addresses`);
  }

  /**
   * Get vault information
   */
  async getVaults(): Promise<ApiResponse<VaultInfo[]>> {
    return this.request<VaultInfo[]>(`${this.baseUrl}/switchly/vaults/asgard`);
  }

  /**
   * Get network status combining inbound addresses and vaults
   */
  async getNetworkStatus(): Promise<ApiResponse<NetworkStatus>> {
    try {
      const [inboundResponse, vaultResponse] = await Promise.all([
        this.getInboundAddresses(),
        this.getVaults(),
      ]);

      if (!inboundResponse.success || !vaultResponse.success) {
        return {
          success: false,
          error: 'Failed to fetch network status',
        };
      }

      const networkStatus: NetworkStatus = {
        status: 'live',
        inbound_addresses: inboundResponse.data || [],
        vaults: vaultResponse.data || [],
        last_updated: new Date().toISOString(),
      };

      return {
        success: true,
        data: networkStatus,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get swap quote
   */
  async getSwapQuote(
    fromAsset: string,
    toAsset: string,
    amount: string,
    destinationAddress?: string
  ): Promise<ApiResponse<SwapQuote>> {
    const params = new URLSearchParams({
      from_asset: fromAsset,
      to_asset: toAsset,
      amount,
      ...(destinationAddress && { destination: destinationAddress }),
    });

    return this.request<SwapQuote>(
      `${this.midgardUrl}/v2/quote/swap?${params.toString()}`
    );
  }

  /**
   * Get transaction actions/history
   */
  async getActions(
    address?: string,
    type?: string,
    limit = 50,
    offset = 0
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(address && { address }),
      ...(type && { type }),
    });

    return this.request<any>(
      `${this.midgardUrl}/v2/actions?${params.toString()}`
    );
  }

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(txHash: string): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/actions/${txHash}`);
  }

  /**
   * Get pool information from Switchly Network
   */
  async getPools(): Promise<ApiResponse<SwitchlyPool[]>> {
    return this.request<SwitchlyPool[]>(`${this.baseUrl}/switchly/pools`);
  }

  /**
   * Get specific pool information
   */
  async getPool(asset: string): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/pool/${asset}`);
  }

  /**
   * Get network statistics
   */
  async getStats(): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/stats`);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>(`${this.midgardUrl}/v2/health`);
  }

  /**
   * Get constants (network configuration)
   */
  async getConstants(): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/thorchain/constants`);
  }

  /**
   * Get mimir configuration
   */
  async getMimir(): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/thorchain/mimir`);
  }

  /**
   * Get queue information
   */
  async getQueue(): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/thorchain/queue`);
  }

  /**
   * Simulate transaction
   */
  async simulateTransaction(
    fromAsset: string,
    toAsset: string,
    amount: string
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      from_asset: fromAsset,
      to_asset: toAsset,
      amount,
    });

    return this.request<any>(
      `${this.midgardUrl}/v2/quote/swap?${params.toString()}&simulate=true`
    );
  }

  /**
   * Get lending positions
   */
  async getLendingPositions(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/borrower/${address}`);
  }

  /**
   * Get savers positions
   */
  async getSaversPositions(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`${this.midgardUrl}/v2/saver/${address}`);
  }
}

// Export singleton instance
export const switchlyAPI = new SwitchlyAPI();

// Export class for testing
export { SwitchlyAPI };