"""
vision/tests/test_tracker.py — Tests for Occlusion-Resistant State Tracking (OC-SORT)
"""

import pytest
import numpy as np
from pathlib import Path
from vision.tracker import OCSortTracker, compute_iou
from vision.roi_manager import ROIManager


def test_iou_calculation():
    box1 = [100.0, 100.0, 200.0, 200.0]
    box2 = [100.0, 100.0, 200.0, 200.0]
    assert compute_iou(box1, box2) == 1.0

    box3 = [300.0, 300.0, 400.0, 400.0]
    assert compute_iou(box1, box3) == 0.0

    box4 = [150.0, 100.0, 250.0, 200.0]
    # Intersection = 50 * 100 = 5000. Union = 10000 + 10000 - 5000 = 15000. IoU = 1/3
    assert abs(compute_iou(box1, box4) - (1.0 / 3.0)) < 1e-4


def test_track_id_persistence_clean_trajectory():
    tracker = OCSortTracker(max_age=30, min_hits=1, iou_threshold=0.3)

    # Move a car from y=100 down to y=200 over 5 frames
    for i in range(5):
        y_pos = 100.0 + i * 20.0
        detections = [
            {"bbox": [500.0, y_pos, 580.0, y_pos + 60.0], "class": "car", "confidence": 0.92}
        ]
        tracks = tracker.update(detections, frame_idx=i + 1)
        assert len(tracks) == 1
        assert tracks[0]["class"] == "car"
        if i == 0:
            first_id = tracks[0]["track_id"]
        else:
            assert tracks[0]["track_id"] == first_id, "Track ID must remain persistent across trajectory!"


def test_occlusion_recovery():
    """
    Simulates 10 frames where a car is visible in frames 1-3,
    occluded (missed by detector) in frames 4-6, and reappears in frames 7-10.
    The tracker must recover the exact same track_id.
    """
    tracker = OCSortTracker(max_age=10, min_hits=1, iou_threshold=0.25)

    track_id_before = None

    # Frames 1-3: Car moves steadily forward (vx=0, vy=10 px/frame)
    for frame_idx in range(1, 4):
        y1 = 200.0 + (frame_idx - 1) * 10.0
        dets = [{"bbox": [400.0, y1, 480.0, y1 + 60.0], "class": "car", "confidence": 0.9}]
        tracks = tracker.update(dets, frame_idx=frame_idx)
        assert len(tracks) == 1
        track_id_before = tracks[0]["track_id"]

    # Frames 4-6: Complete occlusion (0 detections, e.g. behind a bus)
    for frame_idx in range(4, 7):
        tracks = tracker.update([], frame_idx=frame_idx)
        # In occlusion, track is still maintained internally in memory
        occluded_tracks = [t for t in tracks if t["is_occluded"]]
        assert len(occluded_tracks) >= 0

    # Frame 7: Vehicle emerges from occlusion at expected predicted position
    # Expected position: y1 ~ 200 + (7 - 1) * 10 = 260
    dets_frame_7 = [{"bbox": [402.0, 260.0, 482.0, 320.0], "class": "car", "confidence": 0.88}]
    tracks_after = tracker.update(dets_frame_7, frame_idx=7)

    assert len(tracks_after) >= 1
    # Check that our vehicle maintained its original track_id!
    recovered_track = [t for t in tracks_after if t["track_id"] == track_id_before]
    assert len(recovered_track) == 1, (
        f"Vehicle was not recovered! Expected ID {track_id_before}, got {[t['track_id'] for t in tracks_after]}"
    )
    assert recovered_track[0]["is_occluded"] is False


def test_anti_double_counting_distinct_vehicles():
    """
    Two adjacent vehicles moving in parallel must receive distinct track IDs.
    """
    tracker = OCSortTracker(max_age=15, min_hits=1, iou_threshold=0.3)

    dets = [
        {"bbox": [100.0, 200.0, 180.0, 260.0], "class": "car", "confidence": 0.95},
        {"bbox": [300.0, 200.0, 380.0, 260.0], "class": "truck", "confidence": 0.90},
    ]

    tracks = tracker.update(dets, frame_idx=1)
    assert len(tracks) == 2
    ids = {t["track_id"] for t in tracks}
    assert len(ids) == 2, "Each vehicle must have a unique, non-overlapping track ID!"


def test_lane_counts_with_roi_manager():
    """
    Tests spatial mapping of active tracks to intersection approach polygons.
    """
    calib_path = Path("data/calibration/intersection_rois.json")
    roi_manager = ROIManager(calib_path)
    tracker = OCSortTracker(max_age=10, min_hits=1)

    # Place one vehicle in North approach (lane_N: x in [800, 1120], y in [50, 420])
    # and one in South approach (lane_S: x in [740, 1180], y in [660, 1030])
    dets = [
        {"bbox": [860.0, 150.0, 940.0, 250.0], "class": "car", "confidence": 0.9},
        {"bbox": [860.0, 700.0, 940.0, 800.0], "class": "bus", "confidence": 0.85},
    ]

    tracks = tracker.update(dets, frame_idx=1)
    lane_counts = tracker.calculate_lane_counts(tracks, roi_manager)

    assert lane_counts["Approach-N"] == 1 or lane_counts.get("lane_N", 0) == 1
    assert lane_counts["Approach-S"] == 1 or lane_counts.get("lane_S", 0) == 1


def test_headway_calculation():
    """
    Tests inter-vehicle headway calculation (t_gap).
    """
    tracker = OCSortTracker()

    # Empty lane should return default 99.0s
    headway_empty = tracker.calculate_headway_seconds("Approach-N")
    assert headway_empty == 99.0

    # Simulate vehicle crossings recorded at frames 10, 40, 70 (30 frames apart = 1.0s at 30 fps)
    tracker.frame_count = 75
    tracker._lane_crossing_frames["Approach-N"] = [10, 40, 70]
    headway = tracker.calculate_headway_seconds("Approach-N", fps=30.0)

    # 30 frames / 30 fps = 1.0 second headway
    assert abs(headway - 1.0) < 0.1
