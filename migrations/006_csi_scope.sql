-- CSI MasterFormat scope — BUILD 4 (enterprise-profiles board, Tab 1 of 2).
-- Source: 5 real vendor JHAs/SSSPs (AGM, Mortenson, Eli Lilly, Purdue, IU
-- Health) off a Shiel Sexton Procore Zoom, 2026-09-10. Filed at
-- ~/Desktop/SC_ENTERPRISE_BOARD.md.
--
-- Purpose: the CSI scope is entered ONCE per job at setup (not per-JHA) and
-- makes every JHA/report on that job cross-referenceable to procurement by
-- CSI code — legible to the whole project org (estimating, PM, acquisitions),
-- not just the safety guy. Presentation/organizational data only — does not
-- touch the hazard-analysis pipeline, scoring, or verdict logic.

-- Reference codes. `division` lets a picker group by CSI MasterFormat
-- division as more trades' codes get added past the current glazier/
-- curtainwall vertical. `trade_hint` is a loose grouping label, not enforced
-- anywhere in code.
create table if not exists sc_csi_codes (
    code        text primary key,   -- e.g. "08 44 13", MasterFormat's own spacing
    division    text not null,      -- e.g. "08" (Openings)
    description text not null,
    trade_hint  text,
    created_at  timestamptz not null default now()
);
create index if not exists idx_csi_codes_division on sc_csi_codes (division);

insert into sc_csi_codes (code, division, description, trade_hint) values
    ('05 73 00', '05', 'Metal Glass Railings', 'glazing'),
    ('05 73 10', '05', 'Smoke Baffle (Draft Curtain) System', 'glazing'),
    ('07 21 00', '07', 'Thermal Insulation (Partial)', 'glazing'),
    ('07 92 00', '07', 'Joint Sealants', 'glazing'),
    ('08 34 00', '08', 'Interior Sliding Doors', 'glazing'),
    ('08 41 13', '08', 'Aluminum Storefront Framing', 'glazing'),
    ('08 41 26', '08', 'All-Glass Entrances and Storefronts', 'glazing'),
    ('08 42 43', '08', 'ICU/CCU Entrances', 'glazing'),
    ('08 44 13', '08', 'Glazed Aluminum Curtainwalls', 'glazing'),
    ('08 56 53', '08', 'Security Windows', 'glazing'),
    ('08 71 00', '08', 'Door Hardware (Partial)', 'glazing'),
    ('08 80 00', '08', 'Exterior Glazing', 'glazing'),
    ('08 80 01', '08', 'Interior Glazing', 'glazing'),
    ('08 87 00', '08', 'Interior Glazing Surface Films', 'glazing'),
    ('08 88 10', '08', 'Fire Protection Rated Glass', 'glazing'),
    ('08 88 13', '08', 'Fire Resistant-Rated Glazing & Framing', 'glazing')
on conflict (code) do nothing;

-- Per-job scope: sc_projects already exists (001_init) but the frontend has
-- never surfaced a project concept at all — every JHA today goes in with
-- project_id = null even though sc_checklists/sc_analyses have carried the
-- column since day one. This is additive: existing rows get '{}' (no scope
-- set), nothing is backfilled or guessed.
alter table sc_projects add column if not exists csi_codes text[] not null default '{}';
