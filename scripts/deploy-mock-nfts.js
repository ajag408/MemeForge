const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying mock NFTs with account:", deployer.address);

  // Deploy Mock Key NFT
  const MockNFT = await hre.ethers.getContractFactory("MockNFT");
  const keyNFT = await MockNFT.deploy("MockKeyNFT", "KEY");
  await keyNFT.waitForDeployment();
  console.log("MockKeyNFT deployed to:", await keyNFT.getAddress());

  // Deploy Mock Eye NFT
  const eyeNFT = await MockNFT.deploy("MockEyeNFT", "EYE");
  await eyeNFT.waitForDeployment();
  console.log("MockEyeNFT deployed to:", await eyeNFT.getAddress());

  // Mint NFTs to deployer
  await keyNFT.mint(deployer.address, 0);
  console.log("Minted Key NFT to deployer");

  await eyeNFT.mint(deployer.address, 0);
  console.log("Minted Eye NFT to deployer");

  // Transfer Eye NFT to specified address
  const targetAddress = "0x7210F409037e0071c8AeD2B8991f597b19431564";
  await eyeNFT.transferFrom(deployer.address, targetAddress, 0);
  console.log("Transferred Eye NFT to:", targetAddress);

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("Key NFT:", keyNFT.address);
  console.log("Eye NFT:", eyeNFT.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
