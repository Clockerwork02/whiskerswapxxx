import { ethers } from "ethers";
import { rpcManager } from "./rpc-manager";
import { prepareHyperEVMTransaction } from './hyperevm-gas';

// Real HyperEVM DEX contract addresses - Updated for HyperEVM Chain ID 999
export const HYPEREVM_DEX_CONTRACTS = {
  // HyperSwap is the main DEX on HyperEVM - these are likely different addresses
  HYPERSWAP_V2_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Placeholder - need real HyperEVM address
  HYPERSWAP_V2_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Placeholder - need real HyperEVM address
  WETH: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", // WHYPE on HyperEVM
  // Alternative factories that might exist on HyperEVM
  UNISWAP_V2_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  UNISWAP_V2_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  // Pancake-style factories (common on alt chains)
  PANCAKE_FACTORY: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
  PANCAKE_ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
};

// Real token addresses on HyperEVM
export const REAL_TOKEN_ADDRESSES = {
  HYPE: "0x0000000000000000000000000000000000000000", // Native token
  WHYPE: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E",
  PURR: "0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b",
  USDT0: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
  BUDDY: "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE",
  CATBAL: "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49",
  LIQD: "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa",
  PiP: "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309",
  perpcoin: "0xD2567eE20D75e8B74B44875173054365f6Eb5052"
};

// UniswapV2 Router ABI (essential functions)
const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

// UniswapV2 Factory ABI
const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function createPair(address tokenA, address tokenB) external returns (address pair)"
];

// ERC20 ABI
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

// Pair ABI for liquidity info
const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

export interface RealLiquidityPool {
  name: string;
  tokenA: string;
  tokenB: string;
  tokenAAddress: string;
  tokenBAddress: string;
  pairAddress: string | null;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  userLPBalance: string;
  realTVL: string;
  apr: string;
}

export interface LiquidityResult {
  success: boolean;
  hash?: string;
  error?: string;
  liquidityTokens?: string;
}

class RealLiquiditySystem {
  private provider: ethers.JsonRpcProvider;
  private routerContract: ethers.Contract | null = null;
  private factoryContract: ethers.Contract | null = null;

  constructor() {
    this.provider = rpcManager.getProvider();
    this.initializeContracts();
  }

  private initializeContracts() {
    try {
      this.routerContract = new ethers.Contract(
        HYPEREVM_DEX_CONTRACTS.HYPERSWAP_V2_ROUTER,
        ROUTER_ABI,
        this.provider
      );
      
      this.factoryContract = new ethers.Contract(
        HYPEREVM_DEX_CONTRACTS.HYPERSWAP_V2_FACTORY,
        FACTORY_ABI,
        this.provider
      );

      console.log("✅ Real liquidity contracts initialized");
    } catch (error) {
      console.error("❌ Failed to initialize liquidity contracts:", error);
    }
  }

  /**
   * Get real pair address from factory
   */
  async getPairAddress(tokenA: string, tokenB: string): Promise<string | null> {
    try {
      if (!this.factoryContract) return null;
      
      const pairAddress = await this.factoryContract.getPair(tokenA, tokenB);
      return pairAddress === "0x0000000000000000000000000000000000000000" ? null : pairAddress;
    } catch (error) {
      console.warn(`Could not get pair for ${tokenA}/${tokenB}:`, error);
      return null;
    }
  }

  /**
   * Get real liquidity pool data
   */
  async getRealPoolData(
    tokenA: string, 
    tokenB: string, 
    userAddress?: string
  ): Promise<RealLiquidityPool | null> {
    try {
      const tokenAAddress = REAL_TOKEN_ADDRESSES[tokenA as keyof typeof REAL_TOKEN_ADDRESSES];
      const tokenBAddress = REAL_TOKEN_ADDRESSES[tokenB as keyof typeof REAL_TOKEN_ADDRESSES];
      
      if (!tokenAAddress || !tokenBAddress) return null;

      const pairAddress = await this.getPairAddress(tokenAAddress, tokenBAddress);
      if (!pairAddress) return null;

      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
      
      const [reserves, totalSupply, token0] = await Promise.all([
        pairContract.getReserves(),
        pairContract.totalSupply(),
        pairContract.token0()
      ]);

      // Determine which reserve belongs to which token
      const isToken0A = token0.toLowerCase() === tokenAAddress.toLowerCase();
      const reserve0 = isToken0A ? reserves.reserve0 : reserves.reserve1;
      const reserve1 = isToken0A ? reserves.reserve1 : reserves.reserve0;

      // Get user LP balance if address provided
      let userLPBalance = "0";
      if (userAddress) {
        try {
          const lpBalance = await pairContract.balanceOf(userAddress);
          userLPBalance = ethers.formatEther(lpBalance);
        } catch (e) {
          console.warn("Could not fetch user LP balance:", e);
        }
      }

      // Calculate TVL (simplified - using reserves)
      const reserve0Formatted = ethers.formatEther(reserve0);
      const reserve1Formatted = ethers.formatEther(reserve1);
      const estimatedTVL = parseFloat(reserve0Formatted) * 49 + parseFloat(reserve1Formatted) * 49; // Rough estimate

      return {
        name: `${tokenA}/${tokenB}`,
        tokenA,
        tokenB,
        tokenAAddress,
        tokenBAddress,
        pairAddress,
        reserve0: reserve0Formatted,
        reserve1: reserve1Formatted,
        totalSupply: ethers.formatEther(totalSupply),
        userLPBalance,
        realTVL: `$${(estimatedTVL / 1000000).toFixed(2)}M`,
        apr: "0%" // Would need historical data to calculate real APR
      };
    } catch (error) {
      console.error(`Failed to get pool data for ${tokenA}/${tokenB}:`, error);
      return null;
    }
  }

  /**
   * Check if tokens need approval for router
   */
  async checkApproval(
    tokenAddress: string,
    userAddress: string,
    amount: string,
    signer: ethers.Signer
  ): Promise<boolean> {
    try {
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        return true; // Native token doesn't need approval
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const allowance = await tokenContract.allowance(userAddress, HYPEREVM_DEX_CONTRACTS.HYPERSWAP_V2_ROUTER);
      const amountWei = ethers.parseEther(amount);
      
      return allowance >= amountWei;
    } catch (error) {
      console.error("Failed to check approval:", error);
      return false;
    }
  }

  /**
   * Approve tokens for router spending
   */
  async approveToken(
    tokenAddress: string,
    amount: string,
    signer: ethers.Signer
  ): Promise<LiquidityResult> {
    try {
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        return { success: true }; // Native token doesn't need approval
      }

      console.log(`🔑 Approving ${amount} tokens for router...`);
      
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const amountWei = ethers.parseEther(amount);
      
      const gasConfig = prepareHyperEVMTransaction('approval');
      
      const tx = await tokenContract.approve(HYPEREVM_DEX_CONTRACTS.HYPERSWAP_V2_ROUTER, amountWei, gasConfig);
      const receipt = await tx.wait();
      
      console.log(`✅ Token approval successful: ${receipt.hash}`);
      return { success: true, hash: receipt.hash };
    } catch (error: any) {
      console.error("❌ Token approval failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add real liquidity to HyperEVM DEX
   */
  async addRealLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    userAddress: string,
    signer: ethers.Signer,
    slippageTolerance = 0.5
  ): Promise<LiquidityResult> {
    try {
      if (!this.routerContract) {
        throw new Error("Router contract not initialized");
      }

      const tokenAAddress = REAL_TOKEN_ADDRESSES[tokenA as keyof typeof REAL_TOKEN_ADDRESSES];
      const tokenBAddress = REAL_TOKEN_ADDRESSES[tokenB as keyof typeof REAL_TOKEN_ADDRESSES];

      if (!tokenAAddress || !tokenBAddress) {
        throw new Error("Invalid token addresses");
      }

      console.log(`🏊‍♂️ Adding real liquidity: ${amountA} ${tokenA} + ${amountB} ${tokenB}`);

      const routerWithSigner = this.routerContract.connect(signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // Calculate minimum amounts with slippage tolerance
      const minAmountA = ethers.parseEther((parseFloat(amountA) * (1 - slippageTolerance / 100)).toString());
      const minAmountB = ethers.parseEther((parseFloat(amountB) * (1 - slippageTolerance / 100)).toString());

      // Fixed gas configuration for HyperEVM - use Type 0 legacy transactions
      const gasConfig = prepareHyperEVMTransaction('liquidity');

      let tx;

      if (tokenAAddress === "0x0000000000000000000000000000000000000000") {
        // Adding liquidity with native HYPE
        const amountTokenDesired = ethers.parseEther(amountB);
        const amountTokenMin = minAmountB;
        const amountETHMin = minAmountA;
        const value = ethers.parseEther(amountA);

        tx = await routerWithSigner.addLiquidityETH(
          tokenBAddress,
          amountTokenDesired,
          amountTokenMin,
          amountETHMin,
          userAddress,
          deadline,
          { value, ...gasConfig }
        );
      } else if (tokenBAddress === "0x0000000000000000000000000000000000000000") {
        // Adding liquidity with native HYPE (tokenB is HYPE)
        const amountTokenDesired = ethers.parseEther(amountA);
        const amountTokenMin = minAmountA;
        const amountETHMin = minAmountB;
        const value = ethers.parseEther(amountB);

        tx = await routerWithSigner.addLiquidityETH(
          tokenAAddress,
          amountTokenDesired,
          amountTokenMin,
          amountETHMin,
          userAddress,
          deadline,
          { value, ...gasConfig }
        );
      } else {
        // Adding liquidity with two ERC20 tokens
        const amountADesired = ethers.parseEther(amountA);
        const amountBDesired = ethers.parseEther(amountB);

        tx = await routerWithSigner.addLiquidity(
          tokenAAddress,
          tokenBAddress,
          amountADesired,
          amountBDesired,
          minAmountA,
          minAmountB,
          userAddress,
          deadline,
          gasConfig
        );
      }

      console.log("⏳ Waiting for liquidity transaction confirmation...");
      const receipt = await tx.wait();
      
      console.log(`✅ Real liquidity added successfully: ${receipt.hash}`);
      
      return {
        success: true,
        hash: receipt.hash,
        liquidityTokens: "LP tokens received" // Would need to parse logs for exact amount
      };

    } catch (error: any) {
      console.error("❌ Real liquidity addition failed:", error);
      
      let errorMessage = error.message;
      if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient balance for transaction + gas fees";
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Transaction may fail - check token balances and allowances";
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get available liquidity pools
   */
  async getAvailablePools(userAddress?: string): Promise<RealLiquidityPool[]> {
    const poolConfigs = [
      { tokenA: "HYPE", tokenB: "USDT0" },
      { tokenA: "HYPE", tokenB: "PURR" },
      { tokenA: "HYPE", tokenB: "BUDDY" },
      { tokenA: "WHYPE", tokenB: "PURR" },
      { tokenA: "WHYPE", tokenB: "USDT0" }
    ];

    const pools: RealLiquidityPool[] = [];
    
    for (const config of poolConfigs) {
      try {
        const poolData = await this.getRealPoolData(config.tokenA, config.tokenB, userAddress);
        if (poolData) {
          pools.push(poolData);
        }
      } catch (error) {
        console.warn(`Failed to load pool ${config.tokenA}/${config.tokenB}:`, error);
      }
    }

    return pools;
  }
}

export const realLiquiditySystem = new RealLiquiditySystem();