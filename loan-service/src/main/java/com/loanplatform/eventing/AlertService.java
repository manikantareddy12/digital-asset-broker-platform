package com.loanplatform.eventing;

import com.loanplatform.domain.entity.BlockchainEvent;
import com.loanplatform.eventing.ReconciliationService.ReconciliationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Alert Service
 * 
 * Sends alerts for reconciliation mismatches and system issues.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.alerts:system-alerts}")
    private String alertsTopic;

    /**
     * Send alert for reconciliation mismatch
     */
    public void sendReconciliationAlert(BlockchainEvent event, ReconciliationResult result) {
        log.warn("Reconciliation alert: eventId={}, type={}, status={}, notes={}",
                event.getEventId(), event.getEventType(), result.status(), result.notes());

        try {
            Alert alert = new Alert(
                    "RECONCILIATION_" + result.status().name(),
                    "Reconciliation issue detected",
                    result.notes(),
                    "HIGH",
                    Map.of(
                            "eventId", event.getEventId(),
                            "eventType", event.getEventType(),
                            "loanId", event.getLoanId() != null ? event.getLoanId() : "",
                            "blockNumber", event.getBlockNumber().toString(),
                            "transactionHash", event.getTransactionHash()),
                    LocalDateTime.now());

            kafkaTemplate.send(alertsTopic, event.getEventId(), alert);
            log.info("Reconciliation alert sent: {}", event.getEventId());

        } catch (Exception e) {
            log.error("Failed to send alert for event: {}", event.getEventId(), e);
        }
    }

    /**
     * Send system health alert
     */
    public void sendSystemAlert(String alertType, String message, String severity) {
        log.warn("System alert: type={}, message={}, severity={}", alertType, message, severity);

        try {
            Alert alert = new Alert(
                    alertType,
                    message,
                    null,
                    severity,
                    Map.of(),
                    LocalDateTime.now());

            kafkaTemplate.send(alertsTopic, alertType, alert);

        } catch (Exception e) {
            log.error("Failed to send system alert: {}", alertType, e);
        }
    }

    public record Alert(
            String type,
            String message,
            String details,
            String severity,
            Map<String, String> metadata,
            LocalDateTime timestamp) {
    }
}
