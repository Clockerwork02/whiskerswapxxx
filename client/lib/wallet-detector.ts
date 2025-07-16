/**
 * Real-time wallet detection for production use
 * Detects MetaMask, OKX, Trust Wallet, and other injected wallets
 */

export interface WalletProvider {
  isMetaMask?: boolean;
  isOKXWallet?: boolean;
  isTrustWallet?: boolean;
  request: (params: any) => Promise<any>;
  on: (event: string, handler: Function) => void;
  removeListener: (event: string, handler: Function) => void;
}

export function detectWalletProvider(): WalletProvider | null {
  if (typeof window === 'undefined') return null;
  
  // Check for MetaMask
  if (window.ethereum?.isMetaMask) {
    console.log('🦊 MetaMask detected');
    return window.ethereum;
  }
  
  // Check for OKX Wallet
  if (window.okxwallet) {
    console.log('🔶 OKX Wallet detected');
    return window.okxwallet;
  }
  
  // Check for Trust Wallet
  if (window.trustwallet) {
    console.log('🛡️ Trust Wallet detected');
    return window.trustwallet;
  }
  
  // Check for generic ethereum provider
  if (window.ethereum) {
    console.log('⚡ Generic Ethereum provider detected');
    return window.ethereum;
  }
  
  return null;
}

export function isWalletInstalled(): boolean {
  return detectWalletProvider() !== null;
}

export function getWalletName(provider: WalletProvider): string {
  if (provider.isMetaMask) return 'MetaMask';
  if (provider.isOKXWallet) return 'OKX Wallet';
  if (provider.isTrustWallet) return 'Trust Wallet';
  return 'Unknown Wallet';
}