package com.loanplatform.domain.repository;

import com.loanplatform.domain.entity.Loan;
import com.loanplatform.domain.entity.LoanStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Loan Repository
 */
@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {

    Optional<Loan> findByExternalId(String externalId);

    Optional<Loan> findByBlockchainLoanId(String blockchainLoanId);

    Page<Loan> findByStatus(LoanStatus status, Pageable pageable);

    Page<Loan> findByBorrowerId(Long borrowerId, Pageable pageable);

    Page<Loan> findByLenderId(Long lenderId, Pageable pageable);

    @Query("SELECT l FROM Loan l WHERE l.status = :status AND l.maturityDate < CURRENT_TIMESTAMP")
    List<Loan> findOverdueLoans(@Param("status") LoanStatus status);

    @Query("SELECT COUNT(l) FROM Loan l WHERE l.status = :status")
    long countByStatus(@Param("status") LoanStatus status);

    boolean existsByExternalId(String externalId);
}
