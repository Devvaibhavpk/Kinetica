from datetime import datetime, timedelta, timezone
from typing import List, Tuple
import networkx as nx
from schemas.lane_state import PhaseDecision, PhaseReason

def build_city_graph(edges: List[Tuple[str, str, float]]) -> nx.DiGraph:
    """
    Builds a directed graph representing city intersections and travel times.
    edges format: [(from_node, to_node, travel_time_s), ...]
    """
    G = nx.DiGraph()
    for u, v, weight in edges:
        G.add_edge(u, v, weight=weight)
    return G

def project_downstream_path(graph: nx.DiGraph, current_node: str, max_hops: int = 5) -> List[str]:
    """
    Projects downstream route using a greedy heading-based path projection heuristic.
    Note: Historical-route ML model deferred to Phase 5 future work.
    """
    path = [current_node]
    curr = current_node
    
    for _ in range(max_hops):
        neighbors = list(graph.successors(curr))
        if not neighbors:
            break
        # Pick neighbor with lowest travel time / highest weight
        next_node = min(neighbors, key=lambda n: graph[curr][n].get('weight', 1.0))
        if next_node in path:
            break  # avoid cycle
        path.append(next_node)
        curr = next_node
        
    return path

def preclear_corridor(path: List[str], start_time: float | datetime | None = None) -> List[PhaseDecision]:
    """
    Generates PREEMPTED phase decisions for downstream corridor nodes.
    """
    if start_time is None:
        dt_curr = datetime.now(timezone.utc)
    elif isinstance(start_time, (int, float)):
        dt_curr = datetime.fromtimestamp(start_time, tz=timezone.utc)
    else:
        dt_curr = start_time

    decisions = []
    for node in path[1:]:  # Downstream intersections
        dt_end = dt_curr + timedelta(seconds=30)
        decisions.append(PhaseDecision(
            intersection_id=node,
            active_lane_id=f"{node}_main",
            phase_start=dt_curr,
            phase_end=dt_end,
            reason=PhaseReason.PREEMPTED
        ))
        dt_curr = dt_end
        
    return decisions
