package com.loanplatform.domain.entity;

/**
 * Customer Status Enum
 */
public enum CustomerStatus {
    PENDING, // Awaiting verification
    ACTIVE, // Fully verified and active
    SUSPENDED, // Temporarily suspended
    CLOSED // Account closed
}
