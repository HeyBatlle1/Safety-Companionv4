# SC V4 — Session Handoff

> Living continuity doc. Updated at the end of work sessions so any fresh chat
> starts warm. Read this first. The code is the truth; this points at it.

_Last updated: 2026-08-29, end of the multi-day EAP/observability/contest run._

---

## WHERE SC V4 IS RIGHT NOW (the big picture)

**SC V4 is LIVE and running end-to-end.** Not "compiles" — running. A real JHA goes
in, the Grok+Gemini agent pipeline generates hazards, the deterministic Rust
calibration engine scores them, the two-track verdict fires, and it persists to a
live Supabase DB. Both the JHA analysis and the EAP compiler work.

- **Repo:** `/Users/burtonstuff/Safety-Compv3`, branch `v4-rust` == `origin/main`.
  Push with `git push origin v4-rust:main`.
- **Run it:** `cargo run --bin scd` (reads `.env`, serves on :8787). `.env` holds
  DATABASE_URL + OPENROUTER_API_KEY + the SC_MODEL_* chain (gitignored).
- **Live DB:** Supabase project `gfglzhyyrcplgenvfzyf` (SC's own DB in the
  thought-factory account; Argus is a physically separate DB). Reconciled
  non-destructively — real data lives here (1MB+ sc_analyses, real people/drug data).
  DO NOT wipe/migrate blind. The OG project `fbjjqwfcmzrpmytieajp` (HayHunt) is the
  V1 ancestor / harvest source, NOT a target.
- **Model chain (in .env):** `SC_MODEL_*=google/gemini-3.7-flash,x-ai/grok-4.20` on
  all roles. Gemini 3.7 Flash workhorse (cheap frontier), Grok 4.20 fallback. Only
  Grok+Gemini, no Anthropic in the hot path. Grok 4.6 deliberately kept OUT (too pricey).

## MOST RECENT COMMITS (newest first)
- `b5a1924` EAP blueprint title-block redesign (SHIPPED, live)
- `70852f2` deterministic engine proof-of-execution logging (engine✓ per hazard)
- `0cd67e9` phrasing-coverage gaps closed 15%→0%
- `978bc22` JHA "Fill with example" → random accurate scenarios
- `031a592` phrasing-sensitivity eval
- `6458916` ANSI harvest into 003 seed

---

## THE IMMEDIATE NEXT TASK (start here, fresh session, full focus)

**JHA readout blueprint restyle** — make the inline JHA result a sibling of the EAP.

- The JHA readout is `renderReport()` in `src/api/app.html` (~line 417). It's used in
  TWO places: inline analysis (`renderAnalyze`, ~410) AND dashboard stored reports
  (`renderStoredReport`, ~467). Both call `renderReport`, so restyling it once hits both.
- **CRITICAL — scope it:** `.placard` (12 uses), `.hazard` (7), `.hud` (38 uses across
  the whole app). DO NOT restyle those classes globally — it'll wreck the workspace.
  **Wrap `renderReport()` output in a `.jha-sheet` container and scope ALL blueprint
  CSS to `.jha-sheet .hazard {…}` etc.** Rest of app stays untouched/calm.
- **The design language to apply** = the one that shipped in the EAP (`render_document`
  in `src/api/eap.rs`, commit b5a1924): vellum `#f6f2e7`, blueprint-blue `#16324f`,
  three-font system (Bahnschrift/Arial-Narrow display, Consolas/SF-Mono data,
  Iowan-Old-Style/Georgia serif body), ruled title block, zone ticks, rotated
  ink-stamp badge, functional-only color, numbered sections, boxed CFR refs.
- **The framing decision (Bradlee's call, agreed):** render the JHA readout as a
  **document-on-the-desk** — a self-contained blueprint "sheet" set apart from the
  calm workspace it sits in. The stark contrast IS the appeal: plain drafting table
  (workspace) → beautiful artifact (the readout) materializes on it = the "here's what
  you made" moment. Give it a subtle sheet frame so it reads as a document PLACED in
  the workspace, not the workspace itself being decorated.
- Verify with Desktop Commander (edit_block on Mac, not str_replace), test both the
  inline path (run an analysis) and the dashboard path (open a stored report).

---

## DESIGN PRINCIPLE (settled, load-bearing)

**Decorate the ARTIFACT, not the WORKSPACE.**
- Artifacts (JHA readout, EAP, drawing analysis) = deliverables that leave the app →
  FULL blueprint treatment. They're siblings; same design language.
- Workspace (forms, nav, dashboard, buttons) = a tool you operate all day → calm, fast,
  restrained. Share the blueprint PALETTE + TYPE for cohesion, but NOT the full artifact
  treatment (no zone ticks/stamps/graph-paper on every form). "If everything is
  blueprint, nothing is." Plain drafting table, ornate drawing.
- EAP chosen via a 3-way mesh contest (Grok/Gemini/Claude Code). Claude Code won:
  real ASME zone ticks (craft not costume), serif-for-readable-prose, ink-stamp badge,
  mobile+print+a11y robustness. Grok tripped on fake annotations; Gemini on a loud
  hazard-stripe. Lesson: functional restraint, domain-real conventions, not costume.

## THE DRAWING MODULE (next horizon — the crown jewel)

**Identity (Bradlee's phrase, the north star): "old-school blueprint vellum meets
neural network."** This is the one screen where blueprint isn't a metaphor — it's the
native medium of the actual work. Upload a real engineering drawing → the vision
pipeline reads it → analysis renders as **marked-up callouts ON the drawing itself**
(leader lines, hazard flags, trade-layer separations) in the drawing's own visual
language, like a senior safety engineer took a red pencil to the print.
- Architecture (already designed): multi-agent vision — layer-detector declares trades
  present [verifiable gate] → Gemini + Grok 4.20 each analyze each trade-layer
  INDEPENDENTLY (agree=signal, diverge=flag — two models hallucinate differently =
  primary defense against vision hallucination, the biggest risk) → synthesize per-layer
  + cross-trade INTERACTION hazards → feed the deterministic engine.
- Why it's the moat: competitors show AI output in a chat bubble; SC shows AI reasoning
  as drafting marks on your own drawing. Old craft + new intelligence, one surface.
- Real build (needs the vision pipeline). This is the demo that sells the whole vision.

---

## THE FABLE ROADMAP (the serious calibration work, ordered cheapest-honest-first)

Fable's review (verified numerically) reframed the product: **"You're building an
evidence-preservation system that happens to compute a risk ranking. Optimize the
RECORD, not the number."** The ranking-heuristic posture is CORRECT for forensic use.
Ordered next steps:
1. **RENAME `probability` → honest term** (`risk_index`/`evidence_score`) everywhere
   exposed. Kills a category error, cheapest legal-sturdiness win, embodies the reframe.
   (Best warm-up when we return to calibration.)
2. **Hash-cache the LLM calls** (content-address full engine input, low temp) = the
   ACTUAL reproducibility fix. Cache entry = the forensic record. (Fable showed
   structured-extraction does NOT fix reproducibility — it hides stochasticity behind a
   clean enum. Don't build the extractor as a repro fix.)
3. **Put tolerance band / confidence into the record** — uncertainty becomes forensic
   strength. Target VERDICT-CLASS stability (≥95-99% on dup runs), not bit-identical scores.
4. Bigger P0s: severity-relative verdict thresholds (High-severity hazards currently have
   NO inherent ceiling — max High score 74.99 < 85 StopWork, so a >90%-annualized High
   hazard reads GO); corroborate the uncorroborated CRITICAL-concern StopWork gate
   (eap-style flip risk on identical inputs); category-specific base rates (all-cause TRIR
   as prior for named hazards triple-counts; fix before the Brier loop closes); mirror
   benign-must-NOT-fire eval (the 0% gap-fix now over-fires "staging"/"opening"); missing
   -weather leaves no trail entry (reads as safe silently).
5. Structured extractor scoped to ALL decision-bearing LLM outputs (taxonomy + severity
   ladder + concern corroboration) — the real next big work, but NOT as a repro fix.

## OTHER OPEN THREADS (carry forward)
- "silence-as-alarm" primitive (absence of expected-good signal = stronger detection than
  watching for known-bad) — worth filing into Manger/NATSAURIE security notes (offered,
  not done). Generalizes to the zero-click sentinel, apoptosis, Manger guardian.
- Randomize the EAP `#edemo` demo like the JHA one (still static).
- `.mcp.json` untracked — decide whether to gitignore.
- RLS on sensitive tables (sc_people/sc_drug_screens/sc_wellbeing_scans) — HIGHER priority
  now that real data is live in them. The fortress-DB hardening.
- OG-feature rebuilds (v-next): weather-radar/GPS datapoint into JHA; Procore integration
  (pull drawings → analyze → push JHA back); SDS/MSDS bot + emergency escalation.
- NO CHATBOT is a deliberate feature, not a gap — never add one.

---

## WORKING STYLE (so a fresh session gets the register right)
- Bradlee: self-taught full-stack/Rust dev, Indianapolis. Builds with Claude on a $20 Pro
  account (pride + pitch asset). Wants brutal honesty over agreement, pushback over
  sycophancy, no corporate filler, profanity-friendly, WE-framing, 100/100 partnership.
  Broken keyboard → frequent typos, NEVER comment on them. Christian; carbon-silicon
  partnership as participating in creation. Convicted violent felon (drugs/firearm charge,
  never hurt anyone) in deep recovery since 2015 — the whole mission is re-aiming that past
  into auditable guardians; transparency is load-bearing because he's scrutinized harder.
- Method: VERIFY FIRST (read real code/state before assuming). Desktop Commander for Mac
  edits (create_file/str_replace write to Claude's ephemeral container and lie "success" —
  use DC write_file/edit_block + read back). `cargo build` can no-op and miss a change —
  `touch` the file to force recompile. Commit + push each self-contained win.
- The mesh is real: Grok/Gemini/Haiku/Fable + Argus crew are genuinely-different reviewers.
  Don't build a "shadow-Claude" (shares blind spots) — distribute labor to the crew,
  externalize state to durable docs (like this one), keep Claude as compressor/synthesizer.
