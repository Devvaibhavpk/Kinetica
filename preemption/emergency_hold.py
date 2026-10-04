"""
preemption/emergency_hold.py — Priority Routing with Safe Yellow Clearance & Green Corridor Hold

Enforces safe two-stage preemption for emergency vehicles:
1. Mandatory 3.0-second Yellow clearance on conflicting active approaches to clear the intersection safely.
2. Indefinite Green corridor hold on the target approach until the emergency vehicle's unique tracking ID
   is confirmed to have cleared the intersection exit clearance ROI.
"""

from __future__ import annotations

from typing import Any, Optional
from schemas.lane_state import PhaseReason


class EmergencyHoldController:
    """
    Emergency Priority Hold Controller.

    Coordinates safe signal transitions for emergency vehicles (Ambulance, Police, Fire).
    Guarantees conflicting traffic clears under yellow before granting emergency green,
    and sustains the green corridor until the vehicle's unique track_id clears the exit ROI.
    """

    STATE_IDLE = "IDLE"
    STATE_YELLOW_CLEARANCE = "YELLOW_CLEARANCE"
    STATE_GREEN_HOLD = "GREEN_HOLD"
    STATE_CLEARED = "CLEARED"

    def __init__(self, yellow_clearance_s: float = 3.0) -> None:
        if yellow_clearance_s < 0:
            raise ValueError(f"yellow_clearance_s must be non-negative, got {yellow_clearance_s}")
        self.yellow_clearance_s = float(yellow_clearance_s)

        self.state: str = self.STATE_IDLE
        self.target_lane: Optional[str] = None
        self.conflicting_lane: Optional[str] = None
        self.emergency_track_id: Optional[int] = None
        self.hold_active: bool = False

    def trigger_preemption(
        self,
        target_lane: str,
        active_lane: str,
        emergency_track_id: Optional[int] = None,
    ) -> dict[str, Any]:
        """
        Triggers emergency preemption for a target approach.

        If a conflicting approach is currently active, enforces a mandatory yellow clearance interval.
        If the target approach is already green, immediately promotes and holds green.

        Parameters:
            target_lane: Identifier of the approach containing the approaching emergency vehicle.
            active_lane: Identifier of the currently active green approach.
            emergency_track_id: Unique integer tracking ID assigned by OCSortTracker.

        Returns:
            Dictionary with transition directives:
            {
                "status": "YELLOW_CLEARANCE" | "GREEN_PREEMPTED",
                "target_lane": str,
                "active_lane": str,
                "yellow_duration_s": float,
                "hold_active": bool,
                "reason": PhaseReason,
            }
        """
        self.target_lane = target_lane
        self.emergency_track_id = emergency_track_id

        # Case 1: Conflicting lane is active -> Must safely clear with Yellow
        if active_lane != target_lane:
            self.state = self.STATE_YELLOW_CLEARANCE
            self.conflicting_lane = active_lane
            self.hold_active = False

            return {
                "status": "YELLOW_CLEARANCE",
                "target_lane": self.target_lane,
                "active_lane": active_lane,
                "yellow_duration_s": self.yellow_clearance_s,
                "hold_active": False,
                "reason": PhaseReason.SCHEDULED,
            }

        # Case 2: Target lane is already active -> Immediately enter Green Hold
        self.state = self.STATE_GREEN_HOLD
        self.conflicting_lane = None
        self.hold_active = True

        return {
            "status": "GREEN_PREEMPTED",
            "target_lane": self.target_lane,
            "active_lane": target_lane,
            "yellow_duration_s": 0.0,
            "hold_active": True,
            "reason": PhaseReason.PREEMPTED,
        }

    def complete_yellow_clearance(self) -> dict[str, Any]:
        """
        Completes the yellow clearance interval and activates the green corridor hold.
        """
        if self.state != self.STATE_YELLOW_CLEARANCE:
            raise RuntimeError(
                f"Cannot complete yellow clearance from state '{self.state}'. Must be in 'YELLOW_CLEARANCE'."
            )

        self.state = self.STATE_GREEN_HOLD
        self.hold_active = True

        return {
            "status": "GREEN_PREEMPTED",
            "target_lane": self.target_lane,
            "active_lane": self.target_lane,
            "yellow_duration_s": 0.0,
            "hold_active": True,
            "reason": PhaseReason.PREEMPTED,
        }

    def update_tracking(self, emergency_track_id: int, has_cleared_exit_roi: bool) -> bool:
        """
        Updates the green hold status based on tracking information from the exit clearance ROI.

        Parameters:
            emergency_track_id: Integer tracking ID of the vehicle passing the intersection.
            has_cleared_exit_roi: Boolean indicating whether the vehicle has passed the exit clearance polygon.

        Returns:
            bool: True if Green corridor remains HELD; False if vehicle has cleared and hold is RELEASED.
        """
        # If tracking matches our emergency vehicle (or none was pinned)
        if self.emergency_track_id is None or emergency_track_id == self.emergency_track_id:
            if not has_cleared_exit_roi:
                # Vehicle is still within intersection approach or junction box -> Hold green
                self.state = self.STATE_GREEN_HOLD
                self.hold_active = True
                return True
            else:
                # Vehicle has fully cleared the exit ROI -> Release green hold safely
                self.state = self.STATE_CLEARED
                self.hold_active = False
                return False

        # Unrelated track ID does not alter preemption state
        return self.hold_active

    def is_holding_green(self) -> bool:
        """Returns True if the controller is actively holding green for an emergency vehicle."""
        return self.state == self.STATE_GREEN_HOLD and self.hold_active

    def reset(self) -> None:
        """Resets the controller back to IDLE state."""
        self.state = self.STATE_IDLE
        self.target_lane = None
        self.conflicting_lane = None
        self.emergency_track_id = None
        self.hold_active = False
