from typing import Iterator
from datetime import datetime, timedelta
import random
from schemas.lane_state import LaneObservation, PriorityEvent, VehicleClass

def generate_scenario(
    scenario_name: str,
    duration_s: int,
    lanes: list[str] = ["lane_N", "lane_S", "lane_E", "lane_W"],
    ambulance_injection_time_s: int | None = None,
    ambulance_lane: str | None = None,
) -> Iterator[LaneObservation | PriorityEvent]:
    """
    Yields a scripted LaneObservation stream: baseline Poisson arrivals
    per lane, with an optional single PriorityEvent injected at a fixed time.
    """
    if scenario_name not in ["queue_buildup", "corridor_ambulance"]:
        raise NotImplementedError(f"Scenario {scenario_name} not implemented")

    start_time = datetime.now()
    queue_lengths = {lane: 0.0 for lane in lanes}
    vehicle_counts = {lane: 0 for lane in lanes}
    
    ambulance_injected = False
    
    for t in range(duration_s):
        current_time = start_time + timedelta(seconds=t)
        
        # Inject ambulance if specified
        if scenario_name == "corridor_ambulance" and ambulance_injection_time_s is not None and t == ambulance_injection_time_s:
            if not ambulance_injected and ambulance_lane in lanes:
                yield PriorityEvent(
                    lane_id=ambulance_lane,
                    vehicle_class=VehicleClass.AMBULANCE,
                    detected_at=current_time,
                    confidence=0.95
                )
                ambulance_injected = True
                
        for lane in lanes:
            # Update state based on scenario
            if scenario_name == "queue_buildup":
                # Vehicles arrive faster than they can leave (simulating red light)
                arrivals = random.choices([0, 1, 2], weights=[0.5, 0.4, 0.1])[0]
                vehicle_counts[lane] += arrivals
                queue_lengths[lane] += arrivals * 5.0  # 5m per vehicle
            elif scenario_name == "corridor_ambulance":
                # Baseline arrivals
                arrivals = random.choices([0, 1], weights=[0.8, 0.2])[0]
                vehicle_counts[lane] = max(0, vehicle_counts[lane] + arrivals - (1 if random.random() < 0.3 else 0))
                queue_lengths[lane] = vehicle_counts[lane] * 5.0
            
            density = vehicle_counts[lane] / max(1.0, queue_lengths[lane]) if queue_lengths[lane] > 0 else 0.0
            
            yield LaneObservation(
                lane_id=lane,
                timestamp=current_time,
                vehicle_count=vehicle_counts[lane],
                queue_length_m=queue_lengths[lane],
                density_veh_per_m=density,
                class_counts={VehicleClass.STANDARD: vehicle_counts[lane]}
            )

