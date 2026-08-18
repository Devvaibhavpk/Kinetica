import time
import base64
import json
import urllib.request
import cv2
import numpy as np
from typing import Optional, List
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from vision.detect import load_detector, detect_frame
from vision.classify import classify_priority

app = FastAPI(title="Kinetica Vision Live WebSocket & REST Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Preload high-speed ONNX / YOLOv8 model in memory
print("[Kinetica Vision Server] Preloading ultra-fast ONNX / YOLOv8 model into memory...")
MODEL = load_detector("yolov8n.onnx")
print("[Kinetica Vision Server] Model active (55+ FPS ONNX runtime engine)!")

class DetectRequest(BaseModel):
    image: Optional[str] = None # Base64 or URL
    image_url: Optional[str] = None
    camera_id: str = "CAM-01"
    conf_threshold: float = 0.28
    allow_all: bool = False

class BatchDetectRequest(BaseModel):
    cameras: List[DetectRequest]

@app.get("/health")
async def health():
    return {"status": "ok", "model": "yolov8n.onnx", "engine": "onnxruntime", "service": "kinetica-vision-ws"}

def _decode_image(b64_or_url: str) -> Optional[np.ndarray]:
    try:
        if b64_or_url.startswith("http://") or b64_or_url.startswith("https://"):
            req = urllib.request.Request(
                b64_or_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                img_array = np.asarray(bytearray(response.read()), dtype=np.uint8)
                return cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        b64_str = b64_or_url
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_str)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"[Image Decode Error]: {e}")
        return None

def _process_frame(img_bgr: np.ndarray, allow_all: bool, conf_thresh: float):
    start_time = time.perf_counter()
    h, w = img_bgr.shape[:2]
    
    raw_detections = detect_frame(MODEL, img_bgr, allow_all=allow_all, conf_thresh=conf_thresh)
    
    results = []
    class_counts = {}
    
    for det in raw_detections:
        coco_cls = det["coco_class"]
        conf = det["confidence"]
        norm_bbox = det["normalized_bbox"]
        
        if coco_cls in ["car", "bus", "truck"]:
            priority_cls = classify_priority(det, img_bgr)
            final_class = priority_cls.value.lower() if priority_cls.value != "STANDARD" else coco_cls
        else:
            final_class = coco_cls
            
        class_counts[final_class] = class_counts.get(final_class, 0) + 1
        
        results.append({
            "bbox": det["bbox"],
            "class": final_class,
            "confidence": conf,
            "normalized_bbox": norm_bbox
        })
        
    latency_ms = round((time.perf_counter() - start_time) * 1000, 1)
    fps = round(1000 / max(latency_ms, 0.1), 1)
    
    return {
        "success": True,
        "latency_ms": latency_ms,
        "fps": fps,
        "detections_count": len(results),
        "class_counts": class_counts,
        "detections": results,
        "image_size": [w, h]
    }

@app.post("/api/detect_frame")
async def detect_frame_endpoint(req: DetectRequest):
    target = req.image_url or req.image
    if not target:
        raise HTTPException(status_code=400, detail="Missing image or image_url")
        
    img_bgr = _decode_image(target)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Failed to decode image")
        
    res = _process_frame(img_bgr, req.allow_all, req.conf_threshold)
    res["camera_id"] = req.camera_id
    return res

@app.post("/api/detect_batch")
async def detect_batch_endpoint(req: BatchDetectRequest):
    out = []
    for item in req.cameras:
        target = item.image_url or item.image
        if not target:
            continue
        img_bgr = _decode_image(target)
        if img_bgr is not None:
            res = _process_frame(img_bgr, item.allow_all, item.conf_threshold)
            res["camera_id"] = item.camera_id
            out.append(res)
    return {"results": out}

@app.websocket("/ws/vision")
async def websocket_vision_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            message = await websocket.receive()
            
            img_bgr = None
            allow_all = False
            conf_thresh = 0.30
            
            if "text" in message:
                try:
                    data = json.loads(message["text"])
                    b64_str = data.get("image", "")
                    allow_all = data.get("allow_all", False)
                    conf_thresh = float(data.get("conf_threshold", 0.30))
                    img_bgr = _decode_image(b64_str)
                except Exception as e:
                    await websocket.send_json({"error": f"Decode error: {str(e)}"})
                    continue
            elif "bytes" in message:
                np_arr = np.frombuffer(message["bytes"], np.uint8)
                img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                
            if img_bgr is None:
                continue
                
            res = _process_frame(img_bgr, allow_all, conf_thresh)
            await websocket.send_json(res)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS Error]: {e}")
