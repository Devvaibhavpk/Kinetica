import numpy as np
from schemas.lane_state import VehicleClass
from vision.classify import classify_priority

def test_ambulance_detection_on_synthetic_frame():
    # Generate 5 mock frames with a white/red block
    for _ in range(5):
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        
        # Bounding box of the "vehicle"
        bbox = [100, 100, 300, 200]
        x1, y1, x2, y2 = bbox
        
        # Draw white chassis
        frame[y1:y2, x1:x2] = [255, 255, 255]
        
        # Draw red markings
        frame[y1:y1+20, x1:x2] = [0, 0, 255] # BGR format, Red
        
        detection = {'bbox': bbox, 'coco_class': 'car', 'confidence': 0.9}
        
        vehicle_class = classify_priority(detection, frame)
        assert vehicle_class == VehicleClass.AMBULANCE, f"Expected AMBULANCE, got {vehicle_class}"
