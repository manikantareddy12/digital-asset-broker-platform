package com.loanplatform.controller;

import com.loanplatform.service.RepaymentService;
import com.loanplatform.service.dto.ProcessRepaymentRequest;
import com.loanplatform.service.dto.RepaymentResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Repayment Controller
 * 
 * REST API for repayment operations.
 */
@RestController
@RequestMapping("/repayments")
@RequiredArgsConstructor
@Tag(name = "Repayments", description = "Repayment processing operations")
public class RepaymentController {

    private final RepaymentService repaymentService;

    @PostMapping
    @PreAuthorize("hasRole('PAYMENT_PROCESSOR') or hasRole('ADMIN')")
    @Operation(summary = "Process a new repayment")
    public ResponseEntity<RepaymentResponse> processRepayment(
            @Valid @RequestBody ProcessRepaymentRequest request) {
        RepaymentResponse response = repaymentService.processRepayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{externalReference}")
    @PreAuthorize("hasAnyRole('PAYMENT_PROCESSOR', 'VIEWER', 'ADMIN')")
    @Operation(summary = "Get repayment by reference")
    public ResponseEntity<RepaymentResponse> getRepayment(
            @PathVariable String externalReference) {
        RepaymentResponse response = repaymentService.getRepayment(externalReference);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/loan/{loanExternalId}")
    @PreAuthorize("hasAnyRole('PAYMENT_PROCESSOR', 'VIEWER', 'ADMIN')")
    @Operation(summary = "List repayments for a loan")
    public ResponseEntity<Page<RepaymentResponse>> listRepaymentsByLoan(
            @PathVariable String loanExternalId,
            Pageable pageable) {
        Page<RepaymentResponse> repayments = repaymentService.listRepaymentsByLoan(loanExternalId, pageable);
        return ResponseEntity.ok(repayments);
    }
}
