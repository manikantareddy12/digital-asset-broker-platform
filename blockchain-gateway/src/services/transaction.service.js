/**
 * Transaction Service
 * 
 * Handles transaction submission with:
 * - Retry logic with exponential backoff
 * - Idempotency key support
 * - Gas estimation and management
 * - Transaction confirmation waiting
 */

import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { EthereumService } from './ethereum.service.js';

// In-memory idempotency store (use Redis in production)
const idempotencyStore = new Map();

/**
 * Clean up old idempotency keys
 */
function cleanupIdempotencyStore() {
    const now = Date.now();
    const ttlMs = config.idempotencyTtlSeconds * 1000;

    for (const [key, value] of idempotencyStore.entries()) {
        if (now - value.timestamp > ttlMs) {
            idempotencyStore.delete(key);
        }
    }
}

// Cleanup every hour
setInterval(cleanupIdempotencyStore, 60 * 60 * 1000);

export class TransactionService {

    /**
     * Check if an idempotency key has been used
     * @param {string} key - Idempotency key
     * @returns {object|null} - Previous result if exists
     */
    static checkIdempotency(key) {
        if (!key) return null;

        const existing = idempotencyStore.get(key);
        if (existing) {
            logger.info(`Idempotency key found: ${key}, returning cached result`);
            return existing.result;
        }
        return null;
    }

    /**
     * Store result for idempotency key
     */
    static storeIdempotency(key, result) {
        if (!key) return;

        idempotencyStore.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Execute a contract method with retry logic
     * 
     * @param {ethers.Contract} contract - The contract instance
     * @param {string} method - Method name to call
     * @param {Array} args - Method arguments
     * @param {object} options - Additional options
     * @returns {object} - Transaction result
     */
    static async executeWithRetry(contract, method, args, options = {}) {
        const {
            idempotencyKey,
            gasLimit,
            maxRetries = config.maxRetries,
            retryDelay = config.retryDelayMs
        } = options;

        // Check idempotency
        const cachedResult = this.checkIdempotency(idempotencyKey);
        if (cachedResult) {
            return cachedResult;
        }

        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Transaction attempt ${attempt}/${maxRetries}`, {
                    method,
                    args: args.map(a => typeof a === 'bigint' ? a.toString() : a)
                });

                // Prepare transaction options
                const txOptions = {};

                if (gasLimit) {
                    txOptions.gasLimit = gasLimit;
                } else {
                    // Estimate gas with buffer
                    const estimated = await EthereumService.estimateGasWithBuffer(contract, method, args);
                    txOptions.gasLimit = estimated;
                }

                // Get current gas price
                const feeData = await EthereumService.getGasPrice();
                if (feeData.maxFeePerGas) {
                    txOptions.maxFeePerGas = feeData.maxFeePerGas;
                    txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                } else {
                    txOptions.gasPrice = feeData.gasPrice;
                }

                // Submit transaction
                const tx = await contract[method](...args, txOptions);

                logger.info(`Transaction submitted: ${tx.hash}`);

                // Wait for confirmation
                const receipt = await tx.wait(config.confirmations);

                logger.info(`Transaction confirmed in block ${receipt.blockNumber}`, {
                    txHash: receipt.hash,
                    gasUsed: receipt.gasUsed.toString(),
                    status: receipt.status
                });

                // Extract events from receipt
                const events = this.parseEvents(receipt, contract);

                const result = {
                    success: true,
                    transactionHash: receipt.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    events
                };

                // Store for idempotency
                this.storeIdempotency(idempotencyKey, result);

                return result;

            } catch (error) {
                lastError = error;

                logger.warn(`Transaction attempt ${attempt} failed:`, {
                    error: error.message,
                    code: error.code
                });

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    throw error;
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = retryDelay * Math.pow(2, attempt - 1);
                    logger.info(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error(`Transaction failed after ${maxRetries} attempts`, {
            error: lastError.message
        });

        throw lastError;
    }

    /**
     * Parse events from transaction receipt
     */
    static parseEvents(receipt, contract) {
        const events = [];

        for (const log of receipt.logs) {
            try {
                const parsed = contract.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });

                if (parsed) {
                    events.push({
                        name: parsed.name,
                        args: Object.fromEntries(
                            Object.entries(parsed.args).filter(([key]) => isNaN(key))
                        )
                    });
                }
            } catch {
                // Log from different contract, skip
            }
        }

        return events;
    }

    /**
     * Determine if error is non-retryable
     */
    static isNonRetryableError(error) {
        const nonRetryableCodes = [
            'INVALID_ARGUMENT',
            'UNPREDICTABLE_GAS_LIMIT',
            'CALL_EXCEPTION'
        ];

        return nonRetryableCodes.includes(error.code);
    }
}
