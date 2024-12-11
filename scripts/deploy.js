const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MemeForgeCore first
  const MemeForgeCore = await ethers.getContractFactory("MemeForgeCore");
  const memeForgeCore = await MemeForgeCore.deploy();
  await memeForgeCore.waitForDeployment();
  const memeForgeCoreAddress = await memeForgeCore.getAddress();
  console.log("MemeForgeCore deployed to:", memeForgeCoreAddress);

  // Deploy MemeForgeGasBack with core address
  const MemeForgeGasBack = await ethers.getContractFactory("MemeForgeGasBack");
  const memeForgeGasBack = await MemeForgeGasBack.deploy(memeForgeCoreAddress);
  await memeForgeGasBack.waitForDeployment();
  console.log(
    "MemeForgeGasBack deployed to:",
    await memeForgeGasBack.getAddress()
  );

  // Connect MemeForgeCore to GasBack
  await memeForgeCore.setGasBackContract(await memeForgeGasBack.getAddress());
  console.log("Contracts linked successfully");

  // Save deployment addresses for next script
  const deployments = {
    MemeForgeCore: memeForgeCoreAddress,
    MemeForgeGasBack: await memeForgeGasBack.getAddress(),
  };

  // Save to file
  const fs = require("fs");
  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
