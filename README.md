# SaralSandhi

An AI-powered contract analysis and simplification platform that helps users understand complex legal documents through plain language explanations, multi-language translations, and risk detection.

> **Saral** (सरल) means "simple" in Hindi/Sanskrit, and **Sandhi** (संधि) refers to clauses/contracts — "Simple Contracts"

## Features

- **Contract Simplification** — Extracts clauses and rewrites them in plain, easy-to-understand language
- **Multi-language Translation** — Translates simplified clauses to Hindi and Bengali
- **Risk Detection** — Identifies unfair clauses, hidden fees, ambiguous language, and legal red flags
- **Risk Scoring** — Provides severity levels (HIGH/MEDIUM/LOW) with actionable recommendations
- **PDF Processing** — Upload and analyze contract PDFs directly
- **AI Chat Assistant** — Ask questions about your contracts and get instant answers
- **Two-Party Approval** — Add a second party to contracts for collaborative review and approval
- **Blockchain Verification** — Store contract hashes on Ethereum Sepolia for immutable proof
- **Audit Trail** — Track all contract events including uploads, approvals, and blockchain submissions
- **Auto-Detection** — Automatically detect contract category (employment, rental, NDA, etc.) and expiry dates

## Tech Stack

**Backend**
- FastAPI (Python)
- PostgreSQL with AsyncPG
- SQLAlchemy 2.0 (async)
- Google Gemini API
- JWT Authentication
- Web3.py (Ethereum integration)

**Frontend**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS

**Blockchain**
- Solidity Smart Contract
- Ethereum Sepolia Testnet
- Hardhat (development/deployment)

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+
- Google Gemini API key
- Ethereum wallet with Sepolia testnet ETH (for blockchain features)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/vedcoder/saralsandhi.git
cd saralsandhi
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

**Environment variables:**
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/saralsandhi
SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_CHAT_API_KEY=your-gemini-chat-api-key

# Blockchain Configuration (optional)
BLOCKCHAIN_ENABLED=true
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
ETHEREUM_PRIVATE_KEY=your-wallet-private-key
CONTRACT_REGISTRY_ADDRESS=0x21D5A8E4701A6CC7C2927f547Be0D80E42b30E03
```

```bash
# Run the server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb saralsandhi

# Tables are created automatically on first run

# Run migrations (if needed)
cd backend
python migrations/add_blockchain_tx_hash.py
```

### 5. Smart Contract Deployment (Optional)

If you want to deploy your own contract registry:

```bash
cd contracts

# Install dependencies
npm install

# Create .env file with your keys
cp .env.example .env

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

## Project Structure

```
saralsandhi/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── core/                # Config, database, security
│   ├── models/              # SQLAlchemy models
│   ├── routers/             # API endpoints
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic
│   │   ├── contract_service.py
│   │   ├── chat_service.py
│   │   └── blockchain_service.py
│   └── migrations/          # Database migrations
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── contexts/        # Auth context
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # API client
│   │   └── types/           # TypeScript types
├── contracts/               # Solidity smart contracts
│   ├── contracts/           # Contract source files
│   ├── scripts/             # Deployment scripts
│   └── hardhat.config.js
└── requirements.txt
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| GET | `/contracts` | List user contracts |
| POST | `/contracts/upload` | Upload and analyze PDF |
| GET | `/contracts/{id}` | Get contract details |
| DELETE | `/contracts/{id}` | Delete contract |
| POST | `/contracts/{id}/approve` | Approve/reject contract |
| POST | `/contracts/{id}/second-party` | Add second party |
| GET | `/contracts/{id}/audit-trail` | Get contract audit trail |
| POST | `/contracts/{id}/chat` | Chat with AI about contract |

## How It Works

1. **Upload** — User uploads a contract PDF
2. **Model A (Simplifier)** — Extracts clauses and simplifies language
3. **Model B (Translator)** — Translates to Hindi and Bengali
4. **Model C (Risk Detector)** — Identifies risks and provides recommendations
5. **Metadata Extraction** — Detects contract category and expiry date
6. **View** — Interactive split-panel UI to explore analysis
7. **Collaborate** — Add second party for joint review
8. **Approve** — Both parties approve to finalize
9. **Blockchain** — Contract hash stored on Ethereum for verification

## Blockchain Integration

When both parties approve a contract:
1. A SHA-256 hash of the document and metadata is generated
2. The hash is stored on the Ethereum Sepolia testnet
3. A transaction hash links to Etherscan for verification
4. The contract is marked as "On-Chain Verified"

View verified contracts on [Sepolia Etherscan](https://sepolia.etherscan.io/).

## Risk Categories

- Unfair clauses
- Hidden fees/penalties
- Ambiguous language
- Legally unenforceable terms
- Excessive liability limitations
- Unusual termination conditions

## Contract Categories

- Employment
- Rental
- NDA (Non-Disclosure Agreement)
- Service
- Sales
- Partnership
- Loan
- Insurance
- Other

## Deployment

The application is deployed on Railway:
- Backend: FastAPI service
- Frontend: Next.js service
- Database: PostgreSQL

## License

MIT
