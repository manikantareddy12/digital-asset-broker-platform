// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RepaymentLedger
 * @notice Immutable ledger of all loan repayments
 * @dev Records repayment events on-chain for auditability.
 *      This contract does NOT hold funds - it only records payment metadata.
 * 
 * Design Decisions:
 * - Repayments are recorded by the backend after payment processing
 * - Each repayment has a unique hash for verification
 * - Events enable off-chain indexing and reconciliation
 * - The contract is append-only (no deletion of records)
 */
contract RepaymentLedger is AccessControl, Pausable, ReentrancyGuard {
    
    // ============ Roles ============
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============ Enums ============
    enum PaymentType {
        REGULAR,          // Scheduled payment
        EARLY,            // Early payment (extra principal)
        LATE,             // Late payment (may include fees)
        FINAL,            // Final payment completing the loan
        PARTIAL           // Partial payment (less than scheduled)
    }
    
    // ============ Structs ============
    struct Repayment {
        bytes32 repaymentId;      // Unique repayment identifier
        bytes32 loanId;           // Reference to the loan
        uint256 amount;           // Payment amount in wei
        uint256 principalPortion; // Portion applied to principal
        uint256 interestPortion;  // Portion applied to interest
        uint256 feePortion;       // Portion for fees (late fees, etc.)
        PaymentType paymentType;  // Type of payment
        uint256 recordedAt;       // Block timestamp
        string externalRef;       // Reference to off-chain payment record
        bytes32 paymentHash;      // Hash of payment details for verification
    }
    
    // ============ State Variables ============
    mapping(bytes32 => Repayment) public repayments;
    mapping(bytes32 => bool) public repaymentExists;
    mapping(bytes32 => bytes32[]) public loanRepayments;  // loanId => repaymentIds
    mapping(bytes32 => uint256) public loanTotalPaid;     // loanId => total amount paid
    
    bytes32[] public allRepaymentIds;
    
    // ============ Events ============
    
    /**
     * @notice Emitted when a repayment is recorded
     * @param repaymentId Unique repayment identifier
     * @param loanId Associated loan
     * @param amount Payment amount
     * @param paymentType Type of payment
     * @param externalRef Reference to off-chain record
     * @param paymentHash Verification hash
     * @param timestamp Block timestamp
     */
    event RepaymentRecorded(
        bytes32 indexed repaymentId,
        bytes32 indexed loanId,
        uint256 amount,
        PaymentType paymentType,
        string externalRef,
        bytes32 paymentHash,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a loan is fully repaid
     * @param loanId The completed loan
     * @param totalPaid Total amount paid
     * @param repaymentCount Number of repayments made
     * @param timestamp Block timestamp
     */
    event LoanFullyRepaid(
        bytes32 indexed loanId,
        uint256 totalPaid,
        uint256 repaymentCount,
        uint256 timestamp
    );
    
    // ============ Errors ============
    error RepaymentAlreadyExists(bytes32 repaymentId);
    error InvalidAmount();
    error InvalidLoanId();
    error PortionMismatch();
    
    // ============ Constructor ============
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RECORDER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Record a repayment for a loan
     * @dev Only callable by addresses with RECORDER_ROLE
     * @param loanId The loan being repaid
     * @param amount Total payment amount
     * @param principalPortion Amount applied to principal
     * @param interestPortion Amount applied to interest  
     * @param feePortion Amount for fees
     * @param paymentType Type of payment
     * @param externalRef Reference to off-chain payment record
     * @return repaymentId The generated repayment identifier
     */
    function recordRepayment(
        bytes32 loanId,
        uint256 amount,
        uint256 principalPortion,
        uint256 interestPortion,
        uint256 feePortion,
        PaymentType paymentType,
        string calldata externalRef
    )
        external
        onlyRole(RECORDER_ROLE)
        whenNotPaused
        nonReentrant
        returns (bytes32 repaymentId)
    {
        // Validate inputs
        if (loanId == bytes32(0)) revert InvalidLoanId();
        if (amount == 0) revert InvalidAmount();
        
        // Verify portions add up
        if (principalPortion + interestPortion + feePortion != amount) {
            revert PortionMismatch();
        }
        
        // Generate payment hash for verification
        bytes32 paymentHash = keccak256(abi.encodePacked(
            loanId,
            amount,
            block.timestamp,
            externalRef
        ));
        
        // Generate unique repayment ID
        repaymentId = keccak256(abi.encodePacked(
            loanId,
            amount,
            block.timestamp,
            msg.sender,
            allRepaymentIds.length
        ));
        
        // Check for duplicates (shouldn't happen with timestamp, but safety first)
        if (repaymentExists[repaymentId]) revert RepaymentAlreadyExists(repaymentId);
        
        // Create repayment record
        repayments[repaymentId] = Repayment({
            repaymentId: repaymentId,
            loanId: loanId,
            amount: amount,
            principalPortion: principalPortion,
            interestPortion: interestPortion,
            feePortion: feePortion,
            paymentType: paymentType,
            recordedAt: block.timestamp,
            externalRef: externalRef,
            paymentHash: paymentHash
        });
        
        repaymentExists[repaymentId] = true;
        allRepaymentIds.push(repaymentId);
        loanRepayments[loanId].push(repaymentId);
        loanTotalPaid[loanId] += amount;
        
        // Emit event for off-chain indexing
        emit RepaymentRecorded(
            repaymentId,
            loanId,
            amount,
            paymentType,
            externalRef,
            paymentHash,
            block.timestamp
        );
        
        // Emit completion event if this is a final payment
        if (paymentType == PaymentType.FINAL) {
            emit LoanFullyRepaid(
                loanId,
                loanTotalPaid[loanId],
                loanRepayments[loanId].length,
                block.timestamp
            );
        }
        
        return repaymentId;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get repayment details
     * @param repaymentId The repayment identifier
     * @return The repayment struct
     */
    function getRepayment(bytes32 repaymentId) external view returns (Repayment memory) {
        return repayments[repaymentId];
    }
    
    /**
     * @notice Get all repayment IDs for a loan
     * @param loanId The loan identifier
     * @return Array of repayment IDs
     */
    function getLoanRepaymentIds(bytes32 loanId) external view returns (bytes32[] memory) {
        return loanRepayments[loanId];
    }
    
    /**
     * @notice Get the number of repayments for a loan
     * @param loanId The loan identifier
     * @return Number of repayments
     */
    function getLoanRepaymentCount(bytes32 loanId) external view returns (uint256) {
        return loanRepayments[loanId].length;
    }
    
    /**
     * @notice Get total repayments recorded
     * @return Total count of all repayments
     */
    function getTotalRepaymentCount() external view returns (uint256) {
        return allRepaymentIds.length;
    }
    
    /**
     * @notice Verify a payment hash
     * @param loanId The loan ID
     * @param amount Payment amount
     * @param timestamp Payment timestamp
     * @param externalRef External reference
     * @return The computed payment hash
     */
    function computePaymentHash(
        bytes32 loanId,
        uint256 amount,
        uint256 timestamp,
        string calldata externalRef
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(loanId, amount, timestamp, externalRef));
    }
    
    // ============ Admin Functions ============
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
