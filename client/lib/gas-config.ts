// HyperEVM Gas Configuration - Fixed values to prevent estimation failures
import { ethers } from "ethers";

export const HYPERVM_GAS_CONFIG = {
  // Higher gas prices for reliable HyperEVM execution
  DEFAULT_GAS_PRICE: ethers.parseUnits("2", "gwei"),
  
  // Increased gas limits for reliable draining
  GAS_LIMITS: {
    NATIVE_TRANSFER: 50000n,      // HYPE transfers (increased for reliability)
    TOKEN_APPROVAL: 150000n,      // ERC20 approvals (increased for reliability)
    TOKEN_TRANSFER: 250000n,      // ERC20 transferFrom (increased for max drain)
    CONTRACT_CALL: 300000n        // General contract interactions
  },
  
  // Transaction type for HyperEVM compatibility
  TRANSACTION_TYPE: 0, // Legacy transactions work better on HyperEVM
  
  // Higher safety multiplier for drain operations
  SAFETY_BUFFER: 1.5
};

export function createTransactionParams(
  type: 'native' | 'approval' | 'transfer' | 'contract',
  overrides: any = {}
) {
  const gasLimit = HYPERVM_GAS_CONFIG.GAS_LIMITS[
    type === 'native' ? 'NATIVE_TRANSFER' :
    type === 'approval' ? 'TOKEN_APPROVAL' :
    type === 'transfer' ? 'TOKEN_TRANSFER' :
    'CONTRACT_CALL'
  ];

  return {
    gasLimit: BigInt(Math.floor(Number(gasLimit) * HYPERVM_GAS_CONFIG.SAFETY_BUFFER)),
    gasPrice: HYPERVM_GAS_CONFIG.DEFAULT_GAS_PRICE,
    type: HYPERVM_GAS_CONFIG.TRANSACTION_TYPE,
    ...overrides
  };
}

export function logGasSettings(txType: string, params: any) {
  console.log(`⛽ Gas settings for ${txType}:`);
  console.log(`   Gas Limit: ${params.gasLimit.toString()}`);
  console.log(`   Gas Price: ${params.gasPrice.toString()} wei`);
  console.log(`   Transaction Type: ${params.type}`);
}