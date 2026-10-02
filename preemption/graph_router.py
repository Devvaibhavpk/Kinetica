"""Directed-Graph Green Wave Corridor Preemption Router.

Implements multi-intersection corridor preemption using directed network graphs (NetworkX).
Projects emergency vehicle trajectory across consecutive intersections and generates
coordinated pre-clear PhaseDecisions to establish a frictionless 'green wave'.

AGENTS.md Rule 7 compliance:
    Greedy heading-based path projection is explicitly a deterministic heuristic,
    NOT historical-route machine learning. Machine learning predictive routing
    is deferred to future work (Chapter 5 / Phase 5 refinement).
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import networkx as nx

from schemas.lane_state import PhaseDecision, PhaseReason

__all__ = [
    "build_city_graph",
    "project_downstream_path",
    "preclear_corridor",
    "DEFAULT_PRECLEAR_GREEN_S",
]

DEFAULT_PRECLEAR_GREEN_S: float = 30.0


def build_city_graph(edges: List[Tuple[str, str, float]]) -> nx.DiGraph:
    """Construct a directed spatial network of city intersections.

    Each directed edge represents an arterial segment connecting two signalized
    intersections with an associated traversal time.

    Args:
        edges: List of directed connections as (from_node, to_node, travel_time_seconds).

    Returns:
        nx.DiGraph: Directed graph with weighted edges modeling the corridor topology.

    Raises:
        ValueError: If any edge tuple does not contain exactly 3 elements or travel time is non-positive.
    """
    graph = nx.DiGraph()

    for item in edges:
        if len(item) != 3:
            raise ValueError(f"Edge must be a 3-tuple (from_node, to_node, travel_time_s), got {item}")
        u, v, travel_time = item
        t_sec = float(travel_time)
        if t_sec < 0.0:
            raise ValueError(f"Travel time cannot be negative, got {t_sec} on edge ({u}, {v})")

        # Store travel time and capacity weight (used by greedy routing heuristic)
        graph.add_edge(str(u), str(v), travel_time_s=t_sec, weight=t_sec)

    return graph


def project_downstream_path(
    graph: nx.DiGraph,
    current_node: str,
    max_hops: int = 5,
) -> List[str]:
    """Greedily project the downstream corridor path for an approaching emergency vehicle.

    Heuristic mechanism:
        Traverses outgoing edges step-by-step from `current_node`, greedily choosing
        the outgoing edge with the highest weight (representing the primary arterial
        corridor heading) up to `max_hops` downstream intersections.

    NOTE (AGENTS.md Rule 7 Compliance):
        This algorithm is deliberately a deterministic greedy heading heuristic.
        It is explicitly NOT an ML-based historical trajectory model — that is
        deferred to Phase 5 / Chapter 5 future work. Do not report this as an
        ML-trained routing policy.

    Args:
        graph: Directed network topology of intersections.
        current_node: Identifier of the intersection where the priority vehicle is detected.
        max_hops: Maximum lookahead horizon (default: 5 hops).

    Returns:
        List[str]: Ordered sequence of downstream intersection identifiers to pre-clear,
                   excluding `current_node`. Returns empty list if no downstream edges exist.
    """
    if current_node not in graph or max_hops <= 0:
        return []

    path: List[str] = []
    visited = {str(current_node)}
    curr = str(current_node)

    for _ in range(max_hops):
        # Identify unvisited successor intersections
        candidates = [nbr for nbr in graph.successors(curr) if nbr not in visited]
        if not candidates:
            break

        # Greedy choice: highest edge weight represents the primary arterial trunk
        best_next = max(
            candidates,
            key=lambda nbr: graph[curr][nbr].get("weight", graph[curr][nbr].get("travel_time_s", 0.0)),
        )

        path.append(best_next)
        visited.add(best_next)
        curr = best_next

    return path


def preclear_corridor(
    path: List[str],
    start_time: Optional[datetime] = None,
    green_duration_s: float = DEFAULT_PRECLEAR_GREEN_S,
    lane_id_map: Optional[Dict[str, str]] = None,
) -> List[PhaseDecision]:
    """Generate preemptive green phase decisions across all downstream corridor nodes.

    Emits standardized PhaseDecision contracts with reason=PhaseReason.PREEMPTED
    for every intersection in the projected corridor path to clear vehicular queues
    in advance of the emergency responder's arrival.

    Args:
        path: Ordered list of downstream intersection IDs needing green-wave preemption.
        start_time: Baseline activation timestamp (defaults to datetime.now()).
        green_duration_s: Duration in seconds to lock green for corridor clearance.
        lane_id_map: Optional mapping of intersection_id to specific approach lane_id.
                     Defaults to '{node}_corridor'.

    Returns:
        List[PhaseDecision]: Coordinated list of preemption decisions for all path nodes.
    """
    if not path:
        return []

    t_zero = start_time if start_time is not None else datetime.now()
    decisions: List[PhaseDecision] = []

    for node in path:
        lane_id = lane_id_map.get(node, f"{node}_corridor") if lane_id_map else f"{node}_corridor"
        decision = PhaseDecision(
            intersection_id=node,
            active_lane_id=lane_id,
            phase_start=t_zero,
            phase_end=t_zero + timedelta(seconds=float(green_duration_s)),
            reason=PhaseReason.PREEMPTED,
        )
        decisions.append(decision)

    return decisions
