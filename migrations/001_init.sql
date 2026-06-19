-- Safety Companion v4 — clean-room schema
-- Target: fresh Supabase project (or dedicated schema). NOT the legacy project.
-- The legacy project (analysis_history, argus_* memory tables) is a read-only
-- historical record and is never touched by this system.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table if not exists sc_industry_baselines (
    id              bigint generated always as identity primary key,
    naics_code      text not null,
    industry_name   text not null,
    year            int not null,
    injury_rate_per_100 double precision not null,
    total_cases     bigint,
    data_source     text not null default 'BLS',
    raw             jsonb,
    created_at      timestamptz not null default now(),
    unique (naics_code, year, data_source)
);
create index if not exists idx_baselines_naics on sc_industry_baselines (naics_code, year desc);

-- ---------------------------------------------------------------------------
-- Organizational spine (kept minimal; auth handled by Supabase auth/RLS later)
-- ---------------------------------------------------------------------------
create table if not exists sc_companies (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    naics_code  text,
    created_at  timestamptz not null default now()
);

create table if not exists sc_projects (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references sc_companies(id),
    name        text not null,
    address     text,
    -- Procore linkage
    external_system text,
    external_id     text,
    active      boolean not null default true,
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Submissions and analyses — the heartbeat
-- ---------------------------------------------------------------------------
create table if not exists sc_checklists (
    id           uuid primary key,
    project_id   uuid references sc_projects(id),
    company_id   uuid references sc_companies(id),
    work_type    text not null,
    naics_code   text not null,
    responses    jsonb not null,
    submitted_by uuid,
    submitted_at timestamptz not null default now(),
    external_ref jsonb
);
create index if not exists idx_checklists_project on sc_checklists (project_id, submitted_at desc);

create table if not exists sc_analyses (
    id              uuid primary key,
    checklist_id    uuid not null,
    project_id      uuid,
    company_id      uuid,
    work_type       text not null,
    naics_code      text not null,
    verdict         text not null,
    overall_risk_score    double precision not null,
    quality_score   int not null,
    prediction_confidence double precision not null,
    report          jsonb not null,          -- the full SafetyReport
    embedding       vector(384),             -- combined checklist+hazard embedding
    created_at      timestamptz not null default now()
);
create index if not exists idx_analyses_project on sc_analyses (project_id, created_at desc);
create index if not exists idx_analyses_worktype on sc_analyses (work_type, created_at desc);
-- ivfflat needs rows before it helps; fine to create now, rebuild after seed.
create index if not exists idx_analyses_embedding on sc_analyses
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- One row per quantified hazard — the unit of pattern detection.
create table if not exists sc_hazard_events (
    id                  uuid primary key,
    analysis_id         uuid not null references sc_analyses(id) on delete cascade,
    project_id          uuid,
    work_type           text not null,
    description         text not null,
    incident_type_hint  text not null,       -- focus-four bucket: fall|struck-by|caught-between|electrocution|other
    probability         double precision not null,
    severity            text not null,
    risk_score          double precision not null,
    embedding           vector(384),
    created_at          timestamptz not null default now()
);
create index if not exists idx_hazards_project_type on sc_hazard_events (project_id, incident_type_hint, created_at desc);

-- ---------------------------------------------------------------------------
-- The organism's voice — alerts it raises on its own
-- ---------------------------------------------------------------------------
create table if not exists sc_pattern_alerts (
    id              uuid primary key default gen_random_uuid(),
    project_id      uuid,
    pattern_kind    text not null,           -- recurring_hazard | risk_trend | semantic_echo | control_decay
    description     text not null,
    evidence_count  bigint not null default 0,
    severity        text not null,
    first_seen      timestamptz not null,
    last_seen       timestamptz not null,
    acknowledged_by uuid,
    acknowledged_at timestamptz,
    created_at      timestamptz not null default now()
);
create index if not exists idx_alerts_open on sc_pattern_alerts (project_id, created_at desc)
    where acknowledged_at is null;

-- Ground truth: actual incidents/near-misses reported back. This is how the
-- organism learns whether its predictions were right. Without this table the
-- loop never closes.
create table if not exists sc_incident_reports (
    id              uuid primary key default gen_random_uuid(),
    project_id      uuid,
    incident_type   text not null,
    severity        text not null,
    near_miss       boolean not null default false,
    description     text not null,
    occurred_at     timestamptz not null,
    -- Was there an analysis that should have caught this? Link it for scoring.
    related_analysis_id uuid references sc_analyses(id),
    embedding       vector(384),
    created_at      timestamptz not null default now()
);
create index if not exists idx_incidents_project on sc_incident_reports (project_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Audit — every pipeline run, every model call outcome, append-only
-- ---------------------------------------------------------------------------
create table if not exists sc_audit_log (
    id          bigint generated always as identity primary key,
    event_type  text not null,
    subject_id  uuid,
    detail      jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper: cosine recall of similar analyses (used by dashboards/Argus)
-- ---------------------------------------------------------------------------
create or replace function sc_similar_analyses(query_embedding vector(384), match_count int default 5)
returns table (id uuid, similarity double precision, verdict text, overall_risk_score double precision, created_at timestamptz)
language sql stable as $$
    select a.id,
           1 - (a.embedding <=> query_embedding) as similarity,
           a.verdict,
           a.overall_risk_score,
           a.created_at
    from sc_analyses a
    where a.embedding is not null
    order by a.embedding <=> query_embedding
    limit match_count;
$$;
