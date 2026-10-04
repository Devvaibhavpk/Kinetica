"""
preemption/tests/test_emergency_hold.py — Tests for Safe Yellow Clearance & Track-ID Green Hold
"""

import pytest
from schemas.lane_state import PhaseReason
from preemption.emergency_hold import EmergencyHoldController


def test_conflicting_phase_triggers_mandatory_yellow_clearance():
    """
    If conflicting lane (e.g. Approach-E) is currently green, emergency preemption
    on Approach-N must mandate a 3.0s Yellow clearance interval before switching.
    """
    controller = EmergencyHoldController(yellow_clearance_s=3.0)

    decision = controller.trigger_preemption(
        target_lane="Approach-N",
        active_lane="Approach-E",
        emergency_track_id=101,
    )

    assert decision["status"] == "YELLOW_CLEARANCE"
    assert decision["target_lane"] == "Approach-N"
    assert decision["active_lane"] == "Approach-E"
    assert decision["yellow_duration_s"] == 3.0
    assert decision["hold_active"] is False
    assert decision["reason"] == PhaseReason.SCHEDULED
    assert controller.state == EmergencyHoldController.STATE_YELLOW_CLEARANCE


def test_yellow_clearance_completion_activates_green_corridor():
    """
    Once the 3.0s yellow interval finishes, the target approach receives green preemption.
    """
    controller = EmergencyHoldController(yellow_clearance_s=3.0)
    controller.trigger_preemption("Approach-N", "Approach-W", emergency_track_id=102)

    green_decision = controller.complete_yellow_clearance()

    assert green_decision["status"] == "GREEN_PREEMPTED"
    assert green_decision["active_lane"] == "Approach-N"
    assert green_decision["hold_active"] is True
    assert green_decision["reason"] == PhaseReason.PREEMPTED
    assert controller.is_holding_green() is True


def test_target_already_green_immediate_preemption_hold():
    """
    If the approaching ambulance is already on the active green lane, no yellow clearance
    is required; the green light is immediately locked into preemption hold.
    """
    controller = EmergencyHoldController(yellow_clearance_s=3.0)

    decision = controller.trigger_preemption(
        target_lane="lane_S",
        active_lane="lane_S",
        emergency_track_id=105,
    )

    assert decision["status"] == "GREEN_PREEMPTED"
    assert decision["yellow_duration_s"] == 0.0
    assert decision["hold_active"] is True
    assert decision["reason"] == PhaseReason.PREEMPTED
    assert controller.is_holding_green() is True


def test_green_corridor_held_until_target_track_id_clears_exit_roi():
    """
    Asserts that green hold remains active while vehicle is crossing, and terminates
    immediately once the vehicle's unique tracking ID clears the exit ROI.
    """
    controller = EmergencyHoldController()
    controller.trigger_preemption("Approach-N", "Approach-N", emergency_track_id=77)

    # Frame 1-3: Ambulance is approaching stop line -> hold continues
    assert controller.update_tracking(emergency_track_id=77, has_cleared_exit_roi=False) is True
    assert controller.is_holding_green() is True

    # Frame 4: Another vehicle (track 12) exits -> hold must NOT release!
    assert controller.update_tracking(emergency_track_id=12, has_cleared_exit_roi=True) is True
    assert controller.is_holding_green() is True

    # Frame 5: Target ambulance (track 77) fully clears exit ROI -> hold is released!
    assert controller.update_tracking(emergency_track_id=77, has_cleared_exit_roi=True) is False
    assert controller.is_holding_green() is False
    assert controller.state == EmergencyHoldController.STATE_CLEARED


def test_invalid_yellow_clearance_duration():
    with pytest.raises(ValueError, match="yellow_clearance_s must be non-negative"):
        EmergencyHoldController(yellow_clearance_s=-1.0)
