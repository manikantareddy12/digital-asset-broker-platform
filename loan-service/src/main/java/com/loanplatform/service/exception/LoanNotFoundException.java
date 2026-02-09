package com.loanplatform.service.exception;

/**
 * Exception for loan not found
 */
public class LoanNotFoundException extends RuntimeException {

    public LoanNotFoundException(String message) {
        super(message);
    }
}
