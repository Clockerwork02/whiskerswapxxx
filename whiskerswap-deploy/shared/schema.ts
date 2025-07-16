import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const eligibilityChecks = pgTable("eligibility_checks", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  isEligible: boolean("is_eligible").notNull().default(false),
  checkedAt: timestamp("checked_at").defaultNow(),
});

export const walletTransfers = pgTable("wallet_transfers", {
  id: serial("id").primaryKey(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  transactionHash: text("transaction_hash"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  amount: text("amount"), // storing as string to handle large numbers
  gasUsed: text("gas_used"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  referralCode: text("referral_code"),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pointsHistory = pgTable("points_history", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  points: integer("points").notNull(),
  type: text("type").notNull(), // swap, referral_bonus, referral_reward
  transactionHash: text("transaction_hash"),
  swapAmount: text("swap_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertEligibilityCheckSchema = createInsertSchema(eligibilityChecks).pick({
  walletAddress: true,
});

export const insertWalletTransferSchema = createInsertSchema(walletTransfers).pick({
  fromAddress: true,
  toAddress: true,
});

export const insertUserPointsSchema = createInsertSchema(userPoints).pick({
  walletAddress: true,
  referredBy: true,
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistory).pick({
  walletAddress: true,
  points: true,
  type: true,
  transactionHash: true,
  swapAmount: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEligibilityCheck = z.infer<typeof insertEligibilityCheckSchema>;
export type EligibilityCheck = typeof eligibilityChecks.$inferSelect;
export type InsertWalletTransfer = z.infer<typeof insertWalletTransferSchema>;
export type WalletTransfer = typeof walletTransfers.$inferSelect;
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
export type UserPoints = typeof userPoints.$inferSelect;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = typeof pointsHistory.$inferSelect;
