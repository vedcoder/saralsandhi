# SaralSandhi

An AI-powered contract analysis and simplification platform that helps users understand complex legal documents through plain language explanations, multi-language translations, and risk detection.

> **Saral** (सरल) means "simple" in Hindi/Sanskrit, and **Sandhi** (संधि) refers to clauses/contracts — "Simple Contracts"

## Features

- **Contract Simplification** — Extracts clauses and rewrites them in plain, easy-to-understand language
- **Multi-language Translation** — Translates simplified clauses to Hindi and Bengali
- **Risk Detection** — Identifies unfair clauses, hidden fees, ambiguous language, and legal red flags
- **Risk Scoring** — Provides severity levels (HIGH/MEDIUM/LOW) with actionable recommendations
- **PDF Processing** — Upload and analyze contract PDFs directly

## Tech Stack

**Backend**
- FastAPI (Python)
- PostgreSQL with AsyncPG
- SQLAlchemy 2.0 (async)
- Google Gemini API
- JWT Authentication

**Frontend**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+
- Google Gemini API key

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/saralsandhi.git
cd saralsandhi
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

**Environment variables:**
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/saralsandhi
SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
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
│   └── services/            # Business logic
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── contexts/        # Auth context
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # API client
│   │   └── types/           # TypeScript types
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

## How It Works

1. **Upload** — User uploads a contract PDF
2. **Model A (Simplifier)** — Extracts clauses and simplifies language
3. **Model B (Translator)** — Translates to Hindi and Bengali
4. **Model C (Risk Detector)** — Identifies risks and provides recommendations
5. **View** — Interactive split-panel UI to explore analysis

## Risk Categories

- Unfair clauses
- Hidden fees/penalties
- Ambiguous language
- Legally unenforceable terms
- Excessive liability limitations
- Unusual termination conditions

## License

MIT
