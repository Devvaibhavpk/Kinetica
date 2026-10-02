"""Tests for Directed-Graph Corridor Preemption and Success Criterion 3 (SC3).

Covers:
- Sub-phase 4.14: build_city_graph validation and edge weighting
- Sub-phase 4.15: project_downstream_path greedy heading-based corridor projection
- Sub-phase 4.16: preclear_corridor green-wave PhaseDecision generation
- Sub-phase 4.17: Success Criterion 3 (SC3) validation gate
"""

from datetime import datetime, timedelta
import pytest

from preemption.graph_router import (
    DEFAULT_PRECLEAR_GREEN_S,
    build_city_graph,
    preclear_corridor,
    project_downstream_path,
)
from schemas.lane_state import PhaseDecision, PhaseReason


def test_multi_intersection_preclear():
    """SC3 Validation Gate.

    Test ID: preemption/tests/test_graph_router.py::test_multi_intersection_preclear
    build-spec.md § 4.17

    Builds a linear 3-node graph (A -> B -> C) and triggers an emergency vehicle at node A.
    Asserts that preclear_corridor emits exactly 2 PhaseDecision objects for downstream
    nodes B and C with reason=PhaseReason.PREEMPTED. This proves multi-intersection
    pre-clearance holds across the corridor.
    """
    # 1. Build linear 3-node corridor topology: Node A -> Node B -> Node C
    edges = [
        ("node_A", "node_B", 15.0),  # 15 seconds travel time between A and B
        ("node_B", "node_C", 20.0),  # 20 seconds travel time between B and C
    ]
    graph = build_city_graph(edges)

    assert graph.number_of_nodes() == 3
    assert graph.number_of_edges() == 2

    # 2. Project downstream path starting from node_A
    path = project_downstream_path(graph=graph, current_node="node_A", max_hops=5)
    assert path == ["node_B", "node_C"], f"Expected path ['node_B', 'node_C'], got {path}"

    # 3. Generate pre-clearance phase decisions across downstream intersections
    now = datetime(2026, 10, 1, 14, 0, 0)
    decisions = preclear_corridor(path=path, start_time=now, green_duration_s=30.0)

    # 4. SC3 Formal Assertions:
    # Exactly 2 PhaseDecision objects must be emitted (for B and C)
    assert len(decisions) == 2, f"SC3 FAILED: Expected exactly 2 decisions, got {len(decisions)}"

    assert decisions[0].intersection_id == "node_B"
    assert decisions[0].reason == PhaseReason.PREEMPTED
    assert decisions[0].phase_start == now
    assert decisions[0].phase_end == now + timedelta(seconds=30.0)

    assert decisions[1].intersection_id == "node_C"
    assert decisions[1].reason == PhaseReason.PREEMPTED
    assert decisions[1].phase_start == now
    assert decisions[1].phase_end == now + timedelta(seconds=30.0)


def test_build_city_graph_validations():
    """Verify input validation guards on city graph construction."""
    # Invalid tuple length
    with pytest.raises(ValueError, match="3-tuple"):
        build_city_graph([("A", "B")])  # type: ignore

    # Negative travel time
    with pytest.raises(ValueError, match="negative"):
        build_city_graph([("A", "B", -5.0)])


def test_project_downstream_path_max_hops():
    """Verify max_hops parameter bounds the lookahead depth."""
    edges = [
        ("A", "B", 10.0),
        ("B", "C", 10.0),
        ("C", "D", 10.0),
        ("D", "E", 10.0),
    ]
    graph = build_city_graph(edges)

    # Limit to 2 hops
    path_2 = project_downstream_path(graph, "A", max_hops=2)
    assert path_2 == ["B", "C"]

    # Full traversal up to max_hops=5
    path_all = project_downstream_path(graph, "A", max_hops=5)
    assert path_all == ["B", "C", "D", "E"]


def test_project_downstream_path_greedy_weight_selection():
    """Verify greedy selection follows the highest-weight edge (arterial trunk)."""
    edges = [
        ("A", "B_side", 5.0),      # Minor side street
        ("A", "B_arterial", 25.0),  # Major arterial road
        ("B_arterial", "C", 20.0),
    ]
    graph = build_city_graph(edges)

    path = project_downstream_path(graph, "A", max_hops=3)
    assert path[0] == "B_arterial", f"Expected greedy router to pick B_arterial, got {path[0]}"
    assert path == ["B_arterial", "C"]


def test_project_downstream_path_cycle_prevention():
    """Verify graph cycles do not result in infinite loops."""
    edges = [
        ("A", "B", 10.0),
        ("B", "C", 10.0),
        ("C", "A", 10.0),  # Directed cycle back to A
    ]
    graph = build_city_graph(edges)

    path = project_downstream_path(graph, "A", max_hops=10)
    # Must traverse B, C then terminate without re-entering A or B
    assert path == ["B", "C"]


def test_project_downstream_path_missing_node():
    """Verify non-existent node returns empty path."""
    graph = build_city_graph([("A", "B", 10.0)])
    assert project_downstream_path(graph, "UNKNOWN_NODE") == []
    assert project_downstream_path(graph, "A", max_hops=0) == []


def test_preclear_corridor_empty_path():
    """Verify empty path returns empty decision list."""
    assert preclear_corridor([]) == []


def test_preclear_corridor_custom_lanes():
    """Verify custom lane mappings are respected in preclear decisions."""
    lane_map = {"node_X": "approach_west_fast", "node_Y": "approach_north_fast"}
    decisions = preclear_corridor(["node_X", "node_Y"], lane_id_map=lane_map)

    assert decisions[0].active_lane_id == "approach_west_fast"
    assert decisions[1].active_lane_id == "approach_north_fast"
    assert all(d.reason == PhaseReason.PREEMPTED for d in decisions)
