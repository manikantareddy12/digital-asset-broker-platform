/**
 * Blockchain Gateway - Main Entry Point
 * 
 * This service is the ONLY component that touches blockchain private keys.
 * It provides a REST API for the Spring Boot backend to interact with
 * smart contracts without needing blockchain knowledge.
 * 
 * Security Principles:
 * - Private key is loaded from environment (Vault in production)
 * - Never log or expose private keys
 * - All blockchain operations are signed here
 * - Event listeners forward chain events to Kafka
 */

import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { logger } from './config/logger.js';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestValidator } from './middleware/requestValidator.js';

// Routes
import healthRoutes from './routes/health.routes.js';
import loanRoutes from './routes/loan.routes.js';
import repaymentRoutes from './routes/repayment.routes.js';
import eventRoutes from './routes/event.routes.js';

// Services
import { EthereumService } from './services/ethereum.service.js';
import { EventListenerService } from './services/eventListener.service.js';

const app = express();

// ============ Security Middleware ============
app.use(helmet());
app.use(cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
}));

// ============ Request Parsing ============
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============ Logging ============
app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

// ============ Routes ============
app.use('/health', healthRoutes);
app.use('/chain/loan', loanRoutes);
app.use('/chain/repayment', repaymentRoutes);
app.use('/chain/events', eventRoutes);

// ============ Error Handler ============
app.use(errorHandler);

// ============ Server Startup ============
async function startServer() {
    try {
        // Initialize Ethereum connection
        logger.info('Initializing Ethereum connection...');
        await EthereumService.initialize();
        logger.info(`Connected to chain ID: ${await EthereumService.getChainId()}`);

        // Start event listeners (if enabled)
        if (config.enableEventListener) {
            logger.info('Starting contract event listeners...');
            await EventListenerService.startListening();
        }

        // Start HTTP server
        const server = app.listen(config.port, () => {
            logger.info(`Blockchain Gateway running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            await EventListenerService.stopListening();
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
