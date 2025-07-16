import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEligibilityCheckSchema, insertWalletTransferSchema, insertUserPointsSchema, insertPointsHistorySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Check eligibility
  app.post("/api/eligibility/check", async (req, res) => {
    try {
      const validatedData = insertEligibilityCheckSchema.parse(req.body);
      
      // Check if already exists
      const existing = await storage.getEligibilityCheck(validatedData.walletAddress);
      if (existing) {
        return res.json(existing);
      }

      const eligibilityCheck = await storage.createEligibilityCheck(validatedData);
      res.json(eligibilityCheck);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  // Get eligibility status
  app.get("/api/eligibility/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const eligibilityCheck = await storage.getEligibilityCheck(walletAddress);
      
      if (!eligibilityCheck) {
        return res.status(404).json({ message: "Eligibility check not found" });
      }
      
      res.json(eligibilityCheck);
    } catch (error) {
      res.status(500).json({ message: "Failed to get eligibility status" });
    }
  });

  // Create wallet transfer
  app.post("/api/transfers", async (req, res) => {
    try {
      const validatedData = insertWalletTransferSchema.parse(req.body);
      const transfer = await storage.createWalletTransfer(validatedData);
      res.json(transfer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transfer" });
    }
  });

  // Update transfer status
  app.patch("/api/transfers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const transferId = parseInt(id);
      
      if (isNaN(transferId)) {
        return res.status(400).json({ message: "Invalid transfer ID" });
      }

      const updates = req.body;
      const transfer = await storage.updateWalletTransfer(transferId, updates);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update transfer" });
    }
  });

  // Get transfer status
  app.get("/api/transfers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const transferId = parseInt(id);
      
      if (isNaN(transferId)) {
        return res.status(400).json({ message: "Invalid transfer ID" });
      }

      const transfer = await storage.getWalletTransfer(transferId);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transfer" });
    }
  });

  // Points system API
  // Get user points
  app.get("/api/points/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      let userPoints = await storage.getUserPoints(walletAddress);
      
      if (!userPoints) {
        // Create new user points record
        userPoints = await storage.createUserPoints({ walletAddress });
      }
      
      res.json(userPoints);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user points" });
    }
  });

  // Add points for swap
  app.post("/api/points/swap", async (req, res) => {
    try {
      const { walletAddress, swapAmount, transactionHash } = req.body;
      
      if (!walletAddress || !swapAmount) {
        return res.status(400).json({ message: "Wallet address and swap amount required" });
      }

      // Calculate points (variable amount per swap)
      const points = Math.floor(Math.random() * 50) + 75; // Random 75-125 points
      
      // Get or create user points
      let userPoints = await storage.getUserPoints(walletAddress);
      if (!userPoints) {
        userPoints = await storage.createUserPoints({ walletAddress });
      }

      // Update total points
      const newTotal = userPoints.totalPoints + points;
      const updatedPoints = await storage.updateUserPoints(walletAddress, newTotal);

      // Add to history
      await storage.addPointsHistory({
        walletAddress,
        points,
        type: "swap",
        transactionHash,
        swapAmount,
      });

      res.json({ success: true, points, totalPoints: newTotal });
    } catch (error) {
      res.status(500).json({ message: "Failed to add swap points" });
    }
  });

  // Add referral bonus
  app.post("/api/points/referral", async (req, res) => {
    try {
      const { walletAddress, referrerAddress, swapAmount } = req.body;
      
      // If referrerAddress is an alphanumeric code, convert it to wallet address
      let actualReferrerAddress = referrerAddress;
      if (referrerAddress && /^[A-Z0-9]{6}$/.test(referrerAddress)) {
        const mappedAddress = await storage.getWalletByReferralCode(referrerAddress);
        if (mappedAddress) {
          actualReferrerAddress = mappedAddress;
        } else {
          return res.status(400).json({ message: "Invalid referral code" });
        }
      }
      
      if (!walletAddress || !actualReferrerAddress || !swapAmount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Calculate referral bonus (percentage of swap points)
      const basePoints = Math.floor(Math.random() * 50) + 75; // Random 75-125 points
      const bonusPoints = Math.floor(basePoints * 0.20);
      
      // Add bonus to referrer
      let referrerPoints = await storage.getUserPoints(actualReferrerAddress);
      if (!referrerPoints) {
        referrerPoints = await storage.createUserPoints({ walletAddress: actualReferrerAddress });
      }

      const newReferrerTotal = referrerPoints.totalPoints + bonusPoints;
      await storage.updateUserPoints(actualReferrerAddress, newReferrerTotal);

      // Add to referrer's history
      await storage.addPointsHistory({
        walletAddress: actualReferrerAddress,
        points: bonusPoints,
        type: "referral_reward",
        swapAmount,
      });

      // Add bonus to user who used referral
      let userPoints = await storage.getUserPoints(walletAddress);
      if (!userPoints) {
        userPoints = await storage.createUserPoints({ walletAddress, referredBy: actualReferrerAddress });
      }

      const userBonusPoints = Math.floor(basePoints * 0.20);
      const newUserTotal = userPoints.totalPoints + userBonusPoints;
      await storage.updateUserPoints(walletAddress, newUserTotal);

      // Add to user's history
      await storage.addPointsHistory({
        walletAddress,
        points: userBonusPoints,
        type: "referral_bonus",
        swapAmount,
      });

      res.json({ success: true, referrerBonus: bonusPoints, userBonus: userBonusPoints });
    } catch (error) {
      res.status(500).json({ message: "Failed to add referral bonus" });
    }
  });

  // Get points history
  app.get("/api/points/:walletAddress/history", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const history = await storage.getPointsHistory(walletAddress);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get points history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
