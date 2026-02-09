package com.loanplatform.integration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

/**
 * Blockchain Gateway Client
 * 
 * HTTP client for communicating with the Node.js blockchain gateway.
 * Handles loan registration and repayment recording on-chain.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BlockchainGatewayClient {

    private final RestTemplate restTemplate;

    @Value("${blockchain.gateway.url}")
    private String gatewayUrl;

    /**
     * Register a loan on the blockchain
     */
    @Retryable(retryFor = RestClientException.class, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public LoanRegistrationResponse registerLoan(LoanRegistrationRequest request) {
        log.info("Registering loan on blockchain: externalId={}", request.getExternalId());

        HttpHeaders headers = createHeaders();
        HttpEntity<LoanRegistrationRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<LoanRegistrationResponse> response = restTemplate.exchange(
                gatewayUrl + "/chain/loan/register",
                HttpMethod.POST,
                entity,
                LoanRegistrationResponse.class);

        if (response.getBody() == null || !response.getBody().isSuccess()) {
            throw new BlockchainOperationException("Failed to register loan on blockchain");
        }

        log.info("Loan registered on blockchain: loanId={}, txHash={}",
                response.getBody().getData().getLoanId(),
                response.getBody().getData().getTransactionHash());

        return response.getBody();
    }

    /**
     * Update loan status on the blockchain
     */
    @Retryable(retryFor = RestClientException.class, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public StatusUpdateResponse updateLoanStatus(String blockchainLoanId, String newStatus) {
        log.info("Updating loan status on blockchain: loanId={}, newStatus={}",
                blockchainLoanId, newStatus);

        HttpHeaders headers = createHeaders();
        Map<String, String> body = Map.of("status", newStatus);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<StatusUpdateResponse> response = restTemplate.exchange(
                gatewayUrl + "/chain/loan/" + blockchainLoanId + "/status",
                HttpMethod.POST,
                entity,
                StatusUpdateResponse.class);

        if (response.getBody() == null || !response.getBody().isSuccess()) {
            throw new BlockchainOperationException("Failed to update loan status");
        }

        return response.getBody();
    }

    /**
     * Record a repayment on the blockchain
     */
    @Retryable(retryFor = RestClientException.class, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public RepaymentRecordResponse recordRepayment(RepaymentRecordRequest request) {
        log.info("Recording repayment on blockchain: loanId={}, amount={}",
                request.getLoanId(), request.getAmount());

        HttpHeaders headers = createHeaders();
        HttpEntity<RepaymentRecordRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<RepaymentRecordResponse> response = restTemplate.exchange(
                gatewayUrl + "/chain/repayment/record",
                HttpMethod.POST,
                entity,
                RepaymentRecordResponse.class);

        if (response.getBody() == null || !response.getBody().isSuccess()) {
            throw new BlockchainOperationException("Failed to record repayment on blockchain");
        }

        log.info("Repayment recorded on blockchain: repaymentId={}, paymentHash={}",
                response.getBody().getData().getRepaymentId(),
                response.getBody().getData().getPaymentHash());

        return response.getBody();
    }

    /**
     * Get loan from blockchain
     */
    public BlockchainLoanResponse getLoan(String blockchainLoanId) {
        HttpHeaders headers = createHeaders();
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<BlockchainLoanResponse> response = restTemplate.exchange(
                gatewayUrl + "/chain/loan/" + blockchainLoanId,
                HttpMethod.GET,
                entity,
                BlockchainLoanResponse.class);

        return response.getBody();
    }

    /**
     * Health check
     */
    public boolean isHealthy() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    gatewayUrl + "/health/ready",
                    Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("Blockchain gateway health check failed: {}", e.getMessage());
            return false;
        }
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Idempotency-Key", UUID.randomUUID().toString());
        return headers;
    }

    // ============ Request/Response DTOs ============

    @lombok.Data
    public static class LoanRegistrationRequest {
        private String borrower;
        private String lender;
        private String principalAmount;
        private int interestRateBps;
        private int termDays;
        private String externalId;
    }

    @lombok.Data
    public static class LoanRegistrationResponse {
        private boolean success;
        private String message;
        private LoanRegistrationData data;
    }

    @lombok.Data
    public static class LoanRegistrationData {
        private String loanId;
        private String transactionHash;
        private long blockNumber;
        private String gasUsed;
    }

    @lombok.Data
    public static class StatusUpdateResponse {
        private boolean success;
        private String message;
        private Map<String, Object> data;
    }

    @lombok.Data
    public static class RepaymentRecordRequest {
        private String loanId;
        private String amount;
        private String principalPortion;
        private String interestPortion;
        private String feePortion;
        private String paymentType;
        private String externalRef;
    }

    @lombok.Data
    public static class RepaymentRecordResponse {
        private boolean success;
        private String message;
        private RepaymentRecordData data;
    }

    @lombok.Data
    public static class RepaymentRecordData {
        private String repaymentId;
        private String paymentHash;
        private String transactionHash;
        private long blockNumber;
        private String gasUsed;
    }

    @lombok.Data
    public static class BlockchainLoanResponse {
        private boolean success;
        private Map<String, Object> data;
    }
}
