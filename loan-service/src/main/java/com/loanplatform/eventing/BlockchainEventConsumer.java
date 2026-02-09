package com.loanplatform.eventing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.loanplatform.domain.entity.BlockchainEvent;
import com.loanplatform.domain.entity.ReconciliationStatus;
import com.loanplatform.domain.repository.BlockchainEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;

/**
 * Blockchain Event Consumer
 * 
 * Consumes blockchain events from Kafka and stores them for reconciliation.
 * Events are published by the blockchain gateway when contract events are
 * emitted.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BlockchainEventConsumer {

    private final BlockchainEventRepository eventRepository;
    private final ReconciliationService reconciliationService;
    private final ObjectMapper objectMapper;

    /**
     * Consume chain events published by the blockchain gateway
     */
    @KafkaListener(topics = "${kafka.topics.chain-events:chain-events}", groupId = "${spring.kafka.consumer.group-id:loan-service}")
    @Transactional
    public void consumeChainEvent(ConsumerRecord<String, String> record) {
        try {
            log.info("Received chain event: key={}, partition={}, offset={}",
                    record.key(), record.partition(), record.offset());

            Map<String, Object> eventData = objectMapper.readValue(record.value(), Map.class);

            // Check for duplicate
            String eventId = (String) eventData.get("eventId");
            if (eventId != null && eventRepository.existsByEventId(eventId)) {
                log.debug("Duplicate event ignored: {}", eventId);
                return;
            }

            // Build event entity
            BlockchainEvent event = buildEventEntity(eventData);

            // Compute event hash for integrity
            event.setEventHash(computeEventHash(record.value()));

            // Save event
            event = eventRepository.save(event);

            log.info("Blockchain event stored: id={}, type={}, loanId={}",
                    event.getId(), event.getEventType(), event.getLoanId());

            // Trigger async reconciliation
            reconciliationService.reconcileEventAsync(event);

        } catch (Exception e) {
            log.error("Failed to process chain event", e);
            // Event will be retried by Kafka due to not committing offset
            throw new RuntimeException("Event processing failed", e);
        }
    }

    private BlockchainEvent buildEventEntity(Map<String, Object> eventData) {
        String eventType = (String) eventData.get("eventType");

        BlockchainEvent.BlockchainEventBuilder builder = BlockchainEvent.builder()
                .eventId(generateEventId(eventData))
                .eventType(eventType)
                .transactionHash((String) eventData.get("transactionHash"))
                .blockNumber(((Number) eventData.get("blockNumber")).longValue())
                .logIndex(((Number) eventData.getOrDefault("logIndex", 0)).intValue())
                .reconciliationStatus(ReconciliationStatus.PENDING)
                .eventTimestamp(parseTimestamp(eventData.get("timestamp")));

        // Extract loan/repayment ID based on event type
        if (eventType.startsWith("Loan")) {
            builder.loanId((String) eventData.get("loanId"));
        } else if (eventType.startsWith("Repayment")) {
            builder.repaymentId((String) eventData.get("repaymentId"));
            builder.loanId((String) eventData.get("loanId"));
        }

        // Store full event data as JSON
        try {
            builder.eventData(objectMapper.writeValueAsString(eventData));
        } catch (Exception e) {
            log.warn("Failed to serialize event data", e);
        }

        return builder.build();
    }

    private String generateEventId(Map<String, Object> eventData) {
        String txHash = (String) eventData.get("transactionHash");
        Integer logIndex = ((Number) eventData.getOrDefault("logIndex", 0)).intValue();
        return txHash + "-" + logIndex;
    }

    private LocalDateTime parseTimestamp(Object timestamp) {
        if (timestamp == null) {
            return LocalDateTime.now();
        }
        if (timestamp instanceof Number) {
            long epochSeconds = ((Number) timestamp).longValue();
            return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneId.systemDefault());
        }
        return LocalDateTime.now();
    }

    private String computeEventHash(String eventData) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(eventData.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return "0x" + hexString.toString();
        } catch (Exception e) {
            log.warn("Failed to compute event hash", e);
            return null;
        }
    }
}
