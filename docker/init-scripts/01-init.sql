-- Initialize database schema for local development
-- This script runs automatically when PostgreSQL container starts

-- Ensure loandb exists (created by POSTGRES_DB env var, but just in case)
-- CREATE DATABASE loandb;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE loandb TO loanuser;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully for Loan Platform';
END $$;
