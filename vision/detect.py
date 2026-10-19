import cv2
import os
import numpy as np

# Global cache for detector
_MODEL_CACHE = {}

def load_detector(model_name: str | None = None):
    """
    Loads and caches high-performance YOLOv8 detector.
    Automatically prioritizes custom trained edge weights (weights/best.onnx or weights/best.pt)
    when available, falling back to base models.
    """
    from ultralytics import YOLO
    global _MODEL_CACHE

    if model_name is None or model_name in ["yolov8n.onnx", "yolov8n.pt", "default", "yolov8n"]:
        # Prioritize full-vocabulary high-performance models (detecting motorcycles, cars, buses, trucks)
        candidates = [
            os.path.join("weights", "yolov8n.onnx"),
            "yolov8n.onnx",
            "yolov8n.pt",
            os.path.join("weights", "best.onnx"),
            os.path.join("weights", "best.pt"),
            "best.pt",
        ]
        resolved = None
        for cand in candidates:
            if os.path.exists(cand):
                resolved = cand
                break
        model_name = resolved if resolved else "yolov8n.pt"

    if model_name not in _MODEL_CACHE:
        # Check if ONNX model exists for fast inference, fallback to PT if not
        if model_name.endswith(".onnx") and not os.path.exists(model_name):
            model_name = "yolov8n.pt"
            
        model = YOLO(model_name)
        _MODEL_CACHE[model_name] = model
    return _MODEL_CACHE[model_name]

def detect_frame(model, frame: np.ndarray, allow_all: bool = False, conf_thresh: float = 0.20) -> list[dict]:
    """
    Runs ultra-fast YOLO inference with strict roadway vehicle filtering and normalized bboxes.
    Includes specialized high-recall detection for Indian traffic two-wheelers and motorbikes.
    """
    model_names = getattr(model, "names", {})
    # Determine if this model is the custom fine-tuned Kinetica 7-class model
    is_custom_kinetica = False
    if isinstance(model_names, dict) and any(c in model_names.values() for c in ["ambulance", "auto_rickshaw"]):
        is_custom_kinetica = True

    TRAFFIC_CLASSES = {
        2: 'car',
        3: 'motorcycle',
        5: 'bus',
        7: 'truck',
        0: 'person',
        1: 'bicycle',
    }
    
    DISALLOWED_CLASSES = {'train', 'airplane', 'boat', 'bench', 'tv', 'couch', 'bed', 'sink', 'refrigerator'}
    
    h, w = frame.shape[:2]
    
    # Run YOLO with multi-object capability (supports up to 40 vehicles/motorbikes per frame)
    # Respect requested confidence threshold with 0.18 floor for two-wheeler recall
    detection_conf = max(0.18, float(conf_thresh))
    results = model.predict(frame, imgsz=640, conf=detection_conf, iou=0.45, max_det=40, verbose=False)
    
    detections = []
    
    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
            
        for box in boxes:
            class_id = int(box.cls[0].item())
            class_name = model_names.get(class_id, f"class_{class_id}")
            conf = float(box.conf[0].item())
            
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            box_w = x2 - x1
            box_h = y2 - y1
            
            if is_custom_kinetica:
                mapped_class = class_name
                # Guard against low-confidence emergency hallucinations from custom model
                if mapped_class == "ambulance" and conf < 0.40:
                    mapped_class = "car"
            else:
                if class_name in DISALLOWED_CLASSES:
                    continue
                if not allow_all and class_id not in TRAFFIC_CLASSES:
                    continue
                mapped_class = TRAFFIC_CLASSES.get(class_id, class_name)
                
                # Specialized Indian Roadway Two-Wheeler / Motorbike Detection:
                # In top-down traffic camera feeds, motorcyclists are often detected as either 'motorcycle',
                # 'bicycle', or 'person' (the rider astride the bike in the roadway driving lane).
                if mapped_class in ['motorcycle', 'bicycle']:
                    mapped_class = 'motorcycle'
                elif mapped_class == 'person' and (box_h / max(box_w, 1.0)) >= 1.25 and y2 > (0.15 * h):
                    mapped_class = 'motorcycle'
                elif mapped_class in ['car', 'truck']:
                    # Specialized Indian Roadway Auto-Rickshaw & Bus Detection:
                    # 1. Auto-Rickshaw Recovery:
                    # Standard COCO models lack an 'auto_rickshaw' class and label them as 'truck' or 'car'.
                    # In Indian traffic, auto-rickshaws have distinctive yellow/green body livery with compact dimensions.
                    bx1, by1 = max(0, int(round(x1))), max(0, int(round(y1)))
                    bx2, by2 = min(w, int(round(x2))), min(h, int(round(y2)))
                    if (bx2 - bx1) >= 12 and (by2 - by1) >= 12:
                        roi = frame[by1:by2, bx1:bx2]
                        rh, rw = roi.shape[:2]
                        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
                        y_mask = cv2.inRange(hsv, np.array([15, 60, 60]), np.array([38, 255, 255]))
                        g_mask = cv2.inRange(hsv, np.array([35, 50, 50]), np.array([85, 255, 255]))
                        tot = max(1, rh * rw)
                        yr = cv2.countNonZero(y_mask) / tot
                        gr = cv2.countNonZero(g_mask) / tot
                        
                        is_compact = (box_w <= 180 and box_h <= 220)
                        if is_compact and (yr >= 0.12 or (yr >= 0.07 and gr >= 0.04)):
                            mapped_class = 'auto_rickshaw'
                        elif mapped_class == 'truck':
                            # 2. Passenger Bus Recovery:
                            # Large passenger buses often get detected as 'truck' by COCO.
                            aspect_ratio = max(box_w, box_h) / max(min(box_w, box_h), 1.0)
                            if (aspect_ratio >= 2.2 and max(box_w, box_h) >= 140) or (box_w >= 140 and box_h >= 140):
                                mapped_class = 'bus'
                
            # Filter overhead sky billboards
            if y2 < (0.35 * h) and (box_w / max(box_h, 1.0)) > 2.8 and class_name in ['truck', 'bus', 'train']:
                continue
                
            bx1, by1, bx2, by2 = int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))
            
            norm_x = max(0.0, min(1.0, x1 / w))
            norm_y = max(0.0, min(1.0, y1 / h))
            norm_w = max(0.0, min(1.0, box_w / w))
            norm_h = max(0.0, min(1.0, box_h / h))
            
            detections.append({
                'bbox': [bx1, by1, bx2, by2],
                'coco_class': mapped_class,
                'confidence': round(conf, 2),
                'normalized_bbox': [round(norm_x, 4), round(norm_y, 4), round(norm_w, 4), round(norm_h, 4)]
            })
            
    return detections