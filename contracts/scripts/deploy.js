const hre = require("hardhat");

async function main() {
  console.log("Deploying ContractRegistry to Sepolia...");

  const ContractRegistry = await hre.ethers.getContractFactory("ContractRegistry");
  const registry = await ContractRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`ContractRegistry deployed to: ${address}`);
  console.log("Add this address to your .env as CONTRACT_REGISTRY_ADDRESS");

  // Wait for block confirmations before verifying
  console.log("Waiting for block confirmations...");
  await registry.deploymentTransaction().wait(6);

  // Verify on Etherscan
  console.log("Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("Contract verified on Etherscan!");
  } catch (error) {
    console.log("Verification failed (may already be verified):", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
