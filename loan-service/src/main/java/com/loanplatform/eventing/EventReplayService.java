package com.loanplatform.eventing;

import com.loanplatform.domain.entity.BlockchainEvent;
import com.loanplatform.domain.entity.ReconciliationStatus;
import com.loanplatform.domain.repository.BlockchainEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Event Replay Service
 * 
 * Supports replaying blockchain events for recovery and re-reconciliation.
 * Can fetch events from blockchain gateway for a specific block range.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventReplayService {

    private final BlockchainEventRepository eventRepository;
    private final ReconciliationService reconciliationService;
    private final RestTemplate restTemplate;

    @Value("${blockchain.gateway.url}")
    private String gatewayUrl;

    /**
     * Replay events from blockchain for a specific block range
     */
    @Transactional
    public ReplayResult replayEventsFromChain(Long fromBlock, Long toBlock) {
        log.info("Replaying events from blockchain: blocks {} to {}", fromBlock, toBlock);

        int fetched = 0;
        int processed = 0;
        int errors = 0;

        try {
            // Fetch events from gateway
            String url = String.format("%s/chain/events/recent?fromBlock=%d&toBlock=%d",
                    gatewayUrl, fromBlock, toBlock);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null || !Boolean.TRUE.equals(response.get("success"))) {
                log.error("Failed to fetch events from gateway");
                return new ReplayResult(fetched, processed, errors, "Gateway request failed");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> events = (List<Map<String, Object>>) response.get("data");
            fetched = events != null ? events.size() : 0;

            log.info("Fetched {} events from blockchain", fetched);

            // Process each event
            for (Map<String, Object> eventData : events) {
                try {
                    processReplayedEvent(eventData);
                    processed++;
                } catch (Exception e) {
                    log.error("Failed to process replayed event", e);
                    errors++;
                }
            }

        } catch (Exception e) {
            log.error("Event replay failed", e);
            return new ReplayResult(fetched, processed, errors, "Error: " + e.getMessage());
        }

        return new ReplayResult(fetched, processed, errors, "Completed");
    }

    /**
     * Re-reconcile all events for a specific loan
     */
    @Transactional
    public ReplayResult reReconcileLoan(String loanId) {
        log.info("Re-reconciling all events for loan: {}", loanId);

        List<BlockchainEvent> events = eventRepository.findByLoanIdOrderByBlockNumberDesc(loanId);

        int processed = 0;
        int errors = 0;

        for (BlockchainEvent event : events) {
            try {
                // Reset status
                event.setReconciliationStatus(ReconciliationStatus.PENDING);
                eventRepository.save(event);

                // Re-reconcile
                reconciliationService.reconcileEvent(event);
                processed++;
            } catch (Exception e) {
                log.error("Failed to re-reconcile event: {}", event.getId(), e);
                errors++;
            }
        }

        return new ReplayResult(events.size(), processed, errors, "Completed");
    }

    /**
     * Re-reconcile all mismatched events
     */
    @Transactional
    public ReplayResult retryMismatchedEvents() {
        log.info("Retrying all mismatched events");

        List<BlockchainEvent> events = eventRepository.findPendingReconciliation(
                List.of(ReconciliationStatus.MISMATCHED, ReconciliationStatus.NOT_FOUND));

        int processed = 0;
        int errors = 0;

        for (BlockchainEvent event : events) {
            try {
                event.setReconciliationStatus(ReconciliationStatus.PENDING);
                eventRepository.save(event);

                reconciliationService.reconcileEvent(event);
                processed++;
            } catch (Exception e) {
                log.error("Failed to retry event: {}", event.getId(), e);
                errors++;
            }
        }

        return new ReplayResult(events.size(), processed, errors, "Completed");
    }

    private void processReplayedEvent(Map<String, Object> eventData) {
        String txHash = (String) eventData.get("transactionHash");
        Integer logIndex = ((Number) eventData.getOrDefault("logIndex", 0)).intValue();

        // Check if event already exists
        if (eventRepository.findByTransactionHashAndLogIndex(txHash, logIndex).isPresent()) {
            log.debug("Event already exists: {}:{}", txHash, logIndex);
            return;
        }

        // Create new event (will be processed by reconciliation)
        BlockchainEvent event = BlockchainEvent.builder()
                .eventId(txHash + "-" + logIndex)
                .eventType((String) eventData.get("eventType"))
                .loanId((String) eventData.get("loanId"))
                .repaymentId((String) eventData.get("repaymentId"))
                .transactionHash(txHash)
                .blockNumber(((Number) eventData.get("blockNumber")).longValue())
                .logIndex(logIndex)
                .reconciliationStatus(ReconciliationStatus.PENDING)
                .eventTimestamp(java.time.LocalDateTime.now())
                .build();

        event = eventRepository.save(event);
        reconciliationService.reconcileEvent(event);
    }

    public record ReplayResult(int fetched, int processed, int errors, String message) {
    }
}
