# Safety Companion V4

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A learning safety organism for construction. Clean-room **Rust** rebuild of the V1/V3 four-agent adversarial pipeline, with pgvector memory and Argus MCP integration.

**Built by HayHunt Solutions LLC** — architecture and agents developed with Fable 5.

> **Previous stack:** TypeScript + FastAPI V3 lives on branch [`legacy-v3-typescript`](https://github.com/HeyBatlle1/Safety-Compv3/tree/legacy-v3-typescript) and in `legacy/typescript-v3/`. See [docs/MIGRATION_FROM_V3.md](docs/MIGRATION_FROM_V3.md).

Read [SOUL.md](SOUL.md) and [MISSIONSTATEMENT.md](MISSIONSTATEMENT.md) first — they are the spec for prompts and code invariants.

---

## Architecture

```
                       ┌─────────────────────────────────────────┐
 field / Procore ───▶  │  scd (axum)                              │
 Argus (MCP) ───────▶  │  sc-mcp (stdio JSON-RPC)                 │
                       └───────────────┬─────────────────────────┘
                                       ▼
                       ┌─────────────────────────────────────────┐
                       │ 0. MEMORY RECALL  (learning::recall)     │  ◀── pgvector
                       │ 1. VALIDATOR      LLM  temp 0.3          │
                       │ 2. RISK ASSESSOR  LLM  temp 0.7          │  ◀── BLS/OSHA baselines
                       │ 3. PREDICTOR      LLM  temp 1.0          │
                       │ 4. SYNTHESIZER    deterministic Rust     │
                       │ 5. REMEMBER       (learning::remember)   │  ──▶ pgvector
                       └─────────────────────────────────────────┘
```

**Invariants (enforced in code):**

- Agent 4 is never an LLM — verdicts are arithmetic over agent outputs.
- Prediction confidence is capped by validation quality score.
- Probability is per-worker, per-shift, clamped to [1e-5, 0.05]; the
  field-facing number is a 0–100 risk score, and the raw probability stays in
  the audit trail. (Absolute calibration is a ranking today, validated as the
  incident ground-truth loop closes — see MISSIONSTATEMENT.md.)
- Failed `remember()` never destroys a report (logged as error).

---

## Quick start

```bash
cp .env.example .env        # fill in DATABASE_URL + OPENROUTER_API_KEY — never commit .env
cargo run --bin scd -- --migrate   # apply schema + seed BLS baselines (idempotent)
cargo run --bin scd         # HTTP API on :8787
cargo run --bin sc-mcp      # MCP stdio server (register in Argus)
```

`--migrate` applies every pending file in `migrations/` in order, tracked in a
`_sc_migrations` ledger, each inside a transaction — safe to re-run, and it
never leaves a half-applied schema. Point it at a **fresh** Supabase project the
first time. Running the server without a `DATABASE_URL` is allowed: it runs
stateless (analyses work but aren't remembered) and says so loudly.

### Smoke test

```bash
curl -s localhost:8787/v1/analyze -H 'content-type: application/json' -d '{
  "checklist": {
    "id": "00000000-0000-0000-0000-000000000001",
    "responses": {
      "Work description": "Roofing tear-off, 3-story commercial",
      "Fall protection": "harnesses",
      "Emergency plan": "N/A",
      "Hazards identified": "falls, weather",
      "PPE": "hard hats"
    },
    "work_type": "roofing",
    "naics_code": "238160",
    "submitted_at": "2026-06-12T11:00:00Z"
  },
  "weather": { "temperature_f": 88, "wind_speed_mph": 28, "conditions": "gusty" }
}' | jq .
```

---

## Deployment

`docker compose up -d` — scd behind Caddy with automatic TLS. Or deploy the Dockerfile to Railway/Cloud Run (skip Caddy; platform terminates TLS).

---

## MCP tools (Argus)

| Tool | Purpose |
|------|---------|
| `sc_analyze` | Full pipeline on a checklist |
| `sc_recall_patterns` | Query organism memory for project/trade |
| `sc_health` | Liveness + model map |

---

## Status — approaching beta

**Working:** five-stage agent pipeline (validate → assess → predict → synthesize →
remember) with deterministic logit calibration and a two-track verdict (residual
risk moves STOP/CAUTION/GO, inherent risk sets the floor); pgvector learning loop;
EAP compiler (OSHA 1926.35, construction); drawing viewer + vision analysis; people layer
(employee/admin/safety-director); MWF wellbeing check-ins; PIN auth (Argon2 + HMAC
sessions); MCP bridge; field-legible UI that leads with the 0–100 risk score.

**Models:** provider-agnostic via OpenRouter (per-role chains in env); no single
vendor is load-bearing.

**Honest about calibration:** the risk score is an auditable, BLS-anchored ranking
today. Its absolute per-shift probability is exposed only in the audit trail and is
*not* yet a validated probability — that comes as the incident ground-truth loop
(Brier / log-loss) closes. The system says which is which; see MISSIONSTATEMENT.md.

**Before production / during beta:** Supabase RLS on all `sc_` tables; NER scrub on
free-text exports; anonymized-derivative contract clause; close the calibration loop
with incident ground truth; hazard-specific priors (partition all-cause TRIR by
cause) and structured-fact extraction ahead of the scorer.

---

## Docs

| Doc | Contents |
|-----|----------|
| [MIGRATION_FROM_V3.md](docs/MIGRATION_FROM_V3.md) | V3 → V4 path |
| [SOUL.md](SOUL.md) | Agent ethics and constraints |
| [MISSIONSTATEMENT.md](MISSIONSTATEMENT.md) | Product mission |

---

## Security

- Never commit `.env` — use `.env.example` only.
- `SC_SESSION_KEY` must be a dedicated random secret (not derived from API keys).
- Legacy demo `X-Person-Id` header is scaffolding — use PIN login in v4.4+.

MIT License — HayHunt Solutions LLC.