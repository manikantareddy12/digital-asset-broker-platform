package com.loanplatform.controller;

import com.loanplatform.domain.entity.BlockchainEvent;
import com.loanplatform.domain.entity.ReconciliationStatus;
import com.loanplatform.domain.repository.BlockchainEventRepository;
import com.loanplatform.eventing.EventReplayService;
import com.loanplatform.eventing.ReconciliationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reconciliation Controller
 * 
 * REST API for monitoring and managing blockchain event reconciliation.
 */
@RestController
@RequestMapping("/reconciliation")
@RequiredArgsConstructor
@Tag(name = "Reconciliation", description = "Blockchain event reconciliation operations")
public class ReconciliationController {

    private final BlockchainEventRepository eventRepository;
    private final ReconciliationService reconciliationService;
    private final EventReplayService eventReplayService;

    @GetMapping("/events")
    @PreAuthorize("hasAnyRole('ADMIN', 'VIEWER')")
    @Operation(summary = "List all blockchain events with pagination")
    public ResponseEntity<Page<BlockchainEvent>> listEvents(Pageable pageable) {
        return ResponseEntity.ok(eventRepository.findAll(pageable));
    }

    @GetMapping("/events/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'VIEWER')")
    @Operation(summary = "List events by reconciliation status")
    public ResponseEntity<Page<BlockchainEvent>> listEventsByStatus(
            @PathVariable ReconciliationStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(eventRepository.findByReconciliationStatus(status, pageable));
    }

    @GetMapping("/events/loan/{loanId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'VIEWER')")
    @Operation(summary = "List events for a specific loan")
    public ResponseEntity<List<BlockchainEvent>> listEventsByLoan(@PathVariable String loanId) {
        return ResponseEntity.ok(eventRepository.findByLoanIdOrderByBlockNumberDesc(loanId));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'VIEWER')")
    @Operation(summary = "Get reconciliation statistics")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalEvents", eventRepository.count());
        stats.put("pending", eventRepository.countByReconciliationStatus(ReconciliationStatus.PENDING));
        stats.put("matched", eventRepository.countByReconciliationStatus(ReconciliationStatus.MATCHED));
        stats.put("mismatched", eventRepository.countByReconciliationStatus(ReconciliationStatus.MISMATCHED));
        stats.put("notFound", eventRepository.countByReconciliationStatus(ReconciliationStatus.NOT_FOUND));
        stats.put("latestBlock", eventRepository.findLatestBlockNumber());

        return ResponseEntity.ok(stats);
    }

    @PostMapping("/events/{id}/reconcile")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Manually trigger reconciliation for an event")
    public ResponseEntity<Map<String, Object>> reconcileEvent(@PathVariable Long id) {
        BlockchainEvent event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        ReconciliationService.ReconciliationResult result = reconciliationService.reconcileEvent(event);

        Map<String, Object> response = new HashMap<>();
        response.put("eventId", id);
        response.put("status", result.status());
        response.put("notes", result.notes());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/replay")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Replay events from blockchain for a block range")
    public ResponseEntity<EventReplayService.ReplayResult> replayEvents(
            @RequestParam Long fromBlock,
            @RequestParam Long toBlock) {
        EventReplayService.ReplayResult result = eventReplayService.replayEventsFromChain(fromBlock, toBlock);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/replay/loan/{loanId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Re-reconcile all events for a loan")
    public ResponseEntity<EventReplayService.ReplayResult> reReconcileLoan(@PathVariable String loanId) {
        EventReplayService.ReplayResult result = eventReplayService.reReconcileLoan(loanId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/retry-mismatched")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Retry all mismatched events")
    public ResponseEntity<EventReplayService.ReplayResult> retryMismatched() {
        EventReplayService.ReplayResult result = eventReplayService.retryMismatchedEvents();
        return ResponseEntity.ok(result);
    }
}
