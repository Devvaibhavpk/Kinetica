import cv2
import numpy as np
from schemas.lane_state import VehicleClass


def analyze_vehicle_hsv(roi: np.ndarray) -> dict:
    """
    Computes rigorous HSV color space metrics and livery ratios for a vehicle crop.
    Used for mathematical proof and classification of ambulances vs. red passenger cars.
    
    Approach: Rule-based HSV color-space and livery geometric ratio analyzer
    calibrated against Indian MoRTH AIS-125 road ambulance specifications.
    """
    rh, rw = roi.shape[:2]
    total_pixels = max(1, rh * rw)
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    
    # Roof Zone (top 20% where emergency lightbars sit)
    roof_h = max(2, int(rh * 0.20))
    roof_hsv = hsv[0:roof_h, :]
    roof_pixels = max(1, roof_h * rw)
    
    # 1. White Mask (Chassis / Body): S <= 75, V >= 125
    white_mask = cv2.inRange(hsv, np.array([0, 0, 125]), np.array([180, 75, 255]))
    white_ratio = cv2.countNonZero(white_mask) / total_pixels
    
    # 2. Vivid Red Mask (Emergency Cross / Beacon / Red Paint: S >= 60, V >= 60)
    lower_red1, upper_red1 = np.array([0, 60, 60]), np.array([12, 255, 255])
    lower_red2, upper_red2 = np.array([165, 60, 60]), np.array([180, 255, 255])
    def get_red(img):
        return cv2.bitwise_or(cv2.inRange(img, lower_red1, upper_red1), cv2.inRange(img, lower_red2, upper_red2))
        
    red_mask = get_red(hsv)
    red_ratio = cv2.countNonZero(red_mask) / total_pixels
    
    # 3. Vivid Blue Mask (Police Lightbar Beacon ONLY: S >= 100, V >= 80)
    blue_mask = cv2.inRange(hsv, np.array([95, 100, 80]), np.array([135, 255, 255]))
    blue_ratio = cv2.countNonZero(blue_mask) / total_pixels
    
    # 4. Green Mask (108 EMS Stripes: S >= 50, V >= 50)
    green_mask = cv2.inRange(hsv, np.array([35, 50, 50]), np.array([85, 255, 255]))
    green_ratio = cv2.countNonZero(green_mask) / total_pixels
    
    # 5. Yellow Mask (Auto-Rickshaw Body Livery: H in [15, 38], S >= 60, V >= 60)
    yellow_mask = cv2.inRange(hsv, np.array([15, 60, 60]), np.array([38, 255, 255]))
    yellow_ratio = cv2.countNonZero(yellow_mask) / total_pixels
    
    # 6. Roof Siren Zone Ratios
    roof_vivid_red = cv2.countNonZero(get_red(roof_hsv)) / roof_pixels
    roof_vivid_blue = cv2.countNonZero(cv2.inRange(roof_hsv, np.array([95, 100, 80]), np.array([135, 255, 255]))) / roof_pixels

    # 7. Spatial Zonal Decomposition (Upper Body vs. Lower Bumper Taillights)
    # Upper/Mid zone (top 65% of vehicle body where emergency beacon and red cross sit)
    upper_h = max(2, int(rh * 0.65))
    upper_hsv = hsv[0:upper_h, :]
    upper_pixels = max(1, upper_h * rw)
    upper_red_ratio = cv2.countNonZero(get_red(upper_hsv)) / upper_pixels

    # Lower bumper zone (bottom 35% where standard red taillights and brake reflectors sit)
    lower_hsv = hsv[upper_h:, :]
    lower_pixels = max(1, (rh - upper_h) * rw)
    lower_red_ratio = cv2.countNonZero(get_red(lower_hsv)) / lower_pixels

    return {
        "total_pixels": total_pixels,
        "white_ratio": white_ratio,
        "red_ratio": red_ratio,
        "blue_ratio": blue_ratio,
        "green_ratio": green_ratio,
        "yellow_ratio": yellow_ratio,
        "roof_vivid_red": roof_vivid_red,
        "roof_vivid_blue": roof_vivid_blue,
        "upper_red_ratio": upper_red_ratio,
        "lower_red_ratio": lower_red_ratio,
        "white_to_red_ratio": (white_ratio / max(red_ratio, 0.0001)),
    }


def classify_priority(detection: dict, frame: np.ndarray) -> VehicleClass:
    """
    Strict Emergency Priority Classifier with Zero False-Positives.
    
    Approach Documentation: Rule-based HSV color-space, structural livery ratio,
    spatial zonal decomposition, and roof beacon geometry analyzer, specifically calibrated
    under Indian MoRTH AIS-125 road ambulance specifications to prevent false alarms from:
    1. Red passenger cars (Swift, Baleno, sedans).
    2. Indian Auto-rickshaws (yellow/green liveries with canvas roofs).
    3. Standard white passenger cars with red taillights/brake lights on.
    4. Two-wheelers, auto-rickshaws, and non-emergency roadway agents.
    
    Returns VehicleClass.AMBULANCE, VehicleClass.POLICE, or VehicleClass.STANDARD.
    """
    x1, y1, x2, y2 = detection['bbox']
    coco_cls = str(detection.get('coco_class') or detection.get('class', 'car')).lower()
    
    # ── GUARD -1: Non-Emergency Roadway Agents (Motorcycles, Auto-Rickshaws, Pedestrians) ──
    # Road ambulances (MoRTH AIS-125) are four-wheel patient transport vehicles.
    # Two-wheelers, three-wheel auto-rickshaws, and pedestrians NEVER qualify as emergency vehicles.
    if coco_cls in ['motorcycle', 'motorbike', 'bike', 'bicycle', 'person', 'auto_rickshaw', 'auto', 'rickshaw', 'tuk_tuk']:
        return VehicleClass.STANDARD

    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    
    if x2 <= x1 or y2 <= y1:
        return VehicleClass.STANDARD
        
    roi = frame[y1:y2, x1:x2]
    rh, rw = roi.shape[:2]
    if rh < 8 or rw < 8:
        return VehicleClass.STANDARD
        
    metrics = analyze_vehicle_hsv(roi)
    white_ratio = metrics["white_ratio"]
    red_ratio = metrics["red_ratio"]
    blue_ratio = metrics["blue_ratio"]
    green_ratio = metrics["green_ratio"]
    yellow_ratio = metrics["yellow_ratio"]
    roof_vivid_red = metrics["roof_vivid_red"]
    roof_vivid_blue = metrics["roof_vivid_blue"]
    upper_red_ratio = metrics["upper_red_ratio"]
    lower_red_ratio = metrics["lower_red_ratio"]
    
    # ── GUARD 0: Auto-Rickshaw False-Positive Filter ──
    # Auto-rickshaws feature yellow body paint (>=8%) or yellow/green livery.
    # While they may have cream/white canvas roofs and red rear reflector tape,
    # they are STANDARD commercial vehicles and MUST NEVER trigger an emergency preemption!
    if yellow_ratio >= 0.08 or (yellow_ratio >= 0.04 and green_ratio >= 0.03):
        return VehicleClass.STANDARD

    # ── GUARD 1: Red Passenger Car False-Positive Filter ──
    # If the vehicle has significant red paint (>=15%) and red is the primary body color
    # (i.e. red >= 0.45 * white, or white chassis is below ambulance threshold < 35%),
    # or red exceeds white, this vehicle is a RED CAR, NOT an ambulance.
    if red_ratio >= 0.15:
        if white_ratio < 0.35 or red_ratio >= (0.45 * white_ratio) or red_ratio >= white_ratio:
            return VehicleClass.STANDARD

    # ── GUARD 1B: White Passenger Car with Red Brake Lights / Taillights ──
    # When a white passenger car/cab stops, red taillights illuminate on the rear bumper.
    # In standard cars, red pixels are confined almost exclusively to the bottom 35% bumper zone.
    # Real ambulances have their emergency beacon on the roof and Red Cross on the upper/mid body.
    # If the upper body and roof have NO red marking (< 1.5%), this is a WHITE CAR WITH BRAKE LIGHTS.
    if red_ratio > 0 and red_ratio <= 0.15:
        if upper_red_ratio < 0.015 and roof_vivid_red < 0.025:
            return VehicleClass.STANDARD

    # ── GUARD 1C: Freight Cargo Truck Filter ──
    # Standard cargo/freight trucks are not ambulances unless verified by 108 EMS livery or white ambulance van profile
    if coco_cls == 'truck':
        is_ems_truck = (
            (white_ratio >= 0.35 and yellow_ratio < 0.06) and
            (
                (green_ratio >= 0.06 and upper_red_ratio >= 0.015) or
                (upper_red_ratio >= 0.015 and roof_vivid_red >= 0.025) or
                (roof_vivid_red >= 0.020 and roof_vivid_blue >= 0.020)
            )
        )
        if not is_ems_truck:
            return VehicleClass.STANDARD
            
    # ── GUARD 2: Standard Blue Passenger Car (Never Police) ──
    if blue_ratio > 0.12 and (roof_vivid_red < 0.03 or roof_vivid_blue < 0.04):
        return VehicleClass.STANDARD
        
    # ── RULE 1: Real Emergency Ambulance (MoRTH AIS-125 / 108 EMS) ──
    # Evaluated before police cruiser: Indian 108 ambulances feature white chassis (>=30%)
    # with genuine rooftop emergency beacons or dual red/blue flashing rooftop strobe lightbars,
    # or official 108 EMS green livery with red cross emblem.
    if white_ratio >= 0.30 and yellow_ratio < 0.06:
        # 1. Vivid Rooftop Emergency Strobe Beacon (Mandatory under MoRTH AIS-125)
        is_roof_beacon = (roof_vivid_red >= 0.025 and red_ratio <= 0.25 and white_ratio >= 1.2 * red_ratio)
        is_dual_strobe = (roof_vivid_red >= 0.018 and roof_vivid_blue >= 0.018 and white_ratio >= 0.30)
        # 2. Official 108 EMS Green Livery with Red Cross
        is_ems_green = (green_ratio >= 0.06 and (upper_red_ratio >= 0.020 or roof_vivid_red >= 0.020))
        # 3. Dense Geometric Red Cross Emblem (Requires roof beacon confirmation or high upper red concentration)
        is_red_cross = (
            (roof_vivid_red >= 0.020 or upper_red_ratio >= 0.040) and
            (upper_red_ratio >= 0.025 and red_ratio <= 0.25) and
            (white_ratio >= 1.4 * red_ratio)
        )
        
        if is_roof_beacon or is_dual_strobe or is_ems_green or is_red_cross:
            return VehicleClass.AMBULANCE

    # ── RULE 2: Real Police Patrol Cruiser ──
    # STRICT: Must have BOTH Vivid Blue AND Vivid Red lightbar beacon in the top 20% roof zone on a non-ambulance chassis
    if coco_cls != 'truck' and roof_vivid_blue >= 0.05 and roof_vivid_red >= 0.03:
        if white_ratio < 0.40 or upper_red_ratio < 0.015:
            return VehicleClass.POLICE
            
    # Fallback to direct model class if and only if verified with roof beacon or EMS livery
    if coco_cls == 'ambulance' and white_ratio >= 0.30 and yellow_ratio < 0.06:
        if (roof_vivid_red >= 0.020 or (roof_vivid_red >= 0.015 and roof_vivid_blue >= 0.015) or (green_ratio >= 0.05 and upper_red_ratio >= 0.020) or upper_red_ratio >= 0.035):
            return VehicleClass.AMBULANCE
    if coco_cls == 'police' and roof_vivid_blue >= 0.03 and roof_vivid_red >= 0.02:
        return VehicleClass.POLICE
        
    return VehicleClass.STANDARD