package com.loanplatform.service;

import com.loanplatform.domain.entity.*;
import com.loanplatform.domain.repository.CustomerRepository;
import com.loanplatform.domain.repository.LoanRepository;
import com.loanplatform.integration.BlockchainGatewayClient;
import com.loanplatform.integration.BlockchainGatewayClient.*;
import com.loanplatform.service.dto.*;
import com.loanplatform.service.exception.LoanNotFoundException;
import com.loanplatform.service.exception.InvalidOperationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Loan Service
 * 
 * Core business logic for loan management.
 * Coordinates between database and blockchain operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanService {

    private final LoanRepository loanRepository;
    private final CustomerRepository customerRepository;
    private final BlockchainGatewayClient blockchainClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Create a new loan
     */
    @Transactional
    public LoanResponse createLoan(CreateLoanRequest request) {
        log.info("Creating loan: borrowerId={}, lenderId={}, amount={}",
                request.getBorrowerId(), request.getLenderId(), request.getPrincipalAmount());

        // Get or create borrower (for development/testing ease)
        Customer borrower = customerRepository.findByExternalId(request.getBorrowerId())
                .orElseGet(() -> createCustomer(request.getBorrowerId(), CustomerType.INDIVIDUAL, "Borrower"));

        // Get or create lender (for development/testing ease)
        Customer lender = customerRepository.findByExternalId(request.getLenderId())
                .orElseGet(() -> createCustomer(request.getLenderId(), CustomerType.INSTITUTIONAL, "Lender"));

        // Generate external ID
        String externalId = "LOAN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Create loan entity
        Loan loan = Loan.builder()
                .externalId(externalId)
                .borrower(borrower)
                .lender(lender)
                .principalAmount(request.getPrincipalAmount())
                .interestRate(request.getInterestRate())
                .termDays(request.getTermDays())
                .purpose(request.getPurpose())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .status(LoanStatus.PENDING)
                .build();

        loan = loanRepository.save(loan);

        // Publish event
        publishLoanEvent("LOAN_CREATED", loan);

        log.info("Loan created: externalId={}", externalId);

        return mapToResponse(loan);
    }

    /**
     * Helper to create a customer on-the-fly for development/testing
     */
    private Customer createCustomer(String externalId, CustomerType type, String rolePrefix) {
        log.info("Auto-creating customer: externalId={}, type={}", externalId, type);
        // Generate a deterministic wallet address based on externalId
        String walletAddress = String.format("0x%040x", Math.abs(externalId.hashCode()));

        Customer customer = Customer.builder()
                .externalId(externalId)
                .walletAddress(walletAddress)
                .type(type)
                .legalName(rolePrefix + " " + externalId)
                .status(CustomerStatus.ACTIVE)
                .build();

        return customerRepository.save(customer);
    }

    /**
     * Approve a loan and register it on blockchain
     */
    @Transactional
    public LoanResponse approveLoan(String externalId) {
        log.info("Approving loan: externalId={}", externalId);

        Loan loan = findByExternalId(externalId);

        // Update status
        loan.approve();

        // Register on blockchain
        LoanRegistrationRequest blockchainRequest = new LoanRegistrationRequest();
        blockchainRequest.setBorrower(loan.getBorrower().getWalletAddress());
        blockchainRequest.setLender(loan.getLender().getWalletAddress());
        blockchainRequest.setPrincipalAmount(toWei(loan.getPrincipalAmount()));
        blockchainRequest.setInterestRateBps(loan.getInterestRate().multiply(new BigDecimal("100")).intValue());
        blockchainRequest.setTermDays(loan.getTermDays());
        blockchainRequest.setExternalId(loan.getExternalId());

        LoanRegistrationResponse response = blockchainClient.registerLoan(blockchainRequest);

        // Store blockchain reference
        if (response.getData() != null) {
            loan.setBlockchainLoanId(response.getData().getLoanId());
            loan.setBlockchainTxHash(response.getData().getTransactionHash());
        } else {
            // No data returned from blockchain gateway
        }

        loan = loanRepository.save(loan);

        // Publish event
        // publishLoanEvent("LOAN_APPROVED", loan);

        return mapToResponse(loan);
    }

    /**
     * Activate a loan
     */
    @Transactional
    public LoanResponse activateLoan(String externalId) {
        log.info("Activating loan: externalId={}", externalId);

        Loan loan = findByExternalId(externalId);

        loan.activate();

        // Update status on blockchain
        if (loan.getBlockchainLoanId() != null) {
            blockchainClient.updateLoanStatus(loan.getBlockchainLoanId(), "ACTIVE");
        }

        loan = loanRepository.save(loan);

        publishLoanEvent("LOAN_ACTIVATED", loan);

        return mapToResponse(loan);
    }

    /**
     * Get loan by external ID
     */
    @Transactional(readOnly = true)
    public LoanResponse getLoan(String externalId) {
        Loan loan = findByExternalId(externalId);
        return mapToResponse(loan);
    }

    /**
     * List loans with pagination
     */
    @Transactional(readOnly = true)
    public Page<LoanResponse> listLoans(Pageable pageable) {
        return loanRepository.findAll(pageable).map(this::mapToResponse);
    }

    /**
     * List loans by status
     */
    @Transactional(readOnly = true)
    public Page<LoanResponse> listLoansByStatus(LoanStatus status, Pageable pageable) {
        return loanRepository.findByStatus(status, pageable).map(this::mapToResponse);
    }

    /**
     * Cancel a loan
     */
    @Transactional
    public LoanResponse cancelLoan(String externalId) {
        Loan loan = findByExternalId(externalId);
        loan.cancel();

        if (loan.getBlockchainLoanId() != null) {
            blockchainClient.updateLoanStatus(loan.getBlockchainLoanId(), "CANCELLED");
        }

        loan = loanRepository.save(loan);
        publishLoanEvent("LOAN_CANCELLED", loan);

        return mapToResponse(loan);
    }

    // ============ Helper Methods ============

    private Loan findByExternalId(String externalId) {
        return loanRepository.findByExternalId(externalId)
                .orElseThrow(() -> new LoanNotFoundException("Loan not found: " + externalId));
    }

    private String toWei(BigDecimal amount) {
        return amount.multiply(new BigDecimal("1000000000000000000")).toBigInteger().toString();
    }

    private void publishLoanEvent(String eventType, Loan loan) {
        try {
            kafkaTemplate.send("loan-events", loan.getExternalId(),
                    new LoanEvent(eventType, loan.getExternalId(), loan.getStatus().name()));
        } catch (Exception e) {
            log.warn("Failed to publish loan event: {}", e.getMessage());
        }
    }

    private LoanResponse mapToResponse(Loan loan) {
        return LoanResponse.builder()
                .id(loan.getId())
                .externalId(loan.getExternalId())
                .blockchainLoanId(loan.getBlockchainLoanId())
                .blockchainTxHash(loan.getBlockchainTxHash())
                .borrowerId(loan.getBorrower().getExternalId())
                .borrowerName(loan.getBorrower().getLegalName())
                .lenderId(loan.getLender().getExternalId())
                .lenderName(loan.getLender().getLegalName())
                .principalAmount(loan.getPrincipalAmount())
                .interestRate(loan.getInterestRate())
                .termDays(loan.getTermDays())
                .outstandingBalance(loan.getOutstandingBalance())
                .status(loan.getStatus().name())
                .purpose(loan.getPurpose())
                .currency(loan.getCurrency())
                .approvedAt(loan.getApprovedAt())
                .activatedAt(loan.getActivatedAt())
                .maturityDate(loan.getMaturityDate())
                .createdAt(loan.getCreatedAt())
                .build();
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class LoanEvent {
        private String eventType;
        private String loanId;
        private String status;
    }
}
