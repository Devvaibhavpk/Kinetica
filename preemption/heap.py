"""Max-Heap Priority Queue for Intersection Preemption and Phase Scheduling.

Implements the LanePriorityHeap data structure that manages dynamic urgency
scoring for intersection lanes. Provides O(1) peek and O(log N) amortized
push/update operations using a tombstone-based heapq mechanism.

Key design invariants:
1. Anti-Starvation Invariant: Score monotonically increases with wait time via an
   additive aging term, ensuring low-density cross-streets are guaranteed service.
2. Emergency Override Preemption: Priority vehicles (ambulances, police, school vans)
   receive heavy scaling multipliers that immediately place them at the heap root.
"""

import heapq
import math
from typing import Dict, List, Optional, Tuple

__all__ = [
    "LanePriorityHeap",
    "DENSITY_WEIGHT",
    "AGING_WEIGHT",
]

# Scoring weight constants
DENSITY_WEIGHT: float = 20.0
AGING_WEIGHT: float = 1.0


class LanePriorityHeap:
    """Max-Heap priority queue managing traffic lane urgency and preemption.

    Maintains dynamic scores for all incoming intersection approaches using an
    inverted min-heap (`heapq`) paired with a score dictionary for O(1) score
    lookups and tombstoned updates.

    Attributes:
        _heap: Internal list of (-score, counter, lane_id) tuples.
        _scores: Map from lane_id to current valid urgency score.
        _counter: Monotonic sequence counter to guarantee heap stability.
    """

    def __init__(self) -> None:
        """Initialize an empty LanePriorityHeap."""
        self._heap: List[Tuple[float, int, str]] = []
        self._scores: Dict[str, float] = {}
        self._counter: int = 0

    def compute_score(
        self,
        wait_time_s: float,
        density_veh_per_m: float,
        priority_multiplier: float = 1.0,
    ) -> float:
        """Compute the composite urgency score for a lane.

        Mathematical formulation:
            score = (priority_multiplier * (1.0 + density_veh_per_m * DENSITY_WEIGHT))
                  + (wait_time_s * AGING_WEIGHT)

        Where:
            - `priority_multiplier`: Multiplier for emergency/high-priority classes
              (e.g., 1000.0 for ambulance/police, 50.0 for school van in school zone).
            - `density_veh_per_m * DENSITY_WEIGHT`: Proportional queue density demand.
            - `wait_time_s * AGING_WEIGHT`: Additive anti-starvation term strictly
              monotonically increasing with elapsed unserved wait time.

        Args:
            wait_time_s: Elapsed seconds since the lane last received a green phase.
            density_veh_per_m: Current vehicle density along the approach (veh/m).
            priority_multiplier: Emergency multiplier (default: 1.0).

        Returns:
            float: Composite urgency score. Higher scores denote higher priority.
        """
        w_time = max(0.0, float(wait_time_s))
        density = max(0.0, float(density_veh_per_m))
        mult = max(1.0, float(priority_multiplier))

        base_urgency = mult * (1.0 + density * DENSITY_WEIGHT)
        aging_term = w_time * AGING_WEIGHT
        return float(base_urgency + aging_term)

    def push_or_update(self, lane_id: str, score: float) -> None:
        """Insert a lane or update its priority score in the heap.

        Uses a tombstone mechanism: updates the canonical score in `_scores`
        and pushes `(-score, counter, lane_id)` into `_heap`. Outdated entries
        are lazily purged upon peek/pop.

        Args:
            lane_id: Unique identifier for the lane approach.
            score: Urgency score computed for this approach.
        """
        valid_score = float(score)
        self._scores[lane_id] = valid_score
        heapq.heappush(self._heap, (-valid_score, self._counter, lane_id))
        self._counter += 1

    def _purge_tombstones(self) -> None:
        """Lazily discard stale heap entries from the root."""
        while self._heap:
            neg_score, _, lane_id = self._heap[0]
            current_score = self._scores.get(lane_id)
            if current_score is not None and math.isclose(-neg_score, current_score, rel_tol=1e-9, abs_tol=1e-9):
                return
            heapq.heappop(self._heap)

    def peek_root(self) -> str:
        """Return the lane_id with the highest urgency score without removing it.

        Lazily purges tombstoned entries to guarantee O(1) access to the true max.

        Returns:
            str: Identifier of the lane with highest priority score.

        Raises:
            IndexError: If the priority queue contains no active entries.
        """
        self._purge_tombstones()
        if not self._heap:
            raise IndexError("peek_root called on empty LanePriorityHeap")
        return self._heap[0][2]

    def pop_root(self) -> Tuple[str, float]:
        """Remove and return the lane_id and score of the highest priority approach.

        Returns:
            Tuple[str, float]: (lane_id, score) of the top approach.

        Raises:
            IndexError: If the priority queue contains no active entries.
        """
        self._purge_tombstones()
        if not self._heap:
            raise IndexError("pop_root called on empty LanePriorityHeap")
        neg_score, _, lane_id = heapq.heappop(self._heap)
        valid_score = self._scores.pop(lane_id, -neg_score)
        return lane_id, valid_score

    def get_score(self, lane_id: str) -> Optional[float]:
        """Look up the current active score for a lane in O(1) time."""
        return self._scores.get(lane_id)

    def size(self) -> int:
        """Return the number of unique active lanes in the heap."""
        return len(self._scores)

    def __len__(self) -> int:
        return self.size()

    def is_empty(self) -> bool:
        """Check if the priority queue has no active entries."""
        return len(self._scores) == 0

    def clear(self) -> None:
        """Reset the heap and score map."""
        self._heap.clear()
        self._scores.clear()
        self._counter = 0
