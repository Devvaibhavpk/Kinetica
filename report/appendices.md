# Project Kinetica: Appendices

---

## Appendix A: Complete Data Contract Schemas (`schemas/lane_state.py`)

In accordance with **AGENTS.md Rule 3 and Rule 4**, all inter-module data exchange is governed by the immutable schema file [`schemas/lane_state.py`](file:///F:/project/Kinetica/schemas/lane_state.py):

```python
"""
Core Data Contracts for Project Kinetica.

Defines immutable Pydantic dataclasses for cross-module communication
between Vision, Actuation, Preemption, Analytics, and the Frontend.
"""

from datetime import datetime
from enum import Enum
from pydantic.dataclasses import dataclass


class VehicleClass(str, Enum):
    STANDARD = "standard"
    TWO_WHEELER = "two_wheeler"
    AMBULANCE = "ambulance"
    POLICE = "police"
    SCHOOL_VAN = "school_van"


class PhaseReason(str, Enum):
    SCHEDULED = "scheduled"
    EXTENDED = "extended"
    PREEMPTED = "preempted"


@dataclass(frozen=True)
class LaneObservation:
    lane_id: str
    timestamp: datetime
    vehicle_count: int
    queue_length_m: float
    density_veh_per_m: float
    class_counts: dict[VehicleClass, int]
    is_school_zone: bool = False


@dataclass(frozen=True)
class PriorityEvent:
    lane_id: str
    vehicle_class: VehicleClass
    detected_at: datetime
    confidence: float


@dataclass(frozen=True)
class PhaseDecision:
    intersection_id: str
    active_lane_id: str
    phase_start: datetime
    phase_end: datetime
    reason: PhaseReason
```

---

## Appendix B: Automated Test Suite Execution Logs

The full test suite execution verified all 62 automated unit tests across the codebase in 3.29 seconds:

```
============================= test session starts =============================
platform win32 -- Python 3.12.3, pytest-9.1.1, pluggy-1.6.0 -- C:\Python312\python.exe
cachedir: .pytest_cache
hypothesis profile 'default'
rootdir: F:\project\Kinetica
plugins: anyio-4.9.0, langsmith-0.4.4, asyncio-1.4.0, cov-7.1.0, hypothesis-6.168.0
asyncio: mode=Mode.STRICT, debug=False
collected 62 items

actuation/tests/test_arrival_model.py::test_estimator_rejects_non_positive_window PASSED [  1%]
actuation/tests/test_arrival_model.py::test_estimator_rejects_invalid_alpha PASSED [  3%]
actuation/tests/test_arrival_model.py::test_empty_window_returns_zero_lambda PASSED [  4%]
actuation/tests/test_arrival_model.py::test_estimator_convergence_known_ground_truth PASSED [  6%]
actuation/tests/test_arrival_model.py::test_estimator_convergence_on_synthetic_scenario PASSED [  8%]
actuation/tests/test_arrival_model.py::test_estimator_higher_rate_produces_higher_lambda PASSED [  9%]
actuation/tests/test_arrival_model.py::test_rolling_window_purges_old_entries PASSED [ 11%]
actuation/tests/test_arrival_model.py::test_inter_arrival_times_excludes_non_positive_deltas PASSED [ 12%]
actuation/tests/test_arrival_model.py::test_goodness_of_fit_accepts_exponential PASSED [ 14%]
actuation/tests/test_arrival_model.py::test_goodness_of_fit_rejects_constant PASSED [ 16%]
actuation/tests/test_arrival_model.py::test_goodness_of_fit_small_sample_graceful PASSED [ 17%]
actuation/tests/test_arrival_model.py::test_goodness_of_fit_empty_input PASSED [ 19%]
actuation/tests/test_arrival_model.py::test_goodness_of_fit_result_schema PASSED [ 20%]
actuation/tests/test_arrival_model.py::test_goodness_of_fit_json_persistence PASSED [ 22%]
actuation/tests/test_arrival_model.py::test_gap_out_does_not_trigger_before_safety_minimum PASSED [ 24%]
actuation/tests/test_arrival_model.py::test_gap_out_does_not_trigger_with_active_queue PASSED [ 25%]
actuation/tests/test_arrival_model.py::test_gap_out_triggers_on_cleared_empty_lane PASSED [ 27%]
actuation/tests/test_arrival_model.py::test_terminate_phase_early_truncates_correctly PASSED [ 29%]
actuation/tests/test_arrival_model.py::test_terminate_phase_early_cannot_precede_start PASSED [ 30%]
actuation/tests/test_engine.py::test_green_duration_scales_with_queue PASSED [ 32%]
actuation/tests/test_engine.py::test_green_extension_physical_bounds PASSED [ 33%]
actuation/tests/test_engine.py::test_next_phase_decision_extended PASSED [ 35%]
actuation/tests/test_engine.py::test_next_phase_decision_empty_lane PASSED [ 37%]
actuation/tests/test_engine.py::test_next_phase_decision_output_schema PASSED [ 38%]
actuation/tests/test_engine.py::test_baseline_fixed_timer_reason_and_duration PASSED [ 40%]
actuation/tests/test_engine.py::test_baseline_fixed_timer_round_robin PASSED [ 41%]
actuation/tests/test_engine.py::test_baseline_fixed_timer_guards PASSED  [ 43%]
actuation/tests/test_engine.py::test_saturation_flow_rate_constant PASSED [ 45%]
analytics/tests/test_bottleneck_model.py::test_load_simulation_logs_missing_files_raises PASSED [ 46%]
analytics/tests/test_bottleneck_model.py::test_load_simulation_logs_empty_files_raises PASSED [ 48%]
analytics/tests/test_bottleneck_model.py::test_load_simulation_logs_merges_properly PASSED [ 50%]
analytics/tests/test_bottleneck_model.py::test_train_bottleneck_model_max_depth_and_importances PASSED [ 51%]
analytics/tests/test_bottleneck_model.py::test_train_bottleneck_model_insufficient_samples PASSED [ 53%]
analytics/tests/test_bottleneck_model.py::test_calibrate_saturation_flow_rate PASSED [ 54%]
analytics/tests/test_bottleneck_model.py::test_calibrate_saturation_flow_rate_fallback PASSED [ 56%]
analytics/tests/test_hypothesis_test.py::test_h0_rejected_at_alpha_05 PASSED [ 58%]
analytics/tests/test_hypothesis_test.py::test_normal_distribution_branches_to_welch PASSED [ 59%]
analytics/tests/test_hypothesis_test.py::test_skewed_distribution_branches_to_mann_whitney PASSED [ 61%]
analytics/tests/test_hypothesis_test.py::test_identical_distributions_fail_to_reject_h0 PASSED [ 62%]
analytics/tests/test_hypothesis_test.py::test_small_sample_size_handling PASSED [ 64%]
analytics/tests/test_hypothesis_test.py::test_invalid_alpha_guard PASSED [ 66%]
analytics/tests/test_hypothesis_test.py::test_empty_sample_guard PASSED  [ 67%]
analytics/tests/test_hypothesis_test.py::test_json_artifact_persistence PASSED [ 69%]
preemption/tests/test_graph_router.py::test_multi_intersection_preclear PASSED [ 70%]
preemption/tests/test_graph_router.py::test_build_city_graph_validations PASSED [ 72%]
preemption/tests/test_graph_router.py::test_project_downstream_path_max_hops PASSED [ 74%]
preemption/tests/test_graph_router.py::test_project_downstream_path_greedy_weight_selection PASSED [ 75%]
preemption/tests/test_graph_router.py::test_project_downstream_path_cycle_prevention PASSED [ 77%]
preemption/tests/test_graph_router.py::test_project_downstream_path_missing_node PASSED [ 79%]
preemption/tests/test_graph_router.py::test_preclear_corridor_empty_path PASSED [ 80%]
preemption/tests/test_graph_router.py::test_preclear_corridor_custom_lanes PASSED [ 82%]
preemption/tests/test_heap.py::test_aging_prevents_starvation PASSED     [ 83%]
preemption/tests/test_heap.py::test_priority_event_forces_root PASSED    [ 85%]
preemption/tests/test_heap.py::test_tombstone_mechanism_and_updates PASSED [ 87%]
preemption/tests/test_heap.py::test_empty_heap_guards PASSED             [ 88%]
preemption/tests/test_heap.py::test_school_zone_escalation_rules PASSED  [ 90%]
preemption/tests/test_heap.py::test_police_and_standard_multipliers PASSED [ 91%]
schemas/tests/test_schema_roundtrip.py::test_lane_observation_roundtrip PASSED [ 93%]
schemas/tests/test_schema_roundtrip.py::test_priority_event_roundtrip PASSED [ 95%]
schemas/tests/test_schema_roundtrip.py::test_phase_decision_roundtrip PASSED [ 96%]
vision/tests/test_classify.py::test_ambulance_detection_on_synthetic_frame PASSED [ 98%]
vision/tests/test_pipeline_smoke.py::test_pipeline_smoke PASSED          [100%]

============================= 62 passed in 3.29s ==============================
```

---

## Appendix C: System Configuration & Hyperparameters

| Hyperparameter / Constant | Module File | Configured Value | Mathematical Description |
|---|---|---|---|
| `DEFAULT_SATURATION_FLOW_RATE` | `actuation/engine.py` | `1900.0` veh/hr/lane | HCM 2016 base arterial saturation flow rate literature default. |
| `AVERAGE_VEHICLE_SPACING_M` | `actuation/engine.py` | `7.0` meters | Linear distance allocated per queued vehicle (body length + gap). |
| `START_UP_LOST_TIME_S` | `actuation/engine.py` | `2.0` seconds | Initial reaction and acceleration lost time per phase. |
| `MIN_BASE_GREEN_S` | `actuation/engine.py` | `10.0` seconds | Minimum green phase allocation floor for pedestrian clearance. |
| `MAX_GREEN_EXTENSION_S` | `actuation/engine.py` | `60.0` seconds | Maximum green phase allocation ceiling to bound cycle delay. |
| `DENSITY_GAP_OUT_THRESHOLD` | `actuation/arrival_model.py` | `0.02` veh/m | Vehicle density threshold below which gap-out truncation triggers. |
| `MIN_SAFETY_GREEN_BEFORE_GAP_S` | `actuation/arrival_model.py` | `7.0` seconds | Minimum elapsed green time before gap-out truncation is permitted. |
| `DENSITY_WEIGHT` | `preemption/heap.py` | `20.0` | Weight scaling spatial density demand in urgency score. |
| `AGING_WEIGHT` | `preemption/heap.py` | `1.0` | Additive anti-starvation urgency score accumulation rate ($+1.0/\text{s}$). |
| `AMBULANCE / POLICE MULTIPLIER` | `preemption/override.py` | `1000.0` | Urgency multiplier forcing immediate heap root elevation. |
| `SCHOOL_ZONE_ESCALATION` | `preemption/override.py` | `50.0` | Multiplier applied to school vans inside active school zones. |
| `DEFAULT_PRECLEAR_GREEN_S` | `preemption/graph_router.py` | `30.0` seconds | Preemptive green phase lock duration for downstream corridor nodes. |
| `MAX_HOPS` | `preemption/graph_router.py` | `5` | Maximum downstream lookahead horizon in directed corridor graph. |
| `DECISION_TREE_MAX_DEPTH` | `analytics/bottleneck_model.py` | `3` | Maximum tree depth ceiling preserving model interpretability. |
| `LOOKAHEAD_STEPS` | `analytics/bottleneck_model.py` | `5` | Time steps forward to project downstream queue delay. |
| `SIGNIFICANCE_ALPHA` | `analytics/hypothesis_test.py` | `0.05` | Statistical significance threshold for rejecting $H_0$. |

---

## Appendix D: Full Simulation Summary Log (`results/end_to_end_summary.json`)

```json
{
  "status": "SUCCESS",
  "timestamp": "2026-10-03T01:55:04.172673",
  "total_observations": 480,
  "poisson_fit": {
    "p_value": 0.0,
    "poisson_assumption_holds": false,
    "statistic": 2522.2734864300633,
    "sample_size": 479,
    "estimated_lambda": 3.090322580645161,
    "alpha": 0.05
  },
  "hypothesis_test": {
    "test_used": "Mann-Whitney U test",
    "statistic": 20665.0,
    "p_value": 0.0,
    "h0_rejected": true,
    "effect_size": 21.64
  },
  "corridor_path": [
    "IX-02",
    "IX-03",
    "IX-04"
  ],
  "feature_importances": {
    "density_veh_per_m": 0.0,
    "vehicle_count": 0.2918,
    "queue_length_m": 0.7082,
    "is_preempted": 0.0,
    "hour_of_day": 0.0
  }
}
```
