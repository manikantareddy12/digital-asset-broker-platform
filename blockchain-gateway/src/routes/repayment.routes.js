/**
 * Repayment Routes
 * 
 * REST API endpoints for repayment-related blockchain operations.
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { RepaymentService, PaymentTypeNames } from '../services/repayment.service.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * POST /chain/repayment/record
 * Record a repayment on the blockchain
 */
router.post('/record',
    // Validation
    body('loanId').isHexadecimal().isLength({ min: 66, max: 66 }).withMessage('Invalid loan ID'),
    body('amount').isString().notEmpty().withMessage('Amount required'),
    body('principalPortion').isString().notEmpty().withMessage('Principal portion required'),
    body('interestPortion').isString().notEmpty().withMessage('Interest portion required'),
    body('feePortion').isString().notEmpty().withMessage('Fee portion required'),
    body('paymentType').isIn(PaymentTypeNames).withMessage('Invalid payment type'),
    body('externalRef').isString().notEmpty().withMessage('External reference required'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const idempotencyKey = req.headers['x-idempotency-key'];

        // Convert paymentType name to enum value
        const repaymentData = {
            ...req.body,
            paymentType: PaymentTypeNames.indexOf(req.body.paymentType)
        };

        try {
            const result = await RepaymentService.recordRepayment(repaymentData, idempotencyKey);

            res.status(201).json({
                success: true,
                message: 'Repayment recorded on blockchain',
                data: {
                    repaymentId: result.repaymentId,
                    paymentHash: result.paymentHash,
                    transactionHash: result.transactionHash,
                    blockNumber: result.blockNumber,
                    gasUsed: result.gasUsed
                }
            });
        } catch (error) {
            logger.error('Failed to record repayment:', error);

            // Handle specific errors
            if (error.message.includes('portions must equal')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * GET /chain/repayment/:repaymentId
 * Get repayment details
 */
router.get('/:repaymentId',
    param('repaymentId').isHexadecimal().isLength({ min: 66, max: 66 }).withMessage('Invalid repayment ID'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        try {
            const repayment = await RepaymentService.getRepayment(req.params.repaymentId);

            res.json({
                success: true,
                data: repayment
            });
        } catch (error) {
            logger.error('Failed to get repayment:', error);

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * GET /chain/repayment/loan/:loanId
 * Get all repayments for a loan
 */
router.get('/loan/:loanId',
    param('loanId').isHexadecimal().isLength({ min: 66, max: 66 }).withMessage('Invalid loan ID'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        try {
            const [repaymentIds, totalPaid] = await Promise.all([
                RepaymentService.getLoanRepaymentIds(req.params.loanId),
                RepaymentService.getLoanTotalPaid(req.params.loanId)
            ]);

            res.json({
                success: true,
                data: {
                    loanId: req.params.loanId,
                    repaymentCount: repaymentIds.length,
                    repaymentIds,
                    totalPaid
                }
            });
        } catch (error) {
            logger.error('Failed to get loan repayments:', error);

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * POST /chain/repayment/verify-hash
 * Verify a payment hash
 */
router.post('/verify-hash',
    body('loanId').isHexadecimal().isLength({ min: 66, max: 66 }),
    body('amount').isString().notEmpty(),
    body('timestamp').isInt({ min: 0 }),
    body('externalRef').isString().notEmpty(),
    body('expectedHash').isHexadecimal(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        try {
            const { loanId, amount, timestamp, externalRef, expectedHash } = req.body;

            const computedHash = await RepaymentService.computePaymentHash(
                loanId, amount, timestamp, externalRef
            );

            const matches = computedHash.toLowerCase() === expectedHash.toLowerCase();

            res.json({
                success: true,
                data: {
                    matches,
                    computedHash,
                    expectedHash
                }
            });
        } catch (error) {
            logger.error('Failed to verify hash:', error);

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

export default router;
