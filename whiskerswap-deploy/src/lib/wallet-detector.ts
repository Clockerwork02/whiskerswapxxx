import { ethers } from 'ethers';

export interface WalletProvider {
  provider: any;
  name: string;
  isConnected: boolean;
  accounts: string[];
}

export class WalletDetector {
  private static instance: WalletDetector;
  
  static getInstance(): WalletDetector {
    if (!WalletDetector.instance) {
      WalletDetector.instance = new WalletDetector();
    }
    return WalletDetector.instance;
  }

  getAvailableWallets(): WalletProvider[] {
    const wallets: WalletProvider[] = [];

    // MetaMask
    if (window.ethereum?.isMetaMask) {
      wallets.push({
        provider: window.ethereum,
        name: 'MetaMask',
        isConnected: false,
        accounts: []
      });
    }

    // OKX Wallet
    if (window.okxwallet?.ethereum) {
      wallets.push({
        provider: window.okxwallet.ethereum,
        name: 'OKX Wallet',
        isConnected: false,
        accounts: []
      });
    }

    // Trust Wallet
    if (window.trustwallet?.ethereum) {
      wallets.push({
        provider: window.trustwallet.ethereum,
        name: 'Trust Wallet',
        isConnected: false,
        accounts: []
      });
    }

    // Generic Ethereum provider (fallback)
    if (window.ethereum && !window.ethereum.isMetaMask && !wallets.length) {
      wallets.push({
        provider: window.ethereum,
        name: 'Web3 Wallet',
        isConnected: false,
        accounts: []
      });
    }

    return wallets;
  }

  async getBestProvider(): Promise<{ provider: any; name: string } | null> {
    const wallets = this.getAvailableWallets();
    
    if (wallets.length === 0) {
      console.log("❌ No wallets detected");
      return null;
    }

    // Check each wallet for existing connections
    for (const wallet of wallets) {
      try {
        const accounts = await wallet.provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          console.log(`✅ Found connected wallet: ${wallet.name} (${accounts[0]})`);
          return { provider: wallet.provider, name: wallet.name };
        }
      } catch (error) {
        console.warn(`Failed to check ${wallet.name}:`, error);
      }
    }

    // No connected wallets, return the first available
    const firstWallet = wallets[0];
    console.log(`🔍 Using first available wallet: ${firstWallet.name}`);
    return { provider: firstWallet.provider, name: firstWallet.name };
  }

  async connectWallet(): Promise<{ provider: ethers.BrowserProvider; signer: ethers.JsonRpcSigner; address: string; name: string } | null> {
    const bestWallet = await this.getBestProvider();
    
    if (!bestWallet) {
      throw new Error("Please install MetaMask, OKX Wallet, or another Web3 wallet");
    }

    try {
      console.log(`🔗 Connecting to ${bestWallet.name}...`);

      // Request account access
      const accounts = await bestWallet.provider.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Ensure HyperEVM network
      await this.ensureHyperEVMNetwork(bestWallet.provider);

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(bestWallet.provider);
      const signer = await ethersProvider.getSigner();

      console.log(`✅ ${bestWallet.name} connected: ${accounts[0]}`);

      return {
        provider: ethersProvider,
        signer,
        address: accounts[0],
        name: bestWallet.name
      };

    } catch (error: any) {
      console.error(`❌ Failed to connect ${bestWallet.name}:`, error);
      throw error;
    }
  }

  private async ensureHyperEVMNetwork(provider: any): Promise<void> {
    try {
      // Try to switch to HyperEVM
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x3e7' }], // 999 in hex
      });
      console.log("✅ Switched to HyperEVM network");
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Network not added, add it
        console.log("📡 Adding HyperEVM network...");
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x3e7',
            chainName: 'HyperEVM',
            nativeCurrency: {
              name: 'HYPE',
              symbol: 'HYPE',
              decimals: 18,
            },
            rpcUrls: ['https://rpc.hyperliquid.xyz/evm'],
            blockExplorerUrls: ['https://explorer.hyperliquid.xyz'],
          }],
        });
        console.log("✅ HyperEVM network added");
      } else {
        console.warn("Network switch failed:", switchError);
      }
    }
  }
}

export const walletDetector = WalletDetector.getInstance();