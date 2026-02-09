package com.loanplatform.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Repayment Entity
 * 
 * Records individual loan repayments with breakdown of principal, interest, and
 * fees.
 */
@Entity
@Table(name = "repayments", indexes = {
        @Index(name = "idx_repayment_loan", columnList = "loan_id"),
        @Index(name = "idx_repayment_blockchain_id", columnList = "blockchainRepaymentId"),
        @Index(name = "idx_repayment_external_ref", columnList = "externalReference")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Repayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String externalReference;

    @Column(length = 66)
    private String blockchainRepaymentId;

    @Column(length = 66)
    private String blockchainTxHash;

    @Column(length = 66)
    private String paymentHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal principalPortion;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal interestPortion;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal feePortion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentType paymentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RepaymentStatus status;

    @Column(length = 50)
    private String paymentMethod;

    @Column(length = 500)
    private String notes;

    private LocalDateTime processedAt;

    private LocalDateTime recordedOnChainAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Version
    private Long version;
}
