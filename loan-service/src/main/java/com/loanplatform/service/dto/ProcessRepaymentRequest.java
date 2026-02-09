package com.loanplatform.service.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Request DTO for processing a repayment
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessRepaymentRequest {

    @NotBlank(message = "Loan ID is required")
    private String loanExternalId;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    private BigDecimal principalPortion;
    private BigDecimal interestPortion;
    private BigDecimal feePortion;

    private String paymentType;
    private String paymentMethod;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
}
