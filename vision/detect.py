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
        # Check custom trained weights in order of priority
        candidates = [
            os.path.join("weights", "best.onnx"),
            os.path.join("weights", "best.pt"),
            "best.pt",
            "yolov8n.onnx",
            "yolov8n.pt",
        ]
        resolved = None
        for cand in candidates:
            if os.path.exists(cand):
                resolved = cand
                break
        model_name = resolved if resolved else "yolov8n.pt"

    if model_name not in _MODEL_CACHE:
        # Check if ONNX model exists for 18ms inference, fallback to PT if not
        if model_name.endswith(".onnx") and not os.path.exists(model_name):
            model_name = "yolov8n.pt"
            
        model = YOLO(model_name)
        _MODEL_CACHE[model_name] = model
    return _MODEL_CACHE[model_name]

def detect_frame(model, frame: np.ndarray, allow_all: bool = False, conf_thresh: float = 0.30) -> list[dict]:
    """
    Runs ultra-fast YOLO inference with strict roadway vehicle filtering and normalized bboxes.
    Seamlessly supports both custom 7-class Kinetica models and standard COCO pretrained models.
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
    
    # Run YOLO with standard 640px input size (compatible with fixed-dimension ONNX exports)
    results = model.predict(frame, imgsz=640, conf=conf_thresh, iou=0.45, max_det=20, verbose=False)
    
    detections = []
    
    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
            
        for box in boxes:
            class_id = int(box.cls[0].item())
            class_name = model_names.get(class_id, f"class_{class_id}")
            
            if is_custom_kinetica:
                mapped_class = class_name
            else:
                if class_name in DISALLOWED_CLASSES:
                    continue
                if not allow_all and class_id not in TRAFFIC_CLASSES:
                    continue
                mapped_class = TRAFFIC_CLASSES.get(class_id, class_name)
                
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0].item())
            
            box_w = x2 - x1
            box_h = y2 - y1
            
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