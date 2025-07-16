// Weekly Rewards System - More silent and professional points system
import { apiRequest } from './queryClient';

export interface WeeklyReward {
  week: string;
  basePoints: number;
  swapCount: number;
  volumeBonus: number;
  referralBonus: number;
  totalReward: number;
  claimable: boolean;
}

export class WeeklyRewardsSystem {
  /**
   * Get weekly rewards summary for user
   */
  static async getWeeklyRewards(walletAddress: string): Promise<WeeklyReward[]> {
    try {
      const response = await apiRequest(`/api/rewards/weekly/${walletAddress}`);
      return response.json();
    } catch (error) {
      console.warn("Failed to fetch weekly rewards:", error);
      return [];
    }
  }

  /**
   * Check if user has unclaimed rewards
   */
  static async hasUnclaimedRewards(walletAddress: string): Promise<boolean> {
    try {
      const rewards = await this.getWeeklyRewards(walletAddress);
      return rewards.some(reward => reward.claimable && reward.totalReward > 0);
    } catch (error) {
      return false;
    }
  }

  /**
   * Claim weekly rewards
   */
  static async claimWeeklyRewards(walletAddress: string, week: string): Promise<{ success: boolean; amount: number }> {
    try {
      const response = await apiRequest("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, week }),
      });
      return response.json();
    } catch (error) {
      console.warn("Failed to claim rewards:", error);
      return { success: false, amount: 0 };
    }
  }

  /**
   * Get current week identifier
   */
  static getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.ceil(dayOfYear / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate weekly points silently (called on each swap)
   */
  static async updateWeeklyProgress(walletAddress: string, swapAmount: string, transactionHash: string): Promise<void> {
    try {
      await apiRequest("/api/rewards/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          walletAddress, 
          swapAmount, 
          transactionHash,
          week: this.getCurrentWeek()
        }),
      });
    } catch (error) {
      console.warn("Failed to update weekly progress:", error);
    }
  }
}