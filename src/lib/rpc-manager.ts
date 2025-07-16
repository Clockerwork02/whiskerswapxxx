import { ethers } from 'ethers';

// Multiple RPC endpoints for HyperEVM to handle rate limiting
export const HYPEREVM_RPC_ENDPOINTS = [
  'https://rpc.hyperliquid.xyz/evm',
  'https://hyperliquid-testnet.rpc.caldera.xyz/http',
  'https://hyperliquid.caldera.dev'
];

export class RpcManager {
  private static instance: RpcManager;
  private providers: ethers.JsonRpcProvider[] = [];
  private currentIndex = 0;
  private maxRetries = 3;

  private constructor() {
    this.initializeProviders();
  }

  static getInstance(): RpcManager {
    if (!RpcManager.instance) {
      RpcManager.instance = new RpcManager();
    }
    return RpcManager.instance;
  }

  private initializeProviders() {
    this.providers = HYPEREVM_RPC_ENDPOINTS.map(url => {
      return new ethers.JsonRpcProvider(url, {
        chainId: 999,
        name: 'HyperEVM'
      });
    });
  }

  async executeWithFallback<T>(
    operation: (provider: ethers.JsonRpcProvider) => Promise<T>,
    description = 'RPC operation'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      for (let i = 0; i < this.providers.length; i++) {
        const providerIndex = (this.currentIndex + i) % this.providers.length;
        const provider = this.providers[providerIndex];
        
        try {
          console.log(`🔄 Trying ${description} with RPC ${providerIndex + 1}/${this.providers.length}`);
          const result = await operation(provider);
          
          // Success - update current index for next time
          this.currentIndex = providerIndex;
          console.log(`✅ ${description} successful with RPC ${providerIndex + 1}`);
          return result;
          
        } catch (error: any) {
          lastError = error;
          console.warn(`⚠️ RPC ${providerIndex + 1} failed for ${description}:`, error.message);
          
          // If it's a rate limit error, try next RPC immediately
          if (error.message?.includes('rate limit') || 
              error.message?.includes('upstream') || 
              error.code === -32603) {
            continue;
          }
          
          // For other errors, still try next RPC but log the specific error
          if (error.code === 4001) {
            // User rejected - don't retry
            throw error;
          }
        }
      }
      
      // Wait before retrying all providers again
      if (attempt < this.maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 2}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All providers and retries failed
    throw new Error(`All RPC endpoints failed for ${description}. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async sendTransaction(
    signer: ethers.Signer,
    transaction: ethers.TransactionRequest
  ): Promise<ethers.TransactionResponse> {
    return this.executeWithFallback(async (provider) => {
      // Check if signer is connected and valid before proceeding
      if (!signer || !signer.provider) {
        throw new Error('Wallet not connected - please connect your wallet first');
      }
      
      // For browser wallet signers, use the existing connection
      let signerWithProvider: ethers.Signer;
      
      try {
        // Try to connect signer to provider - if it fails, use original signer
        signerWithProvider = signer.connect(provider);
      } catch (connectError) {
        console.warn('Could not connect signer to provider, using original signer:', connectError);
        signerWithProvider = signer;
      }
      
      // Add gas estimation with proper error handling
      try {
        if (!transaction.gasLimit) {
          const estimatedGas = await signerWithProvider.estimateGas(transaction);
          transaction.gasLimit = estimatedGas + estimatedGas / 10n; // Add 10% buffer
        }
        
        // Set gas price if not provided
        if (!transaction.gasPrice && !transaction.maxFeePerGas) {
          const feeData = await provider.getFeeData();
          if (feeData.gasPrice) {
            transaction.gasPrice = feeData.gasPrice + feeData.gasPrice / 10n; // Add 10% to gas price
          }
        }
        
        console.log('🚀 Sending transaction with config:', {
          to: transaction.to,
          gasLimit: transaction.gasLimit?.toString(),
          gasPrice: transaction.gasPrice?.toString(),
          value: transaction.value?.toString()
        });
        
        return await signerWithProvider.sendTransaction(transaction);
        
      } catch (error: any) {
        // Enhanced error handling for common issues
        if (error.code === -32603 && error.message?.includes('upstream')) {
          throw new Error('RPC rate limited - trying next endpoint');
        }
        if (error.code === 4001) {
          throw new Error('Transaction rejected by user');
        }
        if (error.message?.includes('insufficient funds')) {
          throw new Error('Insufficient balance for transaction + gas fees');
        }
        if (error.message?.includes('gas required exceeds allowance')) {
          throw new Error('Gas limit too low - please try again');
        }
        throw error;
      }
    }, 'transaction');
  }

  async estimateGas(
    signer: ethers.Signer,
    transaction: ethers.TransactionRequest
  ): Promise<bigint> {
    return this.executeWithFallback(async (provider) => {
      const signerWithProvider = signer.connect(provider);
      return await signerWithProvider.estimateGas(transaction);
    }, 'gas estimation');
  }

  async getBalance(address: string): Promise<bigint> {
    return this.executeWithFallback(async (provider) => {
      return await provider.getBalance(address);
    }, 'balance check');
  }

  async waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return this.executeWithFallback(async (provider) => {
      return await provider.waitForTransaction(txHash, 1, 30000); // 30 second timeout
    }, 'transaction confirmation');
  }

  // Get the current primary provider for read operations
  getProvider(): ethers.JsonRpcProvider {
    if (this.providers.length === 0) {
      throw new Error('No RPC providers available');
    }
    return this.providers[this.currentIndex];
  }

  // Get all available providers
  getAllProviders(): ethers.JsonRpcProvider[] {
    return [...this.providers];
  }
}

export const rpcManager = RpcManager.getInstance();