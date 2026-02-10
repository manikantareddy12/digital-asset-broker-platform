/**
 * Application Configuration
 * 
 * All configuration is loaded from environment variables.
 * In production, these should come from a secrets manager (Vault, AWS Secrets, etc.)
 */

export const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    // CORS - Allow admin UI and loan service
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:5173',  // Vite dev server (admin-ui)
        'http://localhost:8081',  // Spring Boot (loan-service)
        'http://localhost:8080'   // Legacy
    ],

    // Ethereum
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
    privateKey: process.env.PRIVATE_KEY || process.env.BLOCKCHAIN_PRIVATE_KEY,

    // Contract Addresses (populated after deployment)
    contracts: {
        loanRegistry: process.env.LOAN_REGISTRY_ADDRESS || '',
        repaymentLedger: process.env.REPAYMENT_LEDGER_ADDRESS || ''
    },

    // Transaction Settings
    gasLimitMultiplier: parseFloat(process.env.GAS_LIMIT_MULTIPLIER || '1.2'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
    confirmations: parseInt(process.env.CONFIRMATIONS || '1', 10),

    // Event Listener
    enableEventListener: process.env.ENABLE_EVENT_LISTENER === 'true',

    // Kafka (optional, for event forwarding)
    kafka: {
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
        clientId: process.env.KAFKA_CLIENT_ID || 'blockchain-gateway',
        topic: process.env.KAFKA_CHAIN_EVENTS_TOPIC || 'chain-events'
    },

    // Idempotency
    idempotencyTtlSeconds: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400', 10)
};

// Validate required configuration
export function validateConfig() {
    const errors = [];

    if (!config.privateKey) {
        errors.push('PRIVATE_KEY or BLOCKCHAIN_PRIVATE_KEY is required');
    }

    if (!config.ethereumRpcUrl) {
        errors.push('ETHEREUM_RPC_URL is required');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
}
