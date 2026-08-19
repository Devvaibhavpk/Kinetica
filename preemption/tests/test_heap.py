from preemption.heap import LanePriorityHeap

def test_aging_prevents_starvation():
    heap = LanePriorityHeap()
    # Continuous high-density lane
    heap.push_or_update("lane_dense", heap.compute_score(wait_time_s=0, density_veh_per_m=0.8, priority_multiplier=1.0))
    # Low-density waiting lane
    heap.push_or_update("lane_starved", heap.compute_score(wait_time_s=0, density_veh_per_m=0.01, priority_multiplier=1.0))

    # Simulate time aging for starved lane
    for wait in range(1, 2000):
        score_dense = heap.compute_score(wait_time_s=0, density_veh_per_m=0.8, priority_multiplier=1.0)
        score_starved = heap.compute_score(wait_time_s=wait, density_veh_per_m=0.01, priority_multiplier=1.0)
        heap.push_or_update("lane_dense", score_dense)
        heap.push_or_update("lane_starved", score_starved)
        if heap.peek_root() == "lane_starved":
            break

    assert heap.peek_root() == "lane_starved", "Aging failed to elevate starved lane to root"

def test_priority_event_forces_root():
    """
    SC2: Asserts that a priority vehicle event forces its lane to become root of heap.
    """
    heap = LanePriorityHeap()
    heap.push_or_update("lane_1", heap.compute_score(wait_time_s=10, density_veh_per_m=0.5, priority_multiplier=1.0))
    heap.push_or_update("lane_2", heap.compute_score(wait_time_s=10, density_veh_per_m=0.6, priority_multiplier=1.0))

    # Introduce ambulance on lane_3 with 1000x multiplier
    amb_score = heap.compute_score(wait_time_s=2, density_veh_per_m=0.2, priority_multiplier=1000.0)
    heap.push_or_update("lane_ambulance", amb_score)

    assert heap.peek_root() == "lane_ambulance", f"Expected lane_ambulance, got {heap.peek_root()}"
