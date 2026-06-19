[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
# Safety Companion V3

> Enterprise-grade construction safety management platform powered by a Multi-Agent AI pipeline and real-time data analytics.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js%2015-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://python.org/)
[![Google Gemini](https://img.shields.io/badge/Gemini%202.5-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)

**Built by HayHunt Solutions LLC**

---

## 🎯 Mission

Transform construction safety management from checkbox compliance into intelligent risk prevention. Safety Companion V3 empowers Project Managers and Foremen to generate professional Job Hazard Analysis (JHA) reports in minutes, not hours—combining real-time weather data, OSHA compliance standards, and AI-powered 4-agent risk assessment.

---

## ✨ Key Features

### 🤖 **4-Agent AI Analysis Pipeline**

| Agent | Role | Output |
|-------|------|--------|
| **Agent 1** - Validator | Data quality & OSHA gap analysis | Completeness score, critical gaps |
| **Agent 2** - Risk Assessor | Hazard identification & ranking | Top 3 hazards with severity/probability |
| **Agent 3** - Swiss Cheese | Barrier analysis & incident prediction | Layer vulnerabilities, failure pathways |
| **Agent 4** - Synthesizer | Final report generation | GO/NO-GO decision, action plan |

### 🌤️ **Intelligent Safety Dashboard**
- Real-time weather integration with geolocation
- Location-aware risk assessment 
- OSHA compliance tracking with visual indicators
- Weekly JHA submission trends and analytics

### 📋 **Professional JHA Wizard**
- 4-step progressive form (Project → Equipment → Hazards → Crew)
- AI-powered analysis with real-time progress tracking
- **Fill Test Data** button for quick testing (dev mode)
- Critical risk identification with OSHA citations

### 📊 **Reports & Export**
- **Save to Reports** - Explicitly save analyses for later
- **Full Markdown Report** - Professional narrative format
- **Share** - Copy link or use Web Share API
- **Email** - Send formatted report via email
- **Download** - Export as Markdown or HTML

### 🔐 **Enterprise Ready**
- Clerk authentication (SSO-ready)
- Role-based access control
- Multi-tenant architecture
- Complete audit trails

---

## 🏗️ Architecture

### **Frontend** - Next.js 15 (App Router)
```
frontend/
├── app/
│   ├── page.tsx           # Dashboard with weather + stats
│   ├── jha/
│   │   ├── new/           # 4-step JHA wizard
│   │   ├── [id]/          # JHA detail page with agent cards
│   │   └── page.tsx       # JHA history list
│   ├── reports/           # Saved reports view
│   └── profile/           # User settings
├── components/
│   ├── analysis/          # Agent cards (Agent1Card, Agent2Card, etc.)
│   ├── dashboard/         # Dashboard widgets
│   ├── jha/               # JHA wizard components
│   └── ui/                # shadcn/ui components
└── hooks/
    └── use-api.ts         # React Query hooks
```

**Tech Stack:**
- Next.js 15 (App Router)
- TypeScript (Strict Mode)
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)
- Clerk Authentication

### **Backend** - FastAPI (Python 3.12+)
```
backend/
├── app/
│   ├── main.py            # FastAPI application
│   ├── api/v1/
│   │   ├── jha.py         # JHA endpoints
│   │   ├── reports.py     # Reports endpoints
│   │   ├── weather.py     # Weather integration
│   │   └── admin.py       # Admin endpoints
│   ├── agents/
│   │   ├── orchestrator.py    # 4-agent pipeline coordinator
│   │   ├── agent1_validator.py
│   │   ├── agent2_risk_assessor.py
│   │   ├── agent3_swiss_cheese.py
│   │   └── agent4_synthesizer.py
│   ├── services/
│   │   ├── gemini_service.py  # Google Gemini 2.0 Flash
│   │   └── jha_service.py     # Business logic
│   └── models/
│       └── analysis.py        # SQLAlchemy models
└── tests/                     # Agent unit tests
```

**Tech Stack:**
- FastAPI + Uvicorn
- SQLAlchemy + Alembic
- Neon PostgreSQL (Serverless)
- Grok 4.1 Fast Xai API
- Pydantic v2


### **Security Architecture**
- **Authentication**: Zero-Trust model via Clerk. All API endpoints protected by JWT validation.
- **Data Protection**: 
  - **SQL Safety**: 100% Parameterized queries via SQLAlchemy ORM (No raw SQL).
  - **Prompt Defense**: XML-tagging strategy (`<user_input>`) in Agent prompts prevents prompt injection attacks.
- **API Hardening**: Strict CORS policies (no wildcards) and secure HTTP headers.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (or Neon account)
- Grok 4.20 
- OpenWeather API key

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/HeyBattle1/Agent47.git
cd safety-companion-v3
```

**2. Frontend setup**
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

**3. Backend setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database and API keys
uvicorn app.main:app --reload --port 8000
```

### Environment Variables

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_key
```

**Backend** (`.env`):
```bash
DATABASE_URL=postgresql://user:password@host:5432/safetycompanion
Grok_4_Fast_API
OPENWEATHER_API_KEY=your_openweather_key
ENVIRONMENT=development
```

---

## 📱 API Endpoints

### JHA Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/jha/analyze` | Submit JHA for multi-agent analysis |
| GET | `/api/v1/jha/{id}` | Get JHA details with all agent outputs |
| GET | `/api/v1/jha/recent` | Get recent JHA analyses |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/reports/save` | Save report to Reports tab |
| GET | `/api/v1/reports/saved` | Get explicitly saved reports |
| GET | `/api/v1/reports/{id}/download` | Download report (md/html) |

### Weather
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/weather/current/{city}` | Get current weather + safety status |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |

---

## 🛠️ Development

### Commands
```bash
# Frontend
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check

# Backend
uvicorn app.main:app --reload  # Start dev server (port 8000)
pytest                         # Run tests
```

### Testing JHA Flow
1. Go to `/jha/new`
2. Click **"🎲 Fill All"** button (dev feature)
3. Click Next → Next → Next → Analyze
4. View results with all 4 agent cards
5. Click **"Save to Reports"** to save
6. Go to `/reports` to view saved reports

---

## 📊 Roadmap

### ✅ **V3.0 - Current** (December 2024)
- [x] 4-Agent AI Pipeline (Validator → Risk Assessor → Swiss Cheese → Synthesizer)
- [x] Next.js 15 frontend with shadcn/ui
- [x] FastAPI backend with Grok 4.1 Fast
- [x] Real-time weather integration with safety thresholds
- [x] 4-step JHA wizard with validation
- [x] Full Report Module with markdown rendering
- [x] Save to Reports functionality
- [x] Share/Email/Download capabilities
- [x] Test data generator for development

### 🚧 **V3.1 - Next** (Q1 2025)
- [ ] PDF export with branded template
- [ ] Email sending via SMTP/SendGrid
- [ ] User authentication with Clerk
- [ ] Vector database for OSHA regulation search
- [ ] Mobile-optimized PWA

### 🔮 **V3.2 - Future** (Q2 2025)
- [ ] Historical pattern analysis
- [ ] Multi-language support (Spanish)
- [ ] Voice input for JHA forms
- [ ] Predictive analytics

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

Copyright © 2025 HayHunt Solutions LLC

---

## 🙏 Acknowledgments

**Powered by:**
- Xai Grok 4.1 Fast - AI analysis engine
- Neon - Serverless PostgreSQL
- Railway - Cloud deployment
- OpenWeather API - Weather data

**Built with:**
- Bradlee Burton <Lead Dev 
- Claude (Anthropic) - AI pair programming
- The open-source community

---

<div align="center">

**⭐ Star this repo if Safety Companion helps keep your crews safe ⭐**

[Report Bug](https://github.com/HeyBattle1/Agent47/issues) · [Request Feature](https://github.com/HeyBattle1/Agent47/issues)

</div>
