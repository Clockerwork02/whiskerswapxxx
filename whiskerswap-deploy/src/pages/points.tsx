import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Trophy, Star, Gift, ArrowLeft } from "lucide-react";
import { useDirectBrowserWallet } from "../hooks/use-direct-browser-wallet";
import { RealTimePointsSystem, type PointsHistoryItem } from "../lib/points-api";
import { Link } from "wouter";

export default function Points() {
  const wallet = useDirectBrowserWallet();
  const [userPoints, setUserPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadPointsData();
    }
  }, [wallet.isConnected, wallet.address]);

  const loadPointsData = async () => {
    if (!wallet.address) return;
    
    setIsLoading(true);
    try {
      const [points, history] = await Promise.all([
        RealTimePointsSystem.getUserPoints(wallet.address),
        RealTimePointsSystem.getPointsHistory(wallet.address)
      ]);
      
      setUserPoints(points);
      setPointsHistory(history);
    } catch (error) {
      console.error("Failed to load points data:", error);
    } finally {
      setIsLoading(false);
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
                  <Trophy className="w-12 h-12 mx-auto text-hyper-mint" />
                  <h2 className="text-xl font-bold text-white">Connect Your Wallet</h2>
                  <p className="text-gray-400">
                    Connect your wallet to view your points and trading history.
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
            <h1 className="text-2xl font-bold text-white">WhiskerSwap Points</h1>
          </div>

          {/* Points Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-hyper-mint" />
                  <span className="text-2xl font-bold text-white">{userPoints.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Swaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-hyper-mint" />
                  <span className="text-2xl font-bold text-white">{pointsHistory.filter(h => h.type === 'swap').length}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Referral Bonuses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-hyper-mint" />
                  <span className="text-2xl font-bold text-white">{pointsHistory.filter(h => h.type.includes('referral')).length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Points History */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">Points History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hyper-mint mx-auto"></div>
                  <p className="mt-2 text-gray-400">Loading history...</p>
                </div>
              ) : pointsHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto text-gray-500" />
                  <p className="mt-2 text-gray-400">No points history yet</p>
                  <p className="text-sm text-gray-400">Start swapping to earn points!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pointsHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {item.type === 'swap' && <Star className="w-4 h-4 text-hyper-mint" />}
                          {item.type.includes('referral') && <Gift className="w-4 h-4 text-hyper-mint" />}
                          <span className="font-medium capitalize text-white">{item.type.replace('_', ' ')}</span>
                          <Badge variant="outline" className="border-hyper-mint text-hyper-mint">+{item.points} points</Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString()} at{' '}
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      {item.swapAmount && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">${parseFloat(item.swapAmount).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">Swap value</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* How to Earn Points */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="text-white">How to Earn Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-hyper-mint" />
                    <span className="font-medium text-white">Trading Points</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Earn points for each successful swap transaction
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-hyper-mint" />
                    <span className="font-medium text-white">Referral Bonus</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Earn bonus points when friends use your referral link
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}