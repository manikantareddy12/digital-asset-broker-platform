// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRepaymentLedger
 * @notice Interface for the RepaymentLedger contract
 */
interface IRepaymentLedger {
    
    enum PaymentType {
        REGULAR,
        EARLY,
        LATE,
        FINAL,
        PARTIAL
    }
    
    struct Repayment {
        bytes32 repaymentId;
        bytes32 loanId;
        uint256 amount;
        uint256 principalPortion;
        uint256 interestPortion;
        uint256 feePortion;
        PaymentType paymentType;
        uint256 recordedAt;
        string externalRef;
        bytes32 paymentHash;
    }
    
    // Events
    event RepaymentRecorded(
        bytes32 indexed repaymentId,
        bytes32 indexed loanId,
        uint256 amount,
        PaymentType paymentType,
        string externalRef,
        bytes32 paymentHash,
        uint256 timestamp
    );
    
    event LoanFullyRepaid(
        bytes32 indexed loanId,
        uint256 totalPaid,
        uint256 repaymentCount,
        uint256 timestamp
    );
    
    // Functions
    function recordRepayment(
        bytes32 loanId,
        uint256 amount,
        uint256 principalPortion,
        uint256 interestPortion,
        uint256 feePortion,
        PaymentType paymentType,
        string calldata externalRef
    ) external returns (bytes32 repaymentId);
    
    function getRepayment(bytes32 repaymentId) external view returns (Repayment memory);
    
    function getLoanRepaymentIds(bytes32 loanId) external view returns (bytes32[] memory);
    
    function getLoanRepaymentCount(bytes32 loanId) external view returns (uint256);
    
    function loanTotalPaid(bytes32 loanId) external view returns (uint256);
}
