import { ethers } from 'ethers';

/**
 * HyperEVM Gas Configuration Utility
 * Handles proper gas formatting for HyperEVM transactions
 */

export interface HyperEVMGasConfig {
  gasLimit: number;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  type?: number;
}

/**
 * Get gas configuration specifically for HyperEVM network
 * Uses legacy transaction format to avoid envelope type errors
 */
export function getHyperEVMGasConfig(operation: 'approval' | 'liquidity'): HyperEVMGasConfig {
  const baseGasPrice = ethers.parseUnits("1", "gwei");
  
  if (operation === 'approval') {
    return {
      gasLimit: 100000,
      gasPrice: baseGasPrice,
      type: 0 // Legacy transaction
    };
  } else {
    return {
      gasLimit: 500000,
      gasPrice: baseGasPrice,
      type: 0 // Legacy transaction
    };
  }
}

/**
 * Prepare transaction options for HyperEVM
 * Ensures proper gas configuration and transaction type
 */
export function prepareHyperEVMTransaction(
  operation: 'approval' | 'liquidity',
  additionalOptions: any = {}
): any {
  const gasConfig = getHyperEVMGasConfig(operation);
  
  return {
    ...additionalOptions,
    ...gasConfig
  };
}

/**
 * Validate and fix gas configuration for HyperEVM
 * Removes EIP-1559 fields if present and ensures legacy format
 */
export function fixGasForHyperEVM(txOptions: any): any {
  const fixed = { ...txOptions };
  
  // Remove EIP-1559 fields that cause issues
  delete fixed.maxFeePerGas;
  delete fixed.maxPriorityFeePerGas;
  
  // Ensure legacy gas format
  if (!fixed.gasPrice) {
    fixed.gasPrice = ethers.parseUnits("1", "gwei");
  }
  
  // Force legacy transaction type
  fixed.type = 0;
  
  return fixed;
}