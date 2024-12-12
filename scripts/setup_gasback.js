const hre = require("hardhat");

async function main() {
  // Load deployment addresses
  const deployments = require("../deployments.json");

  // Get contract instances
  const memeForgeGasBack = await ethers.getContractAt(
    "MemeForgeGasBack",
    deployments.MemeForgeGasBack
  );

  // Set GasBack contract address
  await memeForgeGasBack.setGasBackContract(
    "0xf5e602c87d675E978F097503aedE4A766285a08B"
  );
  console.log("GasBack contract set");

  // Set GasBack token ID
  await memeForgeGasBack.setGasBackTokenId(150);
  console.log("GasBack token ID set");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
