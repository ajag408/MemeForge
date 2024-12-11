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
    "0xdF329d59bC797907703F7c198dDA2d770fC45034"
  );
  console.log("GasBack contract set");

  // Set GasBack token ID
  await memeForgeGasBack.setGasBackTokenId(22);
  console.log("GasBack token ID set");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
