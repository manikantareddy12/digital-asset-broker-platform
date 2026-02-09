# Blockchain Gateway

Node.js service that provides REST API access to the loan platform smart contracts.

## Purpose

This service is the **only component that handles blockchain private keys**. It provides:

- Contract interaction via ethers.js
- Transaction signing and submission
- Event listening and forwarding
- Retry logic and idempotency

## API Endpoints

### Health
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Blockchain readiness |
| GET | `/health/live` | Server liveness |

### Loans
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/chain/loan/register` | Register new loan |
| POST | `/chain/loan/:loanId/status` | Update loan status |
| GET | `/chain/loan/:loanId` | Get loan details |
| GET | `/chain/loan/stats/count` | Get total loan count |

### Repayments
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/chain/repayment/record` | Record repayment |
| GET | `/chain/repayment/:repaymentId` | Get repayment details |
| GET | `/chain/repayment/loan/:loanId` | Get loan repayments |
| POST | `/chain/repayment/verify-hash` | Verify payment hash |

### Events
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/chain/events/loan/:loanId` | Get loan events |
| GET | `/chain/events/recent` | Get recent events |
| GET | `/chain/events/type/:eventType` | Get events by type |

## Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Run in development
npm run dev

# Run in production
npm start
```

## Configuration

Set these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `ETHEREUM_RPC_URL` | Blockchain RPC URL | http://localhost:8545 |
| `PRIVATE_KEY` | Wallet private key | - |
| `LOAN_REGISTRY_ADDRESS` | Contract address | - |
| `REPAYMENT_LEDGER_ADDRESS` | Contract address | - |

## Idempotency

All POST endpoints support idempotency via `X-Idempotency-Key` header:

```bash
curl -X POST http://localhost:3000/chain/loan/register \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: unique-request-id" \
  -d '{"borrower":"0x...", "lender":"0x...", ...}'
```

## Architecture

```
src/
├── config/          # Configuration & logging
├── middleware/      # Error handling, validation
├── routes/          # REST endpoints
├── services/        # Core business logic
└── abi/             # Contract ABIs
```
