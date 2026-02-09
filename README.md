# Digital Asset Broker Platform

[![CI Pipeline](https://github.com/manikantareddy12/digital-asset-broker-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/manikantareddy12/digital-asset-broker-platform/actions/workflows/ci.yml)
[![CodeQL](https://github.com/manikantareddy12/digital-asset-broker-platform/actions/workflows/codeql.yml/badge.svg)](https://github.com/manikantareddy12/digital-asset-broker-platform/security/code-scanning)
[![Java](https://img.shields.io/badge/Java-17+-orange)](https://openjdk.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)

A **bank-grade, enterprise digital asset broker platform** that integrates Java microservices with EVM smart contracts through a secure Node.js gateway. The system manages loan lifecycles off-chain while recording critical, immutable events on-chain for auditability.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN UI (React)                             │
│                     Read-Only Dashboard                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                    SPRING BOOT BACKEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │    Loan     │  │  Customer   │  │  Repayment  │  │   Audit   │  │
│  │  Service    │  │  Service    │  │  Service    │  │  Service  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         └────────────────┴────────────────┴───────────────┘        │
│                                │                                    │
│         ┌──────────────────────┴───────────────────────┐           │
│         ▼                                              ▼           │
│   ┌───────────┐                              ┌─────────────────┐   │
│   │ PostgreSQL│                              │  Kafka Events   │   │
│   └───────────┘                              └─────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                   BLOCKCHAIN GATEWAY (Node.js)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ethers.js  │  Transaction Signing  │  Event Listeners      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                    🔐 Private Key Management                        │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                    SMART CONTRACTS (Solidity)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ LoanRegistry │  │LoanAgreement │  │   RepaymentLedger      │    │
│  └──────────────┘  └──────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                           Ethereum / Besu
```

## 📁 Project Structure

```
digital-asset-broker-platform/
├── contracts/                 # Solidity smart contracts (Hardhat)
│   ├── contracts/            # Contract source files
│   ├── scripts/              # Deployment scripts
│   └── test/                 # Contract tests
├── blockchain-gateway/        # Node.js + ethers.js service
│   └── src/
│       ├── routes/           # API endpoints
│       ├── services/         # Blockchain interaction
│       └── middleware/       # Auth, validation
├── loan-service/              # Java Spring Boot backend
│   └── src/main/java/
│       ├── controller/       # REST endpoints
│       ├── service/          # Business logic
│       ├── repository/       # Data access
│       └── integration/      # Gateway client
├── admin-ui/                  # React admin dashboard
├── docker/                    # Docker configurations
└── .github/workflows/         # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- Java 17+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)

### Run Locally

```bash
# 1. Start infrastructure (PostgreSQL, Kafka, Zookeeper)
docker-compose up -d postgres kafka zookeeper

# 2. Deploy smart contracts (local Hardhat node)
cd contracts
npm install
npx hardhat node &
npx hardhat run scripts/deploy.js --network localhost

# 3. Start blockchain gateway
cd ../blockchain-gateway
npm install
export LOAN_REGISTRY_ADDRESS="<address from step 2>"
export REPAYMENT_LEDGER_ADDRESS="<address from step 2>"
export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
npm run dev

# 4. Start Spring Boot backend
cd ../loan-service
./mvnw spring-boot:run

# 5. Start admin UI
cd ../admin-ui
npm install
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Admin UI | http://localhost:5173 |
| Loan Service API | http://localhost:8081/api |
| Swagger UI | http://localhost:8081/api/swagger-ui.html |
| Blockchain Gateway | http://localhost:3000 |
| Hardhat Node | http://localhost:8545 |

### Run with Docker Compose

```bash
docker-compose up -d
```

## 🔐 Security Model

### Key Isolation
- **Private keys** are ONLY accessible by the blockchain gateway
- Spring Boot backend has NO blockchain credentials
- Admin UI is completely read-only

### Authentication
- JWT-based authentication for all APIs
- Role-Based Access Control (RBAC)
- Service-to-service authentication for internal calls

### Audit Trail
- All loan actions emit on-chain events
- Event hashes stored in PostgreSQL for reconciliation
- Mismatch detection and alerting

## 📖 API Overview

### Loan Service (Spring Boot - Port 8081)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/loans` | Create a new loan |
| GET | `/api/loans/{id}` | Get loan details |
| GET | `/api/loans` | List all loans (paginated) |
| POST | `/api/loans/{id}/repayments` | Record a repayment |
| GET | `/api/reconciliation/stats` | Get reconciliation statistics |

### Blockchain Gateway (Node.js - Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chain/loan/register` | Register loan on-chain |
| POST | `/chain/loan/repayment` | Record repayment on-chain |
| GET | `/chain/loan/{id}/events` | Get loan events from chain |
| GET | `/health` | Gateway health check |

## 🧪 Testing

```bash
# Smart contract tests
cd contracts && npx hardhat test

# Gateway tests
cd blockchain-gateway && npm test

# Spring Boot tests
cd loan-service && ./mvnw test

# Admin UI lint check
cd admin-ui && npm run lint
```

## 📊 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Smart Contracts | Solidity 0.8.20 | Immutable loan records |
| Blockchain Gateway | Node.js + ethers.js | Chain interaction |
| Backend | Spring Boot 3.2 | Business logic |
| Database | PostgreSQL 15 | Off-chain state |
| Messaging | Apache Kafka | Event streaming |
| Admin UI | React + TypeScript | Visibility dashboard |
| DevOps | Docker, GitHub Actions | CI/CD |

## 🎯 Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate Node.js gateway | Isolates private key management; ethers.js is best-in-class |
| Business logic in Spring Boot | Type safety, enterprise maturity, better testing |
| On-chain events only | Blockchain for audit trail, not business logic |
| Kafka for events | Decoupling, replay capability, spike handling |
| Read-only UI | Security: no wallet exposure in admin tools |

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.
