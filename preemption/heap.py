import heapq
from typing import Dict, Tuple, List, Optional

class LanePriorityHeap:
    def __init__(self):
        # Min-heap in heapq, so we store negative scores (-score, lane_id, counter)
        self.heap: List[Tuple[float, str, int]] = []
        self.scores: Dict[str, float] = {}
        self.tombstones: Dict[Tuple[str, float], bool] = {}
        self._counter = 0

    def compute_score(self, wait_time_s: float, density_veh_per_m: float, priority_multiplier: float = 1.0) -> float:
        """
        Combines wait time, density, and priority multiplier into an urgency score.
        Includes an additive aging term (+ 0.05 * wait_time_s) ensuring anti-starvation.
        """
        base_score = (density_veh_per_m * 100.0) + (wait_time_s * 0.05)
        return float(base_score * priority_multiplier)

    def push_or_update(self, lane_id: str, score: float):
        old_score = self.scores.get(lane_id)
        if old_score is not None:
            self.tombstones[(lane_id, old_score)] = True

        self.scores[lane_id] = score
        self._counter += 1
        # Push negative score for max-heap behavior
        heapq.heappush(self.heap, (-score, lane_id, self._counter))

    def peek_root(self) -> Optional[str]:
        while self.heap:
            neg_score, lane_id, _ = self.heap[0]
            score = -neg_score
            if self.tombstones.get((lane_id, score), False):
                heapq.heappop(self.heap)
                continue
            if self.scores.get(lane_id) != score:
                heapq.heappop(self.heap)
                continue
            return lane_id
        return None

    def pop_root(self) -> Optional[Tuple[str, float]]:
        while self.heap:
            neg_score, lane_id, _ = heapq.heappop(self.heap)
            score = -neg_score
            if self.tombstones.get((lane_id, score), False):
                continue
            if self.scores.get(lane_id) != score:
                continue
            del self.scores[lane_id]
            return lane_id, score
        return None
