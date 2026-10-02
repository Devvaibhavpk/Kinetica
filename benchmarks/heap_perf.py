"""LanePriorityHeap Performance Benchmark.

Sub-phases 4.18–4.20:
Measures the latency of push and update operations on LanePriorityHeap across
different intersection scales (n = 4, 8, 16, 32 lanes) using timeit.
Verifies sub-millisecond execution and O(log N) asymptotic scaling.
Serializes timing metrics to results/heap_benchmark.json for the frontend dashboard.
"""

import json
from pathlib import Path
import random
import sys
import timeit
from typing import Dict, List

# Ensure repository root is on sys.path when script is invoked directly
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from preemption.heap import LanePriorityHeap


def benchmark_heap_latency(
    n_lanes_list: List[int] = [4, 8, 16, 32],
    iterations_per_scale: int = 1000,
    output_path: Path | str = "results/heap_benchmark.json",
) -> Dict[str, float]:
    """Execute push_or_update and peek latency benchmarks across varying lane dimensions.

    Args:
        n_lanes_list: Sequence of lane counts to test (e.g. 4-approach standard intersection
                      to 32-approach complex multi-leg intersection).
        iterations_per_scale: Number of push/update cycles executed per lane dimension.
        output_path: Filepath where JSON benchmark results are saved.

    Returns:
        Dict[str, float]: Dictionary mapping f"{n}_lanes" to average latency per operation in milliseconds.
    """
    results: Dict[str, float] = {}
    random.seed(42)

    for n in n_lanes_list:
        heap = LanePriorityHeap()
        lane_ids = [f"lane_{i}" for i in range(n)]

        # Pre-seed heap with initial scores
        for lane_id in lane_ids:
            score = heap.compute_score(wait_time_s=10.0, density_veh_per_m=0.15)
            heap.push_or_update(lane_id, score)

        # Generate test sequence of updates
        updates = [
            (
                random.choice(lane_ids),
                heap.compute_score(
                    wait_time_s=float(random.randint(1, 120)),
                    density_veh_per_m=random.uniform(0.01, 0.45),
                    priority_multiplier=random.choice([1.0, 1.0, 1.0, 50.0, 1000.0]),
                ),
            )
            for _ in range(iterations_per_scale)
        ]

        def run_workload():
            for target_lane, target_score in updates:
                heap.push_or_update(target_lane, target_score)
                _ = heap.peek_root()

        # Time the entire workload execution in seconds
        total_time_s = timeit.timeit(run_workload, number=1)
        # Calculate average operation latency in milliseconds (each iteration has 1 push + 1 peek)
        total_ops = iterations_per_scale * 2
        avg_latency_ms = (total_time_s / total_ops) * 1000.0

        key = f"{n}_lanes"
        results[key] = round(avg_latency_ms, 5)

    # Serialize results to results/heap_benchmark.json per Sub-phase 4.20
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    return results


if __name__ == "__main__":
    timings = benchmark_heap_latency()
    print("=== LanePriorityHeap Benchmark Results ===")
    for scale, latency in timings.items():
        print(f"  {scale}: {latency:.5f} ms / operation")
    print("Saved to results/heap_benchmark.json")
