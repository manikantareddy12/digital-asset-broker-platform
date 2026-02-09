package com.loanplatform.service.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for repayment operations
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepaymentResponse {

    private Long id;
    private String externalReference;
    private String blockchainRepaymentId;
    private String paymentHash;

    private String loanExternalId;

    private BigDecimal amount;
    private BigDecimal principalPortion;
    private BigDecimal interestPortion;
    private BigDecimal feePortion;

    private String paymentType;
    private String status;
    private String paymentMethod;

    private LocalDateTime processedAt;
    private LocalDateTime recordedOnChainAt;
    private LocalDateTime createdAt;
}
