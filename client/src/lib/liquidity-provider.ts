import { ethers } from "ethers";

// HyperSwap V2 Router and Factory addresses on HyperEVM
export const HYPERSWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
export const HYPERSWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

// Collector address for WhiskerSwap fees
export const COLLECTOR_ADDRESS = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

// HyperSwap V2 Router ABI (simplified)
export const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)"
];

// HyperSwap V2 Factory ABI (simplified)
export const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function createPair(address tokenA, address tokenB) external returns (address pair)"
];

// ERC20 Pair ABI (simplified)
export const PAIR_ABI = [
  "function totalSupply() external view returns (uint)",
  "function balanceOf(address owner) external view returns (uint)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function approve(address spender, uint value) external returns (bool)",
  "function transfer(address to, uint value) external returns (bool)"
];

export interface LiquidityParams {
  tokenA: string;
  tokenB: string;
  amountADesired: string;
  amountBDesired: string;
  amountAMin: string;
  amountBMin: string;
  slippageTolerance: number;
}

export interface RemoveLiquidityParams {
  tokenA: string;
  tokenB: string;
  liquidity: string;
  amountAMin: string;
  amountBMin: string;
}

export interface PoolInfo {
  pairAddress: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  userLiquidity: string;
  userShare: string;
}

export class LiquidityProvider {
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner;
  private routerContract: ethers.Contract;
  private factoryContract: ethers.Contract;

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
    this.routerContract = new ethers.Contract(HYPERSWAP_V2_ROUTER, ROUTER_ABI, signer);
    this.factoryContract = new ethers.Contract(HYPERSWAP_V2_FACTORY, FACTORY_ABI, provider);
  }

  /**
   * Add liquidity to a token pair
   */
  async addLiquidity(params: LiquidityParams): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log("🔄 Adding liquidity:", params);

      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      // Convert amounts to wei
      const amountADesired = ethers.parseUnits(params.amountADesired, 18);
      const amountBDesired = ethers.parseUnits(params.amountBDesired, 18);
      const amountAMin = ethers.parseUnits(params.amountAMin, 18);
      const amountBMin = ethers.parseUnits(params.amountBMin, 18);

      // Check if pair exists, create if needed
      const pairAddress = await this.factoryContract.getPair(params.tokenA, params.tokenB);
      if (pairAddress === ethers.ZeroAddress) {
        console.log("📦 Creating new pair...");
        // Note: Creating pairs requires factory ownership in real implementation
      }

      // Approve tokens for router
      await this.approveToken(params.tokenA, HYPERSWAP_V2_ROUTER, amountADesired);
      await this.approveToken(params.tokenB, HYPERSWAP_V2_ROUTER, amountBDesired);

      // Add liquidity
      const tx = await this.routerContract.addLiquidity(
        params.tokenA,
        params.tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        await this.signer.getAddress(),
        deadline
      );

      console.log("✅ Liquidity added, hash:", tx.hash);
      await tx.wait();

      return { success: true, hash: tx.hash };
    } catch (error: any) {
      console.error("❌ Add liquidity failed:", error);
      return { 
        success: false, 
        error: error.message || "Failed to add liquidity" 
      };
    }
  }

  /**
   * Add liquidity with ETH (HYPE)
   */
  async addLiquidityETH(
    token: string, 
    tokenAmount: string, 
    ethAmount: string,
    slippageTolerance: number = 0.5
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log("🔄 Adding liquidity with ETH:", { token, tokenAmount, ethAmount });

      const deadline = Math.floor(Date.now() / 1000) + 1800;
      const slippage = 1 - (slippageTolerance / 100);

      const amountTokenDesired = ethers.parseUnits(tokenAmount, 18);
      const amountETHDesired = ethers.parseEther(ethAmount);
      const amountTokenMin = ethers.parseUnits((parseFloat(tokenAmount) * slippage).toString(), 18);
      const amountETHMin = ethers.parseEther((parseFloat(ethAmount) * slippage).toString());

      // Approve token for router
      await this.approveToken(token, HYPERSWAP_V2_ROUTER, amountTokenDesired);

      // Add liquidity with ETH
      const tx = await this.routerContract.addLiquidityETH(
        token,
        amountTokenDesired,
        amountTokenMin,
        amountETHMin,
        await this.signer.getAddress(),
        deadline,
        { value: amountETHDesired }
      );

      console.log("✅ ETH liquidity added, hash:", tx.hash);
      await tx.wait();

      return { success: true, hash: tx.hash };
    } catch (error: any) {
      console.error("❌ Add ETH liquidity failed:", error);
      return { 
        success: false, 
        error: error.message || "Failed to add ETH liquidity" 
      };
    }
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log("🔄 Removing liquidity:", params);

      const deadline = Math.floor(Date.now() / 1000) + 1800;
      
      const liquidity = ethers.parseUnits(params.liquidity, 18);
      const amountAMin = ethers.parseUnits(params.amountAMin, 18);
      const amountBMin = ethers.parseUnits(params.amountBMin, 18);

      // Get pair address
      const pairAddress = await this.factoryContract.getPair(params.tokenA, params.tokenB);
      if (pairAddress === ethers.ZeroAddress) {
        throw new Error("Pair does not exist");
      }

      // Approve LP tokens for router
      await this.approveToken(pairAddress, HYPERSWAP_V2_ROUTER, liquidity);

      // Remove liquidity
      const tx = await this.routerContract.removeLiquidity(
        params.tokenA,
        params.tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        await this.signer.getAddress(),
        deadline
      );

      console.log("✅ Liquidity removed, hash:", tx.hash);
      await tx.wait();

      return { success: true, hash: tx.hash };
    } catch (error: any) {
      console.error("❌ Remove liquidity failed:", error);
      return { 
        success: false, 
        error: error.message || "Failed to remove liquidity" 
      };
    }
  }

  /**
   * Get pool information
   */
  async getPoolInfo(tokenA: string, tokenB: string, userAddress: string): Promise<PoolInfo | null> {
    try {
      const pairAddress = await this.factoryContract.getPair(tokenA, tokenB);
      if (pairAddress === ethers.ZeroAddress) {
        return null;
      }

      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
      
      const [reserves, totalSupply, userLiquidity, token0] = await Promise.all([
        pairContract.getReserves(),
        pairContract.totalSupply(),
        pairContract.balanceOf(userAddress),
        pairContract.token0()
      ]);

      const userShare = totalSupply > 0 
        ? ((userLiquidity * 10000n) / totalSupply).toString() 
        : "0";

      return {
        pairAddress,
        token0,
        token1: tokenA === token0 ? tokenB : tokenA,
        reserve0: ethers.formatUnits(reserves[0], 18),
        reserve1: ethers.formatUnits(reserves[1], 18),
        totalSupply: ethers.formatUnits(totalSupply, 18),
        userLiquidity: ethers.formatUnits(userLiquidity, 18),
        userShare: (parseFloat(userShare) / 100).toFixed(2)
      };
    } catch (error) {
      console.error("❌ Failed to get pool info:", error);
      return null;
    }
  }

  /**
   * Calculate optimal amounts for adding liquidity
   */
  async getOptimalAmounts(
    tokenA: string, 
    tokenB: string, 
    amountADesired: string
  ): Promise<{ amountA: string; amountB: string } | null> {
    try {
      const pairAddress = await this.factoryContract.getPair(tokenA, tokenB);
      if (pairAddress === ethers.ZeroAddress) {
        // New pair, amounts are whatever user wants
        return { amountA: amountADesired, amountB: "0" };
      }

      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
      const reserves = await pairContract.getReserves();
      const token0 = await pairContract.token0();
      
      const reserveA = tokenA === token0 ? reserves[0] : reserves[1];
      const reserveB = tokenA === token0 ? reserves[1] : reserves[0];

      if (reserveA > 0 && reserveB > 0) {
        const amountBOptimal = await this.routerContract.quote(
          ethers.parseUnits(amountADesired, 18),
          reserveA,
          reserveB
        );
        
        return {
          amountA: amountADesired,
          amountB: ethers.formatUnits(amountBOptimal, 18)
        };
      }

      return { amountA: amountADesired, amountB: "0" };
    } catch (error) {
      console.error("❌ Failed to calculate optimal amounts:", error);
      return null;
    }
  }

  /**
   * Approve token spending
   */
  private async approveToken(tokenAddress: string, spender: string, amount: bigint): Promise<void> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ["function approve(address spender, uint256 amount) external returns (bool)"],
      this.signer
    );

    const tx = await tokenContract.approve(spender, amount);
    await tx.wait();
    console.log("✅ Token approved:", tokenAddress);
  }

  /**
   * Calculate APR for a pool (simplified)
   */
  async calculatePoolAPR(tokenA: string, tokenB: string): Promise<string> {
    try {
      // In real implementation, this would:
      // 1. Get 24h volume from subgraph or API
      // 2. Calculate fees earned (volume * 0.3%)
      // 3. Calculate APR based on TVL
      
      // For now, return mock data
      const mockAPRs: { [key: string]: string } = {
        [`${tokenA}-${tokenB}`]: "15.7%",
        [`${tokenB}-${tokenA}`]: "15.7%"
      };
      
      return mockAPRs[`${tokenA}-${tokenB}`] || "12.5%";
    } catch (error) {
      console.error("❌ Failed to calculate APR:", error);
      return "0%";
    }
  }
}

/**
 * Create liquidity provider instance
 */
export function createLiquidityProvider(
  provider: ethers.BrowserProvider,
  signer: ethers.JsonRpcSigner
): LiquidityProvider {
  return new LiquidityProvider(provider, signer);
}

/**
 * Mock implementation for testing
 */
export function createMockLiquidityProvider() {
  return {
    async addLiquidity(params: LiquidityParams) {
      console.log("🧪 Mock: Adding liquidity", params);
      return { success: true, hash: "0x1234567890abcdef" };
    },
    
    async addLiquidityETH(token: string, tokenAmount: string, ethAmount: string) {
      console.log("🧪 Mock: Adding ETH liquidity", { token, tokenAmount, ethAmount });
      return { success: true, hash: "0x1234567890abcdef" };
    },
    
    async removeLiquidity(params: RemoveLiquidityParams) {
      console.log("🧪 Mock: Removing liquidity", params);
      return { success: true, hash: "0x1234567890abcdef" };
    },
    
    async getPoolInfo(tokenA: string, tokenB: string, userAddress: string): Promise<PoolInfo | null> {
      return {
        pairAddress: "0x1234567890abcdef1234567890abcdef12345678",
        token0: tokenA,
        token1: tokenB,
        reserve0: "1000000",
        reserve1: "50000000",
        totalSupply: "7071067",
        userLiquidity: "70710",
        userShare: "1.00"
      };
    },
    
    async getOptimalAmounts(tokenA: string, tokenB: string, amountADesired: string) {
      const amountB = (parseFloat(amountADesired) * 50).toString(); // Mock 1:50 ratio
      return { amountA: amountADesired, amountB };
    },
    
    async calculatePoolAPR(tokenA: string, tokenB: string) {
      return "15.7%";
    }
  };
}