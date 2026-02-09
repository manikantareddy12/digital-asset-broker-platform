package com.loanplatform.domain.entity;

/**
 * Payment Type Enum
 * Must match the smart contract PaymentType enum.
 */
public enum PaymentType {
    REGULAR(0), // Scheduled payment
    EARLY(1), // Early payment (extra principal)
    LATE(2), // Late payment (may include fees)
    FINAL(3), // Final payment completing the loan
    PARTIAL(4); // Partial payment (less than scheduled)

    private final int blockchainValue;

    PaymentType(int blockchainValue) {
        this.blockchainValue = blockchainValue;
    }

    public int getBlockchainValue() {
        return blockchainValue;
    }

    public static PaymentType fromBlockchainValue(int value) {
        for (PaymentType type : values()) {
            if (type.blockchainValue == value) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown blockchain payment type: " + value);
    }
}
