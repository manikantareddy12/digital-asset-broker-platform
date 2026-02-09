/**
 * Error Handler Middleware
 * 
 * Centralized error handling for all routes.
 * Provides consistent error response format.
 */

import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Request error:', {
        method: req.method,
        path: req.path,
        error: err.message,
        stack: err.stack
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.message
        });
    }

    if (err.code === 'CALL_EXCEPTION') {
        // Contract call failed
        const reason = err.reason || 'Contract call failed';
        return res.status(400).json({
            success: false,
            error: 'Smart contract error',
            details: reason
        });
    }

    if (err.code === 'INSUFFICIENT_FUNDS') {
        return res.status(503).json({
            success: false,
            error: 'Insufficient funds for transaction',
            details: 'The wallet does not have enough ETH for gas'
        });
    }

    if (err.code === 'NETWORK_ERROR' || err.code === 'SERVER_ERROR') {
        return res.status(503).json({
            success: false,
            error: 'Blockchain network unavailable',
            details: err.message
        });
    }

    // Default error response
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
}
