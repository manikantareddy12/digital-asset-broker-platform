package com.loanplatform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Loan Service Application
 * 
 * Core backend for the Blockchain-Enabled Loan Processing Platform.
 * This service handles:
 * - Loan lifecycle management
 * - Customer/counterparty data
 * - Repayment orchestration
 * - Blockchain integration via gateway
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableScheduling
public class LoanServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(LoanServiceApplication.class, args);
    }
}
