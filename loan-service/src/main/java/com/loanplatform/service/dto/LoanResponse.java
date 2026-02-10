package com.loanplatform.service.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for loan operations
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanResponse {

    private Long id;
    private String externalId;
    private String blockchainLoanId;
    private String blockchainTxHash;

    private String borrowerId;
    private String borrowerName;

    private String lenderId;
    private String lenderName;

    private BigDecimal principalAmount;
    private BigDecimal interestRate;
    private Integer termDays;
    private BigDecimal outstandingBalance;

    private String status;
    private String purpose;
    private String currency;

    private LocalDateTime approvedAt;
    private LocalDateTime activatedAt;
    private LocalDateTime maturityDate;
    private LocalDateTime createdAt;
}
