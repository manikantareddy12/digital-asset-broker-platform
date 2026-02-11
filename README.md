# Digital Asset Broker Platform

[![CI Pipeline](https://github.com/manikantareddy12/digital-asset-broker-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/manikantareddy12/digital-asset-broker-platform/actions/workflows/ci.yml)
[![CodeQL](https://github.com/manikantareddy12/digital-asset-broker-platform/actions/workflows/codeql.yml/badge.svg)](https://github.com/manikantareddy12/digital-asset-broker-platform/security/code-scanning)
[![Java](https://img.shields.io/badge/Java-17+-orange)](https://openjdk.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A **bank-grade, enterprise loan management platform** that integrates Java microservices with Ethereum smart contracts through a secure Node.js gateway. Every approved loan is immutably registered on the blockchain, creating a tamper-proof audit trail while maintaining full operational flexibility in a traditional database.

---

## Table of Contents

- [Why Blockchain for Loans?](#-why-blockchain-for-loans)
- [Architecture Overview](#-architecture-overview)
- [Business Workflow](#-business-workflow)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [How a Blockchain Transaction Works](#-how-a-blockchain-transaction-works)
- [Smart Contracts](#-smart-contracts)
- [Security Model](#-security-model)
- [Testing](#-testing)
- [Production Deployment](#-production-deployment)
- [Design Decisions](#-design-decisions)
- [Documentation](#-documentation)
- [License](#-license)

---

## 💡 Why Blockchain for Loans?

| Challenge (Traditional System) | Solution (With Blockchain) |
|------|------|
| Records can be altered by database admins | Once registered, loan data is **immutable** — nobody can change it |
| Audit trails can be tampered with | Every transaction has a cryptographic **proof (hash)** on-chain |
| Disputes about loan terms | Both parties can **independently verify** the original loan parameters |
| Cross-party trust issues | A **shared, neutral ledger** that no single party controls |

> **Key insight:** We don't put everything on-chain. Only **approved loans and repayments** are registered on the blockchain. All business logic, customer data, and operational state live in PostgreSQL. This is a **hybrid architecture** — using each technology for what it does best.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ADMIN UI (React + TypeScript)                     │
│                    Dashboard · Loan Management · Auth                    │
│                            Port 5173                                     │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ REST API
┌────────────────────────────────▼─────────────────────────────────────────┐
│                    LOAN SERVICE (Spring Boot 3.2 / Java 17)              │
│  ┌──────────────┐ ┌───────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Loan Service  │ │ Customer Svc  │ │ Repayment Svc│ │ Audit Service│   │
│  └──────┬───────┘ └───────────────┘ └──────┬───────┘ └──────────────┘   │
│         │                                   │                            │
│    ┌────▼──────────────────────────────────┐ │                            │
│    │  BlockchainGatewayClient (HTTP)       │ │                            │
│    └────┬─────────────────────────────────┘ │                            │
│         │                ┌─────────────────┘                             │
│    ┌────▼────┐    ┌──────▼─────┐    ┌──────────────────┐                │
│    │PostgreSQL│    │   Kafka    │    │  Reconciliation   │                │
│    │  (JDBC)  │    │ (Events)   │    │     Service       │                │
│    └─────────┘    └────────────┘    └──────────────────┘                │
│                         Port 8081                                        │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ HTTP (internal)
┌────────────────────────────────▼─────────────────────────────────────────┐
│                BLOCKCHAIN GATEWAY (Node.js + ethers.js v6)               │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────────┐   │
│  │ Ethereum Service│ │ Loan Service   │ │ Transaction Service        │   │
│  │ (Provider/Wallet)│ │ (Contract Calls)│ │ (Gas, Retries, Events)    │   │
│  └────────────────┘ └────────────────┘ └────────────────────────────┘   │
│                    🔐 Private Key Management                             │
│                         Port 3000                                        │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ JSON-RPC
┌────────────────────────────────▼─────────────────────────────────────────┐
│                    SMART CONTRACTS (Solidity 0.8.20)                      │
│  ┌──────────────────┐         ┌──────────────────────┐                  │
│  │   LoanRegistry    │         │   RepaymentLedger     │                  │
│  │  • registerLoan() │         │  • recordRepayment()  │                  │
│  │  • updateStatus() │         │  • getRepayment()     │                  │
│  │  • getLoan()       │         └──────────────────────┘                  │
│  └──────────────────┘                                                    │
│           Ethereum Network (Hardhat local / Polygon / Mainnet)            │
│                         Port 8545 (local)                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

| Service | Technology | Port | Responsibility |
|---------|-----------|------|----------------|
| **Admin UI** | React 18, TypeScript, Vite, TanStack Query | 5173 | Web dashboard, loan CRUD, role-based actions |
| **Loan Service** | Java 17, Spring Boot 3.2, JPA, Flyway | 8081 | Core business logic, REST API, database, blockchain client |
| **Blockchain Gateway** | Node.js, Express, ethers.js v6 | 3000 | Translates HTTP calls to on-chain transactions |
| **Smart Contracts** | Solidity 0.8.20, OpenZeppelin, Hardhat | 8545 | Immutable loan registry and repayment ledger |
| **PostgreSQL** | PostgreSQL 15 | 5432 | Loan data, customers, repayment schedules |
| **Kafka** | Apache Kafka (optional) | 9092 | Blockchain event streaming |

---

## 📋 Business Workflow

### Loan Lifecycle

```
                  ┌──────────────────────────────┐
                  │     Admin creates loan        │
                  │     in the Admin UI           │
                  └──────────────┬───────────────┘
                                 ▼
                           ┌──────────┐
                           │ PENDING  │ ← Stored in PostgreSQL only
                           └────┬─────┘
                    ┌───────────┼───────────┐
                    ▼                       ▼
             ┌──────────┐           ┌───────────┐
             │ APPROVED │           │ CANCELLED │
             └────┬─────┘           └───────────┘
                  │
          🔗 Registered on Blockchain
          (blockchainLoanId + txHash assigned)
                  │
                  ▼
             ┌──────────┐
             │  ACTIVE  │ ← Blockchain status updated
             └────┬─────┘
                  │
          Repayments recorded on-chain
                  │
            ┌─────┼──────┐
            ▼            ▼
      ┌───────────┐ ┌───────────┐
      │ COMPLETED │ │ DEFAULTED │
      └───────────┘ └───────────┘
```

| Step | Actor | Action | System Behavior |
|------|-------|--------|----------------|
| 1 | Admin/Analyst | Creates a new loan | Loan saved in PostgreSQL with status `PENDING` |
| 2 | Admin | Approves the loan | Loan registered on blockchain → gets `blockchainLoanId` + `blockchainTxHash` |
| 3 | Admin | Activates the loan | Blockchain status updated to `ACTIVE`, activation timestamp recorded |
| 4 | Borrower | Makes repayments | Each repayment recorded on blockchain via `RepaymentLedger` |
| 5 | System | Loan fully repaid | Status changed to `COMPLETED` on both database and blockchain |

> **Why PENDING loans aren't on-chain:** Only approved loans deserve the immutability guarantee. Pending loans may be rejected, and blockchain transactions cost gas in production.

---

## 🧰 Technology Stack

### Core Stack (All Open Source & Free)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React + TypeScript | 18.x | Admin dashboard |
| | Vite | 5.x | Build tool |
| | TanStack Query | 5.x | Server state management |
| | Lucide React | — | Icon library |
| **Backend** | Java | 17 | Core language |
| | Spring Boot | 3.2 | Application framework |
| | Spring Data JPA | — | Database access |
| | Flyway | — | Database migrations |
| | Lombok | — | Boilerplate reduction |
| **Blockchain Gateway** | Node.js | 18+ | Runtime |
| | Express | 4.x | HTTP framework |
| | ethers.js | 6.x | Ethereum interaction library |
| | Winston | — | Structured logging |
| **Smart Contracts** | Solidity | 0.8.20 | Contract language |
| | OpenZeppelin | 5.x | Audited contract templates (AccessControl, Pausable) |
| | Hardhat | 2.x | Development framework & local node |
| **Infrastructure** | PostgreSQL | 15+ | Relational database |
| | Apache Kafka | — | Event streaming (optional) |
| | Docker / Docker Compose | — | Containerization |
| | GitHub Actions | — | CI/CD |

---

## 📁 Project Structure

```
digital-asset-broker-platform/
│
├── contracts/                      # ⛓️ Solidity Smart Contracts (Hardhat)
│   ├── contracts/
│   │   ├── LoanRegistry.sol        #   Main loan registration contract
│   │   └── RepaymentLedger.sol     #   Repayment tracking contract
│   ├── scripts/
│   │   └── deploy.js               #   Contract deployment script
│   ├── test/                       #   Contract test suite
│   ├── deployments/                #   Deployed contract addresses per network
│   └── hardhat.config.js           #   Hardhat configuration
│
├── blockchain-gateway/             # 🔗 Node.js Blockchain Gateway
│   └── src/
│       ├── services/
│       │   ├── ethereum.service.js  #   Provider, wallet, contract init
│       │   ├── loan.service.js      #   Loan contract interaction logic
│       │   └── transaction.service.js  # TX execution, gas, retries, event parsing
│       ├── routes/                  #   REST API endpoints
│       ├── middleware/              #   Auth, validation, error handling
│       ├── config/                  #   Environment config, logger
│       └── abi/                     #   Contract ABIs (auto-generated)
│
├── loan-service/                   # ☕ Spring Boot Loan Service
│   └── src/main/java/com/loanplatform/
│       ├── controller/              #   REST endpoints (/api/loans, /api/customers)
│       ├── service/                 #   Business logic (LoanService, RepaymentService)
│       ├── domain/
│       │   ├── entity/              #   JPA entities (Loan, Customer, Repayment)
│       │   └── repository/          #   Spring Data repositories
│       ├── integration/             #   BlockchainGatewayClient (HTTP client)
│       ├── eventing/                #   Kafka consumers, reconciliation
│       └── service/dto/             #   Request/Response DTOs
│
├── admin-ui/                       # ⚛️ React Admin Dashboard
│   └── src/
│       ├── pages/                   #   Dashboard, Loans, Customers, Repayments
│       ├── components/              #   Layout, Sidebar, Charts
│       ├── api/                     #   API client (Axios)
│       └── context/                 #   Auth context (role-based access)
│
├── docs/                           # 📖 Documentation
│   ├── project_documentation.md    #   Complete project deep-dive
│   ├── architecture.md             #   Detailed architecture document
│   ├── blockchain-flow-explained.md #  Blockchain transaction flow
│   ├── security.md                 #   Security model documentation
│   └── phase1–6 docs               #   Build phase documentation
│
├── docker/                         # 🐳 Docker configurations
├── docker-compose.yml              # Full-stack orchestration
├── .github/workflows/              # CI/CD pipelines
└── .env.example                    # Environment variable template
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Check Command |
|------|---------|--------------|
| Java | 17+ | `java -version` |
| Maven | 3.8+ | `mvn -version` |
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| PostgreSQL | 15+ | `psql --version` (or use Docker) |
| Docker | 20+ | `docker --version` (optional) |

### Option 1: Run Locally (Step by Step)

Open **5 separate terminals** and run in order:

**Terminal 1 — Start Local Blockchain**
```bash
cd contracts
npm install
npx hardhat node
```
> This starts a local Ethereum simulation with 20 pre-funded accounts. Keep it running.

**Terminal 2 — Deploy Smart Contracts**
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```
> Note the `LoanRegistry` and `RepaymentLedger` addresses printed — you'll need them next.

**Terminal 3 — Start Blockchain Gateway**
```bash
cd blockchain-gateway
npm install

# Set environment variables (PowerShell)
$env:PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
$env:LOAN_REGISTRY_ADDRESS="<LoanRegistry address from Terminal 2>"
$env:REPAYMENT_LEDGER_ADDRESS="<RepaymentLedger address from Terminal 2>"

npm run dev
```

> ⚠️ **The private key above is Hardhat's public test key.** Never use it on a real network.

**Terminal 4 — Start Loan Service**
```bash
cd loan-service
mvn spring-boot:run
```

**Terminal 5 — Start Admin UI**
```bash
cd admin-ui
npm install
npm run dev
```

### Option 2: Run with Docker Compose

```bash
docker-compose up -d
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Admin UI | http://localhost:5173 | admin / admin123 |
| Loan Service API | http://localhost:8081/api | — |
| Swagger UI | http://localhost:8081/api/swagger-ui.html | — |
| Blockchain Gateway | http://localhost:3000 | — |
| Hardhat Node (JSON-RPC) | http://localhost:8545 | — |

### Quick Verification

```bash
# Create a loan
curl -X POST http://localhost:8081/api/loans \
  -H "Content-Type: application/json" \
  -d '{"borrowerId":"B001","lenderId":"L001","principalAmount":50000,"interestRate":5.0,"termDays":365}'

# Approve it (triggers blockchain registration)
curl -X POST http://localhost:8081/api/loans/LOAN-XXXXX/approve

# Verify blockchain data is populated
curl http://localhost:8081/api/loans/LOAN-XXXXX
# → Response includes blockchainLoanId and blockchainTxHash
```

---

## 📡 API Reference

### Loan Service (Port 8081)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/loans` | Create a new loan |
| `GET` | `/api/loans` | List all loans (paginated) |
| `GET` | `/api/loans?status=APPROVED` | Filter loans by status |
| `GET` | `/api/loans/{externalId}` | Get loan details |
| `POST` | `/api/loans/{externalId}/approve` | Approve loan (registers on blockchain) |
| `POST` | `/api/loans/{externalId}/activate` | Activate an approved loan |
| `POST` | `/api/loans/{externalId}/cancel` | Cancel a pending/approved loan |
| `POST` | `/api/loans/{externalId}/repayments` | Record a repayment |
| `GET` | `/api/customers` | List customers |
| `GET` | `/api/reconciliation/stats` | Blockchain reconciliation stats |

### Blockchain Gateway (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chain/loan/register` | Register a loan on-chain |
| `POST` | `/chain/loan/status` | Update loan status on-chain |
| `POST` | `/chain/repayment/record` | Record a repayment on-chain |
| `GET` | `/chain/loan/{id}` | Get loan data from blockchain |
| `GET` | `/chain/loan/{id}/events` | Get loan events from chain |
| `GET` | `/health` | Gateway health check |

---

## ⛓️ How a Blockchain Transaction Works

When an admin clicks **"Approve"** on a loan in the UI, here's exactly what happens:

```
Admin UI                    Loan Service              Blockchain Gateway         Ethereum Node           Smart Contract
   │                            │                            │                       │                       │
   │  POST /approve             │                            │                       │                       │
   │ ──────────────────────────>│                            │                       │                       │
   │                            │  Update DB: APPROVED       │                       │                       │
   │                            │──┐                         │                       │                       │
   │                            │  │                         │                       │                       │
   │                            │<─┘                         │                       │                       │
   │                            │                            │                       │                       │
   │                            │  POST /chain/loan/register │                       │                       │
   │                            │ ──────────────────────────>│                       │                       │
   │                            │                            │                       │                       │
   │                            │                            │  eth_estimateGas      │                       │
   │                            │                            │ ─────────────────────>│  Simulate registerLoan│
   │                            │                            │                       │ ─────────────────────>│
   │                            │                            │                       │  Gas estimate         │
   │                            │                            │                       │<──────────────────────│
   │                            │                            │<──────────────────────│                       │
   │                            │                            │                       │                       │
   │                            │                            │  Sign TX with         │                       │
   │                            │                            │  private key          │                       │
   │                            │                            │──┐                    │                       │
   │                            │                            │  │                    │                       │
   │                            │                            │<─┘                    │                       │
   │                            │                            │                       │                       │
   │                            │                            │  eth_sendTransaction  │                       │
   │                            │                            │ ─────────────────────>│  Execute registerLoan │
   │                            │                            │                       │ ─────────────────────>│
   │                            │                            │                       │                       │  • Verify REGISTRAR_ROLE
   │                            │                            │                       │                       │  • Validate inputs
   │                            │                            │                       │                       │  • Generate loanId (keccak256)
   │                            │                            │                       │                       │  • Store loan struct
   │                            │                            │                       │                       │  • Emit LoanRegistered event
   │                            │                            │                       │  Receipt + logs       │
   │                            │                            │                       │<──────────────────────│
   │                            │                            │<──────────────────────│                       │
   │                            │                            │                       │                       │
   │                            │                            │  Parse events         │                       │
   │                            │                            │  Extract loanId       │                       │
   │                            │                            │──┐                    │                       │
   │                            │                            │  │                    │                       │
   │                            │                            │<─┘                    │                       │
   │                            │                            │                       │                       │
   │                            │  {loanId, txHash, block}   │                       │                       │
   │                            │<───────────────────────────│                       │                       │
   │                            │                            │                       │                       │
   │                            │  Save blockchainLoanId     │                       │                       │
   │                            │  + blockchainTxHash to DB  │                       │                       │
   │                            │──┐                         │                       │                       │
   │                            │  │                         │                       │                       │
   │                            │<─┘                         │                       │                       │
   │                            │                            │                       │                       │
   │  {status: APPROVED,        │                            │                       │                       │
   │   blockchainLoanId: 0x...} │                            │                       │                       │
   │<───────────────────────────│                            │                       │                       │
```

### Key Blockchain Concepts

| Concept | Explanation |
|---------|-------------|
| **Transaction (TX)** | A signed instruction sent to the blockchain (e.g., "register this loan") |
| **Gas** | Computational cost of running a TX. Free on Hardhat; costs real ETH on mainnet |
| **Block** | A batch of confirmed transactions. Hardhat = 1 block per TX; mainnet = every ~12 sec |
| **Event / Log** | Data emitted by a contract — acts as a receipt of what happened |
| **Transaction Hash** | Unique ID of a TX (e.g., `0xbe532a26...`) — immutable proof it occurred |
| **keccak256** | Ethereum's hash function — generates unique IDs from input data |
| **ABI** | Application Binary Interface — a JSON description of how to call contract functions |
| **Private Key** | Secret key that signs transactions — proves ownership of an Ethereum account |

---

## 📜 Smart Contracts

### LoanRegistry

The primary contract for loan lifecycle management.

| Function | Access | Description |
|----------|--------|-------------|
| `registerLoan()` | `REGISTRAR_ROLE` | Register a new loan, returns unique `loanId` (bytes32) |
| `updateStatus()` | `REGISTRAR_ROLE` | Transition loan status (validates allowed transitions) |
| `getLoan()` | Public (view) | Read loan details by ID |
| `getLoanCount()` | Public (view) | Total registered loans |
| `pause() / unpause()` | `PAUSER_ROLE` | Emergency circuit breaker |

**State Transitions Enforced On-Chain:**
```
PENDING  → APPROVED ✅     APPROVED → ACTIVE ✅       ACTIVE → COMPLETED ✅
PENDING  → CANCELLED ✅    APPROVED → CANCELLED ✅     ACTIVE → DEFAULTED ✅
PENDING  → ACTIVE ❌       ACTIVE   → PENDING ❌       COMPLETED → ACTIVE ❌
```

### RepaymentLedger

Immutable record of all repayments made against a loan.

| Function | Access | Description |
|----------|--------|-------------|
| `recordRepayment()` | `RECORDER_ROLE` | Record a payment with breakdown (principal, interest, fees) |
| `getRepayment()` | Public (view) | Read repayment details |

### Security Features (OpenZeppelin)

- **AccessControl** — Role-based permissions (`REGISTRAR_ROLE`, `RECORDER_ROLE`, `PAUSER_ROLE`)
- **Pausable** — Emergency stop for all state-changing operations
- **ReentrancyGuard** — Protection against reentrancy attacks

---

## 🔐 Security Model

### Key Isolation

```
Admin UI          → No blockchain access, no private keys
Loan Service      → No blockchain credentials, calls gateway over HTTP
Blockchain Gateway → ONLY service with private key access
```

### Authentication & Access Control

| Layer | Mechanism |
|-------|-----------|
| Admin UI | Username/password login, role-based UI (Admin, Analyst, Viewer) |
| Loan Service API | REST endpoints with role-based authorization |
| Gateway ↔ Service | Internal HTTP, idempotency keys |
| Smart Contracts | On-chain `AccessControl` roles — enforced by the EVM itself |

### Audit Trail

- All loan actions emit on-chain events with timestamps
- Event hashes stored in PostgreSQL for cross-referencing
- `ReconciliationService` detects mismatches between DB and blockchain state
- Alert system for reconciliation failures

---

## 🧪 Testing

```bash
# Smart contract tests
cd contracts && npx hardhat test

# Contract test coverage
cd contracts && npx hardhat coverage

# Blockchain gateway tests
cd blockchain-gateway && npm test

# Loan service tests
cd loan-service && mvn test

# Admin UI lint check
cd admin-ui && npm run lint
```

---

## 🌐 Production Deployment

### Hardhat is a Local Dev Tool — Not for Production

Hardhat runs a simulated Ethereum blockchain on your machine. Data is lost when you restart. For production, you need a real network.

### Production Network Options

| Network | Type | TX Cost | Speed | Best For |
|---------|------|---------|-------|----------|
| **Ethereum Mainnet** | Layer 1 | $1–$50+ | ~12s | Maximum security & decentralization |
| **Polygon PoS** | Layer 2 / Sidechain | $0.001–$0.01 | ~2s | Low-cost, high-throughput |
| **Arbitrum** | L2 Optimistic Rollup | $0.01–$0.50 | ~0.25s | Ethereum security, lower cost |
| **Base** | L2 (by Coinbase) | $0.001–$0.05 | ~2s | Very low cost, growing ecosystem |
| **Hyperledger Besu** | Private Ethereum | Free (no gas) | Configurable | Enterprise, permissioned |

### What Changes for Production

| Item | Local (Hardhat) | Production |
|------|----------------|-----------|
| RPC URL | `localhost:8545` | `https://polygon-mainnet.g.alchemy.com/v2/KEY` |
| Private Key | Hardhat's public test key | Securely managed (AWS KMS, HashiCorp Vault) |
| Contract Addresses | Redeployed each restart | Permanent, one-time deploy |
| Gas | Free | Real ETH/MATIC — monitor costs |
| Data | Lost on restart | Permanent, replicated globally |
| Node | Single process | Thousands of validators |

### All Tools Are Open Source

The entire blockchain stack can be built and deployed **100% free**:

| Tool | Cost | Role |
|------|------|------|
| Solidity, Hardhat, ethers.js, OpenZeppelin | Free | Development |
| Geth, Besu, Erigon | Free | Run your own Ethereum node |
| Blockscout | Free | Open-source block explorer |
| HashiCorp Vault | Free | Key management |

**Optional paid services** (for convenience, not required):

| Service | Free Tier | Paid | What It Does |
|---------|-----------|------|-------------|
| Alchemy | 300M compute units/mo | $49+/mo | RPC node access (no self-hosting needed) |
| Infura | 100K requests/day | $50+/mo | Same |
| Etherscan | Limited | $199+/mo | Block explorer API & contract verification |

---

## 🎯 Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate Node.js gateway** | Isolates private key management; ethers.js is the best Ethereum library |
| **Business logic in Spring Boot** | Type safety, enterprise maturity, established ecosystem |
| **Hybrid on-chain/off-chain** | Blockchain for audit trail only — not business logic (cost-efficient) |
| **Approve = Register on-chain** | Only committed loans deserve immutability |
| **OpenZeppelin contracts** | Battle-tested, audited templates — don't reinvent security |
| **Kafka for events** | Decoupling, replay capability, spike handling |
| **Role-based UI** | Admin, Analyst, Viewer — different capabilities per role |

---

## 📖 Documentation

Detailed documentation is available in the [`docs/`](docs/) folder:

| Document | Description |
|----------|-------------|
| [Project Documentation](docs/project_documentation.md) | Complete deep-dive: business flow, tech stack, blockchain explained, production guide |
| [Architecture](docs/architecture.md) | Detailed system architecture |
| [Blockchain Flow](docs/blockchain-flow-explained.md) | Transaction lifecycle walkthrough |
| [Security](docs/security.md) | Security model and threat analysis |
| Phase 1–6 docs | Step-by-step build documentation |

---

## 📝 License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Built with ☕ Java · ⛓️ Solidity · ⚡ Node.js · ⚛️ React</b>
</p>
