import { apiRequest } from "./queryClient";

export interface UserPointsResponse {
  id: number;
  walletAddress: string;
  totalPoints: number;
  referralCode: string | null;
  referredBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PointsHistoryItem {
  id: number;
  walletAddress: string;
  points: number;
  type: "swap" | "referral_bonus" | "referral_reward";
  transactionHash: string | null;
  swapAmount: string | null;
  createdAt: string;
}

export class PointsAPI {
  static async getUserPoints(walletAddress: string): Promise<UserPointsResponse> {
    const response = await fetch(`/api/points/${walletAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to get user points: ${response.statusText}`);
    }
    return response.json();
  }

  static async addSwapPoints(walletAddress: string, swapAmount: string, transactionHash?: string): Promise<{ success: boolean; points: number; totalPoints: number }> {
    const response = await apiRequest("/api/points/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, swapAmount, transactionHash }),
    });
    return response.json();
  }

  static async addReferralBonus(walletAddress: string, referrerAddress: string, swapAmount: string): Promise<{ success: boolean; referrerBonus: number; userBonus: number }> {
    const response = await apiRequest("/api/points/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, referrerAddress, swapAmount }),
    });
    return response.json();
  }

  static async getPointsHistory(walletAddress: string): Promise<PointsHistoryItem[]> {
    const response = await fetch(`/api/points/${walletAddress}/history`);
    if (!response.ok) {
      throw new Error(`Failed to get points history: ${response.statusText}`);
    }
    return response.json();
  }
}

// Real-time points system that replaces localStorage
export class RealTimePointsSystem {
  private static readonly POINTS_PER_SWAP = 0; // Dynamic points, not hardcoded
  private static readonly REFERRAL_BONUS_PERCENT = 10;

  static async getUserPoints(walletAddress: string): Promise<number> {
    try {
      const response = await PointsAPI.getUserPoints(walletAddress);
      return response.totalPoints;
    } catch (error) {
      console.error("Failed to get user points:", error);
      return 0;
    }
  }

  static async addSwapPoints(walletAddress: string, swapAmount: string, transactionHash?: string): Promise<number> {
    try {
      const response = await PointsAPI.addSwapPoints(walletAddress, swapAmount, transactionHash);
      return response.totalPoints;
    } catch (error) {
      console.error("Failed to add swap points:", error);
      return 0;
    }
  }

  static async processReferralBonus(walletAddress: string, referrerAddress: string, swapAmount: string): Promise<void> {
    try {
      await PointsAPI.addReferralBonus(walletAddress, referrerAddress, swapAmount);
    } catch (error) {
      console.error("Failed to process referral bonus:", error);
    }
  }

  static generateReferralCode(walletAddress: string): string {
    // Generate mixed alphanumeric code from wallet address
    const hash = walletAddress.toLowerCase().replace('0x', '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Use first 12 characters of hash to generate 6-character code
    for (let i = 0; i < 6; i++) {
      const char = hash[i] || '0';
      const index = parseInt(char, 16) % chars.length;
      code += chars[index];
    }
    
    return code;
  }

  static generateReferralLink(userAddress: string): string {
    const baseUrl = window.location.origin;
    const referralCode = this.generateReferralCode(userAddress);
    return `${baseUrl}?ref=${referralCode}`;
  }

  static extractReferralCode(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }

  static async getPointsHistory(walletAddress: string): Promise<PointsHistoryItem[]> {
    try {
      return await PointsAPI.getPointsHistory(walletAddress);
    } catch (error) {
      console.error("Failed to get points history:", error);
      return [];
    }
  }
}