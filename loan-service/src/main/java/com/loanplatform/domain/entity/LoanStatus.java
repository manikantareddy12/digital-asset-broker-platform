package com.loanplatform.domain.entity;

/**
 * Loan Status Enum
 * 
 * Defines the lifecycle states of a loan.
 * Must match the smart contract LoanStatus enum.
 */
public enum LoanStatus {
    PENDING(0), // Loan created, awaiting approval
    APPROVED(1), // Loan approved, awaiting activation
    ACTIVE(2), // Loan is active, repayments expected
    COMPLETED(3), // Loan fully repaid
    DEFAULTED(4), // Loan in default
    CANCELLED(5); // Loan cancelled before activation

    private final int blockchainValue;

    LoanStatus(int blockchainValue) {
        this.blockchainValue = blockchainValue;
    }

    public int getBlockchainValue() {
        return blockchainValue;
    }

    public static LoanStatus fromBlockchainValue(int value) {
        for (LoanStatus status : values()) {
            if (status.blockchainValue == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown blockchain status value: " + value);
    }
}
