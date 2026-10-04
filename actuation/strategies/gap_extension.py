"""
actuation/strategies/gap_extension.py — Strategy B: Dynamic Extension with Gap Detection

Monitors the stop-line Decision Zone to extend green time incrementally as long as vehicles
actively cross within the critical headway threshold, and terminates early upon gap-out.
"""

from __future__ import annotations


class GapExtensionController:
    """
    Dynamic Green Extension Controller with Stop-Line Gap Detection.

    Evaluates whether an ongoing green phase should continue or terminate early based on:
    - Minimum green enforcement (HOLD_MINIMUM)
    - Headway threshold comparison against Decision Zone gap (GAP_CONTINUED_EXTEND vs GAP_OUT_EARLY_TERMINATE)
    - Absolute maximum green bounds (MAX_GREEN_TERMINATE)
    """

    def __init__(
        self,
        min_green_s: float = 10.0,
        max_green_s: float = 60.0,
        gap_threshold_s: float = 2.5,
        extension_step_s: float = 2.0,
    ) -> None:
        if min_green_s < 0:
            raise ValueError(f"min_green_s must be non-negative, got {min_green_s}")
        if max_green_s <= min_green_s:
            raise ValueError(
                f"max_green_s ({max_green_s}) must be strictly greater than min_green_s ({min_green_s})"
            )
        if gap_threshold_s <= 0:
            raise ValueError(f"gap_threshold_s must be positive, got {gap_threshold_s}")
        if extension_step_s <= 0:
            raise ValueError(f"extension_step_s must be positive, got {extension_step_s}")

        self.min_green_s = float(min_green_s)
        self.max_green_s = float(max_green_s)
        self.gap_threshold_s = float(gap_threshold_s)
        self.extension_step_s = float(extension_step_s)

    def evaluate_step(
        self, elapsed_green_s: float, current_headway_s: float
    ) -> tuple[bool, float, str]:
        """
        Evaluates the current green phase state against Decision Zone vehicle headway.

        Parameters:
            elapsed_green_s: Total seconds elapsed since the start of the current green phase.
            current_headway_s: Measured time headway (t_gap) in seconds between vehicles in the Decision Zone.

        Returns:
            Tuple of:
            - should_continue (bool): True if green continues, False if phase must terminate.
            - extension_duration_s (float): Number of seconds to extend or hold.
            - reason (str): Semantic reason code:
                * "HOLD_MINIMUM": Elapsed time is less than min_green_s.
                * "MAX_GREEN_TERMINATE": Elapsed time has reached or exceeded max_green_s.
                * "GAP_CONTINUED_EXTEND": Vehicles detected with headway <= gap_threshold_s.
                * "GAP_OUT_EARLY_TERMINATE": Headway exceeded gap_threshold_s (traffic gap detected).
        """
        elapsed = float(elapsed_green_s)
        headway = float(current_headway_s)

        # 1. Enforce minimum green interval
        if elapsed < self.min_green_s:
            remaining_min = round(self.min_green_s - elapsed, 2)
            return True, remaining_min, "HOLD_MINIMUM"

        # 2. Enforce maximum green ceiling
        if elapsed >= self.max_green_s:
            return False, 0.0, "MAX_GREEN_TERMINATE"

        # 3. Gap detection within Decision Zone
        if headway <= self.gap_threshold_s:
            # Check how much green remains before hitting max_green_s
            remaining_to_max = self.max_green_s - elapsed
            step = min(self.extension_step_s, remaining_to_max)
            return True, round(step, 2), "GAP_CONTINUED_EXTEND"
        else:
            # Gap out: headway is too large (platoon depleted)
            return False, 0.0, "GAP_OUT_EARLY_TERMINATE"
