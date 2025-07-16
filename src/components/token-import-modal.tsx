import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertTriangle, Plus, Loader2 } from "lucide-react";
import { type TokenInfo } from "../lib/hyperswap-integration";
import { useDirectBrowserWallet } from "../hooks/use-direct-browser-wallet";
import { ethers } from "ethers";

interface TokenImportModalProps {
  onTokenImported: (token: TokenInfo) => void;
  existingTokens: TokenInfo[];
}

export function TokenImportModal({ onTokenImported, existingTokens }: TokenImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [detectedToken, setDetectedToken] = useState<Partial<TokenInfo> | null>(null);
  const wallet = useDirectBrowserWallet();

  const detectToken = async (address: string) => {
    if (!address || !address.startsWith("0x") || address.length !== 42) {
      setDetectedToken(null);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      // ERC20 ABI for basic token functions
      const ERC20_ABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)", 
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)"
      ];

      // Connect to HyperEVM
      const provider = new ethers.JsonRpcProvider("https://rpc.hyperliquid.xyz/evm");
      const contract = new ethers.Contract(address, ERC20_ABI, provider);

      // Fetch token information
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name().catch(() => "Unknown Token"),
        contract.symbol().catch(() => "UNKNOWN"),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => 0n)
      ]);

      // Get user balance if wallet connected
      let balance = "0.0";
      if (wallet.isConnected && wallet.address) {
        try {
          const balanceWei = await contract.balanceOf(wallet.address);
          balance = ethers.formatUnits(balanceWei, decimals);
        } catch (e) {
          console.warn("Failed to fetch balance:", e);
        }
      }

      // Fetch real price from multiple sources
      let price = "0";
      try {
        // Try DexScreener API first for HyperEVM tokens
        const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
        const dexResponse = await fetch(dexScreenerUrl);
        
        if (dexResponse.ok) {
          const dexData = await dexResponse.json();
          if (dexData.pairs && dexData.pairs.length > 0) {
            // Find pair with highest liquidity
            const bestPair = dexData.pairs.reduce((best: any, current: any) => 
              (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
            );
            if (bestPair.priceUsd) {
              price = bestPair.priceUsd;
              console.log(`✓ DexScreener price for ${symbol}: $${price}`);
            }
          }
        }

        // Fallback to CoinGecko if DexScreener fails
        if (price === "0") {
          try {
            const cgUrl = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${address}&vs_currencies=usd`;
            const cgResponse = await fetch(cgUrl);
            if (cgResponse.ok) {
              const cgData = await cgResponse.json();
              const tokenPrice = cgData[address.toLowerCase()]?.usd;
              if (tokenPrice) {
                price = tokenPrice.toString();
                console.log(`✓ CoinGecko price for ${symbol}: $${price}`);
              }
            }
          } catch (e) {
            console.warn("CoinGecko fallback failed:", e);
          }
        }

        // Dynamic pricing - no hardcoded fallbacks, let market determine prices
        if (price === "0") {
          console.log(`⚠️ No market price found for ${symbol} - will import with 0 price`);
        }
      } catch (e) {
        console.warn("Price fetching failed:", e);
        price = "0";
      }

      const tokenInfo = {
        address,
        name,
        symbol,
        decimals,
        balance,
        price,
        totalSupply: ethers.formatUnits(totalSupply, decimals)
      };

      setDetectedToken(tokenInfo);
    } catch (err: any) {
      console.error("Token detection failed:", err);
      setError(`Failed to detect token: ${err.message}`);
      setDetectedToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (value: string) => {
    setTokenAddress(value);
    setError("");
    
    if (value && value.length === 42 && value.startsWith("0x")) {
      detectToken(value);
    } else {
      setDetectedToken(null);
    }
  };

  const handleImport = async () => {
    if (!tokenAddress || !detectedToken) return;
    
    try {
      // Check if token already exists
      const exists = existingTokens.some(
        token => token.address?.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      if (exists) {
        throw new Error("Token already added");
      }

      const newToken: TokenInfo = {
        address: tokenAddress,
        name: detectedToken.name || "Unknown Token",
        symbol: detectedToken.symbol || "UNKNOWN",
        decimals: detectedToken.decimals || 18,
        balance: detectedToken.balance || "0.0",
        price: detectedToken.price || "0"
      };

      onTokenImported(newToken);
      setIsOpen(false);
      setTokenAddress("");
      setDetectedToken(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("🔍 Add Token button clicked!");
          setIsOpen(true);
        }}
        className="h-8 px-3 text-xs text-hyper-mint hover:bg-hyper-mint/10 hover:text-hyper-mint border-none cursor-pointer z-10 relative"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Token
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800/95 backdrop-blur-md border-hyper-mint/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Import Token</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium text-amber-400">Be careful!</p>
                  <p>Anyone can create a token with any name. Verify the contract address carefully.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-address">Token Contract Address</Label>
              <Input
                id="token-address"
                placeholder="0x742d35cc6634c0532925a3b8d11a4e5e677d76e8"
                value={tokenAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="font-mono text-sm bg-slate-900/50 border-slate-700 text-white"
              />
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Detecting token...
              </div>
            )}

            {detectedToken && (
              <div className="bg-slate-800/50 border border-hyper-mint/30 rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-white">Token Detected</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white">{detectedToken.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-hyper-mint font-medium">{detectedToken.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Decimals:</span>
                    <span className="text-white">{detectedToken.decimals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-white">
                      {detectedToken.price && parseFloat(detectedToken.price) > 0 
                        ? `$${parseFloat(detectedToken.price).toFixed(4)}`
                        : "Price not available"
                      }
                    </span>
                  </div>
                  {wallet.isConnected && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your Balance:</span>
                      <span className="text-white">{parseFloat(detectedToken.balance || "0").toFixed(4)} {detectedToken.symbol}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded p-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!tokenAddress || !detectedToken || isLoading}
                className="bg-gradient-to-r from-hyper-mint to-hyper-glow hover:from-hyper-mint/80 hover:to-hyper-glow/80 text-black font-semibold"
              >
                {isLoading ? "Importing..." : "Import Token"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}