package com.loanplatform.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Customer Entity
 * 
 * Represents a borrower or lender in the system.
 * Contains both wallet address (for blockchain) and traditional identity.
 */
@Entity
@Table(name = "customers", indexes = {
        @Index(name = "idx_customer_wallet", columnList = "walletAddress"),
        @Index(name = "idx_customer_email", columnList = "email"),
        @Index(name = "idx_customer_external_id", columnList = "externalId")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String externalId;

    @Column(nullable = false, length = 42)
    private String walletAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CustomerType type;

    @Column(nullable = false, length = 100)
    private String legalName;

    @Column(length = 100)
    private String tradingName;

    @Column(length = 255)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String taxId;

    @Column(length = 50)
    private String country;

    @Column(length = 500)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CustomerStatus status;

    @Column(length = 2000)
    private String notes;

    private LocalDateTime verifiedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
