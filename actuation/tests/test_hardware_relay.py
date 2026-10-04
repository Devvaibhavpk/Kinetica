"""
actuation/tests/test_hardware_relay.py — Tests for Physical Signal Actuation Interface
"""

import pytest
from actuation.hardware_relay import (
    MockRelayController,
    JetsonGPIORelayController,
    IPRelayController,
)


def test_mock_relay_state_transitions():
    relay = MockRelayController()

    # Initial default state is RED
    assert relay.get_state("Approach-N") == "RED"

    # Transition: RED -> GREEN
    assert relay.set_state("Approach-N", "GREEN") is True
    assert relay.get_state("Approach-N") == "GREEN"

    # Transition: GREEN -> YELLOW
    assert relay.set_state("Approach-N", "YELLOW") is True
    assert relay.get_state("Approach-N") == "YELLOW"

    # Transition: YELLOW -> RED
    assert relay.set_state("Approach-N", "RED") is True
    assert relay.get_state("Approach-N") == "RED"

    assert len(relay.history) == 3


def test_safety_interlock_prevents_simultaneous_conflicting_greens():
    """
    CRITICAL SAFETY INTERLOCK: Conflicting lanes (e.g. Approach-N and Approach-E)
    must NEVER be GREEN simultaneously.
    """
    relay = MockRelayController()

    # Set North to GREEN
    relay.set_state("Approach-N", "GREEN")
    assert relay.get_state("Approach-N") == "GREEN"

    # Attempt to set conflicting East to GREEN -> Must trigger Safety Interlock Fault
    with pytest.raises(RuntimeError, match="SAFETY INTERLOCK FAULT"):
        relay.set_state("Approach-E", "GREEN")

    # East remains RED
    assert relay.get_state("Approach-E") == "RED"


def test_parallel_non_conflicting_lanes_can_be_green():
    """
    Non-conflicting parallel lanes (North and South) CAN both be GREEN simultaneously.
    """
    relay = MockRelayController()

    assert relay.set_state("Approach-N", "GREEN") is True
    assert relay.set_state("Approach-S", "GREEN") is True

    assert relay.get_state("Approach-N") == "GREEN"
    assert relay.get_state("Approach-S") == "GREEN"


def test_invalid_signal_color():
    relay = MockRelayController()
    with pytest.raises(ValueError, match="Invalid signal state"):
        relay.set_state("Approach-N", "BLUE")


def test_jetson_gpio_simulation_mode():
    gpio_relay = JetsonGPIORelayController()
    assert gpio_relay.set_state("Approach-N", "GREEN") is True
    assert gpio_relay.get_state("Approach-N") == "GREEN"

    assert gpio_relay.set_state("Approach-N", "YELLOW") is True
    assert gpio_relay.get_state("Approach-N") == "YELLOW"


def test_ip_relay_controller():
    ip_relay = IPRelayController(base_url="http://10.0.0.50/api/relays")
    assert ip_relay.set_state("Approach-W", "GREEN") is True
    assert ip_relay.get_state("Approach-W") == "GREEN"
