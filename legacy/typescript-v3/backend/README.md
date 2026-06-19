# Safety Companion - Python Backend

Production-ready FastAPI backend for construction safety analysis using 4-agent AI pipeline.

## Features

- **4-Agent JHA Pipeline**: Validator → Risk Assessor → Swiss Cheese → Synthesizer
- **OSHA Fatal Four Integration**: Real statistics-based risk assessment
- **Swiss Cheese Model**: Predictive incident analysis with causal chains
- **Gemini 2.5 Flash**: Fast, cost-effective AI processing
- **Async Architecture**: SQLAlchemy + asyncpg for high performance

## Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run server
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `POST /api/v1/jha/analyze` - Analyze Master JHA checklist
- `POST /api/v1/jha/live-update` - Update existing analysis
- `GET /api/v1/jha/analysis/{id}` - Retrieve analysis
- `GET /health` - Health check

## Agent Pipeline

1. **Validator** (temp 0.3): OSHA compliance validation
2. **Risk Assessor** (temp 0.7): Quantitative risk scoring with Fatal Four
3. **Swiss Cheese** (temp 1.0): Incident prediction with causal analysis
4. **Synthesizer** (temp 0.5): Professional JHA report generation

## Architecture
```
FastAPI
  ↓
JHAOrchestrator
  ↓
AgentRegistry → Gemini 2.5 Flash
  ↓
Neon Postgres
```

## Deployment

**Railway:**
```bash
railway link
railway up
```

**Environment Variables:**
- `GOOGLE_API_KEY` - Gemini API key (required)
- `DATABASE_URL` - Neon Postgres connection string (required)
- `ANTHROPIC_API_KEY` - Claude API key (optional)

## Performance

- Pipeline execution: ~120 seconds (4 agents sequential)
- Cost per analysis: ~$0.0013 (Gemini 2.5 Flash)
- Risk score range: 0-100 (EXTREME flagged at 95+)