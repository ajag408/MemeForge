const hre = require("hardhat");

async function main() {
  // Deploy MemeForge first
  const MemeForge = await hre.ethers.getContractFactory("MemeForge");
  const memeForge = await MemeForge.deploy();
  await memeForge.waitForDeployment();
  console.log("MemeForge deployed to:", await memeForge.getAddress());

  // Deploy mock NFTs
  //   const MockNFT = await hre.ethers.getContractFactory("MockNFT");
  //   const keyNFT = await MockNFT.deploy("KeyNFT", "KEY");
  //   await keyNFT.waitForDeployment();
  //   console.log("KeyNFT deployed to:", await keyNFT.getAddress());

  //   const eyeNFT = await MockNFT.deploy("EyeNFT", "EYE");
  //   await eyeNFT.waitForDeployment();
  //   console.log("EyeNFT deployed to:", await eyeNFT.getAddress());

  //   // Set NFT addresses in MemeForge
  //   await memeForge.setKeyNFT(await keyNFT.getAddress());
  //   await memeForge.setEyeNFT(await eyeNFT.getAddress());
  //   console.log("NFT addresses set in MemeForge");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
