"""
actuation/tests/test_gap_extension.py — Tests for Strategy B: Dynamic Extension with Gap Detection
"""

import pytest
from actuation.strategies.gap_extension import GapExtensionController


def test_hold_minimum_green_despite_large_headway():
    """
    Even if a gap occurs early, minimum green interval MUST be completed.
    """
    controller = GapExtensionController(
        min_green_s=10.0,
        max_green_s=60.0,
        gap_threshold_s=2.5,
        extension_step_s=2.0,
    )

    should_cont, ext, reason = controller.evaluate_step(
        elapsed_green_s=4.0,
        current_headway_s=8.0, # Large gap in traffic
    )

    assert should_cont is True
    assert ext == 6.0 # 10.0 - 4.0
    assert reason == "HOLD_MINIMUM"


def test_gap_continued_extension():
    """
    When elapsed > min_green and headway <= gap_threshold, grant extension.
    """
    controller = GapExtensionController(
        min_green_s=10.0,
        max_green_s=60.0,
        gap_threshold_s=2.5,
        extension_step_s=2.0,
    )

    should_cont, ext, reason = controller.evaluate_step(
        elapsed_green_s=15.0,
        current_headway_s=1.8, # Continuous traffic flow
    )

    assert should_cont is True
    assert ext == 2.0
    assert reason == "GAP_CONTINUED_EXTEND"


def test_gap_out_early_termination():
    """
    When elapsed >= min_green and headway > gap_threshold, terminate early.
    """
    controller = GapExtensionController(
        min_green_s=10.0,
        max_green_s=60.0,
        gap_threshold_s=2.5,
        extension_step_s=2.0,
    )

    should_cont, ext, reason = controller.evaluate_step(
        elapsed_green_s=18.0,
        current_headway_s=3.2, # Headway gap exceeded threshold
    )

    assert should_cont is False
    assert ext == 0.0
    assert reason == "GAP_OUT_EARLY_TERMINATE"


def test_max_green_termination():
    """
    When elapsed >= max_green, terminate immediately regardless of approaching traffic.
    """
    controller = GapExtensionController(
        min_green_s=10.0,
        max_green_s=60.0,
        gap_threshold_s=2.5,
        extension_step_s=2.0,
    )

    should_cont, ext, reason = controller.evaluate_step(
        elapsed_green_s=60.0,
        current_headway_s=0.8, # Platoon still present
    )

    assert should_cont is False
    assert ext == 0.0
    assert reason == "MAX_GREEN_TERMINATE"


def test_extension_step_capped_near_max_green():
    """
    Extension step must not exceed remaining time up to max_green.
    """
    controller = GapExtensionController(
        min_green_s=10.0,
        max_green_s=50.0,
        gap_threshold_s=2.5,
        extension_step_s=3.0,
    )

    should_cont, ext, reason = controller.evaluate_step(
        elapsed_green_s=48.5,
        current_headway_s=1.2,
    )

    assert should_cont is True
    assert ext == 1.5 # Only 1.5s remains before reaching 50.0s
    assert reason == "GAP_CONTINUED_EXTEND"


def test_invalid_parameters():
    with pytest.raises(ValueError, match="min_green_s must be non-negative"):
        GapExtensionController(min_green_s=-5.0)

    with pytest.raises(ValueError, match="must be strictly greater than min_green_s"):
        GapExtensionController(min_green_s=30.0, max_green_s=30.0)

    with pytest.raises(ValueError, match="gap_threshold_s must be positive"):
        GapExtensionController(gap_threshold_s=0.0)
