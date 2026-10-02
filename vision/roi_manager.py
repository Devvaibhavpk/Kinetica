from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from datetime import datetime
import numpy as np

try:
    import cv2
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False

from schemas.lane_state import LaneObservation, VehicleClass


class ROIManager:
    """
    Manages polygonal Regions of Interest (ROIs), stop-line Decision Zones,
    and ground homography coordinate mappings for intersection approaches.
    """

    def __init__(self, config_source: str | Path | dict[str, Any] | None = None) -> None:
        """
        Initialize the ROIManager with a path to a JSON configuration file,
        a pre-parsed configuration dictionary, or None (defaults to intersection_rois.json).
        """
        if config_source is None:
            default_path = (
                Path(__file__).resolve().parent.parent
                / "data"
                / "calibration"
                / "intersection_rois.json"
            )
            self.config = self._load_from_path(default_path)
        elif isinstance(config_source, (str, Path)):
            self.config = self._load_from_path(Path(config_source))
        elif isinstance(config_source, dict):
            self.config = config_source
        else:
            raise TypeError(f"Invalid config_source type: {type(config_source)}")

        self.intersection_id = self.config.get("intersection_id", "IX-104")
        self.resolution = tuple(self.config.get("resolution", [1920, 1080]))
        self.pixels_per_meter = float(self.config.get("pixels_per_meter", 20.0))
        self.homography_matrix = np.array(
            self.config.get("homography_matrix", np.eye(3).tolist()), dtype=np.float32
        )
        self.approaches: dict[str, dict[str, Any]] = self.config.get("approaches", {})

        # Precompute contours for fast OpenCV polygon testing
        self._approach_contours: dict[str, np.ndarray] = {}
        self._decision_zone_contours: dict[str, np.ndarray] = {}
        self._exit_roi_contours: dict[str, np.ndarray] = {}

        for lane_id, data in self.approaches.items():
            norm_id = self.normalize_lane_id(lane_id)
            if "polygon" in data:
                pts = np.array(data["polygon"], dtype=np.int32)
                self._approach_contours[norm_id] = pts
            if "decision_zone" in data:
                dz_pts = np.array(data["decision_zone"], dtype=np.int32)
                self._decision_zone_contours[norm_id] = dz_pts
            if "exit_roi" in data:
                ex_pts = np.array(data["exit_roi"], dtype=np.int32)
                self._exit_roi_contours[norm_id] = ex_pts

    @staticmethod
    def _load_from_path(path: Path) -> dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"ROI configuration file not found at: {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def normalize_lane_id(lane_id: str) -> str:
        """
        Normalizes lane aliases (e.g. 'Approach-N' -> 'lane_N', 'N' -> 'lane_N').
        """
        clean = lane_id.strip()
        low = clean.lower()
        if low in ("lane_n", "approach-n", "n", "north"):
            return "lane_N"
        if low in ("lane_s", "approach-s", "s", "south"):
            return "lane_S"
        if low in ("lane_e", "approach-e", "e", "east"):
            return "lane_E"
        if low in ("lane_w", "approach-w", "w", "west"):
            return "lane_W"
        return clean

    def get_approach_polygon(self, lane_id: str) -> list[tuple[int, int]]:
        """Return the polygon vertices for the given approach."""
        norm_id = self.normalize_lane_id(lane_id)
        for k, v in self.approaches.items():
            if self.normalize_lane_id(k) == norm_id:
                return [tuple(pt) for pt in v.get("polygon", [])]
        raise KeyError(f"Approach '{lane_id}' not found in ROI configuration.")

    def get_decision_zone(self, lane_id: str) -> list[tuple[int, int]]:
        """Return the decision zone polygon vertices before the stop line."""
        norm_id = self.normalize_lane_id(lane_id)
        for k, v in self.approaches.items():
            if self.normalize_lane_id(k) == norm_id:
                return [tuple(pt) for pt in v.get("decision_zone", [])]
        raise KeyError(f"Approach '{lane_id}' has no decision zone defined.")

    def get_exit_roi(self, lane_id: str) -> list[tuple[int, int]]:
        """Return the exit clearance ROI polygon vertices."""
        norm_id = self.normalize_lane_id(lane_id)
        for k, v in self.approaches.items():
            if self.normalize_lane_id(k) == norm_id:
                return [tuple(pt) for pt in v.get("exit_roi", [])]
        raise KeyError(f"Approach '{lane_id}' has no exit ROI defined.")

    @staticmethod
    def point_in_polygon(
        point: tuple[float, float], polygon: list[tuple[int, int]] | np.ndarray
    ) -> bool:
        """
        Checks whether a point (x, y) lies inside or on the boundary of a polygon.
        Uses cv2.pointPolygonTest when available, falling back to ray casting.
        """
        px, py = point
        if _HAS_CV2:
            contour = (
                polygon
                if isinstance(polygon, np.ndarray) and polygon.dtype == np.int32
                else np.array(polygon, dtype=np.int32)
            )
            # dist >= 0 means inside (positive) or on edge (zero)
            res = cv2.pointPolygonTest(contour, (float(px), float(py)), measureDist=False)
            return res >= 0

        # Fallback Ray-Casting Algorithm
        pts = polygon if isinstance(polygon, list) else polygon.tolist()
        inside = False
        n = len(pts)
        p1x, p1y = pts[0]
        for i in range(n + 1):
            p2x, p2y = pts[i % n]
            if py > min(p1y, p2y):
                if py <= max(p1y, p2y):
                    if px <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or px <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    @staticmethod
    def get_bottom_center(bbox: list[float] | tuple[float, float, float, float]) -> tuple[float, float]:
        """
        Extract the ground contact point (bottom-center) of a vehicle bounding box [x1, y1, x2, y2].
        """
        x1, y1, x2, y2 = bbox
        return float((x1 + x2) / 2.0), float(y2)

    def filter_detections_by_roi(self, detections: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        """
        Filters detections and assigns them to corresponding approach ROIs.
        Returns a dictionary mapping normalized lane_id -> list of detections.
        Unassigned detections are placed in the 'unassigned' list.
        """
        result: dict[str, list[dict[str, Any]]] = {
            self.normalize_lane_id(lane_id): [] for lane_id in self.approaches
        }
        result["unassigned"] = []

        for det in detections:
            # Point extraction: support either explicit point or bbox
            if "bottom_center" in det:
                pt = tuple(det["bottom_center"])
            elif "bbox" in det:
                pt = self.get_bottom_center(det["bbox"])
            elif "point" in det:
                pt = tuple(det["point"])
            else:
                result["unassigned"].append(det)
                continue

            assigned = False
            for norm_id, contour in self._approach_contours.items():
                if self.point_in_polygon(pt, contour):
                    det_copy = dict(det)
                    det_copy["assigned_lane"] = norm_id
                    det_copy["in_decision_zone"] = self.is_in_decision_zone(pt, norm_id)
                    result[norm_id].append(det_copy)
                    assigned = True
                    break

            if not assigned:
                det_copy = dict(det)
                det_copy["assigned_lane"] = "unassigned"
                det_copy["in_decision_zone"] = False
                result["unassigned"].append(det_copy)

        return result

    def is_in_decision_zone(self, point: tuple[float, float], lane_id: str) -> bool:
        """Checks if a point is inside the pre-stop-line decision zone for a lane."""
        norm_id = self.normalize_lane_id(lane_id)
        if norm_id in self._decision_zone_contours:
            return self.point_in_polygon(point, self._decision_zone_contours[norm_id])
        return False

    def is_in_exit_roi(self, point: tuple[float, float], lane_id: str) -> bool:
        """Checks if a vehicle has entered the exit clearance zone for a lane."""
        norm_id = self.normalize_lane_id(lane_id)
        if norm_id in self._exit_roi_contours:
            return self.point_in_polygon(point, self._exit_roi_contours[norm_id])
        return False

    def compute_lane_metrics(
        self,
        detections: list[dict[str, Any]],
        timestamp: datetime | None = None,
        is_school_zone: bool = False,
    ) -> dict[str, LaneObservation]:
        """
        Aggregates assigned detections into formal LaneObservation schema models
        for each approach, compliant with schemas/lane_state.py.
        """
        ts = timestamp or datetime.now()
        filtered = self.filter_detections_by_roi(detections)
        observations: dict[str, LaneObservation] = {}

        for lane_id in self.approaches:
            norm_id = self.normalize_lane_id(lane_id)
            lane_dets = filtered.get(norm_id, [])

            class_counts: dict[VehicleClass, int] = {vc: 0 for vc in VehicleClass}
            bottom_centers: list[float] = []

            for det in lane_dets:
                cls_str = str(det.get("class", "standard")).lower()
                matched_class = VehicleClass.STANDARD
                for vc in VehicleClass:
                    if vc.value in cls_str:
                        matched_class = vc
                        break
                class_counts[matched_class] += 1

                # Track y or x coordinate along approach for queue length estimation
                pt = (
                    det.get("bottom_center")
                    or (self.get_bottom_center(det["bbox"]) if "bbox" in det else None)
                )
                if pt:
                    bottom_centers.append(pt[1])

            count = len(lane_dets)
            # Estimate queue length (in meters) from spatial bounding boxes span
            if count > 0 and len(bottom_centers) > 0:
                pixel_span = max(bottom_centers) - min(bottom_centers)
                # Physical minimum vehicle length is ~4.5m
                queue_length_m = max(float(count * 4.5), float(pixel_span / self.pixels_per_meter))
            else:
                queue_length_m = 0.0

            approach_length_m = 80.0  # Approx physical approach surveillance length
            density = min(1.0, queue_length_m / approach_length_m) if approach_length_m > 0 else 0.0

            obs = LaneObservation(
                lane_id=norm_id,
                timestamp=ts,
                vehicle_count=count,
                queue_length_m=round(queue_length_m, 2),
                density_veh_per_m=round(density, 4),
                class_counts=class_counts,
                is_school_zone=is_school_zone,
            )
            observations[norm_id] = obs

        return observations
