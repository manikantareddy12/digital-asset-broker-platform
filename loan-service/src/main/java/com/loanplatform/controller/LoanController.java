package com.loanplatform.controller;

import com.loanplatform.domain.entity.LoanStatus;
import com.loanplatform.service.LoanService;
import com.loanplatform.service.dto.CreateLoanRequest;
import com.loanplatform.service.dto.LoanResponse;
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
 * Loan Controller
 * 
 * REST API for loan management operations.
 */
@RestController
@RequestMapping("/loans")
@RequiredArgsConstructor
@Tag(name = "Loans", description = "Loan management operations")
public class LoanController {

    private final LoanService loanService;

    @PostMapping
    @PreAuthorize("hasRole('LOAN_OFFICER') or hasRole('ADMIN')")
    @Operation(summary = "Create a new loan")
    public ResponseEntity<LoanResponse> createLoan(@Valid @RequestBody CreateLoanRequest request) {
        LoanResponse response = loanService.createLoan(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{externalId}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'VIEWER', 'ADMIN')")
    @Operation(summary = "Get loan by ID")
    public ResponseEntity<LoanResponse> getLoan(@PathVariable String externalId) {
        LoanResponse response = loanService.getLoan(externalId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'VIEWER', 'ADMIN')")
    @Operation(summary = "List all loans with pagination")
    public ResponseEntity<Page<LoanResponse>> listLoans(Pageable pageable) {
        Page<LoanResponse> loans = loanService.listLoans(pageable);
        return ResponseEntity.ok(loans);
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'VIEWER', 'ADMIN')")
    @Operation(summary = "List loans by status")
    public ResponseEntity<Page<LoanResponse>> listLoansByStatus(
            @PathVariable LoanStatus status,
            Pageable pageable) {
        Page<LoanResponse> loans = loanService.listLoansByStatus(status, pageable);
        return ResponseEntity.ok(loans);
    }

    @PostMapping("/{externalId}/approve")
    @PreAuthorize("hasRole('LOAN_APPROVER') or hasRole('ADMIN')")
    @Operation(summary = "Approve a loan and register on blockchain")
    public ResponseEntity<LoanResponse> approveLoan(@PathVariable String externalId) {
        LoanResponse response = loanService.approveLoan(externalId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{externalId}/activate")
    @PreAuthorize("hasRole('LOAN_OFFICER') or hasRole('ADMIN')")
    @Operation(summary = "Activate an approved loan")
    public ResponseEntity<LoanResponse> activateLoan(@PathVariable String externalId) {
        LoanResponse response = loanService.activateLoan(externalId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{externalId}/cancel")
    @PreAuthorize("hasRole('LOAN_APPROVER') or hasRole('ADMIN')")
    @Operation(summary = "Cancel a loan")
    public ResponseEntity<LoanResponse> cancelLoan(@PathVariable String externalId) {
        LoanResponse response = loanService.cancelLoan(externalId);
        return ResponseEntity.ok(response);
    }
}
