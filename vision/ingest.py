import cv2
import numpy as np
from typing import Iterator
import time

def ingest_source(source: str | int) -> Iterator[np.ndarray]:
    """
    Yields standard numpy arrays representing BGR image frames.
    Handles local video files, RTSP/HTTP streams, and a synthetic fallback.
    """
    synthetic_shape = (720, 1280, 3)
    
    if source == "synthetic":
        while True:
            yield np.zeros(synthetic_shape, dtype=np.uint8)
            time.sleep(0.033) # ~30fps
            
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Warning: Could not open source {source}. Falling back to synthetic.")
        while True:
            yield np.zeros(synthetic_shape, dtype=np.uint8)
            time.sleep(0.033)
            
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                # If stream drops, reconnect for rtsp/http, else yield black frame or break?
                if isinstance(source, str) and (source.startswith("rtsp://") or source.startswith("http://")):
                    print(f"Stream dropped. Reconnecting to {source}...")
                    time.sleep(2)
                    cap.open(source)
                    continue
                else:
                    break # Video file ended
            yield frame
    finally:
        cap.release()