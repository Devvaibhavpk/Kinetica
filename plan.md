# Project Kinetica — Execution Plan

**Course:** BCSE497J — Project I, Fall Semester 2026-2027
**Team:** 23BDS1148, 23BDS1168 (Mithil Girish)
**Source documents:** `Project_Kinetica_Proposal.pdf`, `BCSE497J_Project_I_Guidelines_01.pdf`

This plan is written to be executed by an agentic AI coding workflow (Claude Code / equivalent), one phase at a time. Each phase ends in a **verifiable artifact** — a script, a dataset, a metric, a document section — so an agent (or a reviewer) can check "done" without ambiguity. Phases map directly onto the four modules from the proposal (Vision → Actuation → Preemption → Predictive Validation) and are sequenced to land *before* each SCOPE review deadline with margin, not on the deadline itself.

---

## 0. Review Calendar (hard external deadlines — do not move)

| Review | Focus | Marks | Date | Plan phase that must be DONE by then |
|---|---|---|---|---|
| Review 1 (Guide) | Title, abstract, problem, objectives, scope, preliminary plan | 5 | 9–11 Jul 2026 | Phase 0 + this plan.md itself |
| Review 2 (Panel) | Domain/problem, literature review, methodology, design | 20 | 19 Aug 2026 | Phase 1 + Phase 2 (design only, no code required) |
| Review 3 (Panel) | Implementation progress (~50% scope), interim results | 20 | 16 Sep 2026 | Phase 2 (working) + Phase 3 in progress |
| Review 4 (Guide) | Complete implementation, final results, report verification | 25 | 12–16 Oct 2026 | Phase 3 + Phase 4 + Phase 5 (near-final report) |
| Draft/Report Review (Guide) | Cumulative draft, technical consistency, citations | 5 | 12–16 Oct 2026 | Phase 6 (report chapters 1–4 complete) |
| Review 5 (Panel) | Final technical evaluation, demo, report, viva | 25 | 21 Oct 2026 | Phase 6 (all chapters) + Phase 7 (demo-ready) |

> Note: Review 1's date (9–11 Jul 2026) has already passed relative to when this plan is being written (30 Jul 2026). Flag this to the guide in the first meeting — either Review 1 was conducted informally already, or the cohort's actual schedule has shifted from this template. Do not silently assume; confirm and correct the table above before treating any downstream date as fixed.

---

## Phase 0 — Foundations & Repo Scaffolding
*Target: complete now, before any module work starts.*

### 0.1 Repository & agent-workflow setup
- Initialize monorepo: `kinetica/{vision,actuation,preemption,analytics,report,data,scripts}`
- `README.md` with one-paragraph project summary (lift from proposal abstract, don't re-derive)
- `.env.example`, dependency manifests per module (Python `requirements.txt` for vision/analytics; separate if actuation/preemption end up in a different runtime)
- Decide and record **language/runtime per module** now, since the proposal doesn't fix this:
  - Vision: Python (YOLO-family detector, OpenCV)
  - Actuation + Preemption (max-heap, graph): Python for prototyping; consider Rust/Go rewrite in Phase 5 only if latency numbers demand it — do not optimize prematurely
  - Predictive Analytics: Python (scikit-learn / statsmodels)
- `AGENTS.md` (or `CLAUDE.md`) at repo root: one page telling any agentic tool "these are the four modules, this is the interface contract between them, here's where the review deliverables live" — this is the actual harness that makes phases 1–4 machine-executable rather than just aspirational headings.

### 0.2 Interface contracts (write before any module implementation)
Define the data contract between modules as a schema file (`schemas/lane_state.json` or Pydantic models), agreed once, referenced everywhere:
- `LaneObservation`: `{lane_id, timestamp, vehicle_count, queue_length_m, density_veh_per_m, class_counts: {standard, two_wheeler, ambulance, police, school_van}}`
- `PriorityEvent`: `{lane_id, class, detected_at, confidence}`
- `PhaseDecision`: `{intersection_id, active_lane_id, phase_start, phase_end, reason: "scheduled"|"extended"|"preempted"}`

This is the single highest-leverage artifact in the whole plan: every module below reads/writes only these shapes, so Vision, Actuation, and Preemption can be built and tested independently (and by parallel agent sessions) without waiting on each other.

### 0.3 Success criteria file
`success_criteria.md` — copy the four rows from Proposal §2 (Design Objectives) verbatim as testable assertions:
- [ ] Green phase duration is a function of measured queue length (not a constant)
- [ ] A detected priority-class vehicle changes phase ordering ahead of FIFO/queue-length ordering
- [ ] A priority vehicle's projected path causes >1 downstream intersection to pre-clear
- [ ] A t-test or Mann-Whitney U test on paired wait-time samples rejects H0 at α = 0.05

**Deliverable:** repo skeleton, schema file, `success_criteria.md`. This is what an agent checks against at the end of every later phase.

---

## Phase 1 — Domain Research & Literature Review
*Target: complete before Review 2 (19 Aug 2026). This IS a graded rubric line item (Review 2, criterion 2: "Literature/patent review and analysis of existing approaches" — 3 marks).*

### 1.1 Source triage
Organize the five links already gathered into `report/references.bib` (or a plain `references.md` first, converted to BibTeX later):
1. ScienceDirect article (S240589632032629X) — likely computer-vision/ITS survey angle
2. IET Intelligent Transport Systems (10.1049/itr2.12518) — peer-reviewed ITS methodology, strongest citation-weight source
3. IEEE Xplore 11380918 — needs institutional/library access to pull full text; **action item: use VIT's IEEE Xplore subscription (library portal), not open web**
4. IEEE Xplore 11490570 — same access note as above
5. IJSREM open-access paper on AI-based emergency vehicle prioritization via deep learning — directly adjacent to Module 1+3 of this project; freely accessible, pull this one first

### 1.2 Gap analysis table (this is what "literature review" actually means for the rubric, not just a list of citations)
For each source, record in `report/lit_review_matrix.md`:
| Source | Sensing method | Priority mechanism | Statistical validation | Gap vs. Kinetica |
|---|---|---|---|---|
| (fill per paper) | | | | |

The "Gap vs. Kinetica" column is the part that actually earns marks — it's the argument for why this project is not a re-implementation of an existing paper. Two likely gaps to verify against the sources once read: (a) most emergency-preemption ITS work does single-intersection override, not the graph-based multi-intersection green-wave corridor in Proposal §5.3; (b) most either skip formal hypothesis testing or use only mean-comparison without checking normality (Proposal §6.2 explicitly branches to Mann-Whitney when normality fails — this is a genuine methodological improvement worth calling out).

### 1.3 Dataset feasibility check
Proposal doesn't name a dataset. Before Phase 2 starts, resolve:
- Is there access to real traffic camera footage (VIT campus, city traffic authority, or a public ITS dataset e.g. UA-DETRAC, custom-collected)?
- If no real footage: define a synthetic-video or synthetic-event-stream fallback now (Phase 2.1 below already assumes this fallback exists) so Phase 2 is never blocked waiting on data access approval.

**Deliverable:** `references.bib`, `lit_review_matrix.md` (Chapter 2 draft), dataset decision recorded in `data/DATASET_SOURCE.md`.

---

## Phase 2 — Module 1: Vision System
*Target: working prototype before Review 3 (16 Sep 2026); design-only version due at Review 2.*

### 2.1 Data ingestion
- If real camera feed available: RTSP/video-file ingestion via OpenCV
- If not: build a synthetic event generator that emits `LaneObservation`-shaped records from a scripted scenario (staged queue buildup + a scripted ambulance entry) — **this unblocks Phases 3 and 4 even if real footage access is delayed**, and should be built regardless of dataset outcome, since it's also the test harness for Phase 2.4

### 2.2 Object detection
- Baseline: pretrained YOLO-family model (YOLOv8n or similar, per proposal's "convolutional object-detection framework") run on frame samples
- No custom training required for Review 2/3 if a pretrained COCO-class model's `car`/`truck`/`bus`/`motorcycle` classes are sufficient for the baseline "standard vehicle vs. two-wheeler" split

### 2.3 Queue & density estimation (Proposal §3.2)
- Homography/perspective projection from bounding-box coordinates to lane-relative distance (calibrate once per camera angle, store as `calibration/<camera_id>.json`)
- Output: `density_veh_per_m` and `queue_length_m` per lane per frame batch

### 2.4 Vehicle classification (Proposal §3.3, Table 1)
- Fine-tune or fine-grain-classify to at least separate: standard / two-wheeler / ambulance / police / school van
- Ambulance/police in particular need a labeled subset — this is the one sub-phase most likely to need real data or a curated image set specifically for these rare classes, since pretrained COCO models don't distinguish "ambulance" from "van" out of the box
- Unit test: feed 5 synthetic frames with a known ambulance present, assert classifier output produces a `PriorityEvent` with `class="ambulance"`

**Deliverable:** `vision/` module producing a stream of `LaneObservation` + `PriorityEvent` records conforming to Phase 0's schema. Interim results (frame samples, confusion matrix on the classification head) go straight into Chapter 4 draft.

---

## Phase 3 — Module 2: Actuation Engine
*Target: working before Review 3; fully integrated by Review 4.*

### 3.1 Poisson/exponential arrival modeling (Proposal §4.1)
- Rolling estimator for λ (mean arrival rate) per lane, updated from `LaneObservation` stream, e.g. exponentially-weighted moving average over a sliding window
- Validate the Poisson assumption itself, don't just assume it: run a goodness-of-fit check (chi-square or dispersion test) on real/synthetic inter-arrival times before committing to it in the report — if arrivals turn out overdispersed, note this as a limitation in Chapter 5 rather than silently reporting a Poisson fit that doesn't hold
- Unit test: feed a synthetic Poisson-process arrival stream with known λ, assert estimator converges within tolerance

### 3.2 Dynamic green extension & early cutoff (Proposal §4.2)
- Given current queue estimate + saturation flow rate assumption, compute minimum discharge time
- Re-sample every cycle; terminate phase the moment queue clears
- This is the first module that emits a real `PhaseDecision` — test against the success criterion "green phase duration is a function of queue length" directly (Phase 0.3, criterion 1)

### 3.3 Saturation flow rate calibration
- Proposal assumes this is "observed" — decide now whether it's a fixed literature-standard value (common ITS default: ~1800–2000 veh/hr/lane) used as a placeholder, or estimated from the vision stream's own departure counts. Recommend: start with literature default for Review 2/3 design defensibility, replace with observed estimate in Phase 5 refinement, and say so explicitly in the report rather than presenting the placeholder as measured.

**Deliverable:** `actuation/` module. Interim demo: given a scripted queue-buildup scenario, show phase duration scaling with queue length (this is the Review 3 "interim results" artifact).

---

## Phase 4 — Module 3: Green Wave Preemption
*Target: working before Review 3/4; this is the most conceptually distinct module, budget real design time.*

### 4.1 Max-heap priority queue (Proposal §5.1)
- Standard binary max-heap keyed by `priority_score = f(wait_time, queue_density)`
- Aging mechanism: score must grow monotonically with wait time alone (no starvation) — write this as an explicit invariant test: a lane with zero density but arbitrarily long wait time eventually reaches heap root
- Complexity assertions in the proposal (O(log n) update, O(1) peek) should be backed by an actual benchmark, not just cited — add a `benchmarks/heap_perf.py` that times insert/update over n = 4, 8, 16 lanes and reports actual measured complexity growth. This becomes a real Chapter 4 result instead of a repeated textbook claim.

### 4.2 Emergency override (Proposal §5.2)
- On `PriorityEvent` with class ∈ {ambulance, police}: multiply that lane's score by coefficient µ, force heap-root placement on next update
- School van: elevated multiplier, escalating to critical multiplier near school zones (needs a school-zone flag per intersection in the data model — add this to `schemas/lane_state.json` if not already present from Phase 0)
- Test: inject a priority event mid-simulation with an already-large competing queue elsewhere, assert override still wins root placement within one update cycle (bounded-latency claim from the proposal)

### 4.3 Directed graph corridor routing (Proposal §5.3)
- Represent intersection grid as `networkx.DiGraph` (or hand-rolled adjacency list if avoiding the dependency) — vertices = intersections, edges = road segments weighted by expected travel time
- Path projection: given a detected priority vehicle's heading + position, project most probable downstream path
  - Simplest defensible version for a course project: nearest-neighbor heading-based greedy path, NOT full historical-route ML — reserve historical-pattern learning as a stated "future work" item (Chapter 5) rather than a Phase 4 deliverable, to avoid scope creep past what a single semester supports
- Pre-issue green timing along the projected path timed to estimated arrival (reuse Phase 3's phase-decision mechanism, called externally by this module rather than duplicated)
- Test: 3-intersection linear corridor, inject one ambulance at node 0, assert nodes 1 and 2 both receive a `PhaseDecision` with `reason="preempted"` before the vehicle's estimated arrival time at each

**Deliverable:** `preemption/` module satisfying success criteria 2 and 3 from Phase 0.3. This is the module most likely to impress a panel — budget a live/recorded demo of the 3-intersection corridor scenario specifically for Review 4/5.

---

## Phase 5 — Module 4: Predictive Validation & Analytics
*Target: results in place before Review 4 (final results are a rubric line item at 25 marks).*

### 5.1 Regression-tree bottleneck forecasting (Proposal §6.1)
- Train on logged `LaneObservation` + `PhaseDecision` history (from Phases 2–4's own simulation runs — this module consumes the others' output logs, so it cannot start meaningfully until at least a synthetic end-to-end run exists)
- Target variable: downstream delay on non-served approaches after a preemption event
- Keep model simple and interpretable (decision tree / shallow ensemble) — the rubric rewards "appropriateness of methods" over sophistication, and a regression tree's feature importances make a much better report figure than a black-box model

### 5.2 Hypothesis test: Kinetica vs. fixed-timer baseline (Proposal §6.2)
- **Build the fixed-timer baseline controller first** — this doesn't exist yet in any phase above and is required to have a comparison arm at all. Add as Phase 5.2a: a trivial fixed-cycle controller reading the same `LaneObservation` stream but ignoring it, cycling phases on a static schedule.
- Run both controllers on identical traffic samples (same synthetic scenario replayed twice, or same recorded video processed twice)
- Collect independent wait-time samples per approach
- Test normality (Shapiro-Wilk) → branch to two-sample t-test if normal, Mann-Whitney U if not, exactly as the proposal specifies
- Report the actual p-value and effect size, not just "H0 rejected" — a panel reviewer checking Chapter 4 will want to see the numbers, and "significant at α=0.05" without a reported statistic reads as unverified

**Deliverable:** `analytics/` module, `results/hypothesis_test_output.json`, comparison plots (wait-time distributions, before/after). This satisfies success criterion 4 and is the single most important Chapter 4 exhibit.

---

## Phase 6 — Report Writing (Chapters 1–5, per SCOPE structure)
*Progressive, chapter-by-chapter, per guideline §2: "prepared progressively... guide shall verify the near-final report during Review 4."*

Map directly to the guideline's required structure (do not deviate from this table — it's the literal grading rubric):

| Chapter | Content | Fed by | Target completion |
|---|---|---|---|
| Preliminary pages | Title, certificate, declaration, abstract, TOC | Phase 0 | Before Review 2 |
| Ch. 1 — Introduction | Background, problem statement, objectives, scope, expected outcomes | Proposal §1–2 directly | Before Review 2 |
| Ch. 2 — Literature/Patent Review | Source matrix + gap analysis | Phase 1 | Before Review 2 |
| Ch. 3 — Methodology/System Design | Architecture, module descriptions, algorithms, tools/datasets | Phase 0 (schema) + Proposal §3–6 + Phase 2–5 design decisions | Before Review 2, refined through Review 3 |
| Ch. 4 — Implementation & Results | Implementation details, testing, results, comparison/analysis, limitations | Phases 2–5 outputs directly (benchmarks, confusion matrices, hypothesis test results) | Draft by Review 3, complete by Review 4 |
| Ch. 5 — Conclusion & Future Work | Summary, findings, limitations, future enhancements | Everything above + explicitly the deferred items (historical-route ML from 4.3, saturation-rate estimation from 3.3) | Before Draft/Report Review |
| References | BibTeX from Phase 1 | Phase 1.1 | Ongoing |
| Appendices | Screenshots, test cases, contribution statement | All phases | Before Review 5 |

**Individual contribution statement:** guideline §2 requires every student to submit an individual final report highlighting their own contribution — assign module ownership explicitly now (e.g., one member owns Vision + Analytics, the other owns Actuation + Preemption) so this isn't a scramble at Review 4.

**Similarity/citation compliance:** Draft/Report Review rubric explicitly grades "citations, referencing and similarity compliance" (1 mark) — run the near-final draft through VIT's plagiarism-check tool before Review 4, not after.

---

## Phase 7 — Integration, Demo & Final Panel Prep
*Target: Review 5, 21 Oct 2026.*

### 7.1 End-to-end integration test
- Single script/notebook that runs Vision → Actuation → Preemption → Analytics in sequence on one scenario, producing all four success-criteria assertions as pass/fail output
- This is the actual "demonstration" artifact for Review 5's rubric line "presentation, demonstration, viva voce"

### 7.2 Research publication / IP submission (Review 4 rubric line, 2 marks — "no marks without documentary proof")
- If pursuing this: submission needs to happen with enough lead time to have a proof-of-submission (acknowledgement email, portal receipt) in hand *before* Review 4, not after — flag this early since it has its own external timeline independent of the phases above. Given the IJSREM paper found in Phase 1 is CC-BY and actively soliciting submissions, that journal (or a similar open venue) is a plausible low-friction target if the team wants to pursue this line item.

### 7.3 Viva prep
- Rehearse the four success criteria as the spine of the viva narrative: perception → statistical modeling → priority-aware actuation → provable improvement. This is literally the proposal's own closing paragraph (§8) restated as a demo script.

---

## Agent-Workflow Execution Notes

For running this plan through an agentic coding tool phase-by-phase:
- Treat `success_criteria.md` (Phase 0.3) as the test suite the agent checks against after every phase — don't let an agent mark a phase "done" without running the relevant assertion.
- Treat the schema file (Phase 0.2) as a contract an agent should never modify silently — a schema change is a cross-cutting decision that needs to be flagged, not made unilaterally mid-implementation of one module.
- Phases 2, 3, and 4 (Vision, Actuation, Preemption) are independently buildable in parallel once Phase 0 is done, since they only share the schema, not each other's code — if running multiple agent sessions, this is the natural split point.
- Phase 5 is a hard dependency on having *some* end-to-end run of Phases 2–4 (even the synthetic fallback), so don't start it until at least one full scenario replay exists.
- Chapter drafts in Phase 6 should be generated *from* each phase's actual output artifacts (benchmark numbers, test results, confusion matrices) rather than written speculatively ahead of the implementation — this avoids the exact failure mode the guideline warns against in §2: "implementation, results, presentation and report shall reflect the actual work carried out."
