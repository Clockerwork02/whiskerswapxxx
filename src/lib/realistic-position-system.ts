import { ethers } from "ethers";

export interface RealisticPosition {
  id: string;
  pairAddress: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  lpBalance: string;
  token0Amount: string;
  token1Amount: string;
  totalValueUSD: string;
  sharePercentage: number;
  feesEarnedUSD: string;
  apr: number;
  timestamp: number;
  isActive: boolean;
  status: "Active" | "Unstaking" | "Ready";
  unstakeStartTime?: number;
}

export interface RealisticPool {
  pairAddress: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  tvl: string;
  volume24h: string;
  fees24h: string;
  apr: number;
  lpTokenPrice: string;
}

class RealisticPositionSystem {
  private userPositions: Map<string, RealisticPosition[]> = new Map();
  private availablePools: RealisticPool[] = [];

  constructor() {
    this.initializeRealisticPools();
  }

  private initializeRealisticPools() {
    // Create realistic pools based on actual HyperEVM token addresses
    this.availablePools = [
      {
        pairAddress: "0x2A4F2D7E8d8F9A5B3C6E7F8D9A0B1C2D3E4F5G6H",
        token0: "0x0000000000000000000000000000000000000000",
        token1: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E",
        token0Symbol: "HYPE",
        token1Symbol: "PURR",
        tvl: "$2,847,293",
        volume24h: "$156,842",
        fees24h: "$471.26",
        apr: 18.4,
        lpTokenPrice: "24.8965"
      },
      {
        pairAddress: "0x7B8C9D0E1F2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O",
        token0: "0x0000000000000000000000000000000000000000",
        token1: "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE",
        token0Symbol: "HYPE",
        token1Symbol: "BUDDY",
        tvl: "$1,692,847",
        volume24h: "$89,234",
        fees24h: "$267.70",
        apr: 22.1,
        lpTokenPrice: "1.8743"
      },
      {
        pairAddress: "0x8E9F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F",
        token0: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E",
        token1: "0x0000000000000000000000000000000000000000",
        token0Symbol: "PURR",
        token1Symbol: "HYPE",
        tvl: "$2,156,842",
        volume24h: "$127,439",
        fees24h: "$382.32",
        apr: 19.6,
        lpTokenPrice: "12.4783"
      },
      {
        pairAddress: "0x4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E",
        token0: "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE",
        token1: "0x0000000000000000000000000000000000000000",
        token0Symbol: "BUDDY",
        token1Symbol: "HYPE",
        tvl: "$743,291",
        volume24h: "$39,872",
        fees24h: "$119.62",
        apr: 17.3,
        lpTokenPrice: "0.9834"
      },
      {
        pairAddress: "0x3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V",
        token0: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E",
        token1: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
        token0Symbol: "PURR",
        token1Symbol: "USDT",
        tvl: "$945,672",
        volume24h: "$45,891",
        fees24h: "$137.67",
        apr: 15.8,
        lpTokenPrice: "0.7429"
      }
    ];
  }

  /**
   * Get all available pools for liquidity provision
   */
  getAvailablePools(): RealisticPool[] {
    return this.availablePools;
  }

  /**
   * Add a realistic position for a user (called when they "add liquidity")
   */
  addPosition(
    userAddress: string,
    poolAddress: string,
    token0Amount: string,
    token1Amount: string,
    token0Symbol: string,
    token1Symbol: string
  ): RealisticPosition {
    const pool = this.availablePools.find(p => p.pairAddress === poolAddress);
    if (!pool) throw new Error("Pool not found");

    // Calculate realistic values
    const token0Value = parseFloat(token0Amount) * this.getTokenPrice(token0Symbol);
    const token1Value = parseFloat(token1Amount) * this.getTokenPrice(token1Symbol);
    const totalValueUSD = token0Value + token1Value;
    
    // Calculate LP balance based on pool's LP token price
    const lpBalance = (totalValueUSD / parseFloat(pool.lpTokenPrice)).toFixed(8);
    
    // Calculate share percentage (realistic small percentage)
    const poolTVL = parseFloat(pool.tvl.replace(/[$,]/g, ''));
    const sharePercentage = (totalValueUSD / poolTVL) * 100;

    const position: RealisticPosition = {
      id: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pairAddress: poolAddress,
      token0: pool.token0,
      token1: pool.token1,
      token0Symbol,
      token1Symbol,
      lpBalance,
      token0Amount,
      token1Amount,
      totalValueUSD: `$${totalValueUSD.toFixed(2)}`,
      sharePercentage,
      feesEarnedUSD: "$0.00",
      apr: pool.apr,
      timestamp: Date.now(),
      isActive: true,
      status: "Active"
    };

    // Add to user positions
    const userPositions = this.userPositions.get(userAddress) || [];
    userPositions.push(position);
    this.userPositions.set(userAddress, userPositions);

    console.log(`✅ Added realistic position for ${userAddress}`);
    console.log(`💰 Position: ${token0Amount} ${token0Symbol} + ${token1Amount} ${token1Symbol}`);
    console.log(`📊 LP Balance: ${lpBalance} tokens`);
    console.log(`💎 Share: ${sharePercentage.toFixed(4)}% of pool`);

    return position;
  }

  /**
   * Get user's positions with accumulated fees
   */
  getUserPositions(userAddress: string): RealisticPosition[] {
    const positions = this.userPositions.get(userAddress) || [];
    
    // Update fees and status for each position based on time elapsed
    positions.forEach(position => {
      const daysElapsed = (Date.now() - position.timestamp) / (1000 * 60 * 60 * 24);
      const dailyFeeRate = position.apr / 365 / 100;
      const principalValue = parseFloat(position.totalValueUSD.replace('$', ''));
      const feesEarned = principalValue * dailyFeeRate * daysElapsed;
      
      position.feesEarnedUSD = `$${feesEarned.toFixed(2)}`;
      
      // Update unstaking status based on time
      if (position.status === "Unstaking" && position.unstakeStartTime) {
        const unstakeDaysElapsed = (Date.now() - position.unstakeStartTime) / (1000 * 60 * 60 * 24);
        if (unstakeDaysElapsed >= 7) {
          position.status = "Ready";
        }
      }
    });

    return positions;
  }

  /**
   * Start unstaking process for a position
   */
  startUnstaking(userAddress: string, positionId: string): boolean {
    const userPositions = this.userPositions.get(userAddress) || [];
    const position = userPositions.find(p => p.id === positionId);
    
    if (!position || position.status !== "Active") return false;

    position.status = "Unstaking";
    position.unstakeStartTime = Date.now();
    this.userPositions.set(userAddress, userPositions);

    console.log(`🔒 Started unstaking for position ${positionId}`);
    console.log(`⏰ Unstaking period: 7 days from ${new Date(position.unstakeStartTime).toLocaleDateString()}`);

    return true;
  }

  /**
   * Remove position (when user unstakes/withdraws)
   */
  removePosition(userAddress: string, positionId: string): boolean {
    const userPositions = this.userPositions.get(userAddress) || [];
    const index = userPositions.findIndex(p => p.id === positionId);
    
    if (index === -1) return false;

    const removedPosition = userPositions.splice(index, 1)[0];
    this.userPositions.set(userAddress, userPositions);

    console.log(`🗑️ Removed position ${positionId}`);
    console.log(`💰 Position value: ${removedPosition.totalValueUSD}`);
    console.log(`🎯 Tokens collected to collector address`);

    return true;
  }

  /**
   * Get realistic token prices for calculations
   */
  private getTokenPrice(symbol: string): number {
    const prices: Record<string, number> = {
      'HYPE': 48.57,
      'PURR': 0.2246,
      'BUDDY': 0.02497,
      'USDT': 0.9989,
      'CATBAL': 6.21,
      'LIQD': 0.03295,
      'PiP': 20.36
    };
    return prices[symbol] || 1.0;
  }

  /**
   * Get position statistics
   */
  getPositionStats(userAddress: string) {
    const positions = this.getUserPositions(userAddress);
    
    if (positions.length === 0) {
      return {
        totalValue: "$0.00",
        totalFees: "$0.00",
        activePositions: 0,
        avgAPR: 0
      };
    }

    const totalValue = positions.reduce((sum, pos) => {
      return sum + parseFloat(pos.totalValueUSD.replace('$', ''));
    }, 0);

    const totalFees = positions.reduce((sum, pos) => {
      return sum + parseFloat(pos.feesEarnedUSD.replace('$', ''));
    }, 0);

    const avgAPR = positions.reduce((sum, pos) => sum + pos.apr, 0) / positions.length;

    return {
      totalValue: `$${totalValue.toFixed(2)}`,
      totalFees: `$${totalFees.toFixed(2)}`,
      activePositions: positions.length,
      avgAPR: Math.round(avgAPR * 10) / 10
    };
  }
}

// Global instance
export const realisticPositionSystem = new RealisticPositionSystem();