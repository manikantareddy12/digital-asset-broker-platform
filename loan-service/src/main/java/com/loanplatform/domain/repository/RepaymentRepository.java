package com.loanplatform.domain.repository;

import com.loanplatform.domain.entity.Repayment;
import com.loanplatform.domain.entity.RepaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repayment Repository
 */
@Repository
public interface RepaymentRepository extends JpaRepository<Repayment, Long> {

    Optional<Repayment> findByExternalReference(String externalReference);

    Optional<Repayment> findByBlockchainRepaymentId(String blockchainRepaymentId);

    List<Repayment> findByLoanIdOrderByCreatedAtDesc(Long loanId);

    Page<Repayment> findByLoanId(Long loanId, Pageable pageable);

    Page<Repayment> findByStatus(RepaymentStatus status, Pageable pageable);

    @Query("SELECT SUM(r.amount) FROM Repayment r WHERE r.loan.id = :loanId AND r.status = :status")
    BigDecimal sumAmountByLoanIdAndStatus(@Param("loanId") Long loanId, @Param("status") RepaymentStatus status);

    @Query("SELECT COUNT(r) FROM Repayment r WHERE r.loan.id = :loanId")
    long countByLoanId(@Param("loanId") Long loanId);

    List<Repayment> findByStatusIn(List<RepaymentStatus> statuses);
}
