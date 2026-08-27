# MISSION

**Predict the incident. Prevent the incident. Then prove it — as the ground-truth loop closes.**

---

## Why this exists

Construction kills about a thousand workers a year in the United States, and
the "Focus Four" — falls, struck-by, caught-between, electrocution — account
for the majority. Nearly all of them were preceded by visible leading
indicators: a skipped inspection, a vague checklist answer, a hazard flagged
and re-flagged and never fixed, weather nobody re-planned for.

The industry's standard tools are reactive. A JHA gets filled out, filed, and
forgotten. The data that could have predicted Thursday's fall was sitting in
Monday's paperwork, unread.

Safety Companion reads it. All of it. Every time. And remembers.

## What it does

1. **Validates** every field submission against OSHA 1926 and trade-specific
   requirements before trusting it. Bad data is rejected, not analyzed.
2. **Quantifies** the top hazards on every task as an auditable 0–100 risk
   score, anchored to real BLS/OSHA injury-rate baselines and a transparent
   factor trail — a consistent, defensible ranking, not vibes. (The underlying
   per-shift probability is exposed in the audit trail; its absolute
   calibration tightens as the incident feedback loop accumulates ground
   truth — see operating principles.)
3. **Predicts** the most credible incident scenarios for today's conditions,
   with the leading indicators a foreman can check in the next half hour.
4. **Learns** from every analysis and every reported incident or near-miss.
   Recurring hazards, climbing risk trends, and semantic echoes of past
   high-risk situations surface as pattern alerts — the pinch points and
   bottlenecks, caught while they're still forming.

## Who it serves

The crew first. Then the superintendent, the safety director, and the small
contractor who can't afford a full-time safety department — and eventually
the insurance market, because a contractor who can show a falling predicted-
incident curve and a closed feedback loop is a contractor whose premiums
should fall. Safety that pays for itself gets adopted. Safety that gets
adopted saves lives. That ordering is the strategy.

## Operating principles

- **Model-agnostic by architecture.** No single vendor is load-bearing. The
  pipeline speaks to a provider trait; models are configuration.
- **Deterministic where it counts.** Synthesis, scoring clamps, confidence
  ceilings, and pattern classification are code, not prompts. Auditable,
  reproducible, boring.
- **The loop must close.** Predictions without incident ground-truth are
  astrology. The incident/near-miss report path is a first-class citizen, and
  scoring predicted risk against reported outcomes (Brier / log-loss) is the
  next milestone that turns the weights from informed judgment into measured
  calibration. Until it closes, the risk score is an honest ranking, not a
  validated probability — and the system says so.
- **Honest confidence.** Output confidence is structurally capped by input
  quality. The system is incapable of being surer than its data.
- **Interoperate, don't silo.** REST for the field, webhooks for Procore,
  MCP for Argus and whatever comes after.

## Definition of success

A measurable, attributable reduction in recordable incidents on subscribed
projects, strong enough to stand up in front of an insurance underwriter.

Everything else is implementation detail.
