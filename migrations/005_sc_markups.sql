-- Drawing markups — per-author annotation layers on a shop drawing/blueprint.
--
-- GAP FOUND (Sonnet, 2026-09-11, punch-list Tier 1 item 2): `src/api/drawings.rs`
-- has been reading/writing `sc_markups` since the drawing-viewer feature shipped,
-- but no CREATE TABLE for it ever landed in migrations/ — it exists only as
-- whatever got created ad hoc against the live Supabase project. That breaks the
-- project's own stated invariant ("every schema change is a committed .sql in
-- migrations/ — source of truth") and means a fresh environment (new deploy,
-- disaster recovery, a second Supabase project) would 500 on first markup save.
-- This migration is `create table if not exists`, so on the live DB (which
-- already has the table) it is a safe no-op; it only does real work on a fresh
-- database. Non-destructive by construction.
--
-- Shape matches the queries in drawings.rs exactly:
--   select author, shapes, updated_at from sc_markups where drawing=$1 ...
--   insert into sc_markups (id, drawing, author, shapes, updated_at) ...
--     on conflict (drawing, author) do update set shapes=$4, updated_at=now()
-- The `on conflict (drawing, author)` clause requires a unique constraint on
-- exactly that pair — each author owns one layer per drawing, upserted in place.
create table if not exists sc_markups (
    id          uuid        primary key,
    -- filename/key of the drawing this markup layer belongs to (see drawings.rs
    -- safe_name() — no path separators, no traversal, validated at the API edge)
    drawing     text        not null,
    -- who drew this layer; each author's marks live in their own row/layer so
    -- nobody silently overwrites anyone else's annotations
    author      text        not null,
    -- the markup shapes (leader lines, hazard flags, callouts) as opaque JSON —
    -- the viewer's client-side shape format, not interpreted server-side
    shapes      jsonb       not null,
    updated_at  timestamptz not null default now(),
    constraint sc_markups_drawing_author_key unique (drawing, author)
);

-- Load a drawing's full markup set (every author's layer), newest-updated last —
-- matches the "order by updated_at" in get_markups().
create index if not exists idx_markups_drawing
    on sc_markups (drawing, updated_at);
