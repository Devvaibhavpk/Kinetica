import numpy as np
from ultralytics import YOLO

# Global cache for the detector to avoid reloading on every frame
_MODEL_CACHE = {}

def load_detector(model_name: str = "yolov8n.pt") -> YOLO:
    """
    Loads and caches a YOLO model for inference.
    """
    global _MODEL_CACHE
    if model_name not in _MODEL_CACHE:
        # Load the model; Ultralytics will auto-download if not present locally
        model = YOLO(model_name)
        _MODEL_CACHE[model_name] = model
    return _MODEL_CACHE[model_name]

def detect_frame(model: YOLO, frame: np.ndarray) -> list[dict]:
    """
    Runs YOLO inference on a frame and returns filtered detections.
    Filters out everything except: car(2), motorcycle(3), bus(5), truck(7).
    Note: ultralytics COCO class IDs are 0-indexed:
    car=2, motorcycle=3, bus=5, truck=7
    """
    # Allowed classes in standard COCO dataset for YOLO
    ALLOWED_CLASSES = {2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'}
    
    # Run inference without printing verbose logs
    results = model(frame, verbose=False)
    
    detections = []
    
    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
            
        for box in boxes:
            class_id = int(box.cls[0].item())
            if class_id in ALLOWED_CLASSES:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0].item())
                
                detections.append({
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'coco_class': ALLOWED_CLASSES[class_id],
                    'confidence': conf
                })
                
    return detections