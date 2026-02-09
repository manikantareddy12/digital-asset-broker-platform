package com.loanplatform.domain.entity;

/**
 * Repayment Status Enum
 */
public enum RepaymentStatus {
    PENDING, // Payment initiated, awaiting processing
    PROCESSING, // Payment being processed
    CONFIRMED, // Payment confirmed off-chain
    RECORDED_ON_CHAIN, // Payment recorded on blockchain
    FAILED, // Payment failed
    REFUNDED // Payment was refunded
}
