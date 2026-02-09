require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    // Hardhat's built-in network
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0
      }
    },
    // Ethereum Sepolia testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Hyperledger Besu (for enterprise deployments)
    besu: {
      url: process.env.BESU_RPC_URL || "http://localhost:8545",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: parseInt(process.env.BESU_CHAIN_ID || "1337")
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
