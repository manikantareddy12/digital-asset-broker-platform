package com.loanplatform.integration;

/**
 * Exception thrown when blockchain operations fail
 */
public class BlockchainOperationException extends RuntimeException {

    public BlockchainOperationException(String message) {
        super(message);
    }

    public BlockchainOperationException(String message, Throwable cause) {
        super(message, cause);
    }
}
