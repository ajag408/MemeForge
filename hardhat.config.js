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
  },
  //   etherscan: {
  //     apiKey: process.env.ETHERSCAN_API_KEY,
  //   },
};
