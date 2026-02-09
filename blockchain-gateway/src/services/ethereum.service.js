/**
 * Ethereum Service
 * 
 * Core service for interacting with the Ethereum network.
 * This is where the private key is used to sign transactions.
 * 
 * Key Security Features:
 * - Private key loaded once at startup
 * - Key is never logged or exposed
 * - All transactions signed locally before broadcast
 */

import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import ABIs using readFileSync for Node.js 22 compatibility
const LoanRegistryABI = JSON.parse(readFileSync(join(__dirname, '../abi/LoanRegistry.json'), 'utf-8'));
const RepaymentLedgerABI = JSON.parse(readFileSync(join(__dirname, '../abi/RepaymentLedger.json'), 'utf-8'));

class EthereumServiceClass {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.loanRegistry = null;
        this.repaymentLedger = null;
        this.initialized = false;
    }

    /**
     * Initialize the Ethereum connection and contracts
     */
    async initialize() {
        if (this.initialized) {
            logger.warn('EthereumService already initialized');
            return;
        }

        try {
            // Create provider
            this.provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);

            // Verify connection
            const network = await this.provider.getNetwork();
            logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

            // Create wallet from private key
            if (!config.privateKey) {
                throw new Error('Private key not configured');
            }

            this.wallet = new ethers.Wallet(config.privateKey, this.provider);
            logger.info(`Wallet address: ${this.wallet.address}`);

            // Log wallet balance (helpful for debugging)
            const balance = await this.provider.getBalance(this.wallet.address);
            logger.info(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

            // Initialize contracts if addresses are configured
            if (config.contracts.loanRegistry) {
                this.loanRegistry = new ethers.Contract(
                    config.contracts.loanRegistry,
                    LoanRegistryABI.abi,
                    this.wallet
                );
                logger.info(`LoanRegistry contract at: ${config.contracts.loanRegistry}`);
            }

            if (config.contracts.repaymentLedger) {
                this.repaymentLedger = new ethers.Contract(
                    config.contracts.repaymentLedger,
                    RepaymentLedgerABI.abi,
                    this.wallet
                );
                logger.info(`RepaymentLedger contract at: ${config.contracts.repaymentLedger}`);
            }

            this.initialized = true;
            logger.info('EthereumService initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize EthereumService:', error);
            throw error;
        }
    }

    /**
     * Get current chain ID
     */
    async getChainId() {
        const network = await this.provider.getNetwork();
        return network.chainId.toString();
    }

    /**
     * Get current block number
     */
    async getBlockNumber() {
        return await this.provider.getBlockNumber();
    }

    /**
     * Get wallet balance
     */
    async getBalance() {
        const balance = await this.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
    }

    /**
     * Estimate gas for a transaction with safety multiplier
     */
    async estimateGasWithBuffer(contract, method, args) {
        const gasEstimate = await contract[method].estimateGas(...args);
        const gasWithBuffer = gasEstimate * BigInt(Math.floor(config.gasLimitMultiplier * 100)) / 100n;
        return gasWithBuffer;
    }

    /**
     * Get current gas price with optional priority fee
     */
    async getGasPrice() {
        const feeData = await this.provider.getFeeData();
        return {
            gasPrice: feeData.gasPrice,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        };
    }

    /**
     * Get the provider instance
     */
    getProvider() {
        return this.provider;
    }

    /**
     * Get the wallet instance
     */
    getWallet() {
        return this.wallet;
    }

    /**
     * Get contract instances
     */
    getContracts() {
        return {
            loanRegistry: this.loanRegistry,
            repaymentLedger: this.repaymentLedger
        };
    }
}

// Singleton instance
export const EthereumService = new EthereumServiceClass();
