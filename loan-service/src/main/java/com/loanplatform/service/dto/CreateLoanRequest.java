package com.loanplatform.service.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Request DTO for creating a loan
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateLoanRequest {

    @NotBlank(message = "Borrower ID is required")
    private String borrowerId;

    @NotBlank(message = "Lender ID is required")
    private String lenderId;

    @NotNull(message = "Principal amount is required")
    @Positive(message = "Principal amount must be positive")
    private BigDecimal principalAmount;

    @NotNull(message = "Interest rate is required")
    @PositiveOrZero(message = "Interest rate must be non-negative")
    @DecimalMax(value = "100.0", message = "Interest rate cannot exceed 100%")
    private BigDecimal interestRate;

    @NotNull(message = "Term days is required")
    @Min(value = 1, message = "Term must be at least 1 day")
    @Max(value = 3650, message = "Term cannot exceed 10 years")
    private Integer termDays;

    @Size(max = 500, message = "Purpose cannot exceed 500 characters")
    private String purpose;

    private String currency;
}
