import pytest
import numpy as np
from datetime import datetime
from schemas.lane_state import LaneObservation, PriorityEvent, VehicleClass
from vision.ingest import ingest_source
from vision.detect import load_detector, detect_frame
from vision.project import load_calibration, project_to_lane_metrics
from vision.classify import classify_priority

def test_pipeline_smoke():
    # 1. Ingest synthetic frames
    frame_gen = ingest_source("synthetic")
    frame = next(frame_gen)
    assert frame.shape == (720, 1280, 3)
    
    # Manually paint an "ambulance" on the synthetic frame to test classification and projection
    # White chassis, Red markings
    frame[100:200, 100:300] = [255, 255, 255]
    frame[100:120, 100:300] = [0, 0, 255]
    
    # 2. Detect (we mock the detection output to guarantee bounding boxes for testing)
    mock_detections = [
        {'bbox': [100, 100, 300, 200], 'coco_class': 'car', 'confidence': 0.95},
        {'bbox': [500, 100, 600, 150], 'coco_class': 'car', 'confidence': 0.85}
    ]
    
    # 3. Project
    calibration = {
        "homography_matrix": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        "pixels_per_meter": 20.0
    }
    metrics = project_to_lane_metrics(mock_detections, calibration)
    
    # 4. Classify and emit schemas
    lane_id = "lane_0"
    density, queue_len = metrics[lane_id]
    
    class_counts = {vc: 0 for vc in VehicleClass}
    events = []
    
    for det in mock_detections:
        vc = classify_priority(det, frame)
        class_counts[vc] += 1
        
        if vc in [VehicleClass.AMBULANCE, VehicleClass.POLICE, VehicleClass.SCHOOL_VAN]:
            events.append(PriorityEvent(
                lane_id=lane_id,
                vehicle_class=vc,
                detected_at=datetime.now(),
                confidence=det['confidence']
            ))
            
    obs = LaneObservation(
        lane_id=lane_id,
        timestamp=datetime.now(),
        vehicle_count=len(mock_detections),
        queue_length_m=queue_len,
        density_veh_per_m=density,
        class_counts=class_counts
    )
    
    # Assertions
    assert isinstance(obs, LaneObservation)
    assert obs.vehicle_count == 2
    assert obs.class_counts[VehicleClass.AMBULANCE] == 1
    assert obs.class_counts[VehicleClass.STANDARD] == 1
    
    assert len(events) == 1
    assert isinstance(events[0], PriorityEvent)
    assert events[0].vehicle_class == VehicleClass.AMBULANCE
