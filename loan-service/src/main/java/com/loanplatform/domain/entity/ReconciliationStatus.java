package com.loanplatform.domain.entity;

/**
 * Reconciliation Status Enum
 * 
 * Tracks the reconciliation state of blockchain events.
 */
public enum ReconciliationStatus {
    PENDING, // Event received, not yet reconciled
    MATCHED, // Event matches local database records
    MISMATCHED, // Event data doesn't match local records
    NOT_FOUND, // No corresponding local record found
    RECONCILED, // Mismatch resolved
    IGNORED // Event intentionally skipped
}
