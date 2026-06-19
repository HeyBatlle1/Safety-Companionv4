# Migration: Safety Companion V3 → V4 (Rust)

The **TypeScript + FastAPI** stack (Next.js 15 frontend, Python backend) is preserved on branch `legacy-v3-typescript` and in `legacy/typescript-v3/`.

**V4** is a clean-room Rust rebuild (`scd` + `sc-mcp`) built by HayHunt Solutions with Fable 5. Same four-agent adversarial pipeline philosophy; Agent 4 remains deterministic Rust, not an LLM.

## What moved

| V3 | V4 |
|----|-----|
| `frontend/` + `backend/` | `src/` — axum HTTP API + embedded UI |
| Clerk auth | PIN + Argon2 + HMAC session tokens (v4.4) |
| Gemini 2.5 via Python | OpenRouter — nex-n2-pro + Gemma 4 (configurable per role) |
| Netlify/Vercel split | Docker + Caddy, or Railway/Cloud Run |

## Fresh database

Apply `migrations/001_init.sql` to a **new** Supabase project or dedicated schema. Do not point V4 at the legacy V3 production database.

## Run V4

```bash
cp .env.example .env   # OpenRouter + Supabase — never commit .env
cargo run --bin scd    # :8787
cargo run --bin sc-mcp # MCP stdio for Argus
```

## MCP bridge (Argus)

Register `sc-mcp` in `~/.argus/mcp.json`. Tools: `sc_analyze`, `sc_recall_patterns`, `sc_health`.

## Honest gates before production

See README **Honest status** section: full RLS, NER scrub on outbound text, contract clause for anonymized derivatives.