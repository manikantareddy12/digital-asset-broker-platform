// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LoanRegistry
 * @notice Central registry for all loans in the platform
 * @dev This contract serves as the main entry point for loan registration.
 *      It stores immutable loan metadata and emits events for off-chain indexing.
 * 
 * Security Features:
 * - Role-based access control (only REGISTRAR can register loans)
 * - Pausable for emergency situations
 * - ReentrancyGuard for additional safety
 * - Events for complete audit trail
 */
contract LoanRegistry is AccessControl, Pausable, ReentrancyGuard {
    
    // ============ Roles ============
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============ Enums ============
    enum LoanStatus {
        PENDING,      // Loan created, awaiting approval
        APPROVED,     // Loan approved, awaiting activation
        ACTIVE,       // Loan is active, repayments expected
        COMPLETED,    // Loan fully repaid
        DEFAULTED,    // Loan in default
        CANCELLED     // Loan cancelled before activation
    }
    
    // ============ Structs ============
    struct Loan {
        bytes32 loanId;           // Unique identifier (hash of loan details)
        address borrower;         // Borrower's address (for wallet-based identity)
        address lender;           // Lender's address
        uint256 principalAmount;  // Original loan amount in wei
        uint256 interestRateBps;  // Interest rate in basis points (1% = 100 bps)
        uint256 termDays;         // Loan term in days
        uint256 createdAt;        // Block timestamp when created
        uint256 activatedAt;      // Block timestamp when activated (0 if not active)
        LoanStatus status;        // Current status
        string externalId;        // Reference to off-chain system (e.g., database ID)
    }
    
    // ============ State Variables ============
    mapping(bytes32 => Loan) public loans;
    mapping(bytes32 => bool) public loanExists;
    bytes32[] public allLoanIds;
    
    // ============ Events ============
    
    /**
     * @notice Emitted when a new loan is registered
     * @param loanId Unique loan identifier
     * @param borrower Borrower's address
     * @param lender Lender's address
     * @param principalAmount Loan amount
     * @param externalId Reference to off-chain system
     * @param timestamp Block timestamp
     */
    event LoanRegistered(
        bytes32 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 principalAmount,
        string externalId,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when loan status changes
     * @param loanId Loan identifier
     * @param oldStatus Previous status
     * @param newStatus New status
     * @param changedBy Address that made the change
     * @param timestamp Block timestamp
     */
    event LoanStatusChanged(
        bytes32 indexed loanId,
        LoanStatus oldStatus,
        LoanStatus newStatus,
        address indexed changedBy,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a loan is activated
     * @param loanId Loan identifier
     * @param activatedAt Activation timestamp
     */
    event LoanActivated(
        bytes32 indexed loanId,
        uint256 activatedAt
    );
    
    // ============ Errors ============
    error LoanAlreadyExists(bytes32 loanId);
    error LoanNotFound(bytes32 loanId);
    error InvalidTransition(LoanStatus from, LoanStatus to);
    error InvalidAmount();
    error InvalidTerm();
    error InvalidAddress();
    
    // ============ State Transition Matrix ============
    mapping(LoanStatus => mapping(LoanStatus => bool)) private validTransitions;
    
    // ============ Constructor ============
    constructor() {
        // Grant admin role to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Initialize valid state transitions
        _initializeTransitions();
    }
    
    /**
     * @dev Initialize the valid state transition matrix
     * This enforces the loan lifecycle and prevents invalid state changes
     */
    function _initializeTransitions() private {
        // From PENDING
        validTransitions[LoanStatus.PENDING][LoanStatus.APPROVED] = true;
        validTransitions[LoanStatus.PENDING][LoanStatus.CANCELLED] = true;
        
        // From APPROVED
        validTransitions[LoanStatus.APPROVED][LoanStatus.ACTIVE] = true;
        validTransitions[LoanStatus.APPROVED][LoanStatus.CANCELLED] = true;
        
        // From ACTIVE
        validTransitions[LoanStatus.ACTIVE][LoanStatus.COMPLETED] = true;
        validTransitions[LoanStatus.ACTIVE][LoanStatus.DEFAULTED] = true;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Register a new loan in the system
     * @dev Only callable by addresses with REGISTRAR_ROLE
     * @param borrower Address of the borrower
     * @param lender Address of the lender
     * @param principalAmount Loan amount in wei
     * @param interestRateBps Interest rate in basis points
     * @param termDays Loan term in days
     * @param externalId Reference to off-chain database record
     * @return loanId The generated unique loan identifier
     */
    function registerLoan(
        address borrower,
        address lender,
        uint256 principalAmount,
        uint256 interestRateBps,
        uint256 termDays,
        string calldata externalId
    ) 
        external 
        onlyRole(REGISTRAR_ROLE) 
        whenNotPaused 
        nonReentrant 
        returns (bytes32 loanId) 
    {
        // Validate inputs
        if (borrower == address(0) || lender == address(0)) revert InvalidAddress();
        if (principalAmount == 0) revert InvalidAmount();
        if (termDays == 0) revert InvalidTerm();
        
        // Generate unique loan ID
        loanId = keccak256(abi.encodePacked(
            borrower,
            lender,
            principalAmount,
            block.timestamp,
            externalId
        ));
        
        // Check for duplicates
        if (loanExists[loanId]) revert LoanAlreadyExists(loanId);
        
        // Create the loan record
        loans[loanId] = Loan({
            loanId: loanId,
            borrower: borrower,
            lender: lender,
            principalAmount: principalAmount,
            interestRateBps: interestRateBps,
            termDays: termDays,
            createdAt: block.timestamp,
            activatedAt: 0,
            status: LoanStatus.PENDING,
            externalId: externalId
        });
        
        loanExists[loanId] = true;
        allLoanIds.push(loanId);
        
        // Emit event for off-chain indexing
        emit LoanRegistered(
            loanId,
            borrower,
            lender,
            principalAmount,
            externalId,
            block.timestamp
        );
        
        return loanId;
    }
    
    /**
     * @notice Update the status of a loan
     * @dev Only valid state transitions are allowed
     * @param loanId The loan to update
     * @param newStatus The new status
     */
    function updateStatus(bytes32 loanId, LoanStatus newStatus) 
        external 
        onlyRole(REGISTRAR_ROLE) 
        whenNotPaused 
    {
        if (!loanExists[loanId]) revert LoanNotFound(loanId);
        
        Loan storage loan = loans[loanId];
        LoanStatus oldStatus = loan.status;
        
        // Validate transition
        if (!validTransitions[oldStatus][newStatus]) {
            revert InvalidTransition(oldStatus, newStatus);
        }
        
        // Update status
        loan.status = newStatus;
        
        // Handle activation
        if (newStatus == LoanStatus.ACTIVE && loan.activatedAt == 0) {
            loan.activatedAt = block.timestamp;
            emit LoanActivated(loanId, block.timestamp);
        }
        
        emit LoanStatusChanged(
            loanId,
            oldStatus,
            newStatus,
            msg.sender,
            block.timestamp
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get loan details by ID
     * @param loanId The loan identifier
     * @return The loan struct
     */
    function getLoan(bytes32 loanId) external view returns (Loan memory) {
        if (!loanExists[loanId]) revert LoanNotFound(loanId);
        return loans[loanId];
    }
    
    /**
     * @notice Get the total number of loans
     * @return The count of all registered loans
     */
    function getLoanCount() external view returns (uint256) {
        return allLoanIds.length;
    }
    
    /**
     * @notice Check if a transition is valid
     * @param from Current status
     * @param to Target status
     * @return True if transition is valid
     */
    function isValidTransition(LoanStatus from, LoanStatus to) external view returns (bool) {
        return validTransitions[from][to];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Pause the contract (emergency only)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
