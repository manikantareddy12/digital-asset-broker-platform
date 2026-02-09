package com.loanplatform.domain.repository;

import com.loanplatform.domain.entity.Customer;
import com.loanplatform.domain.entity.CustomerStatus;
import com.loanplatform.domain.entity.CustomerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Customer Repository
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByExternalId(String externalId);

    Optional<Customer> findByWalletAddress(String walletAddress);

    Optional<Customer> findByEmail(String email);

    Page<Customer> findByStatus(CustomerStatus status, Pageable pageable);

    Page<Customer> findByType(CustomerType type, Pageable pageable);

    boolean existsByWalletAddress(String walletAddress);

    boolean existsByEmail(String email);
}
