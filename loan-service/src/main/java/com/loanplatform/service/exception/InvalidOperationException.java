package com.loanplatform.service.exception;

/**
 * Exception for invalid business operations
 */
public class InvalidOperationException extends RuntimeException {

    public InvalidOperationException(String message) {
        super(message);
    }
}
