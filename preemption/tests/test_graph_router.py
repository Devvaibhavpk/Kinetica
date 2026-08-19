from preemption.graph_router import build_city_graph, project_downstream_path, preclear_corridor
from schemas.lane_state import PhaseReason

def test_multi_intersection_preclear():
    """
    SC3: Asserts that multi-intersection corridor preemption emits PREEMPTED decisions
    for downstream nodes.
    """
    edges = [("A", "B", 10.0), ("B", "C", 12.0)]
    graph = build_city_graph(edges)
    path = project_downstream_path(graph, current_node="A", max_hops=5)

    assert path == ["A", "B", "C"], f"Expected path ['A', 'B', 'C'], got {path}"

    decisions = preclear_corridor(path)
    assert len(decisions) == 2, f"Expected 2 preemption decisions, got {len(decisions)}"
    assert all(d.reason == PhaseReason.PREEMPTED for d in decisions)
    assert [d.intersection_id for d in decisions] == ["B", "C"]
