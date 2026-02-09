/**
 * Health Routes
 * 
 * Endpoints for health checks and status monitoring.
 */

import express from 'express';
import { EthereumService } from '../services/ethereum.service.js';

const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /health/ready
 * Readiness check - verifies blockchain connection
 */
router.get('/ready', async (req, res) => {
    try {
        const chainId = await EthereumService.getChainId();
        const blockNumber = await EthereumService.getBlockNumber();
        const balance = await EthereumService.getBalance();

        const contracts = EthereumService.getContracts();

        res.json({
            status: 'ready',
            blockchain: {
                chainId,
                blockNumber,
                walletBalance: `${balance} ETH`
            },
            contracts: {
                loanRegistry: contracts.loanRegistry ? 'connected' : 'not configured',
                repaymentLedger: contracts.repaymentLedger ? 'connected' : 'not configured'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /health/live
 * Liveness check - verifies server is running
 */
router.get('/live', (req, res) => {
    res.json({
        status: 'alive',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

export default router;
