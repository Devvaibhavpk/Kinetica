# AGENTS.md — Project Kinetica

**Read this file first, before opening `plan.md`, `build-spec.md`, `design.md`, or any code.**
This is the operating manual for any agentic coding session working on this repo — it tells you what the project is, what the four other documents are for, what you own vs. must not touch, and the rules that hold across every phase. It supersedes the abbreviated "Phase 0.2 AGENTS.md" note in `build-spec.md`; that note is now folded into this file in full.

---

## 1. What this project is (one paragraph)

Project Kinetica is a BCSE497J Project I deliverable (VIT Chennai, Fall 2026-2027, reg. nos. 23BDS1148 / 23BDS1168): a closed-loop cyber-physical system replacing fixed-timer traffic intersections with a perception-driven, statistically-modeled, priority-aware controller. It has four modules — **Vision** (object detection → queue/density/classification), **Actuation** (Poisson-modeled arrival rates → demand-responsive green phases), **Preemption** (max-heap local priority + directed-graph corridor routing for ambulance/police/school-van override), and **Analytics** (regression-tree bottleneck forecasting + a formal hypothesis test proving Kinetica beats a fixed-timer baseline). The whole system exists to make four specific claims true and *measured*, not asserted — see `success_criteria.md`.

## 2. The document set — what each file is for

| File | Purpose | When you read it |
|---|---|---|
| `AGENTS.md` (this file) | Operating rules, ownership, cross-cutting constraints | First, every session |
| `plan.md` | The phase/sub-phase roadmap, mapped to the review calendar | Before starting any new phase — confirms sequencing and deadlines |
| `build-spec.md` | Exact file paths, function signatures, and test code per phase | While implementing — this is the literal spec, not a suggestion |
| `design.md` | Frontend visual system (colors, type, motion, components) | Only when building `frontend/` — irrelevant to backend/module work |
| `success_criteria.md` | The four testable assertions (SC1–SC4) | After finishing any phase, before marking it done |

**Rule:** `plan.md` sets the *sequence and deadlines*, `build-spec.md` sets the *literal implementation*. If they ever conflict on a detail, `build-spec.md` wins for code-level decisions (exact function names, file paths, test assertions); `plan.md` wins for phase ordering and what's in-scope-vs-deferred. Flag the conflict in your session output rather than silently picking one — these two files should not disagree, and a disagreement means one of them needs a human edit.

## 3. Module ownership table (who produces / consumes what)

| Module | Path | Produces | Consumes |
|---|---|---|---|
| Schema | `schemas/lane_state.py` | `LaneObservation`, `PriorityEvent`, `PhaseDecision` | — (foundation, nothing upstream) |
| Vision | `vision/` | `LaneObservation`, `PriorityEvent` | raw frames / synthetic frames |
| Actuation | `actuation/` | `PhaseDecision` (reason: scheduled/extended) | `LaneObservation` |
| Preemption | `preemption/` | `PhaseDecision` (reason: preempted) | `LaneObservation`, `PriorityEvent` |
| Analytics | `analytics/` | hypothesis-test results, bottleneck forecasts | `LaneObservation` + `PhaseDecision` logs from a full run |
| Frontend | `frontend/` | nothing — read-only observability layer | all of the above, via `results/*.json` and live schema objects |

**The hard rule:** no module may invent its own shape for data another module consumes. If Vision needs to hand something to Actuation, it MUST be a `LaneObservation` or `PriorityEvent` as defined in `schemas/lane_state.py` — never a module-local dict, dataclass, or ad-hoc JSON shape that happens to look similar.

## 4. Schema immutability rule

`schemas/lane_state.py` is the single most cross-cutting file in the repo. Every module — including the frontend — depends on its exact field names and types.

- **No agent session may modify this file** without: (a) updating the ownership table above, and (b) stating the change explicitly and prominently in that session's summary output — never as a silent side-effect buried in an unrelated commit.
- A schema change is a cross-cutting decision, not a local implementation detail. Treat it the way you'd treat changing a public API contract: assume something downstream breaks until proven otherwise.
- If a new field seems needed mid-implementation (e.g., the school-zone flag needed by `preemption/override.py`), check first whether `plan.md`/`build-spec.md` already anticipated it (it does, for that specific case — `is_school_zone` is already in the schema). Only add a genuinely new field if neither document anticipated it, and flag the addition per the rule above.

## 5. Frontend is observability-only

The `frontend/` module (per `design.md`'s Kinetica Control Room spec) is a **read-only dashboard**, not a second engineering project. It must never:
- reimplement heap logic, graph routing, arrival-rate estimation, or hypothesis testing in JS/TS — it only renders what the backend already computed
- invent metrics that don't map to a real field in `LaneObservation` / `PhaseDecision` / `PriorityEvent` or a `results/*.json` file
- proceed with a screen that has no real data source yet — if a `results/*.json` file a screen depends on doesn't exist, stub that screen's data panel with a clearly-marked "awaiting Phase N output" state rather than fabricating placeholder numbers that look real

This mirrors the same rule Phase 6 of `build-spec.md` applies to report chapters: don't write content that outruns the artifact it's supposed to represent.

## 6. Success-criteria discipline

`success_criteria.md` holds four checkboxes (SC1–SC4), each pointing at one real pytest test ID. The rule, unconditionally:

- A checkbox flips from `[ ]` to `[x]` **only** by actually running that exact test ID and observing PASS.
- Never mark a phase "done" in any summary, commit message, or status update without having run its corresponding test(s) in that same session.
- If a test doesn't exist yet for a criterion you believe you've satisfied, write the test first — build-spec.md gives you the literal test code for SC1–SC4; do not invent a weaker version of one of these four tests to make it easier to pass.

## 7. Placeholder / assumption discipline

Several values in this system are deliberately literature-defaults or MVP simplifications, not measured facts. An agent must never let one of these silently graduate into "measured" language in a report chapter, commit message, or dashboard label:

| Placeholder | Where | Correct framing |
|---|---|---|
| `DEFAULT_SATURATION_FLOW_RATE = 1900` veh/hr/lane | `actuation/engine.py` | "literature default (1800–2000 veh/hr/lane range)," not "measured" — Phase 5 refinement replaces it with an observed value |
| Greedy heading-based path projection | `preemption/graph_router.py` | explicitly NOT historical-route ML — that's deferred to Chapter 5 future work, do not implement it now |
| Poisson arrival assumption | `actuation/arrival_model.py` | must be validated via `goodness_of_fit_check()` before being cited as holding — if it doesn't hold, report that as a limitation, don't suppress it |
| Rule-based / heuristic ambulance-police classifier (if no labeled subset exists) | `vision/classify.py` | document which approach was actually used in the docstring — never ship a heuristic stub silently labeled as a trained classifier |

General principle: **if a number or claim didn't come from an actual test run, benchmark, or measured pipeline output, it doesn't get reported as one.** This applies equally to code comments, report chapters, and dashboard copy.

## 8. Dependency ordering (what can run in parallel vs. what can't)

- **Phase 0 (schema + scaffolding) blocks everything.** Nothing else starts until it's done.
- **Vision, Actuation, and Preemption (Phases 2–4) are parallelizable** once Phase 0 is done — they only share the schema, not each other's internals. If running multiple agent sessions concurrently, this is the natural split point.
- **Analytics (Phase 5) hard-depends on at least one full synthetic end-to-end run existing** (`data.synthetic_generator.generate_scenario(...)` piped through Vision → Actuation/baseline → Preemption). Do not start Analytics work — including drafting its report chapter — before that run exists, even if the module's code skeleton can be written in isolation.
- **Frontend can start once `schemas/lane_state.py` exists**, since it only needs the contract, not finished backend logic — but any screen depending on a specific `results/*.json` file still waits on that file's producing phase, per Rule 5 above.
- **Report chapters (Phase 6) are generated FROM artifacts, never ahead of them.** A chapter section with no backing `results/*.json` gets a `<!-- BLOCKED: awaiting results/X.json from Phase N -->` marker, not speculative prose.

## 9. Dataset / real-data status

Check `data/DATASET_SOURCE.md` at the start of any Vision-related work. If it still shows `STATUS: PENDING`, the synthetic generator (`data/synthetic_generator.py`) is the only valid data source — do not block on real footage access, and do not silently substitute a different placeholder scenario than the two named ones (`queue_buildup`, `corridor_ambulance`) referenced across `build-spec.md`.

## 10. Review-calendar awareness

Before starting work in any session, check the current date against the review table in `plan.md`. One known issue already flagged there: the Review 1 date (9–11 Jul 2026) predates when this plan was written — if that hasn't been confirmed/corrected with the guide yet, treat every downstream deadline in that table as provisional and say so, rather than optimizing a sprint plan around a date that might be wrong.

## 11. What "done" means, project-wide

A phase is done when:
1. Its exit-gate condition in `build-spec.md` is met and demonstrably tested (not just implemented).
2. Any `success_criteria.md` row it touches is genuinely flipped per Rule 6.
3. No schema change was made without following Rule 4, or one was made and it's explicitly flagged.
4. No placeholder value was reported as measured, per Rule 7.
5. If it feeds a report chapter, that chapter's corresponding section is either written from real output or explicitly marked blocked — never speculative.

If any of these five aren't true, the phase is not done — regardless of how much code exists.
