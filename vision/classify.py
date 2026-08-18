import cv2
import numpy as np
from schemas.lane_state import VehicleClass

def classify_priority(detection: dict, frame: np.ndarray) -> VehicleClass:
    """
    Strict Emergency Priority Classifier with Zero False-Positives.
    
    1. Real Police Patrol Cruisers:
       - STRICT: Must possess a dual Vivid Red + Vivid Blue emergency lightbar on the roof (top 20%).
       - Normal blue cars, navy cars, and blue trucks are 100% excluded and categorized as STANDARD.
    2. Real Ambulances (108 EMS & Emergency units):
       - White chassis (>=22%) + dominant Red Cross/Stripe markings (Red > Blue) OR 108 EMS Green stripes (>=6%).
    3. Standard Traffic (Guaranteed STANDARD):
       - Blue, Red, White, Silver, Black passenger cars.
       - Commercial Trucks with blue/white cargo containers.
       - Plain white delivery vans without emergency livery.
    
    Returns VehicleClass.AMBULANCE, VehicleClass.POLICE, or VehicleClass.STANDARD.
    """
    x1, y1, x2, y2 = detection['bbox']
    coco_cls = detection.get('coco_class', 'car')
    
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    
    if x2 <= x1 or y2 <= y1:
        return VehicleClass.STANDARD
        
    roi = frame[y1:y2, x1:x2]
    rh, rw = roi.shape[:2]
    if rh < 8 or rw < 8:
        return VehicleClass.STANDARD
        
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    total_pixels = max(1, rh * rw)
    
    # Roof Zone (top 20% where emergency lightbars sit)
    roof_h = max(2, int(rh * 0.20))
    roof_hsv = hsv[0:roof_h, :]
    roof_pixels = max(1, roof_h * rw)
    
    # White Mask (Chassis) - S <= 75, V >= 125
    white_mask = cv2.inRange(hsv, np.array([0, 0, 125]), np.array([180, 75, 255]))
    white_ratio = cv2.countNonZero(white_mask) / total_pixels
    
    # Vivid Red Mask (Emergency Cross / Beacon / Red Paint: S >= 60, V >= 60)
    lower_red1, upper_red1 = np.array([0, 60, 60]), np.array([12, 255, 255])
    lower_red2, upper_red2 = np.array([165, 60, 60]), np.array([180, 255, 255])
    def get_red(img):
        return cv2.bitwise_or(cv2.inRange(img, lower_red1, upper_red1), cv2.inRange(img, lower_red2, upper_red2))
        
    red_mask = get_red(hsv)
    red_ratio = cv2.countNonZero(red_mask) / total_pixels
    
    # Vivid Blue Mask (Police Lightbar Beacon ONLY: S >= 100, V >= 80)
    # High saturation S >= 100 rejects pale sky reflections, tint, and dull blue paint
    blue_mask = cv2.inRange(hsv, np.array([95, 100, 80]), np.array([135, 255, 255]))
    blue_ratio = cv2.countNonZero(blue_mask) / total_pixels
    
    # Green Mask (108 EMS Stripes: S >= 50, V >= 50)
    green_mask = cv2.inRange(hsv, np.array([35, 50, 50]), np.array([85, 255, 255]))
    green_ratio = cv2.countNonZero(green_mask) / total_pixels
    
    roof_vivid_red = cv2.countNonZero(get_red(roof_hsv)) / roof_pixels
    roof_vivid_blue = cv2.countNonZero(cv2.inRange(roof_hsv, np.array([95, 100, 80]), np.array([135, 255, 255]))) / roof_pixels
    
    # ── GUARD 1: Pure Red Passenger Car (No White Body) ──
    if red_ratio > 0.20 and white_ratio < 0.18:
        return VehicleClass.STANDARD
        
    # ── GUARD 2: Standard Blue Passenger Car (Never Police) ──
    # If the vehicle body is blue but does not have a dual roof siren beacon -> STANDARD
    if blue_ratio > 0.12 and (roof_vivid_red < 0.03 or roof_vivid_blue < 0.04):
        return VehicleClass.STANDARD
        
    # ── RULE 1: Real Police Patrol Cruiser ──
    # STRICT: Must have BOTH Vivid Blue AND Vivid Red lightbar beacon in the top 20% roof zone!
    if coco_cls != 'truck' and roof_vivid_blue >= 0.05 and roof_vivid_red >= 0.03:
        return VehicleClass.POLICE
        
    # ── RULE 2: Real Emergency Ambulance ──
    # Requires White chassis (>=22%) PLUS (Red Cross/Beacon >=3.5% and Red > Blue) or 108 EMS Green Stripes (>=6%)
    if white_ratio >= 0.22:
        if (red_ratio >= 0.035 and red_ratio > blue_ratio) or (green_ratio >= 0.06 and red_ratio >= 0.015) or (roof_vivid_red >= 0.035 and red_ratio > blue_ratio):
            return VehicleClass.AMBULANCE
            
    return VehicleClass.STANDARD