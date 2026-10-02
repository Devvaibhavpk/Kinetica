"""Tests for Priority Queue Max-Heap and Success Criterion 2 (SC2).

Covers:
- Sub-phase 4.8: Starvation prevention invariant via aging over 10,000 seconds
- Sub-phase 4.9: Success Criterion 2 (SC2) validation gate
- Tombstone cleanup and score updates
- Emergency vehicle override multipliers
- School zone priority escalation
"""

from datetime import datetime
import pytest

from preemption.heap import LanePriorityHeap
from preemption.override import (
    PRIORITY_MULTIPLIERS,
    SCHOOL_ZONE_ESCALATION,
    apply_override,
)
from schemas.lane_state import PriorityEvent, VehicleClass


def test_aging_prevents_starvation():
    """Sub-phase 4.8: Anti-starvation invariant validation.

    Simulates 10,000 seconds where:
    - Main arterial lane ('lane_arterial') is heavily congested (density=0.3 veh/m)
      but repeatedly served, resetting its wait time to 0.
    - Side street lane ('lane_side_street') is empty (density=0.0 veh/m) but waits
      continuously without service.

    Demonstrates that the additive aging term monotonically increases the side street's
    score, eventually overtaking the constantly-refreshed dense arterial lane to force
    a phase transition, proving infinite starvation is impossible in Kinetica.
    """
    heap = LanePriorityHeap()

    # Score of dense lane that is constantly serviced (wait_time = 0, high density)
    dense_density = 0.35
    dense_score = heap.compute_score(wait_time_s=0.0, density_veh_per_m=dense_density, priority_multiplier=1.0)
    heap.push_or_update("lane_arterial", dense_score)

    starvation_prevented = False
    switch_second = -1

    for t_second in range(1, 10001):
        # Empty side street has zero density, but wait time ticks up every second
        empty_score = heap.compute_score(wait_time_s=float(t_second), density_veh_per_m=0.0, priority_multiplier=1.0)
        heap.push_or_update("lane_side_street", empty_score)

        # Check if aging has elevated the side street over the dense arterial
        if heap.peek_root() == "lane_side_street":
            starvation_prevented = True
            switch_second = t_second
            break

    assert starvation_prevented is True, "Aging mechanism failed: side street was starved for 10,000 seconds."
    assert 0 < switch_second < 100, f"Expected side street to overtake within reasonable horizon, took {switch_second}s."
    assert heap.peek_root() == "lane_side_street"


def test_priority_event_forces_root():
    """SC2 Validation Gate.

    Test ID: preemption/tests/test_heap.py::test_priority_event_forces_root
    build-spec.md § 4.9

    Asserts that when multiple dense standard lanes are queued in the priority heap,
    injecting a PriorityEvent for an emergency vehicle (ambulance with priority_multiplier=1000.0)
    instantly forces the emergency lane to the root of the heap ahead of FIFO or density ordering.
    """
    heap = LanePriorityHeap()

    # 1. Populate heap with several high-density standard traffic lanes
    dense_lanes = {
        "lane_N": (120.0, 0.40),  # 2 min wait, very heavy queue
        "lane_S": (90.0, 0.35),
        "lane_E": (60.0, 0.25),
    }

    for lane_id, (wait_s, density) in dense_lanes.items():
        score = heap.compute_score(wait_time_s=wait_s, density_veh_per_m=density, priority_multiplier=1.0)
        heap.push_or_update(lane_id, score)

    # Pre-condition: highest density/wait lane is currently root
    assert heap.peek_root() == "lane_N"

    # 2. Inject an emergency PriorityEvent (ambulance approaching on lane_W)
    now = datetime.now()
    event = PriorityEvent(
        lane_id="lane_W",
        vehicle_class=VehicleClass.AMBULANCE,
        detected_at=now,
        confidence=0.98,
    )

    mult = apply_override(event=event, is_school_zone=False)
    assert mult == 1000.0

    # Ambulance just arrived: wait_time is 0s, queue ahead may be short
    ambulance_score = heap.compute_score(wait_time_s=0.0, density_veh_per_m=0.10, priority_multiplier=mult)
    heap.push_or_update(event.lane_id, ambulance_score)

    # 3. SC2 Formal Assertion: emergency vehicle instantly seizes root
    assert heap.peek_root() == "lane_W", (
        f"SC2 FAILED: Expected emergency lane_W at heap root, got {heap.peek_root()}"
    )


def test_tombstone_mechanism_and_updates():
    """Verify that updating a lane's score purges outdated entries lazily without corruption."""
    heap = LanePriorityHeap()

    heap.push_or_update("lane_A", 10.0)
    heap.push_or_update("lane_B", 20.0)
    assert heap.peek_root() == "lane_B"

    # Update lane_A to have a much higher score than lane_B
    heap.push_or_update("lane_A", 50.0)
    assert heap.peek_root() == "lane_A"
    assert heap.size() == 2

    # Pop lane_A and ensure lane_B is next
    lane, score = heap.pop_root()
    assert lane == "lane_A"
    assert score == pytest.approx(50.0)
    assert heap.peek_root() == "lane_B"
    assert heap.size() == 1


def test_empty_heap_guards():
    """Verify IndexError is raised when peeking or popping an empty heap."""
    heap = LanePriorityHeap()

    assert heap.is_empty() is True
    assert len(heap) == 0

    with pytest.raises(IndexError, match="empty"):
        heap.peek_root()

    with pytest.raises(IndexError, match="empty"):
        heap.pop_root()


def test_school_zone_escalation_rules():
    """Verify apply_override applies 50x escalation for school vans in active zones."""
    now = datetime.now()

    van_event = PriorityEvent(
        lane_id="lane_school",
        vehicle_class=VehicleClass.SCHOOL_VAN,
        detected_at=now,
        confidence=0.92,
    )

    # Outside school zone: baseline 1.0 multiplier
    assert apply_override(van_event, is_school_zone=False) == 1.0

    # Inside active school zone: escalated 50.0 multiplier
    assert apply_override(van_event, is_school_zone=True) == SCHOOL_ZONE_ESCALATION
    assert SCHOOL_ZONE_ESCALATION == 50.0


def test_police_and_standard_multipliers():
    """Verify police gets 1000x and standard gets 1x priority."""
    now = datetime.now()

    police_event = PriorityEvent(
        lane_id="lane_E",
        vehicle_class=VehicleClass.POLICE,
        detected_at=now,
        confidence=0.99,
    )
    standard_event = PriorityEvent(
        lane_id="lane_E",
        vehicle_class=VehicleClass.STANDARD,
        detected_at=now,
        confidence=0.95,
    )

    assert apply_override(police_event) == 1000.0
    assert apply_override(standard_event) == 1.0
    assert PRIORITY_MULTIPLIERS[VehicleClass.AMBULANCE] == 1000.0
    assert PRIORITY_MULTIPLIERS[VehicleClass.POLICE] == 1000.0
