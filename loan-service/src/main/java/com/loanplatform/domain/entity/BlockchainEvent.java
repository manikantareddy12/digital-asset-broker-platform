package com.loanplatform.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Blockchain Event Entity
 * 
 * Stores blockchain events for reconciliation and audit purposes.
 * Each event is stored with its hash for integrity verification.
 */
@Entity
@Table(name = "blockchain_events", indexes = {
        @Index(name = "idx_event_loan_id", columnList = "loanId"),
        @Index(name = "idx_event_type", columnList = "eventType"),
        @Index(name = "idx_event_tx_hash", columnList = "transactionHash"),
        @Index(name = "idx_event_block", columnList = "blockNumber"),
        @Index(name = "idx_event_status", columnList = "reconciliationStatus")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockchainEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 66)
    private String eventId;

    @Column(nullable = false, length = 50)
    private String eventType;

    @Column(length = 66)
    private String loanId;

    @Column(length = 66)
    private String repaymentId;

    @Column(nullable = false, length = 66)
    private String transactionHash;

    @Column(nullable = false)
    private Long blockNumber;

    @Column(nullable = false)
    private Integer logIndex;

    @Column(length = 66)
    private String eventHash;

    @Column(columnDefinition = "TEXT")
    private String eventData;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReconciliationStatus reconciliationStatus;

    private LocalDateTime reconciliationTime;

    @Column(length = 500)
    private String reconciliationNotes;

    @Column(nullable = false)
    private LocalDateTime eventTimestamp;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime receivedAt;

    @Version
    private Long version;
}
