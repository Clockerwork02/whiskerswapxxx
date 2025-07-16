import { 
  users, 
  eligibilityChecks, 
  walletTransfers, 
  userPoints,
  pointsHistory,
  type User, 
  type InsertUser, 
  type EligibilityCheck, 
  type InsertEligibilityCheck, 
  type WalletTransfer, 
  type InsertWalletTransfer,
  type UserPoints,
  type InsertUserPoints,
  type PointsHistory,
  type InsertPointsHistory
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createEligibilityCheck(check: InsertEligibilityCheck): Promise<EligibilityCheck>;
  getEligibilityCheck(walletAddress: string): Promise<EligibilityCheck | undefined>;
  createWalletTransfer(transfer: InsertWalletTransfer): Promise<WalletTransfer>;
  updateWalletTransfer(id: number, updates: Partial<WalletTransfer>): Promise<WalletTransfer | undefined>;
  getWalletTransfer(id: number): Promise<WalletTransfer | undefined>;
  // Points system
  getUserPoints(walletAddress: string): Promise<UserPoints | undefined>;
  createUserPoints(points: InsertUserPoints): Promise<UserPoints>;
  updateUserPoints(walletAddress: string, totalPoints: number): Promise<UserPoints | undefined>;
  addPointsHistory(history: InsertPointsHistory): Promise<PointsHistory>;
  getPointsHistory(walletAddress: string): Promise<PointsHistory[]>;
  // Referral code mapping
  getWalletByReferralCode(referralCode: string): Promise<string | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private eligibilityChecks: Map<number, EligibilityCheck>;
  private walletTransfers: Map<number, WalletTransfer>;
  private userPointsMap: Map<string, UserPoints>;
  private pointsHistoryMap: Map<number, PointsHistory>;
  private referralCodeMap: Map<string, string>; // referralCode -> walletAddress
  private currentUserId: number;
  private currentEligibilityId: number;
  private currentTransferId: number;
  private currentPointsId: number;

  constructor() {
    this.users = new Map();
    this.eligibilityChecks = new Map();
    this.walletTransfers = new Map();
    this.userPointsMap = new Map();
    this.pointsHistoryMap = new Map();
    this.referralCodeMap = new Map();
    this.currentUserId = 1;
    this.currentEligibilityId = 1;
    this.currentTransferId = 1;
    this.currentPointsId = 1;
    
    // No demo data - users start fresh
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createEligibilityCheck(insertCheck: InsertEligibilityCheck): Promise<EligibilityCheck> {
    const id = this.currentEligibilityId++;
    const check: EligibilityCheck = {
      ...insertCheck,
      id,
      isEligible: true, // All wallets are eligible for live mode
      checkedAt: new Date(),
    };
    this.eligibilityChecks.set(id, check);
    return check;
  }

  async getEligibilityCheck(walletAddress: string): Promise<EligibilityCheck | undefined> {
    return Array.from(this.eligibilityChecks.values()).find(
      (check) => check.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
    );
  }

  async createWalletTransfer(insertTransfer: InsertWalletTransfer): Promise<WalletTransfer> {
    const id = this.currentTransferId++;
    const transfer: WalletTransfer = {
      ...insertTransfer,
      id,
      transactionHash: null,
      status: "pending",
      amount: null,
      gasUsed: null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.walletTransfers.set(id, transfer);
    return transfer;
  }

  async updateWalletTransfer(id: number, updates: Partial<WalletTransfer>): Promise<WalletTransfer | undefined> {
    const existing = this.walletTransfers.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.walletTransfers.set(id, updated);
    return updated;
  }

  async getWalletTransfer(id: number): Promise<WalletTransfer | undefined> {
    return this.walletTransfers.get(id);
  }

  // Points system methods
  async getUserPoints(walletAddress: string): Promise<UserPoints | undefined> {
    return this.userPointsMap.get(walletAddress.toLowerCase());
  }

  async createUserPoints(insertPoints: InsertUserPoints): Promise<UserPoints> {
    const id = this.currentUserId++;
    const now = new Date();
    
    // Generate unique referral code for this wallet
    const uniqueReferralCode = this.generateUniqueReferralCode(insertPoints.walletAddress);
    
    const userPoints: UserPoints = {
      id,
      walletAddress: insertPoints.walletAddress.toLowerCase(),
      totalPoints: 0,
      referralCode: uniqueReferralCode,
      referredBy: insertPoints.referredBy || null,
      createdAt: now,
      updatedAt: now,
    };
    this.userPointsMap.set(insertPoints.walletAddress.toLowerCase(), userPoints);
    return userPoints;
  }

  // Generate unique referral code based on wallet address
  private generateUniqueReferralCode(walletAddress: string): string {
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
    
    // Store the mapping
    this.referralCodeMap.set(code, walletAddress);
    return code;
  }

  async getWalletByReferralCode(referralCode: string): Promise<string | undefined> {
    return this.referralCodeMap.get(referralCode);
  }

  async updateUserPoints(walletAddress: string, totalPoints: number): Promise<UserPoints | undefined> {
    const existing = this.userPointsMap.get(walletAddress.toLowerCase());
    if (!existing) return undefined;
    
    const updated: UserPoints = {
      ...existing,
      totalPoints,
      updatedAt: new Date(),
    };
    this.userPointsMap.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  async addPointsHistory(insertHistory: InsertPointsHistory): Promise<PointsHistory> {
    const id = this.currentPointsId++;
    const history: PointsHistory = {
      id,
      walletAddress: insertHistory.walletAddress.toLowerCase(),
      points: insertHistory.points,
      type: insertHistory.type,
      transactionHash: insertHistory.transactionHash || null,
      swapAmount: insertHistory.swapAmount || null,
      createdAt: new Date(),
    };
    this.pointsHistoryMap.set(id, history);
    return history;
  }

  async getPointsHistory(walletAddress: string): Promise<PointsHistory[]> {
    const normalizedAddress = walletAddress.toLowerCase();
    return Array.from(this.pointsHistoryMap.values()).filter(
      (history) => history.walletAddress.toLowerCase() === normalizedAddress
    ).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }
}

export const storage = new MemStorage();
