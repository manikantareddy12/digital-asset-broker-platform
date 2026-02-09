/**
 * Loan Routes
 * 
 * REST API endpoints for loan-related blockchain operations.
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { LoanService, LoanStatus, LoanStatusNames } from '../services/loan.service.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * POST /chain/loan/register
 * Register a new loan on the blockchain
 */
router.post('/register',
    // Validation
    body('borrower').isEthereumAddress().withMessage('Invalid borrower address'),
    body('lender').isEthereumAddress().withMessage('Invalid lender address'),
    body('principalAmount').isString().notEmpty().withMessage('Principal amount required'),
    body('interestRateBps').isInt({ min: 0, max: 10000 }).withMessage('Interest rate must be 0-10000 bps'),
    body('termDays').isInt({ min: 1, max: 3650 }).withMessage('Term must be 1-3650 days'),
    body('externalId').isString().notEmpty().withMessage('External ID required'),

    async (req, res) => {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const idempotencyKey = req.headers['x-idempotency-key'];

        try {
            const result = await LoanService.registerLoan(req.body, idempotencyKey);

            res.status(201).json({
                success: true,
                message: 'Loan registered on blockchain',
                data: {
                    loanId: result.loanId,
                    transactionHash: result.transactionHash,
                    blockNumber: result.blockNumber,
                    gasUsed: result.gasUsed
                }
            });
        } catch (error) {
            logger.error('Failed to register loan:', error);

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * POST /chain/loan/:loanId/status
 * Update loan status
 */
router.post('/:loanId/status',
    param('loanId').isHexadecimal().isLength({ min: 66, max: 66 }).withMessage('Invalid loan ID'),
    body('status').isIn(LoanStatusNames).withMessage('Invalid status'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { loanId } = req.params;
        const statusName = req.body.status;
        const newStatus = LoanStatusNames.indexOf(statusName);
        const idempotencyKey = req.headers['x-idempotency-key'];

        try {
            const result = await LoanService.updateStatus(loanId, newStatus, idempotencyKey);

            res.json({
                success: true,
                message: `Loan status updated to ${statusName}`,
                data: {
                    transactionHash: result.transactionHash,
                    blockNumber: result.blockNumber,
                    gasUsed: result.gasUsed
                }
            });
        } catch (error) {
            logger.error('Failed to update loan status:', error);

            // Handle specific contract errors
            if (error.message.includes('InvalidTransition')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status transition'
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
 * GET /chain/loan/:loanId
 * Get loan details from blockchain
 */
router.get('/:loanId',
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
            const loan = await LoanService.getLoan(req.params.loanId);

            res.json({
                success: true,
                data: loan
            });
        } catch (error) {
            logger.error('Failed to get loan:', error);

            if (error.message.includes('LoanNotFound')) {
                return res.status(404).json({
                    success: false,
                    error: 'Loan not found'
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
 * GET /chain/loan/count
 * Get total loan count
 */
router.get('/stats/count', async (req, res) => {
    try {
        const count = await LoanService.getLoanCount();

        res.json({
            success: true,
            data: { count }
        });
    } catch (error) {
        logger.error('Failed to get loan count:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
