import sys
import json
import base64
import time
import os
import cv2
import numpy as np
from vision.detect import load_detector, detect_frame
from vision.classify import classify_priority
from vision.project import load_calibration, project_to_lane_metrics

def run_inference_on_image(img_bgr, camera_id="synthetic_cam"):
    start_time = time.time()
    
    # Load YOLO model
    model = load_detector("yolov8n.pt")
    
    # Detect objects
    raw_detections = detect_frame(model, img_bgr)
    
    # Calibration & Homography metrics
    try:
        calib = load_calibration(camera_id)
        metrics = project_to_lane_metrics(raw_detections, calib)
        density_val, queue_len_m = metrics.get("lane_0", (0.0, 0.0))
    except Exception:
        density_val, queue_len_m = (0.0, 0.0)
    
    results = []
    class_counts = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0, "ambulance": 0, "police": 0}
    
    h, w = img_bgr.shape[:2]
    
    for det in raw_detections:
        bbox = det["bbox"]
        coco_cls = det["coco_class"]
        conf = det["confidence"]
        
        # Priority classification check
        priority_cls = classify_priority(det, img_bgr)
        final_class = priority_cls.value.lower() if priority_cls.value != "STANDARD" else coco_cls
        
        class_counts[final_class] = class_counts.get(final_class, 0) + 1
        
        results.append({
            "bbox": bbox, # [x1, y1, x2, y2]
            "class": final_class,
            "confidence": round(conf, 3),
            "normalized_bbox": [
                round(bbox[0] / max(w, 1), 4),
                round(bbox[1] / max(h, 1), 4),
                round((bbox[2] - bbox[0]) / max(w, 1), 4),
                round((bbox[3] - bbox[1]) / max(h, 1), 4)
            ]
        })
        
    latency_ms = round((time.time() - start_time) * 1000, 1)
    
    return {
        "success": True,
        "image_size": [w, h],
        "latency_ms": latency_ms,
        "fps": round(1000 / max(latency_ms, 1), 1),
        "detections_count": len(results),
        "queue_length_m": round(queue_len_m, 1),
        "density_veh_m": round(density_val, 3),
        "class_counts": class_counts,
        "detections": results
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image input provided"}))
        sys.exit(1)
        
    arg = sys.argv[1]
    
    if os.path.exists(arg):
        img = cv2.imread(arg)
    elif arg.startswith("data:image") or len(arg) > 200:
        if "," in arg:
            arg = arg.split(",", 1)[1]
        img_bytes = base64.b64decode(arg)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    else:
        print(json.dumps({"error": "Invalid file path or base64 data"}))
        sys.exit(1)
        
    if img is None:
        print(json.dumps({"error": "Failed to decode image"}))
        sys.exit(1)
        
    out = run_inference_on_image(img)
    print(json.dumps(out))
