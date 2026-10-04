"""
actuation/strategies/proportional.py — Strategy A: Proportional Volume Allocation Engine

Dynamically splits intersection cycle time strictly in proportion to real-time
vehicle accumulation across conflicting approaches, preventing green-time waste on underutilized lanes.
"""

from __future__ import annotations

from typing import Mapping


class ProportionalVolumeAllocator:
    """
    Proportional Volume Allocation Engine.

    Calculates dynamic green splits based on the ratio of waiting vehicles:
        g_i = clamp( C * (v_i / sum(v_k)), g_min, g_max )
    """

    def __init__(
        self,
        cycle_time_s: float = 100.0,
        min_green_s: float = 10.0,
        max_green_s: float = 60.0,
    ) -> None:
        if cycle_time_s <= 0:
            raise ValueError(f"cycle_time_s must be positive, got {cycle_time_s}")
        if min_green_s < 0:
            raise ValueError(f"min_green_s must be non-negative, got {min_green_s}")
        if max_green_s < min_green_s:
            raise ValueError(
                f"max_green_s ({max_green_s}) cannot be less than min_green_s ({min_green_s})"
            )

        self.cycle_time_s = float(cycle_time_s)
        self.min_green_s = float(min_green_s)
        self.max_green_s = float(max_green_s)

    def compute_green_splits(self, queue_counts: Mapping[str, int]) -> dict[str, float]:
        """
        Computes allocated green duration (in seconds) for each approach.

        Parameters:
            queue_counts: Dictionary mapping approach identifier (e.g. 'lane_N', 'Approach-N')
                          to integer queue counts.

        Returns:
            Dictionary mapping approach identifier to green split duration in seconds.
        """
        if not queue_counts:
            return {}

        total_vehicles = sum(max(0, count) for count in queue_counts.values())
        k = len(queue_counts)

        splits: dict[str, float] = {}

        # Case 1: Zero waiting traffic in all lanes -> Equal distribution
        if total_vehicles == 0:
            equal_share = self.cycle_time_s / float(k)
            clamped_equal = max(self.min_green_s, min(self.max_green_s, equal_share))
            for lane_id in queue_counts.keys():
                splits[lane_id] = round(clamped_equal, 2)
            return splits

        # Case 2: Proportional allocation
        for lane_id, count in queue_counts.items():
            v_i = max(0, count)
            ratio = v_i / float(total_vehicles)
            raw_green = self.cycle_time_s * ratio
            clamped_green = max(self.min_green_s, min(self.max_green_s, raw_green))
            splits[lane_id] = round(clamped_green, 2)

        return splits
