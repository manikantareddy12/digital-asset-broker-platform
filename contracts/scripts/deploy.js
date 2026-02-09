const { ethers } = require("hardhat");

/**
 * Deployment script for Loan Platform Smart Contracts
 * 
 * This script deploys:
 * 1. LoanRegistry - Main loan registration contract
 * 2. RepaymentLedger - Repayment tracking contract
 * 
 * After deployment, it grants the REGISTRAR_ROLE and RECORDER_ROLE
 * to a specified operator address (for use by the blockchain gateway).
 */
async function main() {
    console.log("=".repeat(60));
    console.log("Loan Platform Smart Contract Deployment");
    console.log("=".repeat(60));

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("\nDeployer address:", deployer.address);
    console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Get operator address from environment (or use deployer for local dev)
    const operatorAddress = process.env.OPERATOR_ADDRESS || deployer.address;
    console.log("Operator address:", operatorAddress);

    console.log("\n" + "-".repeat(60));
    console.log("Deploying LoanRegistry...");
    console.log("-".repeat(60));

    // Deploy LoanRegistry
    const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
    const loanRegistry = await LoanRegistry.deploy();
    await loanRegistry.waitForDeployment();

    const loanRegistryAddress = await loanRegistry.getAddress();
    console.log("LoanRegistry deployed to:", loanRegistryAddress);

    console.log("\n" + "-".repeat(60));
    console.log("Deploying RepaymentLedger...");
    console.log("-".repeat(60));

    // Deploy RepaymentLedger
    const RepaymentLedger = await ethers.getContractFactory("RepaymentLedger");
    const repaymentLedger = await RepaymentLedger.deploy();
    await repaymentLedger.waitForDeployment();

    const repaymentLedgerAddress = await repaymentLedger.getAddress();
    console.log("RepaymentLedger deployed to:", repaymentLedgerAddress);

    // Grant roles to operator if different from deployer
    if (operatorAddress !== deployer.address) {
        console.log("\n" + "-".repeat(60));
        console.log("Granting roles to operator...");
        console.log("-".repeat(60));

        const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
        const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECORDER_ROLE"));

        await loanRegistry.grantRole(REGISTRAR_ROLE, operatorAddress);
        console.log("Granted REGISTRAR_ROLE to operator on LoanRegistry");

        await repaymentLedger.grantRole(RECORDER_ROLE, operatorAddress);
        console.log("Granted RECORDER_ROLE to operator on RepaymentLedger");
    }

    // Output deployment summary
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("\nContract Addresses:");
    console.log(JSON.stringify({
        LoanRegistry: loanRegistryAddress,
        RepaymentLedger: repaymentLedgerAddress,
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        operator: operatorAddress,
        timestamp: new Date().toISOString()
    }, null, 2));

    // Write addresses to file for other services
    const fs = require("fs");
    const deploymentInfo = {
        LoanRegistry: loanRegistryAddress,
        RepaymentLedger: repaymentLedgerAddress,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        deployedAt: new Date().toISOString()
    };

    const deploymentsDir = "./deployments";
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const networkName = (await ethers.provider.getNetwork()).name || "localhost";
    fs.writeFileSync(
        `${deploymentsDir}/${networkName}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\nDeployment info saved to ${deploymentsDir}/${networkName}.json`);

    console.log("\n" + "=".repeat(60));
    console.log("Deployment complete!");
    console.log("=".repeat(60));

    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
