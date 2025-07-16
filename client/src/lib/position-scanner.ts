import { ethers } from 'ethers';
import { rpcManager } from './rpc-manager';

/**
 * Enhanced Position Scanner for HyperEVM
 * Scans multiple DEX contracts to find existing liquidity positions
 */

// Known DEX factory addresses on HyperEVM - scan multiple possibilities
const DEX_FACTORIES = [
  "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Standard UniswapV2 factory
  "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", // PancakeSwap factory style
  "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac", // Alternative factory
  "0x1F98431c8aD98523631AE4a59f267346ea31F984", // UniswapV3 style
  "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap router
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Standard UniswapV2 router
  // HyperEVM specific contracts (to be found)
  "0x2222222222222222222222222222222222222222", // Bridge contract mentioned in docs
  "0x3333333333333333333333333333333333333333", // Potential HyperSwap factory
  "0x4444444444444444444444444444444444444444"  // Potential alternative DEX
];

// Popular HyperEVM token addresses to check pairs for
const POPULAR_TOKENS = [
  "0x0000000000000000000000000000000000000000", // Native HYPE
  "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", // WHYPE
  "0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b", // PURR
  "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", // USD₮0
  "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE", // BUDDY
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function allPairs(uint) external view returns (address pair)",
  "function allPairsLength() external view returns (uint)"
];

const PAIR_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];

interface LiquidityPosition {
  pairAddress: string;
  token0: string;
  token1: string;
  lpBalance: string;
  totalSupply: string;
  sharePercentage: number;
  reserves: {
    reserve0: string;
    reserve1: string;
  };
}

class PositionScanner {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = rpcManager.getProvider();
  }

  /**
   * Scan all known DEX factories for user's liquidity positions
   */
  async scanAllPositions(userAddress: string): Promise<LiquidityPosition[]> {
    console.log(`🔍 Scanning for liquidity positions for ${userAddress}...`);
    const positions: LiquidityPosition[] = [];

    // Method 1: Check specific token pairs across all factories
    for (const factory of DEX_FACTORIES) {
      try {
        const factoryPositions = await this.scanFactoryPositions(factory, userAddress);
        positions.push(...factoryPositions);
      } catch (error) {
        console.warn(`Failed to scan factory ${factory}:`, error);
      }
    }

    // Method 2: Scan all pairs in each factory (limited to prevent timeout)
    for (const factory of DEX_FACTORIES) {
      try {
        const allPairs = await this.scanAllPairsInFactory(factory, userAddress, 50); // Limit to 50 pairs
        positions.push(...allPairs);
      } catch (error) {
        console.warn(`Failed to scan all pairs in ${factory}:`, error);
      }
    }

    // Remove duplicates
    const uniquePositions = positions.filter((pos, index, self) => 
      index === self.findIndex(p => p.pairAddress.toLowerCase() === pos.pairAddress.toLowerCase())
    );

    console.log(`✅ Found ${uniquePositions.length} liquidity positions`);
    return uniquePositions;
  }

  /**
   * Check specific token pair combinations in a factory
   */
  private async scanFactoryPositions(factoryAddress: string, userAddress: string): Promise<LiquidityPosition[]> {
    const positions: LiquidityPosition[] = [];
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, this.provider);

    // Check all combinations of popular tokens
    for (let i = 0; i < POPULAR_TOKENS.length; i++) {
      for (let j = i + 1; j < POPULAR_TOKENS.length; j++) {
        try {
          const pairAddress = await factory.getPair(POPULAR_TOKENS[i], POPULAR_TOKENS[j]);
          
          if (pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000") {
            const position = await this.checkPairPosition(pairAddress, userAddress);
            if (position && parseFloat(position.lpBalance) > 0) {
              positions.push(position);
              console.log(`💎 Found position: ${position.token0}/${position.token1} - ${position.lpBalance} LP`);
            }
          }
        } catch (error) {
          // Silently continue if pair doesn't exist
        }
      }
    }

    return positions;
  }

  /**
   * Scan all pairs in a factory (limited for performance)
   */
  private async scanAllPairsInFactory(factoryAddress: string, userAddress: string, limit: number): Promise<LiquidityPosition[]> {
    const positions: LiquidityPosition[] = [];
    
    try {
      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, this.provider);
      const pairCount = await factory.allPairsLength();
      const maxPairs = Math.min(Number(pairCount), limit);

      console.log(`🔍 Scanning ${maxPairs} pairs in factory ${factoryAddress}`);

      for (let i = 0; i < maxPairs; i++) {
        try {
          const pairAddress = await factory.allPairs(i);
          const position = await this.checkPairPosition(pairAddress, userAddress);
          
          if (position && parseFloat(position.lpBalance) > 0) {
            positions.push(position);
            console.log(`💎 Found position in pair ${i}: ${position.lpBalance} LP`);
          }
        } catch (error) {
          // Continue scanning even if one pair fails
        }
      }
    } catch (error) {
      console.warn(`Factory scanning failed for ${factoryAddress}:`, error);
    }

    return positions;
  }

  /**
   * Check if user has position in specific pair
   */
  private async checkPairPosition(pairAddress: string, userAddress: string): Promise<LiquidityPosition | null> {
    try {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
      
      const [lpBalance, totalSupply, token0, token1, reserves] = await Promise.all([
        pair.balanceOf(userAddress),
        pair.totalSupply(),
        pair.token0(),
        pair.token1(),
        pair.getReserves()
      ]);

      const lpBalanceFormatted = ethers.formatEther(lpBalance);
      const totalSupplyFormatted = ethers.formatEther(totalSupply);
      const sharePercentage = parseFloat(lpBalanceFormatted) / parseFloat(totalSupplyFormatted) * 100;

      return {
        pairAddress,
        token0,
        token1,
        lpBalance: lpBalanceFormatted,
        totalSupply: totalSupplyFormatted,
        sharePercentage,
        reserves: {
          reserve0: ethers.formatEther(reserves.reserve0),
          reserve1: ethers.formatEther(reserves.reserve1)
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token symbol from address (best effort)
   */
  async getTokenSymbol(tokenAddress: string): Promise<string> {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      return "HYPE";
    }

    try {
      const contract = new ethers.Contract(tokenAddress, ["function symbol() view returns (string)"], this.provider);
      return await contract.symbol();
    } catch {
      return tokenAddress.slice(0, 8) + "...";
    }
  }
}

export const positionScanner = new PositionScanner();