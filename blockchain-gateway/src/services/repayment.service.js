/**
 * Repayment Service
 * 
 * Business logic for repayment-related blockchain operations.
 * Wraps the RepaymentLedger contract interactions.
 */

import { logger } from '../config/logger.js';
import { EthereumService } from './ethereum.service.js';
import { TransactionService } from './transaction.service.js';

// Payment type enum (must match contract)
export const PaymentType = {
    REGULAR: 0,
    EARLY: 1,
    LATE: 2,
    FINAL: 3,
    PARTIAL: 4
};

export const PaymentTypeNames = ['REGULAR', 'EARLY', 'LATE', 'FINAL', 'PARTIAL'];

export class RepaymentService {

    /**
     * Record a repayment on the blockchain
     * 
     * @param {object} repaymentData - Repayment details
     * @param {string} repaymentData.loanId - Loan ID (bytes32)
     * @param {string} repaymentData.amount - Total payment amount in wei
     * @param {string} repaymentData.principalPortion - Principal portion in wei
     * @param {string} repaymentData.interestPortion - Interest portion in wei
     * @param {string} repaymentData.feePortion - Fee portion in wei
     * @param {number} repaymentData.paymentType - Payment type enum value
     * @param {string} repaymentData.externalRef - Reference to off-chain payment
     * @param {string} [idempotencyKey] - Idempotency key
     * @returns {object} - Transaction result with repaymentId
     */
    static async recordRepayment(repaymentData, idempotencyKey) {
        const { repaymentLedger } = EthereumService.getContracts();

        if (!repaymentLedger) {
            throw new Error('RepaymentLedger contract not initialized');
        }

        const {
            loanId,
            amount,
            principalPortion,
            interestPortion,
            feePortion,
            paymentType,
            externalRef
        } = repaymentData;

        // Validate portions add up
        const total = BigInt(principalPortion) + BigInt(interestPortion) + BigInt(feePortion);
        if (total !== BigInt(amount)) {
            throw new Error('Payment portions must equal total amount');
        }

        logger.info('Recording repayment on chain', {
            loanId,
            amount,
            paymentType: PaymentTypeNames[paymentType],
            externalRef
        });

        const result = await TransactionService.executeWithRetry(
            repaymentLedger,
            'recordRepayment',
            [
                loanId,
                BigInt(amount),
                BigInt(principalPortion),
                BigInt(interestPortion),
                BigInt(feePortion),
                paymentType,
                externalRef
            ],
            { idempotencyKey }
        );

        // Extract repaymentId from events
        const recordedEvent = result.events.find(e => e.name === 'RepaymentRecorded');
        const repaymentId = recordedEvent?.args?.repaymentId;
        const paymentHash = recordedEvent?.args?.paymentHash;

        return {
            ...result,
            repaymentId,
            paymentHash
        };
    }

    /**
     * Get repayment details
     * 
     * @param {string} repaymentId - Repayment ID (bytes32)
     */
    static async getRepayment(repaymentId) {
        const { repaymentLedger } = EthereumService.getContracts();

        if (!repaymentLedger) {
            throw new Error('RepaymentLedger contract not initialized');
        }

        const repayment = await repaymentLedger.getRepayment(repaymentId);

        return {
            repaymentId: repayment.repaymentId,
            loanId: repayment.loanId,
            amount: repayment.amount.toString(),
            principalPortion: repayment.principalPortion.toString(),
            interestPortion: repayment.interestPortion.toString(),
            feePortion: repayment.feePortion.toString(),
            paymentType: Number(repayment.paymentType),
            paymentTypeName: PaymentTypeNames[Number(repayment.paymentType)],
            recordedAt: Number(repayment.recordedAt),
            externalRef: repayment.externalRef,
            paymentHash: repayment.paymentHash
        };
    }

    /**
     * Get all repayment IDs for a loan
     * 
     * @param {string} loanId - Loan ID (bytes32)
     */
    static async getLoanRepaymentIds(loanId) {
        const { repaymentLedger } = EthereumService.getContracts();

        if (!repaymentLedger) {
            throw new Error('RepaymentLedger contract not initialized');
        }

        return await repaymentLedger.getLoanRepaymentIds(loanId);
    }

    /**
     * Get total amount paid for a loan
     * 
     * @param {string} loanId - Loan ID (bytes32)
     */
    static async getLoanTotalPaid(loanId) {
        const { repaymentLedger } = EthereumService.getContracts();

        if (!repaymentLedger) {
            throw new Error('RepaymentLedger contract not initialized');
        }

        const total = await repaymentLedger.loanTotalPaid(loanId);
        return total.toString();
    }

    /**
     * Compute payment hash for verification
     */
    static async computePaymentHash(loanId, amount, timestamp, externalRef) {
        const { repaymentLedger } = EthereumService.getContracts();

        if (!repaymentLedger) {
            throw new Error('RepaymentLedger contract not initialized');
        }

        return await repaymentLedger.computePaymentHash(
            loanId,
            BigInt(amount),
            BigInt(timestamp),
            externalRef
        );
    }
}
