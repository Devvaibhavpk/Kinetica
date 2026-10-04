"""
actuation/strategies/phase_skipping.py — Strategy C: Zero-Demand Phase Skipping

Inspects real-time vehicle accumulation across scheduled approaches and skips phases
with zero waiting traffic, preventing dead-time cycle waste on empty intersection approaches.
"""

from __future__ import annotations

from typing import Mapping, Sequence


class PhaseSkippingCoordinator:
    """
    Zero-Demand Phase Skipping Coordinator.

    Filters the scheduled phase sequence dynamically, bypassing approaches with zero waiting vehicles:
        active_phases = [p for p in scheduled_phases if queue_counts.get(p, 0) > 0]
    """

    def __init__(self, scheduled_phases: Sequence[str]) -> None:
        if not scheduled_phases:
            raise ValueError("scheduled_phases sequence cannot be empty")
        self.scheduled_phases: list[str] = list(scheduled_phases)

    def get_active_phases(self, queue_counts: Mapping[str, int]) -> list[str]:
        """
        Returns the ordered list of phases that have waiting demand (queue_count > 0).

        Parameters:
            queue_counts: Mapping of approach/phase IDs to current waiting vehicle counts.

        Returns:
            List of phase identifiers with active demand. If all phases have zero demand,
            returns the full scheduled_phases sequence to maintain standard resting cycle.
        """
        active: list[str] = [
            phase for phase in self.scheduled_phases if queue_counts.get(phase, 0) > 0
        ]

        # If zero demand detected across all approaches, default to full schedule
        if not active:
            return list(self.scheduled_phases)

        return active

    def get_next_phase(self, current_phase: str, queue_counts: Mapping[str, int]) -> str:
        """
        Determines the next phase to actuate in circular order, skipping zero-demand phases.

        Parameters:
            current_phase: The currently active phase identifier.
            queue_counts: Mapping of approach/phase IDs to current waiting vehicle counts.

        Returns:
            The identifier of the next approach with pending demand.
        """
        active = self.get_active_phases(queue_counts)
        if not active:
            return self.scheduled_phases[0]

        if current_phase in active:
            current_idx = active.index(current_phase)
            next_idx = (current_idx + 1) % len(active)
            return active[next_idx]

        # If current_phase is not in active (was skipped or external), find next in scheduled order
        if current_phase in self.scheduled_phases:
            sched_idx = self.scheduled_phases.index(current_phase)
            for i in range(1, len(self.scheduled_phases) + 1):
                candidate = self.scheduled_phases[(sched_idx + i) % len(self.scheduled_phases)]
                if candidate in active:
                    return candidate

        return active[0]
