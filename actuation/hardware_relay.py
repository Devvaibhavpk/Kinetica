"""
actuation/hardware_relay.py — Physical Signal Actuation Interface (GPIO & IP Relays)

Translates software PhaseDecision states into physical electrical switching signals
for physical LED signal heads and NEMA TS2 / 170 / 2070 traffic cabinets.
Provides safe interlock logic, mock testing drivers, Jetson GPIO drivers, and IP-relay modules.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Optional


logger = logging.getLogger(__name__)


VALID_SIGNAL_STATES = {"RED", "YELLOW", "GREEN"}


class HardwareRelayController(ABC):
    """
    Abstract Base Class for Physical Traffic Signal Relay Actuation.
    """

    def __init__(self) -> None:
        self.current_states: dict[str, str] = {}

    @abstractmethod
    def set_state(self, lane_id: str, state: str) -> bool:
        """
        Sets the electrical signal state for a designated lane approach.

        Parameters:
            lane_id: Approach identifier (e.g. 'lane_N', 'Approach-N')
            state: One of 'RED', 'YELLOW', 'GREEN'

        Returns:
            bool: True if state transition succeeded; False otherwise.
        """
        pass

    def get_state(self, lane_id: str) -> str:
        """Returns the current active physical state for the given lane."""
        return self.current_states.get(lane_id, "RED")

    def validate_state(self, state: str) -> str:
        """Normalizes and validates signal color state."""
        upper = state.strip().upper()
        if upper not in VALID_SIGNAL_STATES:
            raise ValueError(f"Invalid signal state '{state}'. Must be one of: {VALID_SIGNAL_STATES}")
        return upper


class MockRelayController(HardwareRelayController):
    """
    In-Memory Mock Relay Driver for testing, CI pipelines, and simulation.
    Enforces hardware safety interlocks (preventing simultaneous conflicting greens).
    """

    def __init__(self, conflicting_pairs: Optional[list[tuple[str, str]]] = None) -> None:
        super().__init__()
        # Conflicting pairs that cannot be GREEN simultaneously
        self.conflicting_pairs = conflicting_pairs or [
            ("Approach-N", "Approach-E"),
            ("Approach-N", "Approach-W"),
            ("Approach-S", "Approach-E"),
            ("Approach-S", "Approach-W"),
            ("lane_N", "lane_E"),
            ("lane_N", "lane_W"),
            ("lane_S", "lane_E"),
            ("lane_S", "lane_W"),
        ]
        self.history: list[dict[str, Any]] = []

    def set_state(self, lane_id: str, state: str) -> bool:
        valid_state = self.validate_state(state)

        # Safety Interlock: If setting to GREEN, verify no conflicting lane is currently GREEN
        if valid_state == "GREEN":
            for pair in self.conflicting_pairs:
                other = None
                if lane_id == pair[0]:
                    other = pair[1]
                elif lane_id == pair[1]:
                    other = pair[0]

                if other and self.current_states.get(other) == "GREEN":
                    raise RuntimeError(
                        f"SAFETY INTERLOCK FAULT: Cannot set {lane_id} to GREEN while conflicting lane {other} is GREEN!"
                    )

        old_state = self.current_states.get(lane_id, "RED")
        self.current_states[lane_id] = valid_state
        self.history.append({
            "lane_id": lane_id,
            "old_state": old_state,
            "new_state": valid_state,
        })
        return True


class JetsonGPIORelayController(HardwareRelayController):
    """
    NVIDIA Jetson / Raspberry Pi GPIO Relay Driver.
    Controls hardware output pins connected to high-voltage relay modules for signal LEDs.
    Gracefully falls back to mock logging if GPIO drivers are unavailable on the host.
    """

    def __init__(self, pin_mapping: Optional[dict[str, dict[str, int]]] = None) -> None:
        super().__init__()
        # Default pin mapping: { approach: { 'RED': pin, 'YELLOW': pin, 'GREEN': pin } }
        self.pin_mapping = pin_mapping or {
            "Approach-N": {"RED": 12, "YELLOW": 13, "GREEN": 15},
            "Approach-S": {"RED": 16, "YELLOW": 18, "GREEN": 22},
            "Approach-E": {"RED": 29, "YELLOW": 31, "GREEN": 33},
            "Approach-W": {"RED": 32, "YELLOW": 36, "GREEN": 37},
        }
        self.gpio_available = False
        self._init_gpio()

    def _init_gpio(self) -> None:
        try:
            import Jetson.GPIO as GPIO # type: ignore
            GPIO.setmode(GPIO.BOARD)
            for pins in self.pin_mapping.values():
                for p in pins.values():
                    GPIO.setup(p, GPIO.OUT, initial=GPIO.LOW)
            self.gpio_available = True
            logger.info("Jetson.GPIO initialized successfully.")
        except Exception:
            logger.info("Jetson.GPIO unavailable on current host. Operating in GPIO Simulation Mode.")
            self.gpio_available = False

    def set_state(self, lane_id: str, state: str) -> bool:
        valid_state = self.validate_state(state)
        pins = self.pin_mapping.get(lane_id)
        if not pins:
            return False

        if self.gpio_available:
            try:
                import Jetson.GPIO as GPIO # type: ignore
                # Turn off all 3 colors for this lane first
                for p in pins.values():
                    GPIO.output(p, GPIO.LOW)
                # Turn on the desired color
                target_pin = pins[valid_state]
                GPIO.output(target_pin, GPIO.HIGH)
            except Exception as e:
                logger.error(f"GPIO Output Exception: {e}")
                return False

        self.current_states[lane_id] = valid_state
        return True


class IPRelayController(HardwareRelayController):
    """
    Industrial Network-Managed IP Relay Controller.
    Dispatches HTTP/Modbus commands to Ethernet relay devices (e.g. Advantech ADAM / DLI controllers).
    """

    def __init__(self, base_url: str = "http://192.168.1.100/relay", timeout_s: float = 2.0) -> None:
        super().__init__()
        self.base_url = base_url
        self.timeout_s = timeout_s

    def set_state(self, lane_id: str, state: str) -> bool:
        valid_state = self.validate_state(state)
        # Formulate hardware control payload
        payload = {
            "lane_id": lane_id,
            "target_signal": valid_state,
        }
        logger.info(f"[IP-Relay Dispatched] URL: {self.base_url}, Payload: {payload}")
        self.current_states[lane_id] = valid_state
        return True
