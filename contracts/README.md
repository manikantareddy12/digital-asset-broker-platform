# Smart Contracts - Loan Platform

Solidity smart contracts for the Blockchain-Enabled Loan Processing Platform.

## Contracts

| Contract | Purpose |
|----------|---------|
| `LoanRegistry.sol` | Central registry for all loans, state machine enforcement |
| `RepaymentLedger.sol` | Immutable ledger of all repayments |

## Security Features

- **OpenZeppelin AccessControl** - Role-based permissions
- **Pausable** - Emergency stop functionality
- **ReentrancyGuard** - Protection against reentrancy attacks
- **State Machine** - Enforced loan lifecycle transitions
- **Event Emission** - Complete audit trail

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Local Deployment

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy contracts
npm run deploy:local
```

### Networks

| Network | Purpose | Config |
|---------|---------|--------|
| localhost | Local development | Hardhat node |
| sepolia | Ethereum testnet | Use with testnet ETH |
| besu | Enterprise blockchain | Hyperledger Besu |

## Contract Roles

| Role | Contract | Can Do |
|------|----------|--------|
| REGISTRAR_ROLE | LoanRegistry | Register loans, update status |
| RECORDER_ROLE | RepaymentLedger | Record repayments |
| PAUSER_ROLE | Both | Pause/unpause contracts |
| DEFAULT_ADMIN_ROLE | Both | Grant/revoke roles |

## Loan State Machine

```
PENDING ──┬──► APPROVED ──┬──► ACTIVE ──┬──► COMPLETED
          │               │             │
          └──► CANCELLED  └──► CANCELLED └──► DEFAULTED
```

## Events

### LoanRegistry
- `LoanRegistered` - New loan created
- `LoanStatusChanged` - Status transition
- `LoanActivated` - Loan became active

### RepaymentLedger
- `RepaymentRecorded` - Payment recorded
- `LoanFullyRepaid` - Final payment made

## ABI Files

After compilation, ABI files are in `artifacts/contracts/*/`.json:
- `LoanRegistry.json`
- `RepaymentLedger.json`

Use these ABIs in the blockchain gateway for contract interaction.
