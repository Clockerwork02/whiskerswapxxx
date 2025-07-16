import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { detectWalletProvider, getWalletName } from '../lib/wallet-detector';

interface DirectWalletState {
  isConnected: boolean;
  address: string;
  balance: string;
  isLoading: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

declare global {
  interface Window {
    ethereum?: any;
    okxwallet?: any;
    trustwallet?: any;
  }
}

export function useDirectBrowserWallet() {
  const [state, setState] = useState<DirectWalletState>({
    isConnected: false,
    address: '',
    balance: '0.0',
    isLoading: false,
    provider: null,
    signer: null
  });

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      // Use wallet detector for reliable detection
      const provider = detectWalletProvider();
      if (!provider) return;
      
      const accounts = await provider.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const balance = await ethersProvider.getBalance(address);
        const formattedBalance = ethers.formatEther(balance);

        setState({
          isConnected: true,
          address,
          balance: formattedBalance,
          isLoading: false,
          provider: ethersProvider,
          signer
        });

        console.log('✅ Wallet already connected:', address);
      }
    } catch (error) {
      console.log('No existing wallet connection found');
    }
  }, []);

  const connect = useCallback(async (walletProvider?: any) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log('🔌 Connecting to browser wallet...');
      
      // Use wallet detector for reliable detection
      const provider = walletProvider || detectWalletProvider();
      
      if (!provider) {
        throw new Error('No wallet provider detected. Please install MetaMask, OKX Wallet, or Trust Wallet to continue.');
      }
      
      console.log('🔌 Using wallet provider:', getWalletName(provider));

      // Force wallet connection request - this triggers wallet popup
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Please connect your wallet to continue');
      }

      const address = accounts[0];
      console.log('✅ Wallet connected:', address);

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Add HyperEVM network if not already added (only for real wallets)
      if (provider.isMetaMask && provider.request) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x3e7' }], // 999 in hex
          });
          console.log('✅ Switched to HyperEVM network');
        } catch (switchError: any) {
          // Network not added, try to add it
          if (switchError.code === 4902) {
            console.log('🔄 Adding HyperEVM network...');
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x3e7',
                chainName: 'HyperEVM',
                nativeCurrency: {
                  name: 'HYPE',
                  symbol: 'HYPE',
                  decimals: 18
                },
                rpcUrls: [
                  'https://rpc.hyperliquid.xyz/evm',
                  'https://hyperliquid-testnet.rpc.caldera.xyz/http',
                  'https://hyperliquid.caldera.dev'
                ],
                blockExplorerUrls: ['https://explorer.hyperliquid.xyz']
              }]
            });
            console.log('✅ HyperEVM network added successfully');
          } else {
            console.warn('Failed to switch network:', switchError);
          }
        }
      }

      // Get balance
      const balance = await ethersProvider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);

      setState({
        isConnected: true,
        address,
        balance: formattedBalance,
        isLoading: false,
        provider: ethersProvider,
        signer
      });

      console.log('🎉 Browser wallet connected successfully!');
      console.log('💰 Balance:', formattedBalance, 'HYPE');
      return true;
      
    } catch (error: any) {
      console.error('❌ Browser wallet connection failed:', error);
      setState({
        isConnected: false,
        address: '',
        balance: '0.0',
        isLoading: false,
        provider: null,
        signer: null
      });
      
      if (error.code === 4001) {
        throw new Error('Connection rejected by user');
      }
      throw new Error(error.message || 'Failed to connect wallet');
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: '',
      balance: '0.0',
      isLoading: false,
      provider: null,
      signer: null
    });
    console.log('🔌 Browser wallet disconnected');
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!state.provider || !state.address) return;
    
    try {
      const balance = await state.provider.getBalance(state.address);
      const formattedBalance = ethers.formatEther(balance);
      setState(prev => ({ ...prev, balance: formattedBalance }));
      console.log('💰 Updated balance:', formattedBalance, 'HYPE');
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [state.provider, state.address]);

  // Listen for account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== state.address) {
        checkConnection();
      }
    };

    const handleNetworkChanged = () => {
      if (state.isConnected) {
        checkConnection();
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleNetworkChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleNetworkChanged);
      }
    };
  }, [state.address, state.isConnected, disconnect, checkConnection]);

  // Compatibility methods
  const getProvider = useCallback(async () => state.provider, [state.provider]);
  const getSigner = useCallback(async () => state.signer, [state.signer]);

  return {
    ...state,
    connect,
    disconnect,
    fetchBalance,
    getProvider,
    getSigner
  };
}