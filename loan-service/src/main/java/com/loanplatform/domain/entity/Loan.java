package com.loanplatform.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Loan Entity
 * 
 * Represents a loan in the system. This is the central domain object
 * that connects borrowers, lenders, and repayment schedules.
 */
@Entity
@Table(name = "loans", indexes = {
        @Index(name = "idx_loan_external_id", columnList = "externalId"),
        @Index(name = "idx_loan_blockchain_id", columnList = "blockchainLoanId"),
        @Index(name = "idx_loan_status", columnList = "status"),
        @Index(name = "idx_loan_borrower", columnList = "borrower_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String externalId;

    @Column(length = 66)
    private String blockchainLoanId;

    @Column(length = 66)
    private String blockchainTxHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    private Customer borrower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lender_id", nullable = false)
    private Customer lender;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal principalAmount;

    @Column(nullable = false, precision = 7, scale = 4)
    private BigDecimal interestRate;

    @Column(nullable = false)
    private Integer termDays;

    @Column(precision = 19, scale = 4)
    private BigDecimal outstandingBalance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LoanStatus status;

    @Column(length = 500)
    private String purpose;

    @Column(length = 20)
    private String currency;

    private LocalDateTime approvedAt;

    private LocalDateTime activatedAt;

    private LocalDateTime maturityDate;

    private LocalDateTime closedAt;

    @OneToMany(mappedBy = "loan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Repayment> repayments = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    // ============ Business Methods ============

    public void approve() {
        if (this.status != LoanStatus.PENDING) {
            throw new IllegalStateException("Can only approve PENDING loans");
        }
        this.status = LoanStatus.APPROVED;
        this.approvedAt = LocalDateTime.now();
    }

    public void activate() {
        if (this.status != LoanStatus.APPROVED) {
            throw new IllegalStateException("Can only activate APPROVED loans");
        }
        this.status = LoanStatus.ACTIVE;
        this.activatedAt = LocalDateTime.now();
        this.maturityDate = this.activatedAt.plusDays(this.termDays);
        this.outstandingBalance = this.principalAmount;
    }

    public void recordRepayment(BigDecimal amount) {
        if (this.status != LoanStatus.ACTIVE) {
            throw new IllegalStateException("Can only record payments on ACTIVE loans");
        }
        this.outstandingBalance = this.outstandingBalance.subtract(amount);

        if (this.outstandingBalance.compareTo(BigDecimal.ZERO) <= 0) {
            this.status = LoanStatus.COMPLETED;
            this.closedAt = LocalDateTime.now();
            this.outstandingBalance = BigDecimal.ZERO;
        }
    }

    public void markDefaulted() {
        if (this.status != LoanStatus.ACTIVE) {
            throw new IllegalStateException("Can only default ACTIVE loans");
        }
        this.status = LoanStatus.DEFAULTED;
        this.closedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (this.status != LoanStatus.PENDING && this.status != LoanStatus.APPROVED) {
            throw new IllegalStateException("Can only cancel PENDING or APPROVED loans");
        }
        this.status = LoanStatus.CANCELLED;
        this.closedAt = LocalDateTime.now();
    }
}
