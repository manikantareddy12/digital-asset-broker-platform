-- =============================================
-- V2__Blockchain_Events.sql
-- Blockchain events table for reconciliation
-- =============================================

CREATE TABLE blockchain_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(150) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    loan_id VARCHAR(66),
    repayment_id VARCHAR(66),
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    event_hash VARCHAR(66),
    event_data TEXT,
    reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reconciliation_time TIMESTAMP,
    reconciliation_notes VARCHAR(500),
    event_timestamp TIMESTAMP NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- Indexes for efficient querying
CREATE INDEX idx_event_loan_id ON blockchain_events(loan_id);
CREATE INDEX idx_event_type ON blockchain_events(event_type);
CREATE INDEX idx_event_tx_hash ON blockchain_events(transaction_hash);
CREATE INDEX idx_event_block ON blockchain_events(block_number);
CREATE INDEX idx_event_status ON blockchain_events(reconciliation_status);
CREATE INDEX idx_event_received ON blockchain_events(received_at);

-- Unique constraint on tx_hash + log_index
CREATE UNIQUE INDEX idx_event_unique ON blockchain_events(transaction_hash, log_index);
