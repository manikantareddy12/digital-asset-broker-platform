-- =============================================
-- V1__Initial_Schema.sql
-- Loan Platform Database Schema
-- =============================================

-- Customers table
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(50) NOT NULL UNIQUE,
    wallet_address VARCHAR(42) NOT NULL,
    type VARCHAR(20) NOT NULL,
    legal_name VARCHAR(100) NOT NULL,
    trading_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    tax_id VARCHAR(100),
    country VARCHAR(50),
    address VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    notes VARCHAR(2000),
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_customer_wallet ON customers(wallet_address);
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_status ON customers(status);

-- Loans table
CREATE TABLE loans (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(50) NOT NULL UNIQUE,
    blockchain_loan_id VARCHAR(66),
    blockchain_tx_hash VARCHAR(66),
    borrower_id BIGINT NOT NULL REFERENCES customers(id),
    lender_id BIGINT NOT NULL REFERENCES customers(id),
    principal_amount DECIMAL(19, 4) NOT NULL,
    interest_rate DECIMAL(7, 4) NOT NULL,
    term_days INTEGER NOT NULL,
    outstanding_balance DECIMAL(19, 4),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    purpose VARCHAR(500),
    currency VARCHAR(20) DEFAULT 'USD',
    approved_at TIMESTAMP,
    activated_at TIMESTAMP,
    maturity_date TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_loan_external_id ON loans(external_id);
CREATE INDEX idx_loan_blockchain_id ON loans(blockchain_loan_id);
CREATE INDEX idx_loan_status ON loans(status);
CREATE INDEX idx_loan_borrower ON loans(borrower_id);
CREATE INDEX idx_loan_lender ON loans(lender_id);

-- Repayments table
CREATE TABLE repayments (
    id BIGSERIAL PRIMARY KEY,
    external_reference VARCHAR(50) NOT NULL UNIQUE,
    blockchain_repayment_id VARCHAR(66),
    blockchain_tx_hash VARCHAR(66),
    payment_hash VARCHAR(66),
    loan_id BIGINT NOT NULL REFERENCES loans(id),
    amount DECIMAL(19, 4) NOT NULL,
    principal_portion DECIMAL(19, 4) NOT NULL,
    interest_portion DECIMAL(19, 4) NOT NULL,
    fee_portion DECIMAL(19, 4) NOT NULL DEFAULT 0,
    payment_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    notes VARCHAR(500),
    processed_at TIMESTAMP,
    recorded_on_chain_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_repayment_loan ON repayments(loan_id);
CREATE INDEX idx_repayment_blockchain_id ON repayments(blockchain_repayment_id);
CREATE INDEX idx_repayment_external_ref ON repayments(external_reference);
CREATE INDEX idx_repayment_status ON repayments(status);

-- Users table (for authentication)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_username ON users(username);
CREATE INDEX idx_user_email ON users(email);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@loanplatform.com', 
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.F.Ghq3v.Nqjs0nMHji', 
        'System Admin', 'ADMIN');
