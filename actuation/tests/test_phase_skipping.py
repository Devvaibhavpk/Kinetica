"""
actuation/tests/test_phase_skipping.py — Tests for Strategy C: Zero-Demand Phase Skipping
"""

import pytest
from actuation.strategies.phase_skipping import PhaseSkippingCoordinator


def test_skip_empty_phase_east():
    """
    Given phases [N, S, E, W] with E=0, assert output active phases is [N, S, W].
    """
    coordinator = PhaseSkippingCoordinator(
        scheduled_phases=["Approach-N", "Approach-S", "Approach-E", "Approach-W"]
    )
    counts = {
        "Approach-N": 15,
        "Approach-S": 10,
        "Approach-E": 0,
        "Approach-W": 7,
    }

    active = coordinator.get_active_phases(counts)
    assert active == ["Approach-N", "Approach-S", "Approach-W"]


def test_skip_multiple_empty_phases():
    """
    When only one approach has vehicles, only that approach is selected.
    """
    coordinator = PhaseSkippingCoordinator(
        scheduled_phases=["lane_N", "lane_S", "lane_E", "lane_W"]
    )
    counts = {"lane_N": 8, "lane_S": 0, "lane_E": 0, "lane_W": 0}

    active = coordinator.get_active_phases(counts)
    assert active == ["lane_N"]


def test_all_phases_empty_fallback_to_scheduled_cycle():
    """
    If zero traffic is detected across all approaches, fall back to default cycle.
    """
    phases = ["Approach-N", "Approach-S", "Approach-E", "Approach-W"]
    coordinator = PhaseSkippingCoordinator(scheduled_phases=phases)
    counts = {p: 0 for p in phases}

    active = coordinator.get_active_phases(counts)
    assert active == phases


def test_get_next_phase_skipping_behavior():
    """
    Tests sequential next-phase determination skipping intermediate empty phases.
    """
    coordinator = PhaseSkippingCoordinator(
        scheduled_phases=["Approach-N", "Approach-S", "Approach-E", "Approach-W"]
    )
    counts = {
        "Approach-N": 10,
        "Approach-S": 10,
        "Approach-E": 0,  # Empty
        "Approach-W": 5,
    }

    # From N, next active is S
    assert coordinator.get_next_phase("Approach-N", counts) == "Approach-S"
    # From S, next active skips E and goes to W
    assert coordinator.get_next_phase("Approach-S", counts) == "Approach-W"
    # From W, next active wraps around to N
    assert coordinator.get_next_phase("Approach-W", counts) == "Approach-N"


def test_empty_schedule_raises_value_error():
    with pytest.raises(ValueError, match="cannot be empty"):
        PhaseSkippingCoordinator(scheduled_phases=[])
