"""
benchmarks/tests/test_edge_benchmark.py — Tests for Closed-Loop Edge Benchmark
"""

import json
from pathlib import Path
from benchmarks.edge_benchmark import generate_benchmark_frame, run_edge_benchmark


def test_generate_benchmark_frame():
    frame = generate_benchmark_frame(frame_idx=5, width=640, height=640)
    assert frame.shape == (640, 640, 3)
    assert frame.dtype == "uint8"


def test_edge_benchmark_execution_and_artifact(tmp_path):
    out_file = tmp_path / "test_benchmark.json"

    # Run quick 25-frame benchmark to verify pipeline execution & artifact serialization
    summary = run_edge_benchmark(
        num_frames=25,
        output_path=out_file,
        assert_realtime=False,
    )

    assert summary["total_frames"] == 25
    assert "latency_metrics_ms" in summary
    assert "throughput_fps" in summary
    assert summary["latency_metrics_ms"]["p50_median"] > 0.0
    assert out_file.exists()

    with open(out_file, "r", encoding="utf-8") as f:
        loaded = json.load(f)

    assert loaded["total_frames"] == 25
    assert "p95" in loaded["latency_metrics_ms"]
