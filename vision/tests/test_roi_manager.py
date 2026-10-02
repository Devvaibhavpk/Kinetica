import pytest
from datetime import datetime
from vision.roi_manager import ROIManager
from schemas.lane_state import LaneObservation, VehicleClass

def test_roi_manager_initialization():
    manager = ROIManager()
    assert manager.intersection_id == "IX-104"
    assert manager.pixels_per_meter == 20.0
    assert len(manager.approaches) == 4
    assert "lane_N" in manager.approaches

def test_normalize_lane_id():
    assert ROIManager.normalize_lane_id("Approach-N") == "lane_N"
    assert ROIManager.normalize_lane_id("approach-s") == "lane_S"
    assert ROIManager.normalize_lane_id("EAST") == "lane_E"
    assert ROIManager.normalize_lane_id("lane_W") == "lane_W"

def test_get_approach_polygon_and_decision_zone():
    manager = ROIManager()
    poly_n = manager.get_approach_polygon("lane_N")
    assert len(poly_n) == 4
    dz_n = manager.get_decision_zone("lane_N")
    assert len(dz_n) == 4

    # Alias check
    poly_alias = manager.get_approach_polygon("Approach-N")
    assert poly_alias == poly_n

def test_point_in_polygon():
    manager = ROIManager()
    # North polygon: [[800, 50], [1120, 50], [1100, 420], [820, 420]]
    poly_n = manager.get_approach_polygon("lane_N")

    # Point clearly inside
    assert manager.point_in_polygon((950, 200), poly_n) is True
    # Point outside to the west
    assert manager.point_in_polygon((500, 200), poly_n) is False
    # Point outside to the south
    assert manager.point_in_polygon((950, 500), poly_n) is False

def test_decision_zone_detection():
    manager = ROIManager()
    # North decision zone: [[820, 340], [1100, 340], [1100, 420], [820, 420]]
    # Inside decision zone
    assert manager.is_in_decision_zone((950, 380), "lane_N") is True
    # In North approach, but far upstream (not in decision zone)
    assert manager.is_in_decision_zone((950, 150), "lane_N") is False

def test_filter_detections_by_roi():
    manager = ROIManager()

    sample_detections = [
        # Car in North approach decision zone
        {
            "id": 1,
            "class": "standard",
            "confidence": 0.92,
            "bbox": [920, 340, 980, 400], # bottom center: (950, 400)
        },
        # Ambulance in North approach upstream
        {
            "id": 2,
            "class": "ambulance",
            "confidence": 0.98,
            "bbox": [920, 100, 980, 160], # bottom center: (950, 160)
        },
        # Car in West approach
        {
            "id": 3,
            "class": "standard",
            "confidence": 0.88,
            "bbox": [200, 480, 260, 540], # bottom center: (230, 540)
        },
        # Vehicle outside all ROIs
        {
            "id": 4,
            "class": "standard",
            "confidence": 0.85,
            "bbox": [10, 10, 50, 50], # bottom center: (30, 50)
        },
    ]

    filtered = manager.filter_detections_by_roi(sample_detections)

    assert len(filtered["lane_N"]) == 2
    assert len(filtered["lane_W"]) == 1
    assert len(filtered["lane_S"]) == 0
    assert len(filtered["unassigned"]) == 1

    # Verify decision zone flag on car in North
    north_dets = filtered["lane_N"]
    car_det = next(d for d in north_dets if d["id"] == 1)
    amb_det = next(d for d in north_dets if d["id"] == 2)
    assert car_det["in_decision_zone"] is True
    assert amb_det["in_decision_zone"] is False

def test_compute_lane_metrics_schema_compliance():
    manager = ROIManager()

    sample_detections = [
        {"class": "standard", "bbox": [920, 340, 980, 400]},
        {"class": "two_wheeler", "bbox": [910, 200, 950, 250]},
        {"class": "ambulance", "bbox": [940, 100, 990, 160]},
    ]

    now = datetime.now()
    metrics = manager.compute_lane_metrics(sample_detections, timestamp=now)

    assert "lane_N" in metrics
    obs_n = metrics["lane_N"]
    assert isinstance(obs_n, LaneObservation)
    assert obs_n.vehicle_count == 3
    assert obs_n.class_counts[VehicleClass.STANDARD] == 1
    assert obs_n.class_counts[VehicleClass.TWO_WHEELER] == 1
    assert obs_n.class_counts[VehicleClass.AMBULANCE] == 1
    assert obs_n.queue_length_m > 0
    assert obs_n.density_veh_per_m > 0

    # Ensure Pydantic serialization roundtrip works
    dumped = obs_n.model_dump_json()
    validated = LaneObservation.model_validate_json(dumped)
    assert validated.vehicle_count == 3
