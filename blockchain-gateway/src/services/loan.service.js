/**
 * Loan Service
 * 
 * Business logic for loan-related blockchain operations.
 * Wraps the LoanRegistry contract interactions.
 */

import { ethers } from 'ethers';
import { logger } from '../config/logger.js';
import { EthereumService } from './ethereum.service.js';
import { TransactionService } from './transaction.service.js';

// Loan status enum (must match contract)
export const LoanStatus = {
    PENDING: 0,
    APPROVED: 1,
    ACTIVE: 2,
    COMPLETED: 3,
    DEFAULTED: 4,
    CANCELLED: 5
};

export const LoanStatusNames = ['PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'];

export class LoanService {

    /**
     * Register a new loan on the blockchain
     * 
     * @param {object} loanData - Loan details
     * @param {string} loanData.borrower - Borrower address
     * @param {string} loanData.lender - Lender address
     * @param {string} loanData.principalAmount - Amount in wei (as string)
     * @param {number} loanData.interestRateBps - Interest rate in basis points
     * @param {number} loanData.termDays - Loan term in days
     * @param {string} loanData.externalId - Reference to off-chain system
     * @param {string} [idempotencyKey] - Idempotency key
     * @returns {object} - Transaction result with loanId
     */
    static async registerLoan(loanData, idempotencyKey) {
        const { loanRegistry } = EthereumService.getContracts();

        if (!loanRegistry) {
            throw new Error('LoanRegistry contract not initialized');
        }

        const {
            borrower,
            lender,
            principalAmount,
            interestRateBps,
            termDays,
            externalId
        } = loanData;

        // Validate addresses
        if (!ethers.isAddress(borrower)) {
            throw new Error('Invalid borrower address');
        }
        if (!ethers.isAddress(lender)) {
            throw new Error('Invalid lender address');
        }

        logger.info('Registering loan on chain', {
            borrower,
            lender,
            principalAmount,
            externalId
        });

        const result = await TransactionService.executeWithRetry(
            loanRegistry,
            'registerLoan',
            [
                borrower,
                lender,
                BigInt(principalAmount),
                interestRateBps,
                termDays,
                externalId
            ],
            { idempotencyKey }
        );

        // Extract loanId from events
        const registeredEvent = result.events.find(e => e.name === 'LoanRegistered');
        const loanId = registeredEvent?.args?.loanId;

        return {
            ...result,
            loanId
        };
    }

    /**
     * Update loan status
     * 
     * @param {string} loanId - The loan ID (bytes32 hex string)
     * @param {number} newStatus - New status value
     * @param {string} [idempotencyKey] - Idempotency key
     */
    static async updateStatus(loanId, newStatus, idempotencyKey) {
        const { loanRegistry } = EthereumService.getContracts();

        if (!loanRegistry) {
            throw new Error('LoanRegistry contract not initialized');
        }

        logger.info('Updating loan status', {
            loanId,
            newStatus: LoanStatusNames[newStatus]
        });

        return await TransactionService.executeWithRetry(
            loanRegistry,
            'updateStatus',
            [loanId, newStatus],
            { idempotencyKey }
        );
    }

    /**
     * Get loan details from the blockchain
     * 
     * @param {string} loanId - The loan ID (bytes32 hex string)
     */
    static async getLoan(loanId) {
        const { loanRegistry } = EthereumService.getContracts();

        if (!loanRegistry) {
            throw new Error('LoanRegistry contract not initialized');
        }

        const loan = await loanRegistry.getLoan(loanId);

        return {
            loanId: loan.loanId,
            borrower: loan.borrower,
            lender: loan.lender,
            principalAmount: loan.principalAmount.toString(),
            interestRateBps: Number(loan.interestRateBps),
            termDays: Number(loan.termDays),
            createdAt: Number(loan.createdAt),
            activatedAt: Number(loan.activatedAt),
            status: Number(loan.status),
            statusName: LoanStatusNames[Number(loan.status)],
            externalId: loan.externalId
        };
    }

    /**
     * Get total loan count
     */
    static async getLoanCount() {
        const { loanRegistry } = EthereumService.getContracts();

        if (!loanRegistry) {
            throw new Error('LoanRegistry contract not initialized');
        }

        const count = await loanRegistry.getLoanCount();
        return Number(count);
    }

    /**
     * Check if a status transition is valid
     */
    static async isValidTransition(fromStatus, toStatus) {
        const { loanRegistry } = EthereumService.getContracts();

        if (!loanRegistry) {
            throw new Error('LoanRegistry contract not initialized');
        }

        return await loanRegistry.isValidTransition(fromStatus, toStatus);
    }
}
