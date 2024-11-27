const { Alchemy, Network } = require("alchemy-sdk");
require("dotenv").config();

async function testAlchemyConnection() {
  const config = {
    apiKey: process.env.SHAPE_SEPOLIA_API_URL.split("/").pop(),
    network: Network.SHAPE_SEPOLIA,
  };

  try {
    const alchemy = new Alchemy(config);
    const blockNumber = await alchemy.core.getBlockNumber();
    console.log("Alchemy Connection Successful! Block number:", blockNumber);
    return true;
  } catch (error) {
    console.error("Alchemy Connection Failed:", error);
    return false;
  }
}

testAlchemyConnection();
