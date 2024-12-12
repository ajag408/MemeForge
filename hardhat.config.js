require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    shapeSepolia: {
      url: process.env.SHAPE_SEPOLIA_API_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    shape: {
      url: process.env.SHAPE_MAINNET_API_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 360,
      timeout: 120000,
      httpHeaders: {
        Accept: "*/*",
        Connection: "keep-alive",
      },
      gasPrice: "auto",
      gas: 2100000,
    },
  },
  //   etherscan: {
  //     apiKey: process.env.ETHERSCAN_API_KEY,
  //   },
};
