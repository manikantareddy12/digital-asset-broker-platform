// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILoanRegistry
 * @notice Interface for the LoanRegistry contract
 * @dev Used by other contracts and the blockchain gateway to interact with the registry
 */
interface ILoanRegistry {
    
    enum LoanStatus {
        PENDING,
        APPROVED,
        ACTIVE,
        COMPLETED,
        DEFAULTED,
        CANCELLED
    }
    
    struct Loan {
        bytes32 loanId;
        address borrower;
        address lender;
        uint256 principalAmount;
        uint256 interestRateBps;
        uint256 termDays;
        uint256 createdAt;
        uint256 activatedAt;
        LoanStatus status;
        string externalId;
    }
    
    // Events
    event LoanRegistered(
        bytes32 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 principalAmount,
        string externalId,
        uint256 timestamp
    );
    
    event LoanStatusChanged(
        bytes32 indexed loanId,
        LoanStatus oldStatus,
        LoanStatus newStatus,
        address indexed changedBy,
        uint256 timestamp
    );
    
    event LoanActivated(
        bytes32 indexed loanId,
        uint256 activatedAt
    );
    
    // Functions
    function registerLoan(
        address borrower,
        address lender,
        uint256 principalAmount,
        uint256 interestRateBps,
        uint256 termDays,
        string calldata externalId
    ) external returns (bytes32 loanId);
    
    function updateStatus(bytes32 loanId, LoanStatus newStatus) external;
    
    function getLoan(bytes32 loanId) external view returns (Loan memory);
    
    function getLoanCount() external view returns (uint256);
    
    function isValidTransition(LoanStatus from, LoanStatus to) external view returns (bool);
}
