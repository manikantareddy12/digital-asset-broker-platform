package com.loanplatform.domain.repository;

import com.loanplatform.domain.entity.BlockchainEvent;
import com.loanplatform.domain.entity.ReconciliationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Blockchain Event Repository
 */
@Repository
public interface BlockchainEventRepository extends JpaRepository<BlockchainEvent, Long> {

    Optional<BlockchainEvent> findByEventId(String eventId);

    Optional<BlockchainEvent> findByTransactionHashAndLogIndex(String transactionHash, Integer logIndex);

    List<BlockchainEvent> findByLoanIdOrderByBlockNumberDesc(String loanId);

    Page<BlockchainEvent> findByEventType(String eventType, Pageable pageable);

    Page<BlockchainEvent> findByReconciliationStatus(ReconciliationStatus status, Pageable pageable);

    @Query("SELECT e FROM BlockchainEvent e WHERE e.reconciliationStatus IN :statuses ORDER BY e.receivedAt ASC")
    List<BlockchainEvent> findPendingReconciliation(@Param("statuses") List<ReconciliationStatus> statuses);

    @Query("SELECT e FROM BlockchainEvent e WHERE e.blockNumber >= :fromBlock AND e.blockNumber <= :toBlock ORDER BY e.blockNumber, e.logIndex")
    List<BlockchainEvent> findByBlockRange(@Param("fromBlock") Long fromBlock, @Param("toBlock") Long toBlock);

    @Query("SELECT MAX(e.blockNumber) FROM BlockchainEvent e")
    Long findLatestBlockNumber();

    @Query("SELECT COUNT(e) FROM BlockchainEvent e WHERE e.reconciliationStatus = :status")
    long countByReconciliationStatus(@Param("status") ReconciliationStatus status);

    boolean existsByEventId(String eventId);

    List<BlockchainEvent> findByReceivedAtAfter(LocalDateTime since);
}
