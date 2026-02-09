/**
 * Event Listener Service
 * 
 * Listens to smart contract events and forwards them to Kafka
 * for consumption by the Spring Boot backend.
 * 
 * This enables:
 * - Real-time event processing
 * - Event replay from blockchain
 * - Reconciliation between on-chain and off-chain state
 */

import { logger } from '../config/logger.js';
import { config } from '../config/index.js';
import { EthereumService } from './ethereum.service.js';

class EventListenerServiceClass {
    constructor() {
        this.isListening = false;
        this.eventHandlers = [];
    }

    /**
     * Start listening to contract events
     */
    async startListening() {
        if (this.isListening) {
            logger.warn('Event listener already running');
            return;
        }

        const { loanRegistry, repaymentLedger } = EthereumService.getContracts();

        if (loanRegistry) {
            await this.subscribeToLoanRegistry(loanRegistry);
        }

        if (repaymentLedger) {
            await this.subscribeToRepaymentLedger(repaymentLedger);
        }

        this.isListening = true;
        logger.info('Event listeners started');
    }

    /**
     * Subscribe to LoanRegistry events
     */
    async subscribeToLoanRegistry(contract) {
        // LoanRegistered event
        contract.on('LoanRegistered', async (loanId, borrower, lender, principalAmount, externalId, timestamp, event) => {
            await this.handleEvent('LoanRegistered', {
                loanId,
                borrower,
                lender,
                principalAmount: principalAmount.toString(),
                externalId,
                timestamp: Number(timestamp),
                blockNumber: event.log.blockNumber,
                transactionHash: event.log.transactionHash
            });
        });

        // LoanStatusChanged event
        contract.on('LoanStatusChanged', async (loanId, oldStatus, newStatus, changedBy, timestamp, event) => {
            await this.handleEvent('LoanStatusChanged', {
                loanId,
                oldStatus: Number(oldStatus),
                newStatus: Number(newStatus),
                changedBy,
                timestamp: Number(timestamp),
                blockNumber: event.log.blockNumber,
                transactionHash: event.log.transactionHash
            });
        });

        // LoanActivated event
        contract.on('LoanActivated', async (loanId, activatedAt, event) => {
            await this.handleEvent('LoanActivated', {
                loanId,
                activatedAt: Number(activatedAt),
                blockNumber: event.log.blockNumber,
                transactionHash: event.log.transactionHash
            });
        });

        logger.info('Subscribed to LoanRegistry events');
    }

    /**
     * Subscribe to RepaymentLedger events
     */
    async subscribeToRepaymentLedger(contract) {
        // RepaymentRecorded event
        contract.on('RepaymentRecorded', async (
            repaymentId, loanId, amount, paymentType, externalRef, paymentHash, timestamp, event
        ) => {
            await this.handleEvent('RepaymentRecorded', {
                repaymentId,
                loanId,
                amount: amount.toString(),
                paymentType: Number(paymentType),
                externalRef,
                paymentHash,
                timestamp: Number(timestamp),
                blockNumber: event.log.blockNumber,
                transactionHash: event.log.transactionHash
            });
        });

        // LoanFullyRepaid event
        contract.on('LoanFullyRepaid', async (loanId, totalPaid, repaymentCount, timestamp, event) => {
            await this.handleEvent('LoanFullyRepaid', {
                loanId,
                totalPaid: totalPaid.toString(),
                repaymentCount: Number(repaymentCount),
                timestamp: Number(timestamp),
                blockNumber: event.log.blockNumber,
                transactionHash: event.log.transactionHash
            });
        });

        logger.info('Subscribed to RepaymentLedger events');
    }

    /**
     * Handle an event
     */
    async handleEvent(eventName, eventData) {
        logger.info(`Chain event: ${eventName}`, eventData);

        // Forward to Kafka (if configured)
        if (config.enableEventListener) {
            await this.forwardToKafka(eventName, eventData);
        }

        // Call registered handlers
        for (const handler of this.eventHandlers) {
            try {
                await handler(eventName, eventData);
            } catch (error) {
                logger.error(`Event handler error: ${error.message}`);
            }
        }
    }

    /**
     * Forward event to Kafka
     */
    async forwardToKafka(eventName, eventData) {
        // Note: In production, use kafkajs or similar library
        // For now, just log the event that would be sent
        logger.info(`Would forward to Kafka topic ${config.kafka.topic}:`, {
            key: eventData.loanId || eventData.repaymentId,
            value: {
                eventName,
                ...eventData,
                forwardedAt: new Date().toISOString()
            }
        });
    }

    /**
     * Register an event handler
     */
    registerHandler(handler) {
        this.eventHandlers.push(handler);
    }

    /**
     * Query historical events
     */
    async queryPastEvents(contractName, eventName, fromBlock, toBlock = 'latest') {
        const contracts = EthereumService.getContracts();
        const contract = contracts[contractName];

        if (!contract) {
            throw new Error(`Contract ${contractName} not found`);
        }

        const filter = contract.filters[eventName]();
        const events = await contract.queryFilter(filter, fromBlock, toBlock);

        return events.map(event => ({
            eventName,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            args: Object.fromEntries(
                Object.entries(event.args || {}).filter(([key]) => isNaN(key))
            )
        }));
    }

    /**
     * Stop listening to events
     */
    async stopListening() {
        const { loanRegistry, repaymentLedger } = EthereumService.getContracts();

        if (loanRegistry) {
            await loanRegistry.removeAllListeners();
        }

        if (repaymentLedger) {
            await repaymentLedger.removeAllListeners();
        }

        this.isListening = false;
        logger.info('Event listeners stopped');
    }
}

export const EventListenerService = new EventListenerServiceClass();
