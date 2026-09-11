-- GC Profiles — BUILD 2 (enterprise-profiles board, ~/Desktop/SC_ENTERPRISE_BOARD.md).
--
-- A profile is presentation-layer only: a GC's name, which of the two known
-- real document layouts to print into, and a standard PPE line they expect
-- listed. Creating or editing a profile changes nothing about how a job is
-- analyzed — same SafetyReport, different table it gets printed into.
--
-- Logo is NOT a column here. It's customer-uploaded binary data (the GC's
-- own approved header asset — never SC-sourced or fabricated), stored on
-- disk under SC_LOGOS_DIR/{id}.{ext}, mirroring how drawings.rs already
-- stores blueprints. The API checks the filesystem for a match rather than
-- tracking a boolean/path column that could drift from what's actually there.
create table if not exists sc_gc_profiles (
    id           uuid        primary key,
    gc_name      text        not null,
    layout       text        not null check (layout in ('three_col', 'numbered_row')),
    default_ppe  text,
    created_at   timestamptz not null default now()
);
create index if not exists idx_gc_profiles_name on sc_gc_profiles (gc_name);
