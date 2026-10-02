"""Green Wave Preemption Module for Project Kinetica.

Provides local priority queue scheduling (max-heap) and multi-intersection
directed-graph corridor routing for emergency vehicle overrides.
"""

from preemption.graph_router import (
    DEFAULT_PRECLEAR_GREEN_S,
    build_city_graph,
    preclear_corridor,
    project_downstream_path,
)
from preemption.heap import AGING_WEIGHT, DENSITY_WEIGHT, LanePriorityHeap
from preemption.override import (
    PRIORITY_MULTIPLIERS,
    SCHOOL_ZONE_ESCALATION,
    apply_override,
)

__all__ = [
    "LanePriorityHeap",
    "DENSITY_WEIGHT",
    "AGING_WEIGHT",
    "PRIORITY_MULTIPLIERS",
    "SCHOOL_ZONE_ESCALATION",
    "apply_override",
    "build_city_graph",
    "project_downstream_path",
    "preclear_corridor",
    "DEFAULT_PRECLEAR_GREEN_S",
]
