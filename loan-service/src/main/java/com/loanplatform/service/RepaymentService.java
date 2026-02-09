package com.loanplatform.service;

import com.loanplatform.domain.entity.*;
import com.loanplatform.domain.repository.LoanRepository;
import com.loanplatform.domain.repository.RepaymentRepository;
import com.loanplatform.integration.BlockchainGatewayClient;
import com.loanplatform.integration.BlockchainGatewayClient.*;
import com.loanplatform.service.dto.*;
import com.loanplatform.service.exception.LoanNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Repayment Service
 * 
 * Handles repayment processing and blockchain recording.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RepaymentService {

    private final RepaymentRepository repaymentRepository;
    private final LoanRepository loanRepository;
    private final BlockchainGatewayClient blockchainClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Process a repayment
     */
    @Transactional
    public RepaymentResponse processRepayment(ProcessRepaymentRequest request) {
        log.info("Processing repayment: loanId={}, amount={}",
                request.getLoanExternalId(), request.getAmount());

        // Find loan
        Loan loan = loanRepository.findByExternalId(request.getLoanExternalId())
                .orElseThrow(() -> new LoanNotFoundException("Loan not found: " + request.getLoanExternalId()));

        // Generate reference
        String externalRef = "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Calculate payment breakdown if not provided
        BigDecimal principalPortion = request.getPrincipalPortion() != null
                ? request.getPrincipalPortion()
                : request.getAmount().multiply(new BigDecimal("0.8"));
        BigDecimal interestPortion = request.getInterestPortion() != null
                ? request.getInterestPortion()
                : request.getAmount().multiply(new BigDecimal("0.2"));
        BigDecimal feePortion = request.getFeePortion() != null
                ? request.getFeePortion()
                : BigDecimal.ZERO;

        // Determine payment type
        PaymentType paymentType = determinePaymentType(loan, request.getAmount(), request.getPaymentType());

        // Create repayment record
        Repayment repayment = Repayment.builder()
                .externalReference(externalRef)
                .loan(loan)
                .amount(request.getAmount())
                .principalPortion(principalPortion)
                .interestPortion(interestPortion)
                .feePortion(feePortion)
                .paymentType(paymentType)
                .status(RepaymentStatus.PROCESSING)
                .paymentMethod(request.getPaymentMethod())
                .notes(request.getNotes())
                .build();

        repayment = repaymentRepository.save(repayment);

        // Record on blockchain
        if (loan.getBlockchainLoanId() != null) {
            try {
                RepaymentRecordRequest blockchainRequest = new RepaymentRecordRequest();
                blockchainRequest.setLoanId(loan.getBlockchainLoanId());
                blockchainRequest.setAmount(toWei(request.getAmount()));
                blockchainRequest.setPrincipalPortion(toWei(principalPortion));
                blockchainRequest.setInterestPortion(toWei(interestPortion));
                blockchainRequest.setFeePortion(toWei(feePortion));
                blockchainRequest.setPaymentType(paymentType.name());
                blockchainRequest.setExternalRef(externalRef);

                RepaymentRecordResponse response = blockchainClient.recordRepayment(blockchainRequest);

                repayment.setBlockchainRepaymentId(response.getData().getRepaymentId());
                repayment.setBlockchainTxHash(response.getData().getTransactionHash());
                repayment.setPaymentHash(response.getData().getPaymentHash());
                repayment.setStatus(RepaymentStatus.RECORDED_ON_CHAIN);
                repayment.setRecordedOnChainAt(LocalDateTime.now());

            } catch (Exception e) {
                log.error("Failed to record repayment on blockchain", e);
                repayment.setStatus(RepaymentStatus.CONFIRMED);
            }
        } else {
            repayment.setStatus(RepaymentStatus.CONFIRMED);
        }

        repayment.setProcessedAt(LocalDateTime.now());
        repayment = repaymentRepository.save(repayment);

        // Update loan balance
        loan.recordRepayment(request.getAmount());
        loanRepository.save(loan);

        // Update blockchain status if completed
        if (loan.getStatus() == LoanStatus.COMPLETED && loan.getBlockchainLoanId() != null) {
            blockchainClient.updateLoanStatus(loan.getBlockchainLoanId(), "COMPLETED");
        }

        // Publish event
        publishRepaymentEvent("REPAYMENT_PROCESSED", repayment);

        log.info("Repayment processed: externalRef={}, blockchainId={}",
                externalRef, repayment.getBlockchainRepaymentId());

        return mapToResponse(repayment);
    }

    /**
     * Get repayment by reference
     */
    @Transactional(readOnly = true)
    public RepaymentResponse getRepayment(String externalReference) {
        Repayment repayment = repaymentRepository.findByExternalReference(externalReference)
                .orElseThrow(() -> new LoanNotFoundException("Repayment not found: " + externalReference));
        return mapToResponse(repayment);
    }

    /**
     * List repayments for a loan
     */
    @Transactional(readOnly = true)
    public Page<RepaymentResponse> listRepaymentsByLoan(String loanExternalId, Pageable pageable) {
        Loan loan = loanRepository.findByExternalId(loanExternalId)
                .orElseThrow(() -> new LoanNotFoundException("Loan not found: " + loanExternalId));

        return repaymentRepository.findByLoanId(loan.getId(), pageable)
                .map(this::mapToResponse);
    }

    // ============ Helper Methods ============

    private PaymentType determinePaymentType(Loan loan, BigDecimal amount, String requestedType) {
        if (requestedType != null) {
            return PaymentType.valueOf(requestedType);
        }

        // Auto-determine based on context
        if (loan.getOutstandingBalance() != null &&
                amount.compareTo(loan.getOutstandingBalance()) >= 0) {
            return PaymentType.FINAL;
        }

        return PaymentType.REGULAR;
    }

    private String toWei(BigDecimal amount) {
        return amount.multiply(new BigDecimal("1000000000000000000")).toBigInteger().toString();
    }

    private void publishRepaymentEvent(String eventType, Repayment repayment) {
        try {
            kafkaTemplate.send("repayment-events", repayment.getExternalReference(),
                    new RepaymentEvent(eventType, repayment.getExternalReference(),
                            repayment.getLoan().getExternalId(), repayment.getAmount()));
        } catch (Exception e) {
            log.warn("Failed to publish repayment event: {}", e.getMessage());
        }
    }

    private RepaymentResponse mapToResponse(Repayment repayment) {
        return RepaymentResponse.builder()
                .id(repayment.getId())
                .externalReference(repayment.getExternalReference())
                .blockchainRepaymentId(repayment.getBlockchainRepaymentId())
                .paymentHash(repayment.getPaymentHash())
                .loanExternalId(repayment.getLoan().getExternalId())
                .amount(repayment.getAmount())
                .principalPortion(repayment.getPrincipalPortion())
                .interestPortion(repayment.getInterestPortion())
                .feePortion(repayment.getFeePortion())
                .paymentType(repayment.getPaymentType().name())
                .status(repayment.getStatus().name())
                .paymentMethod(repayment.getPaymentMethod())
                .processedAt(repayment.getProcessedAt())
                .recordedOnChainAt(repayment.getRecordedOnChainAt())
                .createdAt(repayment.getCreatedAt())
                .build();
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class RepaymentEvent {
        private String eventType;
        private String repaymentId;
        private String loanId;
        private BigDecimal amount;
    }
}
