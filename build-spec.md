# Project Kinetica — Build Specification

**For: AI coding agent execution**
**Companion to:** `plan.md` (phase sequencing + review calendar), `AGENTS.md` (operating rules — read that file first), `design.md` (frontend visual system)
**Contract:** every phase below must produce the exact file paths, function signatures, and test assertions listed. Do not deviate from a listed path/name without flagging it — other phases import from these exact locations.

---

## 0. Repo Layout (create this exact tree before anything else)

```
kinetica/
├── AGENTS.md
├── README.md
├── success_criteria.md
├── schemas/
│   └── lane_state.py
├── vision/
│   ├── __init__.py
│   ├── ingest.py
│   ├── detect.py
│   ├── project.py
│   ├── classify.py
│   └── tests/
├── actuation/
│   ├── __init__.py
│   ├── arrival_model.py
│   ├── engine.py
│   ├── baseline_fixed_timer.py
│   └── tests/
├── preemption/
│   ├── __init__.py
│   ├── heap.py
│   ├── override.py
│   ├── graph_router.py
│   └── tests/
├── analytics/
│   ├── __init__.py
│   ├── bottleneck_model.py
│   ├── hypothesis_test.py
│   └── tests/
├── benchmarks/
│   └── heap_perf.py
├── data/
│   ├── DATASET_SOURCE.md
│   ├── synthetic_generator.py
│   └── calibration/
├── frontend/
│   ├── (Kinetica Control Room — see design.md; observability-only, see AGENTS.md §5)
├── results/
├── report/
│   ├── references.bib
│   └── lit_review_matrix.md
└── run_end_to_end.py
```

---

## Phase 0 — Foundations & Contracts

### 0.1 `schemas/lane_state.py`
Implement as Pydantic v2 models. These are the ONLY objects that cross module boundaries — no module may invent its own shape for data another module consumes.

```python
from pydantic import BaseModel
from enum import Enum
from datetime import datetime

class VehicleClass(str, Enum):
    STANDARD = "standard"
    TWO_WHEELER = "two_wheeler"
    AMBULANCE = "ambulance"
    POLICE = "police"
    SCHOOL_VAN = "school_van"

class LaneObservation(BaseModel):
    lane_id: str
    timestamp: datetime
    vehicle_count: int
    queue_length_m: float
    density_veh_per_m: float
    class_counts: dict[VehicleClass, int]
    is_school_zone: bool = False

class PriorityEvent(BaseModel):
    lane_id: str
    vehicle_class: VehicleClass  # must be AMBULANCE, POLICE, or SCHOOL_VAN
    detected_at: datetime
    confidence: float  # 0.0-1.0

class PhaseReason(str, Enum):
    SCHEDULED = "scheduled"
    EXTENDED = "extended"
    PREEMPTED = "preempted"

class PhaseDecision(BaseModel):
    intersection_id: str
    active_lane_id: str
    phase_start: datetime
    phase_end: datetime
    reason: PhaseReason
```

**Test (`schemas/tests/test_schema_roundtrip.py`):** instantiate each model with valid data, serialize to JSON, deserialize, assert equality. This is a smoke test only — run it FIRST, before any other module's tests, in CI.

**Immutability rule (see AGENTS.md §4):** no later phase may modify this file's field names or types without explicitly flagging the change and updating the ownership table in AGENTS.md §3. Adding a field that AGENTS.md/plan.md already anticipated (e.g. `is_school_zone`, already present above) is not a "change" in that sense — it's already part of the contract.

### 0.2 `AGENTS.md`
This file already exists at the repo root (delivered separately, alongside this build-spec). Do not recreate or overwrite it — it is the operating manual this build-spec is a companion to. If this repo scaffold is being generated somewhere `AGENTS.md` is missing, stop and flag it rather than fabricating a replacement; the two documents must match.

### 0.3 `success_criteria.md`
Structure as a literal pytest-collectible checklist, not prose:

```markdown
# Success Criteria — Test IDs

- [ ] SC1: `actuation/tests/test_engine.py::test_green_duration_scales_with_queue`
- [ ] SC2: `preemption/tests/test_heap.py::test_priority_event_forces_root`
- [ ] SC3: `preemption/tests/test_graph_router.py::test_multi_intersection_preclear`
- [ ] SC4: `analytics/tests/test_hypothesis_test.py::test_h0_rejected_at_alpha_05`
```
Each row's checkbox is flipped to `[x]` only by actually running that test ID and observing PASS — never marked done from a status update alone. See AGENTS.md §6 for the full discipline around this file.

### 0.4 `data/DATASET_SOURCE.md`
Two-section file:
1. `## Real footage` — leave blank with `STATUS: PENDING — confirm with user before Phase 2 starts` if no source is confirmed.
2. `## Synthetic fallback` — always implement `data/synthetic_generator.py` regardless of (1)'s status; this is not optional, it is the test harness for every other module.

**`data/synthetic_generator.py` spec:**
```python
def generate_scenario(
    scenario_name: str,
    duration_s: int,
    lanes: list[str],
    ambulance_injection_time_s: int | None = None,
    ambulance_lane: str | None = None,
) -> list[LaneObservation]:
    """Yields a scripted LaneObservation stream: baseline Poisson arrivals
    per lane, with an optional single PriorityEvent injected at a fixed time."""
```
Must support at minimum two named scenarios: `"queue_buildup"` (single lane, monotonically increasing queue) and `"corridor_ambulance"` (3+ lanes across simulated adjacent intersections, ambulance injected mid-run). These two scenario names are referenced by name in Phase 3 and Phase 4 tests below, and by the frontend's scenario-selector control (design.md, Overview page) — do not rename them.

**Exit gate for Phase 0:** repo tree matches §0 exactly, schema roundtrip test passes, `success_criteria.md` exists with all boxes unchecked, `DATASET_SOURCE.md` exists with an explicit status. Do not start Phase 1 or 2 before this gate passes.

---

## Phase 1 — Literature Review (non-code, but produces a code-adjacent artifact)

### 1.1 `report/references.bib`
BibTeX entries for the 5 sources (fill `note` field with access status):
```bibtex
@article{sciencedirect_s240589632032629x, ... note={accessible}}
@article{iet_itr2_12518, ... note={accessible}}
@article{ieee_11380918, ... note={requires institutional access — pull via VIT library portal}}
@article{ieee_11490570, ... note={requires institutional access — pull via VIT library portal}}
@article{ijsrem_ev_prioritization, ... note={open access, CC-BY}}
```

### 1.2 `report/lit_review_matrix.md`
Markdown table, columns: `Source | Sensing method | Priority mechanism | Statistical validation | Gap vs. Kinetica`. One row per source above. This is a manual-research deliverable — an agent should generate the table skeleton with empty cells and a `TODO: fill after reading source` marker, not fabricate contents for papers it hasn't been given full text of.

**Exit gate:** both files exist with correct row/entry count (5 each). Content completeness is NOT gate-checkable by an agent — flag to user for manual fill-in rather than inventing citations' findings.

---

## Phase 2 — Vision System

### 2.1 `vision/ingest.py`
```python
def ingest_source(source: str | int) -> Iterator[np.ndarray]:
    """source: video file path, RTSP URL, or int for synthetic mode (frame count).
    If real footage unavailable (per data/DATASET_SOURCE.md STATUS: PENDING),
    this function MUST fall back to yielding synthetic frames — never raise
    on missing footage, since Phase 3/4 depend on this not blocking."""
```

### 2.2 `vision/detect.py`
```python
def load_detector(model_name: str = "yolov8n") -> Any:
    """Load pretrained YOLO-family model. Do NOT train from scratch."""

def detect_frame(model: Any, frame: np.ndarray) -> list[dict]:
    """Returns list of {bbox: [x1,y1,x2,y2], coco_class: str, confidence: float}"""
```
Use `ultralytics` package, pretrained weights, COCO classes `car/truck/bus/motorcycle` as the baseline standard/two-wheeler split. No custom training required for this sub-phase.

### 2.3 `vision/project.py`
```python
def load_calibration(camera_id: str) -> dict:
    """Loads data/calibration/<camera_id>.json — homography matrix +
    lane boundary polygons. Raise FileNotFoundError with a clear message
    if missing — do not silently return identity transform."""

def project_to_lane_metrics(
    detections: list[dict], calibration: dict
) -> dict[str, tuple[float, float]]:
    """Returns {lane_id: (density_veh_per_m, queue_length_m)}"""
```
**If no calibration file exists yet:** write one synthetic `data/calibration/synthetic_cam.json` with a trivial pixel-to-meter identity scale so the pipeline runs end-to-end even before real calibration is done.

### 2.4 `vision/classify.py`
```python
def classify_priority(detection: dict, frame: np.ndarray) -> VehicleClass:
    """MVP: rule-based on coco_class + a color/shape heuristic for
    ambulance/police (e.g. red-cross or light-bar color signature) OR
    a small fine-tuned head if a labeled subset exists. Document which
    approach was used in a docstring — do not silently ship a heuristic
    stub as if it were a trained classifier (see AGENTS.md §7)."""
```

**Test (`vision/tests/test_classify.py::test_ambulance_detection_on_synthetic_frame`):** feed 5 synthetic frames with a known-injected "ambulance" marker (from `synthetic_generator.py`'s corridor_ambulance scenario), assert `classify_priority` returns `VehicleClass.AMBULANCE` for that detection at least 4/5 times.

**Exit gate:** `vision/` module, given `data.synthetic_generator.generate_scenario("corridor_ambulance", ...)` as input, produces a stream of valid `LaneObservation` + at least one `PriorityEvent` object. Run this as `vision/tests/test_pipeline_smoke.py`.

---

## Phase 3 — Actuation Engine

### 3.1 `actuation/arrival_model.py`
```python
class ArrivalRateEstimator:
    def __init__(self, window_s: int = 60): ...
    def update(self, obs: LaneObservation) -> None: ...
    def lambda_estimate(self, lane_id: str) -> float:
        """EWMA of arrivals/sec over the window."""

def goodness_of_fit_check(inter_arrival_times: list[float]) -> dict:
    """Chi-square or dispersion test against Poisson assumption.
    Returns {'p_value': float, 'poisson_assumption_holds': bool}.
    MUST be called and its result MUST be logged to results/
    before the report cites Poisson modeling as validated — do not
    assume the fit without running this (see AGENTS.md §7)."""
```

### 3.2 `actuation/engine.py`
```python
DEFAULT_SATURATION_FLOW_RATE = 1900  # veh/hr/lane, literature default — see 3.3

def compute_green_extension(
    queue_length_m: float,
    vehicle_length_m: float = 5.0,
    saturation_flow_rate: float = DEFAULT_SATURATION_FLOW_RATE,
) -> float:
    """Returns seconds needed to discharge current queue."""

def next_phase_decision(
    intersection_id: str,
    lane_observations: list[LaneObservation],
    current_time: datetime,
) -> PhaseDecision:
    """Core SC1 entry point: phase duration must be a function of
    queue_length_m, not constant."""
```

**Test (`actuation/tests/test_engine.py::test_green_duration_scales_with_queue`)** — **this IS success criterion SC1, do not write a weaker version:**
```python
def test_green_duration_scales_with_queue():
    obs_short_queue = make_observation(queue_length_m=5.0)
    obs_long_queue = make_observation(queue_length_m=50.0)
    d1 = compute_green_extension(obs_short_queue.queue_length_m)
    d2 = compute_green_extension(obs_long_queue.queue_length_m)
    assert d2 > d1  # monotonic in queue length, not constant
```

### 3.3 Saturation flow rate
Ship `DEFAULT_SATURATION_FLOW_RATE = 1900` as a literature-default placeholder (cite in docstring: standard ITS range 1800–2000 veh/hr/lane). Add a TODO comment: `# Phase 5 refinement: replace with observed value from vision departure-count stream`. Do NOT let the report cite this constant as "measured" — flag it explicitly as an assumed default in Chapter 3/4 text if also drafting report content (see AGENTS.md §7's placeholder table).

### 3.4 `actuation/baseline_fixed_timer.py`
**Build this now, not deferred — Phase 5 hard-depends on it existing.**
```python
def fixed_timer_phase_decision(
    intersection_id: str,
    lane_ids: list[str],
    current_time: datetime,
    cycle_length_s: int = 90,
) -> PhaseDecision:
    """Static round-robin schedule. Ignores lane_observations entirely
    by design — this is the control-group controller for the
    hypothesis test in Phase 5."""
```

**Exit gate:** both `engine.py` and `baseline_fixed_timer.py` importable, SC1 test passes, goodness-of-fit check runs and logs a result to `results/poisson_fit_check.json`.

---

## Phase 4 — Green Wave Preemption

### 4.1 `preemption/heap.py`
```python
class LanePriorityHeap:
    def __init__(self): ...
    def push_or_update(self, lane_id: str, score: float) -> None: ...
    def peek_root(self) -> str: ...  # O(1)
    def compute_score(
        self, wait_time_s: float, density_veh_per_m: float,
        priority_multiplier: float = 1.0,
    ) -> float:
        """MUST grow monotonically in wait_time_s alone, even at
        density=0 — this is the anti-starvation invariant, test it
        explicitly (see below), don't just assert it in a docstring."""
```

**Test (`preemption/tests/test_heap.py::test_aging_prevents_starvation`):**
```python
def test_aging_prevents_starvation():
    heap = LanePriorityHeap()
    # lane_a: zero density, but wait_time grows unboundedly
    for t in range(0, 10000, 100):
        heap.push_or_update("lane_a", heap.compute_score(wait_time_s=t, density_veh_per_m=0))
        heap.push_or_update("lane_b", heap.compute_score(wait_time_s=0, density_veh_per_m=5))
    assert heap.peek_root() == "lane_a"  # eventually wins despite zero density
```

**Test (`preemption/tests/test_heap.py::test_priority_event_forces_root`)** — **this IS SC2:**
```python
def test_priority_event_forces_root():
    heap = LanePriorityHeap()
    heap.push_or_update("lane_busy", heap.compute_score(wait_time_s=500, density_veh_per_m=20))
    ambulance_score = heap.compute_score(wait_time_s=0, density_veh_per_m=0, priority_multiplier=1000.0)
    heap.push_or_update("lane_ambulance", ambulance_score)
    assert heap.peek_root() == "lane_ambulance"  # forced to root despite competing large queue
```

### 4.2 `preemption/override.py`
```python
PRIORITY_MULTIPLIERS = {
    VehicleClass.AMBULANCE: 1000.0,
    VehicleClass.POLICE: 1000.0,
    VehicleClass.SCHOOL_VAN: 50.0,  # elevated
}
SCHOOL_ZONE_ESCALATION = 1000.0  # escalates to critical near school zones

def apply_override(
    event: PriorityEvent, heap: LanePriorityHeap, is_school_zone: bool
) -> None:
    multiplier = PRIORITY_MULTIPLIERS[event.vehicle_class]
    if event.vehicle_class == VehicleClass.SCHOOL_VAN and is_school_zone:
        multiplier = SCHOOL_ZONE_ESCALATION
    # ... push_or_update with computed score
```

### 4.3 `preemption/graph_router.py`
```python
import networkx as nx

def build_city_graph(edges: list[tuple[str, str, float]]) -> nx.DiGraph:
    """edges: (from_intersection, to_intersection, expected_travel_time_s)"""

def project_downstream_path(
    graph: nx.DiGraph, entry_node: str, heading_vector: tuple[float, float],
    max_hops: int = 5,
) -> list[str]:
    """MVP scope: greedy heading-based next-node selection, NOT
    historical-route ML — that is explicitly deferred to Chapter 5
    future work (see AGENTS.md §7). Do not implement route-history
    learning here."""

def preclear_corridor(
    graph: nx.DiGraph, path: list[str], vehicle_entry_time: datetime,
) -> list[PhaseDecision]:
    """For each node in path[1:], compute estimated arrival time from
    cumulative edge weights, emit a PhaseDecision with
    reason=PhaseReason.PREEMPTED timed to that arrival."""
```

**Test (`preemption/tests/test_graph_router.py::test_multi_intersection_preclear`)** — **this IS SC3:**
```python
def test_multi_intersection_preclear():
    graph = build_city_graph([("A", "B", 30.0), ("B", "C", 30.0)])
    path = project_downstream_path(graph, "A", heading_vector=(1, 0))
    decisions = preclear_corridor(graph, path, vehicle_entry_time=NOW)
    assert len(decisions) >= 2  # >1 downstream intersection pre-clears
    assert all(d.reason == PhaseReason.PREEMPTED for d in decisions)
```

### 4.4 `benchmarks/heap_perf.py`
```python
def benchmark_heap_operations(n_lanes_list: list[int] = [4, 8, 16, 32]) -> dict:
    """Times insert/update for each n, writes results/heap_benchmark.json.
    This is a REAL measurement for Chapter 4 — do not report the
    O(log n) claim from the proposal without this actually running.
    The frontend's Benchmarks/System Health page (design.md) renders
    this exact file — do not change its shape without updating that
    page's data-fetch logic too."""
```

**Exit gate:** SC2 and SC3 tests pass, `results/heap_benchmark.json` exists with real timing numbers for at least 4 values of n.

---

## Phase 5 — Predictive Analytics

### 5.1 `analytics/bottleneck_model.py`
```python
def train_bottleneck_model(
    observation_log: list[LaneObservation],
    decision_log: list[PhaseDecision],
) -> Any:
    """Shallow decision tree or small ensemble (scikit-learn).
    Target: downstream delay on non-preempted lanes following a
    PREEMPTED decision. Requires BOTH logs from at least one full
    Phase 2-4 run — do not stub this with synthetic labels that
    don't derive from actual pipeline output (see AGENTS.md §8 on
    dependency ordering: this phase cannot start meaningfully before
    a full end-to-end run exists)."""

def feature_importances(model: Any) -> dict[str, float]:
    """For Chapter 4 figure and the frontend's Analytics & Validation
    page — must reflect the actually-trained model."""
```

### 5.2 `analytics/hypothesis_test.py`
```python
from scipy import stats

def run_comparison(
    kinetica_wait_times: list[float],
    baseline_wait_times: list[float],
    alpha: float = 0.05,
) -> dict:
    """1. Shapiro-Wilk normality test on both samples.
    2. If both normal: two-sample t-test (Welch's, unequal variance
       by default). Else: Mann-Whitney U test.
    3. Return {'test_used': str, 'statistic': float, 'p_value': float,
       'h0_rejected': bool, 'effect_size': float}.
    MUST return the actual p-value and effect size — a report or
    dashboard that says 'H0 rejected' without these numbers is not
    acceptable (see AGENTS.md §7)."""
```

**Test (`analytics/tests/test_hypothesis_test.py::test_h0_rejected_at_alpha_05`)** — **this IS SC4:**
```python
def test_h0_rejected_at_alpha_05():
    # Generate two clearly-different synthetic wait-time distributions
    kinetica_times = generate_wait_times(mean=20, scenario="dynamic")
    baseline_times = generate_wait_times(mean=45, scenario="fixed")
    result = run_comparison(kinetica_times, baseline_times)
    assert result["h0_rejected"] is True
    assert result["p_value"] < 0.05
```
This must be run against BOTH the synthetic scenario (to validate the test logic itself passes) AND the real end-to-end pipeline output (Phase 7) before the report/frontend cites it as a genuine finding — do not report only the synthetic-validation run as if it were the real result.

**Exit gate:** SC4 test passes on synthetic data; `results/hypothesis_test_output.json` exists with real statistic/p-value fields populated.

---

## Phase 6 — Report Chapters (non-code deliverables, generated FROM artifacts above)

Do not draft any chapter content before its feeding phase has produced real output. Each chapter file below must cite the specific `results/*.json` file it draws from in an inline comment at the top.

| File | Draws from |
|---|---|
| `report/ch1_introduction.md` | proposal §1-2 directly, no code dependency |
| `report/ch2_literature.md` | `report/lit_review_matrix.md` (Phase 1) |
| `report/ch3_methodology.md` | `schemas/lane_state.py` + Phase 2-5 design docstrings |
| `report/ch4_implementation_results.md` | `results/poisson_fit_check.json`, `results/heap_benchmark.json`, `results/hypothesis_test_output.json`, `vision/tests` confusion matrix output |
| `report/ch5_conclusion.md` | all above + explicit "future work" callouts for: historical-route ML (deferred in 4.3), observed saturation-rate estimation (deferred in 3.3) |

**Rule for an agent drafting these:** if a `results/*.json` file referenced above doesn't exist yet, do not write the chapter section that depends on it — write `<!-- BLOCKED: awaiting results/X.json from Phase N -->` instead and stop.

---

## Phase 7 — Frontend: Kinetica Control Room

**Read `design.md` in full before starting this phase — it is the authoritative visual spec (color tokens, type stack, motion, component rules).**

### 7.1 Scope discipline (see AGENTS.md §5 — read this before writing any frontend code)
This is a **read-only observability layer**. It must never reimplement heap logic, graph routing, arrival-rate estimation, or hypothesis testing in JS/TS — every visual is a render of a real backend artifact.

| Page | Reads from |
|---|---|
| Overview | live `PhaseDecision` stream, KPI aggregates from all 4 modules, `synthetic_generator`'s two named scenarios as demo triggers |
| Intersection Detail | live `LaneObservation` per lane, live `LanePriorityHeap` state (root-highlighted), recent `PhaseDecision` history |
| Vision Feed Monitor | `vision/detect.py` bounding boxes + `vision/classify.py` labels, `vision/tests` confusion-matrix output, `data/calibration/*.json` |
| Green Wave Corridor View | `preemption/graph_router.py`'s `project_downstream_path` + `preclear_corridor` output, animated against `vehicle_entry_time` |
| Analytics & Validation | `results/hypothesis_test_output.json`, `analytics/bottleneck_model.py`'s `feature_importances`, `results/poisson_fit_check.json` |
| Benchmarks / System Health | `results/heap_benchmark.json` |
| Settings | `data/DATASET_SOURCE.md` status, scenario parameter controls that call `synthetic_generator.generate_scenario` |

### 7.2 Blocked-state rule
If a page's backing `results/*.json` or live data source doesn't exist yet when this phase starts, render that page's data panel in a clearly-marked "awaiting Phase N output" state — never a fabricated placeholder number that could be mistaken for real data. This mirrors Phase 6's rule for report chapters exactly.

### 7.3 Design-token wiring
Pull all color, type, spacing, radius, and motion values from `design.md`'s YAML frontmatter as the actual token source (CSS custom properties or a theme object) — do not hand-pick colors that merely look similar. The state-ramp (`state-calm` / `state-building` / `state-preempted`) must be the single mechanism driving lane/node/chip color everywhere; no page-local color logic that duplicates or diverges from it.

**Exit gate:** all 7 pages render against real or explicitly-blocked data sources; no page contains a fabricated metric; state-ramp coloring is consistent across every page that shows lane/node/chip status.

---

## Phase 8 — Integration & Demo

### 8.1 `run_end_to_end.py`
```python
"""
Runs: synthetic_generator → vision (or synthetic passthrough) →
actuation + baseline_fixed_timer (parallel runs, same input) →
preemption → analytics.hypothesis_test on the two wait-time outputs.
Prints a final PASS/FAIL against all 4 success_criteria.md rows.
This is the single command a reviewer runs to see the whole system:
    python run_end_to_end.py --scenario corridor_ambulance
"""
```

**Exit gate for the whole spec:** `python run_end_to_end.py --scenario corridor_ambulance` runs without error and prints `SC1: PASS, SC2: PASS, SC3: PASS, SC4: PASS`, and the frontend, pointed at the same run's output, renders all 7 pages with real (non-blocked) data.
