package com.loanplatform.eventing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.loanplatform.domain.entity.*;
import com.loanplatform.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Reconciliation Service
 * 
 * Compares blockchain events with local database records to detect mismatches.
 * Provides alerting and supports event replay for recovery.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReconciliationService {

    private final BlockchainEventRepository eventRepository;
    private final LoanRepository loanRepository;
    private final RepaymentRepository repaymentRepository;
    private final ObjectMapper objectMapper;
    private final AlertService alertService;

    /**
     * Reconcile a single event asynchronously
     */
    @Async
    @Transactional
    public void reconcileEventAsync(BlockchainEvent event) {
        try {
            reconcileEvent(event);
        } catch (Exception e) {
            log.error("Async reconciliation failed for event: {}", event.getId(), e);
        }
    }

    /**
     * Reconcile a blockchain event with local database
     */
    @Transactional
    public ReconciliationResult reconcileEvent(BlockchainEvent event) {
        log.debug("Reconciling event: id={}, type={}", event.getId(), event.getEventType());

        ReconciliationResult result;

        switch (event.getEventType()) {
            case "LoanRegistered":
                result = reconcileLoanRegistered(event);
                break;
            case "LoanStatusChanged":
                result = reconcileLoanStatusChanged(event);
                break;
            case "RepaymentRecorded":
                result = reconcileRepaymentRecorded(event);
                break;
            case "LoanFullyRepaid":
                result = reconcileLoanFullyRepaid(event);
                break;
            default:
                log.warn("Unknown event type: {}", event.getEventType());
                result = new ReconciliationResult(ReconciliationStatus.IGNORED, "Unknown event type");
        }

        // Update event status
        event.setReconciliationStatus(result.status());
        event.setReconciliationTime(LocalDateTime.now());
        event.setReconciliationNotes(result.notes());
        eventRepository.save(event);

        // Alert on mismatches
        if (result.status() == ReconciliationStatus.MISMATCHED ||
                result.status() == ReconciliationStatus.NOT_FOUND) {
            alertService.sendReconciliationAlert(event, result);
        }

        return result;
    }

    private ReconciliationResult reconcileLoanRegistered(BlockchainEvent event) {
        try {
            Map<String, Object> data = parseEventData(event);
            String externalId = (String) data.get("externalId");
            String blockchainLoanId = event.getLoanId();

            Optional<Loan> loanOpt = loanRepository.findByExternalId(externalId);

            if (loanOpt.isEmpty()) {
                return new ReconciliationResult(
                        ReconciliationStatus.NOT_FOUND,
                        "No loan found with externalId: " + externalId);
            }

            Loan loan = loanOpt.get();

            // Check if blockchain ID matches
            if (loan.getBlockchainLoanId() == null) {
                // Update with blockchain ID if missing
                loan.setBlockchainLoanId(blockchainLoanId);
                loanRepository.save(loan);
                return new ReconciliationResult(
                        ReconciliationStatus.MATCHED,
                        "Blockchain ID updated on loan");
            }

            if (!loan.getBlockchainLoanId().equals(blockchainLoanId)) {
                return new ReconciliationResult(
                        ReconciliationStatus.MISMATCHED,
                        "Blockchain ID mismatch: local=" + loan.getBlockchainLoanId() +
                                ", chain=" + blockchainLoanId);
            }

            return new ReconciliationResult(ReconciliationStatus.MATCHED, "Loan registration verified");

        } catch (Exception e) {
            log.error("Failed to reconcile LoanRegistered event", e);
            return new ReconciliationResult(ReconciliationStatus.PENDING, "Error: " + e.getMessage());
        }
    }

    private ReconciliationResult reconcileLoanStatusChanged(BlockchainEvent event) {
        try {
            Map<String, Object> data = parseEventData(event);
            String blockchainLoanId = event.getLoanId();
            int newStatus = ((Number) data.get("newStatus")).intValue();

            Optional<Loan> loanOpt = loanRepository.findByBlockchainLoanId(blockchainLoanId);

            if (loanOpt.isEmpty()) {
                return new ReconciliationResult(
                        ReconciliationStatus.NOT_FOUND,
                        "No loan found with blockchain ID: " + blockchainLoanId);
            }

            Loan loan = loanOpt.get();
            LoanStatus expectedStatus = LoanStatus.fromBlockchainValue(newStatus);

            if (loan.getStatus() != expectedStatus) {
                return new ReconciliationResult(
                        ReconciliationStatus.MISMATCHED,
                        "Status mismatch: local=" + loan.getStatus() + ", chain=" + expectedStatus);
            }

            return new ReconciliationResult(ReconciliationStatus.MATCHED, "Status verified");

        } catch (Exception e) {
            log.error("Failed to reconcile LoanStatusChanged event", e);
            return new ReconciliationResult(ReconciliationStatus.PENDING, "Error: " + e.getMessage());
        }
    }

    private ReconciliationResult reconcileRepaymentRecorded(BlockchainEvent event) {
        try {
            Map<String, Object> data = parseEventData(event);
            String externalRef = (String) data.get("externalRef");
            String blockchainRepaymentId = event.getRepaymentId();

            Optional<Repayment> repaymentOpt = repaymentRepository.findByExternalReference(externalRef);

            if (repaymentOpt.isEmpty()) {
                return new ReconciliationResult(
                        ReconciliationStatus.NOT_FOUND,
                        "No repayment found with externalRef: " + externalRef);
            }

            Repayment repayment = repaymentOpt.get();

            // Update blockchain reference if missing
            if (repayment.getBlockchainRepaymentId() == null) {
                repayment.setBlockchainRepaymentId(blockchainRepaymentId);
                repayment.setPaymentHash((String) data.get("paymentHash"));
                repaymentRepository.save(repayment);
            }

            // Verify amount
            BigDecimal chainAmount = new BigDecimal(data.get("amount").toString());
            // Convert from wei to standard units
            BigDecimal localAmount = repayment.getAmount()
                    .multiply(new BigDecimal("1000000000000000000"));

            if (localAmount.compareTo(chainAmount) != 0) {
                return new ReconciliationResult(
                        ReconciliationStatus.MISMATCHED,
                        "Amount mismatch: local=" + localAmount + ", chain=" + chainAmount);
            }

            return new ReconciliationResult(ReconciliationStatus.MATCHED, "Repayment verified");

        } catch (Exception e) {
            log.error("Failed to reconcile RepaymentRecorded event", e);
            return new ReconciliationResult(ReconciliationStatus.PENDING, "Error: " + e.getMessage());
        }
    }

    private ReconciliationResult reconcileLoanFullyRepaid(BlockchainEvent event) {
        try {
            String blockchainLoanId = event.getLoanId();

            Optional<Loan> loanOpt = loanRepository.findByBlockchainLoanId(blockchainLoanId);

            if (loanOpt.isEmpty()) {
                return new ReconciliationResult(
                        ReconciliationStatus.NOT_FOUND,
                        "No loan found with blockchain ID: " + blockchainLoanId);
            }

            Loan loan = loanOpt.get();

            if (loan.getStatus() != LoanStatus.COMPLETED) {
                return new ReconciliationResult(
                        ReconciliationStatus.MISMATCHED,
                        "Loan not marked as COMPLETED locally, status: " + loan.getStatus());
            }

            return new ReconciliationResult(ReconciliationStatus.MATCHED, "Full repayment verified");

        } catch (Exception e) {
            log.error("Failed to reconcile LoanFullyRepaid event", e);
            return new ReconciliationResult(ReconciliationStatus.PENDING, "Error: " + e.getMessage());
        }
    }

    /**
     * Scheduled job to retry pending reconciliations
     */
    @Scheduled(fixedDelayString = "${reconciliation.retry-interval-ms:60000}")
    @Transactional
    public void retryPendingReconciliations() {
        List<BlockchainEvent> pendingEvents = eventRepository.findPendingReconciliation(
                List.of(ReconciliationStatus.PENDING));

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Retrying {} pending reconciliations", pendingEvents.size());

        for (BlockchainEvent event : pendingEvents) {
            try {
                reconcileEvent(event);
            } catch (Exception e) {
                log.error("Retry failed for event: {}", event.getId(), e);
            }
        }
    }

    private Map<String, Object> parseEventData(BlockchainEvent event) throws Exception {
        if (event.getEventData() == null) {
            return Map.of();
        }
        return objectMapper.readValue(event.getEventData(), Map.class);
    }

    public record ReconciliationResult(ReconciliationStatus status, String notes) {
    }
}
