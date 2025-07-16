import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Shield, Zap, Users, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function Docs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-hyper-mint text-hyper-mint hover:bg-hyper-mint hover:text-black">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Swap
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">WhiskerSwap Documentation</h1>
          </div>

          {/* Introduction */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">About WhiskerSwap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400">
                WhiskerSwap is a decentralized exchange aggregator built specifically for the HyperEVM ecosystem. 
                We provide seamless token swapping with competitive rates, low fees, and an intuitive user experience.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-hyper-mint" />
                  <span className="text-sm font-medium text-white">Fast Execution</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-hyper-mint" />
                  <span className="text-sm font-medium text-white">Secure & Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-hyper-mint" />
                  <span className="text-sm font-medium text-white">Community Driven</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-white">1. Connect Your Wallet</h3>
                  <p className="text-sm text-gray-400">
                    Connect your MetaMask or compatible wallet to start trading. 
                    Make sure you're on the HyperEVM network (Chain ID: 999).
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">2. Select Tokens</h3>
                  <p className="text-sm text-gray-400">
                    Choose the tokens you want to swap from our curated list or import custom tokens 
                    using their contract addresses.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">3. Review & Swap</h3>
                  <p className="text-sm text-gray-400">
                    Review the swap details, including rates and fees, then approve the transaction 
                    to complete your swap.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liquidity Provision */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">Liquidity Provision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400">
                WhiskerSwap offers liquidity provision services where users can contribute token pairs to earn yield. 
                Our system provides competitive APY rates and flexible staking options.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-white">How It Works</h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>• Select two tokens you want to provide as liquidity (e.g., HYPE + BUDDY)</p>
                    <p>• Enter equal value amounts of both tokens</p>
                    <p>• Approve both token contracts for liquidity pool access</p>
                    <p>• Receive LP (Liquidity Provider) tokens representing your pool share</p>
                    <p>• Earn yield from trading fees and liquidity mining rewards</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">LP Token Management</h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>• LP tokens automatically compound rewards over time</p>
                    <p>• View your positions in the "My Positions" section</p>
                    <p>• Track real-time APY and accumulated rewards</p>
                    <p>• Positions are displayed with current token balances</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">Unstaking Process</h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>• Click "Unstake" on any active liquidity position</p>
                    <p>• Standard 7-day unstaking period applies for security</p>
                    <p>• During unstaking, you continue earning reduced rewards</p>
                    <p>• After 7 days, claim your original tokens plus accumulated yield</p>
                    <p>• Emergency unstaking available with 5% penalty fee</p>
                  </div>
                </div>
                

              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-hyper-mint" />
                Security & Safety
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-white">Smart Contract Security</h3>
                  <p className="text-sm text-gray-400">
                    Our smart contracts have been thoroughly tested and follow industry best practices. 
                    We integrate with established DEX protocols to ensure maximum security.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">Token Verification</h3>
                  <p className="text-sm text-gray-400">
                    Always verify token contract addresses before trading. Be cautious of tokens with 
                    similar names to popular cryptocurrencies.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">Slippage Protection</h3>
                  <p className="text-sm text-gray-400">
                    Set appropriate slippage tolerance to protect against unfavorable price movements 
                    during transaction execution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points System */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">Points System & Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-white">Earning Points</h3>
                  <p className="text-sm text-gray-400">
                    Earn points for every successful token swap. Points are awarded instantly 
                    and permanently stored in your wallet profile.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">Weekly Distribution</h3>
                  <p className="text-sm text-gray-400">
                    Maximum 50,000 points distributed weekly across all users. Early adopters 
                    benefit from higher point accumulation rates.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">Farming Duration</h3>
                  <p className="text-sm text-gray-400">
                    Points farming runs for 12 weeks (3 months) starting from launch. 
                    Total pool: 600,000 points to be distributed.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">Referral Bonuses</h3>
                  <p className="text-sm text-gray-400">
                    Earn 10% bonus points for every swap made by users who join through your 
                    referral link. No limit on referral earnings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HyperEVM Network */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">HyperEVM Network</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 text-white">Network Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Chain ID:</span>
                      <Badge variant="outline" className="border-hyper-mint text-hyper-mint">999</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Native Token:</span>
                      <Badge variant="outline" className="border-hyper-mint text-hyper-mint">HYPE</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">RPC URL:</span>
                      <span className="font-mono text-xs text-white">rpc.hyperliquid.xyz/evm</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-white">Add to MetaMask</h3>
                  <p className="text-sm text-gray-400 mb-2">
                    Automatically add HyperEVM network to your MetaMask wallet.
                  </p>
                  <Button variant="outline" size="sm" className="border-hyper-mint text-hyper-mint hover:bg-hyper-mint hover:text-black">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Add Network
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community & Support */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">Community & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400">
                Join our community for updates, support, and to connect with other traders.
              </p>
              
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  className="border-hyper-mint text-hyper-mint hover:bg-hyper-mint hover:text-black"
                  onClick={() => window.open('https://x.com/whiskerswap', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Follow @WhiskerSwap
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}