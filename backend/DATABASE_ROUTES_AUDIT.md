# NeonDB & Database Routes Audit

## Database Configuration

### Environment Variables
| Variable | Local Dev | Production |
|----------|-----------|------------|
| `DATABASE_URL` | `sqlite:///./safety_companion.db` | `postgresql+asyncpg://...@neon.tech/...` |

### Connection File
`backend/app/core/database.py`
- Auto-converts `postgresql://` → `postgresql+asyncpg://` for async
- Auto-converts `sqlite://` → `sqlite+aiosqlite://` for async
- Pool size: 20 (PostgreSQL only)
- Pool pre-ping: True (connection health check)

---

## Database Tables

### Active Tables (Created by `init_db.py`):

| Table | Model File | Purpose |
|-------|------------|---------|
| `analysis_history` | `models/analysis.py` | Stores JHA analysis results |
| `agent_outputs` | `models/analysis.py` | Individual agent outputs per analysis |
| `agent_configurations` | `models/agent_config.py` | Agent settings/prompts |
| `agent_performance_logs` | `models/agent_config.py` | Agent performance metrics |
| `jha_updates` | `models/jha_updates.py` | Live field updates |
| `users` | `models/user.py` | User accounts (V2) |

### Pending Tables (Commented Out):
- `safety_reports` - models/safety.py
- `risk_assessments` - models/safety.py  
- `companies` - models/company.py
- `projects` - models/company.py
- `notification_preferences` - models/notifications.py

---

## API Routes Using Database

### JHA Routes (`/api/v1/jha/`)
| Endpoint | Method | DB Operation | Table |
|----------|--------|--------------|-------|
| `/analyze` | POST | INSERT → UPDATE | `analysis_history` |
| `/recent` | GET | SELECT | `analysis_history` |
| `/{jha_id}` | GET | SELECT | `analysis_history` |
| `/acknowledge` | POST | UPDATE | `jha_updates` |
| `/live-update` | POST | INSERT | (TODO) |

### Admin Routes (`/api/v1/admin/`)
| Endpoint | Method | DB Operation | Table |
|----------|--------|--------------|-------|
| `/agent-config` | GET | SELECT ALL | `agent_configurations` |
| `/agent-config` | POST | INSERT | `agent_configurations` |
| `/agent-config/{id}` | PUT | UPDATE | `agent_configurations` |
| `/agent-config/{id}` | DELETE | DELETE | `agent_configurations` |
| `/analytics` | GET | SELECT | `analysis_history`, `agent_outputs` |
| `/performance` | GET | SELECT | `agent_performance_logs` |

### Reports Routes (`/api/v1/reports/`)
| Endpoint | Method | DB Operation | Table |
|----------|--------|--------------|-------|
| `/email` | POST | SELECT | `analysis_history` |
| `/save` | POST | UPDATE | `analysis_history` |
| `/saved` | GET | SELECT | `analysis_history` |
| `/{id}` | GET | SELECT | `analysis_history` |

### Vision Routes (`/api/v1/jha/vision/`)
| Endpoint | Method | DB Operation | Table |
|----------|--------|--------------|-------|
| `/analyze` | POST | INSERT → UPDATE | `analysis_history` |
| `/analyze/image` | POST | None (stateless) | - |
| `/analyze/document` | POST | None (stateless) | - |
| `/capabilities` | GET | None (static) | - |

---

## Database Initialization

### For Local Development:
```bash
cd backend
python init_db.py
```
Creates SQLite file: `safety_companion.db`

### For Production (NeonDB):
1. Set `DATABASE_URL` in Railway/Vercel environment
2. Run init script OR tables auto-create on first request

---

## Verification Commands

### Check Tables Exist:
```bash
# Local (SQLite)
sqlite3 safety_companion.db ".tables"

# Production (Neon) - via psql or Neon Console
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Test Database Connection:
```bash
# Health check
curl https://your-api.com/health

# List recent JHAs (proves DB read works)
curl https://your-api.com/api/v1/jha/recent
```

---

## Status: ✅ All Routes Wired Correctly

All API endpoints that need database access:
1. Import `get_db` from `app.core.deps`
2. Use `db: AsyncSession = Depends(get_db)` in function signature
3. Use SQLAlchemy async operations (`await db.execute(...)`)
4. Session auto-commits on success, rollbacks on error
