import cv2
import numpy as np
from schemas.lane_state import VehicleClass

def classify_priority(detection: dict, frame: np.ndarray) -> VehicleClass:
    """
    Placeholder heuristic to identify priority vehicles based on color thresholding.
    This will be replaced by a fine-tuned YOLO model in future iterations.
    
    Checks the bounding box region for dominant white/red (ambulance) or red/blue (police).
    Returns VehicleClass.AMBULANCE, VehicleClass.POLICE, or VehicleClass.STANDARD.
    """
    x1, y1, x2, y2 = detection['bbox']
    
    # Ensure coordinates are within frame bounds
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    
    if x2 <= x1 or y2 <= y1:
        return VehicleClass.STANDARD
        
    roi = frame[y1:y2, x1:x2]
    hsv_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    
    # Calculate total pixels in ROI
    total_pixels = roi.shape[0] * roi.shape[1]
    
    # Ambulance heuristic: Bright white chassis + red markings
    # White threshold
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 50, 255])
    white_mask = cv2.inRange(hsv_roi, lower_white, upper_white)
    
    # Red threshold (wraps around in HSV)
    lower_red1 = np.array([0, 120, 70])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([170, 120, 70])
    upper_red2 = np.array([180, 255, 255])
    red_mask = cv2.bitwise_or(
        cv2.inRange(hsv_roi, lower_red1, upper_red1),
        cv2.inRange(hsv_roi, lower_red2, upper_red2)
    )
    
    # Police heuristic: Blue markings
    lower_blue = np.array([100, 150, 0])
    upper_blue = np.array([140, 255, 255])
    blue_mask = cv2.inRange(hsv_roi, lower_blue, upper_blue)
    
    white_ratio = cv2.countNonZero(white_mask) / total_pixels
    red_ratio = cv2.countNonZero(red_mask) / total_pixels
    blue_ratio = cv2.countNonZero(blue_mask) / total_pixels
    
    # Simple thresholds
    if white_ratio > 0.4 and red_ratio > 0.05:
        return VehicleClass.AMBULANCE
    elif blue_ratio > 0.1 and red_ratio > 0.05:
        return VehicleClass.POLICE
        
    return VehicleClass.STANDARD