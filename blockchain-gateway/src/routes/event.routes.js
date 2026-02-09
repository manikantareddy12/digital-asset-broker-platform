/**
 * Event Routes
 * 
 * REST API endpoints for querying blockchain events.
 */

import express from 'express';
import { query, param, validationResult } from 'express-validator';
import { EventListenerService } from '../services/eventListener.service.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * GET /chain/events/loan/:loanId
 * Get all events for a specific loan
 */
router.get('/loan/:loanId',
    param('loanId').isHexadecimal().isLength({ min: 66, max: 66 }).withMessage('Invalid loan ID'),
    query('fromBlock').optional().isInt({ min: 0 }),
    query('toBlock').optional(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { loanId } = req.params;
        const fromBlock = parseInt(req.query.fromBlock) || 0;
        const toBlock = req.query.toBlock || 'latest';

        try {
            // Query both contracts for events related to this loan
            const [loanEvents, repaymentEvents] = await Promise.all([
                EventListenerService.queryPastEvents('loanRegistry', 'LoanRegistered', fromBlock, toBlock),
                EventListenerService.queryPastEvents('repaymentLedger', 'RepaymentRecorded', fromBlock, toBlock)
            ]);

            // Filter events for this loan
            const filteredLoanEvents = loanEvents.filter(e => e.args.loanId === loanId);
            const filteredRepaymentEvents = repaymentEvents.filter(e => e.args.loanId === loanId);

            // Also get status change events
            const statusEvents = await EventListenerService.queryPastEvents(
                'loanRegistry', 'LoanStatusChanged', fromBlock, toBlock
            );
            const filteredStatusEvents = statusEvents.filter(e => e.args.loanId === loanId);

            // Combine and sort by block number
            const allEvents = [
                ...filteredLoanEvents,
                ...filteredStatusEvents,
                ...filteredRepaymentEvents
            ].sort((a, b) => a.blockNumber - b.blockNumber);

            res.json({
                success: true,
                data: {
                    loanId,
                    fromBlock,
                    toBlock,
                    totalEvents: allEvents.length,
                    events: allEvents
                }
            });
        } catch (error) {
            logger.error('Failed to query loan events:', error);

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * GET /chain/events/recent
 * Get recent events from all contracts
 */
router.get('/recent',
    query('blocks').optional().isInt({ min: 1, max: 1000 }).default(100),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const blocksBack = parseInt(req.query.blocks) || 100;

        try {
            const { EthereumService } = await import('../services/ethereum.service.js');
            const currentBlock = await EthereumService.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - blocksBack);

            const [loanRegistered, statusChanged, repayments] = await Promise.all([
                EventListenerService.queryPastEvents('loanRegistry', 'LoanRegistered', fromBlock),
                EventListenerService.queryPastEvents('loanRegistry', 'LoanStatusChanged', fromBlock),
                EventListenerService.queryPastEvents('repaymentLedger', 'RepaymentRecorded', fromBlock)
            ]);

            // Combine and sort
            const allEvents = [
                ...loanRegistered,
                ...statusChanged,
                ...repayments
            ].sort((a, b) => b.blockNumber - a.blockNumber);

            res.json({
                success: true,
                data: {
                    currentBlock,
                    fromBlock,
                    totalEvents: allEvents.length,
                    events: allEvents.slice(0, 50) // Limit to 50 most recent
                }
            });
        } catch (error) {
            logger.error('Failed to query recent events:', error);

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * GET /chain/events/type/:eventType
 * Get events by type
 */
router.get('/type/:eventType',
    param('eventType').isIn([
        'LoanRegistered', 'LoanStatusChanged', 'LoanActivated',
        'RepaymentRecorded', 'LoanFullyRepaid'
    ]),
    query('fromBlock').optional().isInt({ min: 0 }),
    query('toBlock').optional(),
    query('limit').optional().isInt({ min: 1, max: 100 }).default(50),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { eventType } = req.params;
        const fromBlock = parseInt(req.query.fromBlock) || 0;
        const toBlock = req.query.toBlock || 'latest';
        const limit = parseInt(req.query.limit) || 50;

        // Determine which contract has this event
        const loanRegistryEvents = ['LoanRegistered', 'LoanStatusChanged', 'LoanActivated'];
        const contractName = loanRegistryEvents.includes(eventType) ? 'loanRegistry' : 'repaymentLedger';

        try {
            const events = await EventListenerService.queryPastEvents(
                contractName, eventType, fromBlock, toBlock
            );

            // Sort by block (newest first) and limit
            const sortedEvents = events
                .sort((a, b) => b.blockNumber - a.blockNumber)
                .slice(0, limit);

            res.json({
                success: true,
                data: {
                    eventType,
                    contract: contractName,
                    fromBlock,
                    toBlock,
                    totalEvents: events.length,
                    returnedEvents: sortedEvents.length,
                    events: sortedEvents
                }
            });
        } catch (error) {
            logger.error(`Failed to query ${eventType} events:`, error);

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

export default router;
