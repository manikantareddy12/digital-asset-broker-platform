/**
 * Winston Logger Configuration
 * 
 * Structured logging for production debugging and monitoring.
 * NEVER log private keys or sensitive data.
 */

import winston from 'winston';
import { config } from './index.js';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}] ${message} ${metaStr}`;
    })
);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'blockchain-gateway' },
    transports: [
        // Console transport (colored for development)
        new winston.transports.Console({
            format: config.nodeEnv === 'development' ? consoleFormat : logFormat
        })
    ]
});

// Add file transport in production
if (config.nodeEnv === 'production') {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log'
    }));
}
