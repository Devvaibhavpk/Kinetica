# AGENTS.md — Project Kinetica

**Read this file first, before opening `docs/plan.md`, `docs/build-spec.md`, `docs/design.md`, or any code.**
This is the operating manual for any agentic coding session working on this repo — it tells you what the project is, what the architectural documents are for, what you own vs. must not touch, and the rules that hold across every phase.

---

## 1. What this project is (one paragraph)

Project Kinetica is an autonomous closed-loop cyber-physical system replacing fixed-timer traffic intersections with a perception-driven, statistically-modeled, priority-aware controller. It has four core backend modules — **Vision** (object detection → queue/density/classification), **Actuation** (Poisson-modeled arrival rates → demand-responsive green phases), **Preemption** (max-heap local priority + directed-graph corridor routing for ambulance/police/school-van override), and **Analytics** (regression-tree bottleneck forecasting + a formal hypothesis test proving Kinetica beats a fixed-timer baseline). The whole system exists to make four specific claims true and *measured*, not asserted — see `docs/success_criteria.md`.

## 2. The document set — what each file is for

| File | Purpose | When you read it |
|---|---|---|
| `AGENTS.md` (this file) | Operating rules, ownership, cross-cutting constraints | First, every session |
| `docs/plan.md` | Architectural phase roadmap | Before starting any new phase — confirms sequencing |
| `docs/build-spec.md` | Exact file paths, function signatures, and test code per phase | While implementing — this is the literal spec, not a suggestion |
| `docs/design.md` | Frontend visual system (colors, type, motion, components) | Only when building `frontend/` — irrelevant to backend/module work |
| `docs/success_criteria.md` | The four testable assertions (SC1–SC4) | After finishing any phase, before marking it done |

**Rule:** `docs/plan.md` sets the *sequence*, `docs/build-spec.md` sets the *literal implementation*. If they ever conflict on a detail, `docs/build-spec.md` wins for code-level decisions (exact function names, file paths, test assertions). Flag the conflict in your session output rather than silently picking one.

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

## 5. Frontend is observability-only

The `frontend/` module (per `design.md`'s Kinetica Control Room spec) is a **read-only dashboard**, not a second engineering project. It must never:
- reimplement heap logic, graph routing, arrival-rate estimation, or hypothesis testing in JS/TS — it only renders what the backend already computed
- invent metrics that don't map to a real field in `LaneObservation` / `PhaseDecision` / `PriorityEvent` or a `results/*.json` file
- proceed with a screen that has no real data source yet — if a `results/*.json` file a screen depends on doesn't exist, stub that screen's data panel with a clearly-marked "awaiting Phase N output" state rather than fabricating placeholder numbers that look real

## 6. Success-criteria discipline

`success_criteria.md` holds four checkboxes (SC1–SC4), each pointing at one real pytest test ID. The rule, unconditionally:

- A checkbox flips from `[ ]` to `[x]` **only** by actually running that exact test ID and observing PASS.
- Never mark a phase "done" in any summary, commit message, or status update without having run its corresponding test(s) in that same session.
- If a test doesn't exist yet for a criterion you believe you've satisfied, write the test first — build-spec.md gives you the literal test code for SC1–SC4.

## 7. Placeholder / assumption discipline

Several values in this system are deliberately literature-defaults or baseline models, not measured facts:

| Placeholder | Where | Correct framing |
|---|---|---|
| `DEFAULT_SATURATION_FLOW_RATE = 1900` veh/hr/lane | `actuation/engine.py` | "literature default (1800–2000 veh/hr/lane range)," not "measured" |
| Greedy heading-based path projection | `preemption/graph_router.py` | explicitly heading-based heuristic corridor projection |
| Poisson arrival assumption | `actuation/arrival_model.py` | must be validated via `goodness_of_fit_check()` before being cited as holding |
| Rule-based / heuristic ambulance-police classifier | `vision/classify.py` | documented MoRTH AIS-125 livery decomposition heuristic |

General principle: **if a number or claim didn't come from an actual test run, benchmark, or measured pipeline output, it doesn't get reported as one.**

## 8. Dependency ordering (what can run in parallel vs. what can't)

- **Phase 0 (schema + scaffolding) blocks everything.** Nothing else starts until it's done.
- **Vision, Actuation, and Preemption (Phases 2–4) are parallelizable** once Phase 0 is done — they only share the schema, not each other's internals.
- **Analytics (Phase 5) hard-depends on at least one full synthetic end-to-end run existing** (`data.synthetic_generator.generate_scenario(...)` piped through Vision → Actuation/baseline → Preemption).
- **Frontend can start once `schemas/lane_state.py` exists**, since it only needs the contract, not finished backend logic.

## 9. Dataset / real-data status

Check `data/DATASET_SOURCE.md` at the start of any Vision-related work. If it shows synthetic mode, the synthetic generator (`data/synthetic_generator.py`) is the valid data source for end-to-end testing across the two named scenarios (`queue_buildup`, `corridor_ambulance`).

## 10. What "done" means, project-wide

A phase is done when:
1. Its exit-gate condition in `build-spec.md` is met and demonstrably tested (not just implemented).
2. Any `success_criteria.md` row it touches is genuinely flipped per Rule 6.
3. No schema change was made without following Rule 4, or one was made and it's explicitly flagged.
4. No placeholder value was reported as measured, per Rule 7.

If any of these aren't true, the phase is not done — regardless of how much code exists.
