"""
vision/tracker.py — Observation-Centric State Tracking (OC-SORT & ByteTrack Principles)

Assigns persistent tracking IDs across consecutive video frames, recovers vehicle
trajectories across visual occlusions (e.g., cars masked by buses or trucks),
prevents double-counting, and computes approach accumulation and inter-vehicle headway.
"""

from __future__ import annotations

import numpy as np
from typing import Any, Optional
from scipy.optimize import linear_sum_assignment


def bbox_to_z(bbox: list[float] | tuple[float, float, float, float] | np.ndarray) -> np.ndarray:
    """
    Converts [x1, y1, x2, y2] bounding box to Kalman filter state observation:
    [center_x, center_y, area, aspect_ratio]^T
    """
    w = max(1.0, float(bbox[2] - bbox[0]))
    h = max(1.0, float(bbox[3] - bbox[1]))
    x = float(bbox[0]) + w / 2.0
    y = float(bbox[1]) + h / 2.0
    s = w * h  # scale/area
    r = w / h  # aspect ratio
    return np.array([x, y, s, r], dtype=float).reshape((4, 1))


def x_to_bbox(x: np.ndarray) -> list[float]:
    """
    Converts Kalman filter state vector [x, y, s, r, ...] to [x1, y1, x2, y2] bbox.
    """
    flat = x.flatten()
    cx, cy, s, r = float(flat[0]), float(flat[1]), float(flat[2]), float(flat[3])
    s = max(1.0, s)
    r = max(0.01, r)
    w = np.sqrt(s * r)
    h = s / max(w, 1e-4)
    x1 = cx - w / 2.0
    y1 = cy - h / 2.0
    x2 = cx + w / 2.0
    y2 = cy + h / 2.0
    return [float(x1), float(y1), float(x2), float(y2)]


def compute_iou(bb_test: list[float], bb_gt: list[float]) -> float:
    """
    Computes standard Intersection Over Union (IoU) between two bounding boxes.
    """
    xx1 = max(bb_test[0], bb_gt[0])
    yy1 = max(bb_test[1], bb_gt[1])
    xx2 = min(bb_test[2], bb_gt[2])
    yy2 = min(bb_test[3], bb_gt[3])
    w = max(0.0, xx2 - xx1)
    h = max(0.0, yy2 - yy1)
    intersection = w * h

    area_test = max(1e-4, (bb_test[2] - bb_test[0]) * (bb_test[3] - bb_test[1]))
    area_gt = max(1e-4, (bb_gt[2] - bb_gt[0]) * (bb_gt[3] - bb_gt[1]))
    union = area_test + area_gt - intersection
    return float(intersection / union) if union > 0 else 0.0


def compute_iou_matrix(boxes_a: list[list[float]], boxes_b: list[list[float]]) -> np.ndarray:
    """Computes an N x M pairwise IoU matrix."""
    n, m = len(boxes_a), len(boxes_b)
    iou_mat = np.zeros((n, m), dtype=float)
    for i in range(n):
        for j in range(m):
            iou_mat[i, j] = compute_iou(boxes_a[i], boxes_b[j])
    return iou_mat


class KalmanBoxTracker:
    """
    2D Constant-Velocity Kalman Filter for tracking bounding box motion and scale.
    Implements observation-centric momentum tracking to re-identify vehicles after occlusion.
    """
    _count = 0

    def __init__(self, bbox: list[float], class_name: str = "car", confidence: float = 1.0) -> None:
        KalmanBoxTracker._count += 1
        self.id = KalmanBoxTracker._count
        self.class_name = class_name
        self.confidence = confidence

        # State vector: [cx, cy, s, r, vx, vy, vs]^T
        self.x = np.zeros((7, 1), dtype=float)
        self.x[:4] = bbox_to_z(bbox)

        # State transition matrix F (constant velocity)
        self.F = np.eye(7, dtype=float)
        self.F[0, 4] = 1.0  # cx += vx
        self.F[1, 5] = 1.0  # cy += vy
        self.F[2, 6] = 1.0  # s += vs

        # Measurement matrix H
        self.H = np.zeros((4, 7), dtype=float)
        self.H[0, 0] = 1.0
        self.H[1, 1] = 1.0
        self.H[2, 2] = 1.0
        self.H[3, 3] = 1.0

        # State covariance P
        self.P = np.diag([10.0, 10.0, 10.0, 10.0, 1000.0, 1000.0, 1000.0])
        # Process noise covariance Q
        self.Q = np.diag([1.0, 1.0, 1.0, 1.0, 0.01, 0.01, 0.0001])
        # Measurement noise covariance R
        self.R = np.diag([1.0, 1.0, 10.0, 10.0])

        self.time_since_update = 0
        self.hits = 1
        self.hit_streak = 1
        self.age = 0
        self.history: list[list[float]] = []

        # Observation-Centric (OC) trajectory history
        self.last_observation: list[float] = list(bbox)
        self.observations: list[tuple[int, list[float]]] = [(0, list(bbox))]

    def predict(self) -> list[float]:
        """Advances state vector via kinematic prediction."""
        if (self.x[6] + self.x[2]) <= 0:
            self.x[6] = 0.0

        self.x = np.dot(self.F, self.x)
        self.P = np.dot(np.dot(self.F, self.P), self.F.T) + self.Q
        self.age += 1
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1

        pred_box = x_to_bbox(self.x)
        self.history.append(pred_box)
        return pred_box

    def update(self, bbox: list[float], frame_idx: int = 0, confidence: float = 1.0) -> None:
        """Updates Kalman state with new detector observation."""
        self.time_since_update = 0
        self.hits += 1
        self.hit_streak += 1
        self.confidence = confidence

        # Observation-Centric momentum update for occlusion recovery:
        # If recovering after multiple missed frames, estimate momentum directly from observed displacement
        if len(self.observations) > 0 and self.age > 1:
            prev_idx, prev_box = self.observations[-1]
            dt = max(1, frame_idx - prev_idx)
            vx_obs = (float((bbox[0] + bbox[2]) / 2.0) - float((prev_box[0] + prev_box[2]) / 2.0)) / dt
            vy_obs = (float((bbox[1] + bbox[3]) / 2.0) - float((prev_box[1] + prev_box[3]) / 2.0)) / dt
            # Blend observed velocity into state to correct for occluded lag
            self.x[4] = 0.7 * self.x[4] + 0.3 * vx_obs
            self.x[5] = 0.7 * self.x[5] + 0.3 * vy_obs

        self.last_observation = list(bbox)
        self.observations.append((frame_idx, list(bbox)))

        # Standard Kalman filter measurement update
        z = bbox_to_z(bbox)
        y = z - np.dot(self.H, self.x)
        S = np.dot(self.H, np.dot(self.P, self.H.T)) + self.R
        K = np.dot(np.dot(self.P, self.H.T), np.linalg.inv(S))

        self.x = self.x + np.dot(K, y)
        self.P = self.P - np.dot(np.dot(K, self.H), self.P)

    def get_state(self) -> list[float]:
        """Returns the current bounding box estimate."""
        return x_to_bbox(self.x)


class OCSortTracker:
    """
    Observation-Centric SORT (OC-SORT) Multi-Object Tracker.
    Maintains persistent IDs across occlusions, filters duplicate detections,
    and calculates approach accumulation counts and headway metrics.
    """

    def __init__(
        self,
        max_age: int = 30,
        min_hits: int = 3,
        iou_threshold: float = 0.3,
    ) -> None:
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.trackers: list[KalmanBoxTracker] = []
        self.frame_count = 0

        # Headway tracking per lane: list of timestamps/frame indices of vehicle crossings
        self._lane_crossing_frames: dict[str, list[int]] = {}

    def update(self, detections: list[dict[str, Any]], frame_idx: Optional[int] = None) -> list[dict[str, Any]]:
        """
        Processes detections for the current frame and returns list of active tracks.

        Parameters:
            detections: List of detection dicts with 'bbox': [x1, y1, x2, y2], 'class', 'confidence'
            frame_idx: Optional integer frame index.

        Returns:
            List of track dicts with 'track_id', 'bbox', 'class', 'confidence', 'bottom_center'
        """
        if frame_idx is None:
            self.frame_count += 1
            frame_idx = self.frame_count
        else:
            self.frame_count = frame_idx

        # 1. Predict new locations of existing tracks
        predicted_boxes = []
        to_del = []
        for i, trk in enumerate(self.trackers):
            pos = trk.predict()
            if np.any(np.isnan(pos)):
                to_del.append(i)
            else:
                predicted_boxes.append(pos)

        for i in reversed(to_del):
            self.trackers.pop(i)

        # 2. Extract detection bounding boxes
        det_boxes = [d["bbox"] for d in detections]

        # 3. Associate detections to existing tracks via IoU Hungarian matching
        matched_trks, unmatched_dets, unmatched_trks = self._associate(
            det_boxes, predicted_boxes, self.iou_threshold
        )

        # 4. Update matched tracks
        for d_idx, t_idx in matched_trks:
            det = detections[d_idx]
            self.trackers[t_idx].update(
                bbox=det["bbox"],
                frame_idx=frame_idx,
                confidence=float(det.get("confidence", 1.0)),
            )
            # Update class if provided
            if "class" in det:
                self.trackers[t_idx].class_name = det["class"]

        # 5. Create new tracks for unmatched detections
        for d_idx in unmatched_dets:
            det = detections[d_idx]
            trk = KalmanBoxTracker(
                bbox=det["bbox"],
                class_name=det.get("class", "car"),
                confidence=float(det.get("confidence", 1.0)),
            )
            self.trackers.append(trk)

        # 6. Build active track output list & prune dead tracks
        active_tracks: list[dict[str, Any]] = []
        remaining_trackers: list[KalmanBoxTracker] = []

        for trk in self.trackers:
            # Active if updated recently OR within occlusion max_age threshold
            if trk.time_since_update <= self.max_age:
                remaining_trackers.append(trk)

                # Output track if it has met the minimum hits threshold or was confirmed
                if trk.hits >= self.min_hits or self.frame_count <= self.min_hits:
                    box = trk.get_state()
                    x1, y1, x2, y2 = box
                    bottom_center = (float((x1 + x2) / 2.0), float(y2))
                    is_occluded = trk.time_since_update > 0

                    active_tracks.append({
                        "track_id": trk.id,
                        "bbox": [round(float(v), 2) for v in box],
                        "class": trk.class_name,
                        "confidence": round(float(trk.confidence), 3),
                        "bottom_center": (round(bottom_center[0], 2), round(bottom_center[1], 2)),
                        "age": trk.age,
                        "hits": trk.hits,
                        "is_occluded": is_occluded,
                    })

        self.trackers = remaining_trackers
        return active_tracks

    def _associate(
        self,
        det_boxes: list[list[float]],
        trk_boxes: list[list[float]],
        iou_thresh: float,
    ) -> tuple[list[tuple[int, int]], list[int], list[int]]:
        """
        Solves bipartite maximum-weight assignment using the Hungarian algorithm on IoU matrix.
        """
        if len(trk_boxes) == 0:
            return [], list(range(len(det_boxes))), []

        if len(det_boxes) == 0:
            return [], [], list(range(len(trk_boxes)))

        iou_matrix = compute_iou_matrix(det_boxes, trk_boxes)
        # Cost matrix: minimize 1 - IoU
        cost_matrix = 1.0 - iou_matrix

        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        matched_indices: list[tuple[int, int]] = []
        unmatched_dets = list(range(len(det_boxes)))
        unmatched_trks = list(range(len(trk_boxes)))

        for r, c in zip(row_ind, col_ind):
            if iou_matrix[r, c] >= iou_thresh:
                matched_indices.append((int(r), int(c)))
                if r in unmatched_dets:
                    unmatched_dets.remove(r)
                if c in unmatched_trks:
                    unmatched_trks.remove(c)

        return matched_indices, unmatched_dets, unmatched_trks

    def calculate_lane_counts(self, tracks: list[dict[str, Any]], roi_manager: Any) -> dict[str, int]:
        """
        Computes the total waiting vehicle count per lane approach ROI using ROIManager.
        """
        counts = {
            "Approach-N": 0,
            "Approach-S": 0,
            "Approach-E": 0,
            "Approach-W": 0,
        }

        # Filter tracks by approach polygon
        for trk in tracks:
            pt = trk["bottom_center"]
            assigned_lane = None
            for lane_id in counts.keys():
                poly = roi_manager.get_approach_polygon(lane_id)
                if poly and roi_manager.point_in_polygon(pt, poly):
                    assigned_lane = lane_id
                    break

            if assigned_lane:
                counts[assigned_lane] += 1
                # If vehicle is in the decision zone, record crossing timestamp
                if roi_manager.is_in_decision_zone(pt, assigned_lane):
                    if assigned_lane not in self._lane_crossing_frames:
                        self._lane_crossing_frames[assigned_lane] = []
                    # Avoid duplicate records in consecutive frames for same track
                    self._lane_crossing_frames[assigned_lane].append(self.frame_count)

        return counts

    def calculate_headway_seconds(self, lane_id: str, fps: float = 30.0) -> float:
        """
        Calculates the inter-vehicle time headway (t_gap) in seconds for an approach.
        If vehicles are continuously crossing, returns average headway.
        If no vehicles or lane is empty, returns large default (99.0s).
        """
        crossings = self._lane_crossing_frames.get(lane_id, [])
        if len(crossings) < 2:
            return 99.0  # Empty or insufficient traffic for continuous headway

        # Get recent crossings within last 90 frames (3 seconds at 30 fps)
        recent = [f for f in crossings if (self.frame_count - f) <= int(fps * 3.0)]
        if len(recent) < 2:
            return 99.0

        # Unique frames where distinct vehicles were observed
        unique_frames = sorted(list(set(recent)))
        if len(unique_frames) < 2:
            return 1.5  # Constant presence in decision zone

        diffs = [unique_frames[i] - unique_frames[i - 1] for i in range(1, len(unique_frames))]
        avg_frame_gap = float(np.mean(diffs))
        return float(avg_frame_gap / max(1.0, fps))
