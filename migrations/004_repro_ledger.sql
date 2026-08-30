-- Reproducibility ledger — content-addressed, tamper-evident record of every
-- analysis. Two jobs in one table:
--
--   1. REPRODUCIBILITY: keyed by input_hash (SHA-256 of the exact scored input +
--      model IDs + engine version). Identical input -> lookup hit -> the SAME
--      stored output is returned, so the system cannot give two different verdicts
--      for the same paperwork. This is the forensic promise made true.
--
--   2. TAMPER-EVIDENCE: each row chains to the previous via prev_entry_hash, and
--      entry_hash = SHA-256 of the row's own fields + prev_entry_hash (the Argus
--      argus-audit Merkle-chain pattern). Any silent alteration of a historical
--      row invalidates every entry_hash after it — so the ledger can prove "this
--      analysis was produced on this date and has not been changed since." This is
--      the tamper-evident evidence chain a court (and the whole agent-provenance
--      industry) actually asks for.
--
-- Append-only by discipline: the code never UPDATEs or DELETEs these rows.
create table if not exists sc_repro_ledger (
    id                bigserial primary key,
    -- content address of the exact scored input (canonical, deterministic)
    input_hash        text        not null,
    -- SHA-256 of the serialized output report (what was produced for this input)
    output_hash       text        not null,
    -- the analysis this entry corresponds to (the full report lives in sc_analyses)
    analysis_id       uuid        not null,
    -- provenance pinned INTO the hash so a model/engine change is a different input
    model_ids         text        not null,   -- e.g. "validator=…;risk=…;…"
    engine_version    text        not null,
    -- the full report, stored so a lookup can return it without re-running the pipeline
    report            jsonb       not null,
    -- tamper-evident chain (argus-audit pattern)
    prev_entry_hash   text        not null,   -- SHA-256 of previous entry_hash, or SHA-256("GENESIS")
    entry_hash        text        not null unique,
    created_at        timestamptz not null default now()
);

-- The reproducibility lookup: "have we scored this exact input before?" — fast,
-- newest-first so a re-run returns the most recent identical-input result.
create index if not exists idx_repro_input_hash
    on sc_repro_ledger (input_hash, created_at desc);
