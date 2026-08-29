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

**THE KEYSTONE (why this module is the whole company, worked out 2026-08-29):**
Fatal construction incidents live in the **cross-trade SEAMS** — where one trade's work
becomes another trade's unexamined assumption, across trades and across years, with no one
seeing the whole. Ground-truth example (the WHY): a sealer put a ladder on the far side of
a 3-story retention wall and leaned across to reach a hard spot; the masonry (laid years
prior) + the rigging shoring the riggers never properly did + his load gave way and crushed
him. Four trades, three timeframes, nobody saw the 360. **No model predicts that event —
the data was never assembled in one place. But:**
- **The DRAWING is the room the trades were never in together.** Space is the one thing all
  trades share — their work all lands on the same sheet even when they never overlap in
  time. Layer-decomposition + spatial coincidence = the seams *rendered visible* at specific
  coordinates. Where the masonry layer + rigging layer + sealer's task-point stack up on the
  sheet = the seam.
- **ELEVATION is the severity multiplier** that separates deadly seams from trivial ones.
  Same cross-trade overlap = a coordination note at grade, a fatality at EL 30ft against a
  load-bearing wall under load. The elevation data carries exactly what the flat JHA lacks.
- **Output is NOT prediction — it's forced witnessing:** "N trades depend on this point, at
  this height, against this structural element — verify before load, eyes required." Makes
  the un-owned handoff owned. Guardian move: not "catch everything," but "make the seam
  impossible to miss."
- **EMERGENT SUPERPOWER (trade-agnostic AND cross-trade-protective, same property):** both
  fall out of ONE decision — read the DRAWING, not the trade-scoped form. The drawing
  doesn't respect trade boundaries, so a system reading it is *structurally incapable* of the
  single-trade silo blindness that kills people. Analyzing one trade's seam *necessarily*
  inspects the other side of it → the glazier's JHA catches the ironworker's un-torqued
  connection FOR FREE, without meaning to, because you can't assess the load point without
  seeing what it rests on. Strategic fallout: one product sells to every trade (not per-trade
  SKUs); single-jobsite NETWORK EFFECT (safer the more trades on the same job — each trade's
  analysis independently witnesses every other's seams; coverage compounds → GC's incentive
  is "get everyone on it"); it's a GC/liability instrument (the GC is the only party currently
  forced to assemble the 4-trade picture by hand and holds the bag when a seam kills someone;
  SC does that assembly automatically from the Procore drawings they already have — Procore
  integration + this = the same play). This is the category-maker: "good JHA tool"
  (trade-siloed, like every competitor) vs "the system that assembles the cross-trade,
  multi-elevation picture no single human on the site can hold."

**VISION ARCHITECTURE (finalized 2026-08-29, verified against live specs — pin exact model
IDs at build time, do NOT trust these strings from memory, vision capability moves fast):**
Separation of labor BY THE TYPE OF ERROR EACH STAGE PREVENTS:
- **PERCEPTION MESH (redundancy vs unrecoverable MISSES):** 3-4 vision models doing the SAME
  seeing in parallel, cross-checked — agree=signal, diverge=flag for human. Because a
  perception miss (nobody saw the wall) is unrecoverable — no downstream floor can score what
  was never perceived. Grok = heavy-lifter here (verified: grok image-understanding has an
  explicit `detail:"high"` mode built for "technical diagrams / dense document scans," 20MiB
  images, multi-image-per-request comparison; Grok 4.20 Beta has documented improved vision +
  multi-agent architecture). Gemini = independent second perceiver (Nano-Banana structural
  sense, different lineage → different failure modes). Real-world PHOTOS (mud, glare, angles)
  are the messiest/highest-stakes input → want the MOST eyes there.
- **DETERMINISTIC ENGINE = the blind honest floor** (scores extracted structured data, never
  sees the image, no reputation).
- **FINAL COLD VISION AUDITOR (redundancy vs the assembled answer DRIFTING from ground truth):**
  ONE vision model that did NOT participate in perception, looking at [original drawing] +
  [final analysis] together: "what in this analysis is phantom (not on the sheet)? what seam
  on the sheet did it miss?" Closes the loop that's otherwise open (output is never checked
  back against the drawing). Grok is a strong auditor pick specifically for its documented
  LOW-HALLUCINATION trait (Grok 4.1 = 65% lower hallucination vs Grok 4) — the auditor's whole
  job is "don't confirm a match that isn't there." A cold single checker beats a committee
  here (want fresh judgment vs the source, not more voices sharing the mesh's blind spots).

**WHY GROK IN VISION, WHY ANTHROPIC ON FINALITY (the trust architecture):**
- Grok's read isn't fanboying — it's reading the *training intent*: a founder shaping a model
  toward truth/math/engineering yields a model good at reading engineering artifacts (drawings).
  Durable predictor (intent shapes every release; specs change per release). BUT the same
  "confident engineering answer-machine" trait = confident WRONGNESS, and on a drawing a
  confident miss is fatal. So Grok is a SCOPED heavy-lifter, NEVER solo — the mesh manufactures
  the uncertainty a confident model won't volunteer. Strength and danger are the same trait →
  harness one, cage the other.
- **Finality rests with Anthropic/Claude** — earned through 2.5yr of repeated observation that
  Claude-in-a-mesh produces answers that hold under scrutiny. CAVEAT (Bradlee's own method
  applied honestly): finality-rests-with-Anthropic must stay CHECKED by the same mesh that
  checks everything — the day it stops earning it, the rule updates. Keep Claude on the same
  leash as Grok. Unexamined trust in a liked model = same failure as trusting a confident
  model's unchecked output, just pointed somewhere friendlier.

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
