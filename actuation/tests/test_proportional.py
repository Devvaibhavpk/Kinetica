"""
actuation/tests/test_proportional.py — Tests for Strategy A: Proportional Volume Allocation
"""

import pytest
from actuation.strategies.proportional import ProportionalVolumeAllocator


def test_proportional_ratio_40_10_allocation():
    """
    Asserts that a 40:10 waiting vehicle ratio with 100s cycle splits exactly 80s / 20s.
    """
    allocator = ProportionalVolumeAllocator(
        cycle_time_s=100.0,
        min_green_s=10.0,
        max_green_s=85.0,
    )
    counts = {"North-South": 40, "East-West": 10}
    splits = allocator.compute_green_splits(counts)

    assert splits["North-South"] == 80.0
    assert splits["East-West"] == 20.0


def test_clamping_at_gmin_and_gmax():
    """
    Asserts that green times strictly respect min_green_s and max_green_s bounds.
    """
    allocator = ProportionalVolumeAllocator(
        cycle_time_s=100.0,
        min_green_s=15.0,
        max_green_s=60.0,
    )
    # Extreme imbalance: 99 vs 1
    counts = {"Arterial": 99, "SideStreet": 1}
    splits = allocator.compute_green_splits(counts)

    # Raw 99s clamped to 60s, raw 1s clamped to 15s
    assert splits["Arterial"] == 60.0
    assert splits["SideStreet"] == 15.0


def test_zero_vehicles_equal_distribution():
    """
    Asserts that when all approaches have zero demand, green time is equally distributed.
    """
    allocator = ProportionalVolumeAllocator(
        cycle_time_s=100.0,
        min_green_s=10.0,
        max_green_s=60.0,
    )
    counts = {"Approach-N": 0, "Approach-S": 0, "Approach-E": 0, "Approach-W": 0}
    splits = allocator.compute_green_splits(counts)

    assert len(splits) == 4
    for lane_id, green in splits.items():
        assert green == 25.0


def test_multi_approach_four_way_split():
    """
    Tests standard 4-way intersection volume distribution.
    """
    allocator = ProportionalVolumeAllocator(
        cycle_time_s=120.0,
        min_green_s=10.0,
        max_green_s=60.0,
    )
    # Total = 60 vehicles
    counts = {
        "lane_N": 20, # 20/60 * 120 = 40.0s
        "lane_S": 20, # 20/60 * 120 = 40.0s
        "lane_E": 10, # 10/60 * 120 = 20.0s
        "lane_W": 10, # 10/60 * 120 = 20.0s
    }
    splits = allocator.compute_green_splits(counts)

    assert splits["lane_N"] == 40.0
    assert splits["lane_S"] == 40.0
    assert splits["lane_E"] == 20.0
    assert splits["lane_W"] == 20.0


def test_empty_counts_dictionary():
    allocator = ProportionalVolumeAllocator()
    assert allocator.compute_green_splits({}) == {}


def test_invalid_parameters():
    with pytest.raises(ValueError, match="cycle_time_s must be positive"):
        ProportionalVolumeAllocator(cycle_time_s=-50.0)

    with pytest.raises(ValueError, match="cannot be less than min_green_s"):
        ProportionalVolumeAllocator(min_green_s=50.0, max_green_s=30.0)
