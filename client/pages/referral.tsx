import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Copy, Gift, Users, ArrowLeft, ExternalLink } from "lucide-react";
import { useDirectBrowserWallet } from "../hooks/use-direct-browser-wallet";
import { RealTimePointsSystem } from "../lib/points-api";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";

export default function Referral() {
  const wallet = useDirectBrowserWallet();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      const link = RealTimePointsSystem.generateReferralLink(wallet.address);
      setReferralLink(link);
      
      // Generate unique alphabetic referral code
      const code = RealTimePointsSystem.generateReferralCode(wallet.address);
      setReferralCode(code);
    }
  }, [wallet.isConnected, wallet.address]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30 shadow-2xl">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Gift className="w-12 h-12 mx-auto text-hyper-mint" />
                  <h2 className="text-xl font-bold text-white">Connect Your Wallet</h2>
                  <p className="text-gray-400">
                    Connect your wallet to access your referral program and start earning bonus points.
                  </p>
                  <Button 
                    onClick={wallet.connect} 
                    disabled={wallet.isLoading}
                    className="bg-gradient-to-r from-hyper-mint to-hyper-glow hover:from-hyper-mint/80 hover:to-hyper-glow/80 text-black font-semibold"
                  >
                    Connect Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white">Referral Program</h1>
          </div>

          {/* Referral Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Gift className="w-5 h-5 text-hyper-mint" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">1. Share Your Link</h3>
                  <p className="text-sm text-gray-400">
                    Share your unique referral link with friends and fellow traders
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">2. Friends Start Trading</h3>
                  <p className="text-sm text-gray-400">
                    When they use WhiskerSwap via your link, they get tracked as your referral
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">3. Earn Bonus Points</h3>
                  <p className="text-sm text-gray-400">
                    You earn bonus points for every swap your referrals make
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5 text-hyper-mint" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Your Referral Code</span>
                  <Badge variant="secondary" className="font-mono bg-slate-700 text-hyper-mint border-hyper-mint">
                    {referralCode}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total Referrals</span>
                  <Badge variant="outline" className="border-hyper-mint text-hyper-mint">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Bonus Points Earned</span>
                  <Badge className="bg-hyper-mint text-black">0</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Link */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">Your Referral Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="font-mono text-sm bg-slate-900/50 border-slate-700 text-white"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(referralLink)}
                  className="flex-shrink-0 border-hyper-mint text-hyper-mint hover:bg-hyper-mint hover:text-black"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    const tweetText = `Just discovered WhiskerSwap - the best DEX aggregator on HyperEVM! 🐱⚡\n\nEarn points for every trade and join the community:\n${referralLink}\n\n#WhiskerSwap #HyperEVM #DeFi`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
                  }}
                  className="w-full max-w-sm border-hyper-mint text-hyper-mint hover:bg-hyper-mint hover:text-black"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Share on Twitter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">Program Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Referral bonuses are calculated as 20% of the base points earned by your referrals</li>
                  <li>• Base points are earned per successful swap transaction</li>
                  <li>• Both you and your referral earn bonus points when they trade</li>
                  <li>• Referral tracking is based on the wallet address used in the referral link</li>
                  <li>• Points are awarded automatically after successful transactions</li>
                  <li>• Self-referrals and farming are not allowed and may result in point forfeiture</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}