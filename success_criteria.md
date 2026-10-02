# Success Criteria — Testable Assertions & Test IDs

As per AGENTS.md, a checkbox here is ONLY flipped to `[x]` when its exact corresponding Pytest ID is run and observed to PASS.

- [x] **SC1: Green phase duration is a function of measured queue length (not a constant)**
      Test ID: `actuation/tests/test_engine.py::test_green_duration_scales_with_queue`

- [x] **SC2: A detected priority-class vehicle changes phase ordering ahead of FIFO/queue-length ordering**
      Test ID: `preemption/tests/test_heap.py::test_priority_event_forces_root`

- [x] **SC3: A priority vehicle's projected path causes >1 downstream intersection to pre-clear**
      Test ID: `preemption/tests/test_graph_router.py::test_multi_intersection_preclear`

- [x] **SC4: A t-test or Mann-Whitney U test on paired wait-time samples rejects H0 at α = 0.05**
      Test ID: `analytics/tests/test_hypothesis_test.py::test_h0_rejected_at_alpha_05`
