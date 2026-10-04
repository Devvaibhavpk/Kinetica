"""
benchmarks/edge_benchmark.py — Closed-Loop Perception-to-Actuation Edge Benchmark

Executes 1,000 frames through the complete closed loop:
  ROIManager -> YOLOv8/ONNX Detector -> OCSortTracker -> Actuation Strategies
Profiles 50th, 95th, and 99th percentile latencies and writes summary to
results/edge_hardware_benchmark.json.
Asserts that 95th percentile latency <= 33.3ms (>= 30 FPS).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np

# Add project root to sys.path for direct CLI execution
REPO_ROOT = str(Path(__file__).resolve().parent.parent)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Safe OpenMP initialization on Windows
if sys.platform == "win32":
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from actuation.strategies.gap_extension import GapExtensionController
from actuation.strategies.phase_skipping import PhaseSkippingCoordinator
from actuation.strategies.proportional import ProportionalVolumeAllocator
from vision.model_zoo import get_detector
from vision.roi_manager import ROIManager
from vision.tracker import OCSortTracker


def generate_benchmark_frame(frame_idx: int, width: int = 640, height: int = 640) -> np.ndarray:
    """
    Generates a deterministic synthetic 640x640 traffic frame with moving vehicle shapes
    for reproducible edge benchmarking.
    """
    frame = np.full((height, width, 3), 40, dtype=np.uint8)

    # Road asphalt lanes
    frame[:, 260:380] = 55
    frame[260:380, :] = 55

    # Moving vehicles across frames
    y_pos = int((frame_idx * 6) % (height - 80))
    x_pos = int((frame_idx * 8) % (width - 80))

    # Vehicle 1 (North-South car: silver)
    frame[y_pos : y_pos + 50, 290:350] = [180, 180, 180]
    # Vehicle 2 (East-West truck: blue)
    frame[300:350, x_pos : x_pos + 70] = [200, 100, 50]

    return frame


def run_edge_benchmark(
    num_frames: int = 1000,
    output_path: str | Path = "results/edge_hardware_benchmark.json",
    assert_realtime: bool = True,
) -> dict[str, Any]:
    """
    Runs the closed-loop edge benchmark across num_frames.

    Parameters:
        num_frames: Total number of frames to profile (default: 1,000).
        output_path: Path to save the benchmark summary JSON artifact.
        assert_realtime: If True, asserts p95 latency <= 33.3ms (>= 30 FPS).

    Returns:
        Dictionary containing latency percentiles, throughput metrics, and validation status.
    """
    print("=" * 68)
    print(f"   PROJECT KINETICA: CLOSED-LOOP EDGE PIPELINE BENCHMARK")
    print(f"   Target: {num_frames} frames through Perception -> Tracking -> Actuation")
    print("=" * 68)

    # 1. Initialize Pipeline Modules
    proj_root = Path(__file__).resolve().parent.parent
    calib_file = proj_root / "data" / "calibration" / "intersection_rois.json"
    roi_manager = ROIManager(calib_file)

    detector = get_detector("yolov8")
    tracker = OCSortTracker(max_age=15, min_hits=1)

    allocator = ProportionalVolumeAllocator(cycle_time_s=100.0, min_green_s=10.0, max_green_s=60.0)
    gap_controller = GapExtensionController(min_green_s=10.0, max_green_s=60.0, gap_threshold_s=2.5)
    skip_coordinator = PhaseSkippingCoordinator(
        scheduled_phases=["Approach-N", "Approach-S", "Approach-E", "Approach-W"]
    )

    # Warmup pipeline (10 frames)
    print("Warming up inference pipeline...")
    for w in range(10):
        warmup_frame = generate_benchmark_frame(w)
        dets = detector.infer(warmup_frame)
        trks = tracker.update(dets, frame_idx=w)
        _ = tracker.calculate_lane_counts(trks, roi_manager)

    print(f"Executing {num_frames} closed-loop frames...")
    latencies_ms: list[float] = []

    start_bench = time.perf_counter()

    for idx in range(num_frames):
        t0 = time.perf_counter()

        # Step A: Synthesize/Ingest frame
        frame = generate_benchmark_frame(idx)

        # Step B: Edge AI Perception (Detection)
        detections = detector.infer(frame, conf_threshold=0.25)

        # Step C: State Tracking (OC-SORT / ByteTrack)
        tracks = tracker.update(detections, frame_idx=idx)

        # Step D: Spatial ROI Mapping & Queue Counting
        lane_counts = tracker.calculate_lane_counts(tracks, roi_manager)
        headway_s = tracker.calculate_headway_seconds("Approach-N")

        # Step E: Dynamic Actuation Strategies Execution
        splits = allocator.compute_green_splits(lane_counts)
        ext_continue, ext_sec, ext_reason = gap_controller.evaluate_step(
            elapsed_green_s=12.0, current_headway_s=headway_s
        )
        active_phases = skip_coordinator.get_active_phases(lane_counts)

        t1 = time.perf_counter()
        elapsed_ms = (t1 - t0) * 1000.0
        latencies_ms.append(elapsed_ms)

        if (idx + 1) % 200 == 0 or (idx + 1) == num_frames:
            current_mean = np.mean(latencies_ms)
            current_fps = 1000.0 / max(0.1, current_mean)
            print(f"  Frame {idx + 1:4d}/{num_frames} | Mean: {current_mean:.2f} ms | FPS: {current_fps:.1f}")

    total_bench_duration_s = time.perf_counter() - start_bench

    # 2. Compute Statistical Metrics
    lat_arr = np.array(latencies_ms)
    mean_lat = float(np.mean(lat_arr))
    std_lat = float(np.std(lat_arr))
    min_lat = float(np.min(lat_arr))
    max_lat = float(np.max(lat_arr))
    p50_lat = float(np.percentile(lat_arr, 50))
    p95_lat = float(np.percentile(lat_arr, 95))
    p99_lat = float(np.percentile(lat_arr, 99))
    effective_fps = float(1000.0 / max(0.1, mean_lat))

    passed_realtime_gate = bool(p95_lat <= 33.3 and effective_fps >= 30.0)

    summary = {
        "status": "PASS" if passed_realtime_gate else "FAIL",
        "benchmark_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_frames": num_frames,
        "total_duration_s": round(total_bench_duration_s, 2),
        "latency_metrics_ms": {
            "mean": round(mean_lat, 2),
            "std": round(std_lat, 2),
            "min": round(min_lat, 2),
            "max": round(max_lat, 2),
            "p50_median": round(p50_lat, 2),
            "p95": round(p95_lat, 2),
            "p99": round(p99_lat, 2),
        },
        "throughput_fps": round(effective_fps, 1),
        "target_constraints": {
            "max_p95_latency_ms": 33.3,
            "min_fps": 30.0,
        },
        "realtime_constraint_met": passed_realtime_gate,
        "active_detector": detector.model_name,
        "system_platform": sys.platform,
    }

    # 3. Serialize Results
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 68)
    print("                  BENCHMARK SUMMARY RESULTS")
    print("=" * 68)
    print(f"  Total Processed:    {num_frames} frames in {total_bench_duration_s:.2f} s")
    print(f"  Mean Latency:       {mean_lat:.2f} ms")
    print(f"  50th Percentile:    {p50_lat:.2f} ms")
    print(f"  95th Percentile:    {p95_lat:.2f} ms (Budget: <= 33.3 ms)")
    print(f"  99th Percentile:    {p99_lat:.2f} ms")
    print(f"  Effective FPS:      {effective_fps:.1f} FPS (Target: >= 30.0 FPS)")
    print(f"  Real-Time Met:      {passed_realtime_gate} ({summary['status']})")
    print(f"  Output Artifact:    {output_path}")
    print("=" * 68 + "\n")

    if assert_realtime and not passed_realtime_gate:
        raise AssertionError(
            f"Benchmark failed real-time threshold! p95={p95_lat:.2f}ms (target <= 33.3ms), FPS={effective_fps:.1f}"
        )

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kinetica Closed-Loop Edge Benchmark")
    parser.add_argument("--frames", type=int, default=1000, help="Number of benchmark frames (default: 1000)")
    parser.add_argument("--no-assert", action="store_true", help="Do not throw assertion on performance miss")
    args = parser.parse_args()

    run_edge_benchmark(num_frames=args.frames, assert_realtime=not args.no_assert)
