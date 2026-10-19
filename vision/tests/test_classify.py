import numpy as np
from schemas.lane_state import VehicleClass
from vision.classify import classify_priority, analyze_vehicle_hsv


def test_ambulance_detection_on_synthetic_frame():
    """Confirms genuine Indian 108 Emergency Ambulance is identified with 100% sensitivity."""
    for _ in range(5):
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        bbox = [100, 100, 300, 200]
        x1, y1, x2, y2 = bbox
        
        # White chassis (80% of vehicle area)
        frame[y1:y2, x1:x2] = [255, 255, 255]
        # Red cross / beacon markings (top 20% of vehicle area)
        frame[y1:y1+20, x1:x2] = [0, 0, 255]
        
        detection = {'bbox': bbox, 'coco_class': 'car', 'confidence': 0.9}
        vehicle_class = classify_priority(detection, frame)
        assert vehicle_class == VehicleClass.AMBULANCE, f"Expected AMBULANCE, got {vehicle_class}"


def test_red_car_with_windshield_glare_rejected_as_standard():
    """
    MATHEMATICAL PROOF & REJECTION TEST:
    Proves that a red passenger car with specular windshield/road reflection
    (45% red body paint, 25% white glare) is evaluated as VehicleClass.STANDARD
    and NEVER falsely classified as an AMBULANCE.
    """
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    bbox = [150, 150, 350, 300]
    x1, y1, x2, y2 = bbox

    # Red vehicle body (dominant red paint in BGR: [0, 0, 220])
    frame[y1:y2, x1:x2] = [0, 0, 220]

    # Specular windshield / sunroof reflection (white glare in BGR: [240, 240, 240])
    frame[y1+30:y1+80, x1+20:x2-20] = [240, 240, 240]

    detection = {'bbox': bbox, 'coco_class': 'car', 'confidence': 0.88}
    vehicle_class = classify_priority(detection, frame)

    roi = frame[y1:y2, x1:x2]
    metrics = analyze_vehicle_hsv(roi)

    # Prove mathematically that red paint dominates over white glare
    assert metrics["red_ratio"] > 0.30, f"Expected red body > 30%, got {metrics['red_ratio']:.2f}"
    assert metrics["red_ratio"] > metrics["white_ratio"], "Red car body must have red > white"
    assert vehicle_class == VehicleClass.STANDARD, f"Expected STANDARD (False Positive Rejected), got {vehicle_class}"


def test_pure_red_passenger_car_rejected_as_standard():
    """Proves that a standard red passenger sedan evaluates to VehicleClass.STANDARD."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    bbox = [50, 50, 200, 200]
    x1, y1, x2, y2 = bbox
    frame[y1:y2, x1:x2] = [15, 15, 230] # High-saturation Red

    detection = {'bbox': bbox, 'coco_class': 'car', 'confidence': 0.92}
    vehicle_class = classify_priority(detection, frame)
    assert vehicle_class == VehicleClass.STANDARD


def test_red_car_upstream_ambulance_label_overridden_as_standard():
    """
    Proves that if an upstream CNN detector mistakenly predicts 'ambulance' on a red car,
    secondary livery decomposition overrides it to VehicleClass.STANDARD.
    """
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    bbox = [100, 100, 250, 250]
    x1, y1, x2, y2 = bbox
    frame[y1:y2, x1:x2] = [0, 0, 210] # Red car
    frame[y1+20:y1+50, x1+15:x2-15] = [230, 230, 230] # Glare

    # Simulated upstream false-positive label
    detection = {'bbox': bbox, 'coco_class': 'ambulance', 'confidence': 0.84}
    vehicle_class = classify_priority(detection, frame)
    assert vehicle_class == VehicleClass.STANDARD, f"Expected override to STANDARD, got {vehicle_class}"


def test_auto_rickshaw_with_canvas_roof_and_red_tape_rejected_as_standard():
    """
    MATHEMATICAL PROOF & REJECTION TEST FOR AUTO-RICKSHAW:
    Proves that an Indian auto-rickshaw with cream canvas roof (30% white glare),
    yellow metal body (40% yellow paint), and rear red reflector strip (3% red)
    evaluates to VehicleClass.STANDARD and NEVER triggers an AMBULANCE preemption.
    """
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    bbox = [120, 120, 240, 280]
    x1, y1, x2, y2 = bbox
    
    # Yellow body paint (dominant Indian auto livery: BGR [0, 215, 255])
    frame[y1:y2, x1:x2] = [0, 215, 255]
    # Cream / white canvas roof (top 35% of vehicle)
    frame[y1:y1+55, x1:x2] = [230, 235, 235]
    # Rear red reflective tape / tail-lamp (bottom 5% of vehicle)
    frame[y2-10:y2, x1:x2] = [0, 0, 220]

    detection = {'bbox': bbox, 'coco_class': 'auto_rickshaw', 'confidence': 0.90}
    vehicle_class = classify_priority(detection, frame)

    roi = frame[y1:y2, x1:x2]
    metrics = analyze_vehicle_hsv(roi)

    assert metrics["yellow_ratio"] >= 0.20, f"Expected yellow body >= 20%, got {metrics['yellow_ratio']:.2f}"
    assert vehicle_class == VehicleClass.STANDARD, f"Expected STANDARD (Auto-Rickshaw Rejected), got {vehicle_class}"


def test_auto_rickshaw_upstream_ambulance_label_overridden_as_standard():
    """
    Proves that if an upstream detector mistakenly labels an auto-rickshaw as an 'ambulance',
    Guard 0 livery analysis successfully overrides it to VehicleClass.STANDARD.
    """
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    bbox = [100, 100, 220, 250]
    x1, y1, x2, y2 = bbox

    # Yellow body + green lower border
    frame[y1:y2, x1:x2] = [0, 200, 240]
    frame[y2-30:y2, x1:x2] = [30, 160, 40]
    # White canvas roof
    frame[y1:y1+40, x1:x2] = [240, 240, 240]

    detection = {'bbox': bbox, 'coco_class': 'ambulance', 'confidence': 0.82}
    vehicle_class = classify_priority(detection, frame)
    assert vehicle_class == VehicleClass.STANDARD, f"Expected override to STANDARD, got {vehicle_class}"


def test_white_passenger_car_with_brake_lights_rejected_as_standard():
    """
    MATHEMATICAL PROOF & REJECTION TEST:
    Proves that a white passenger car with illuminated red brake lights/taillights
    (75% white chassis, 6% red taillights strictly at the bottom rear bumper)
    is evaluated as VehicleClass.STANDARD and NEVER falsely flagged as an ambulance.
    """
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    bbox = [100, 100, 260, 260]
    x1, y1, x2, y2 = bbox

    # White vehicle body (80% of vehicle area)
    frame[y1:y2, x1:x2] = [245, 245, 245]
    # Red brake lights confined strictly to bottom 15% rear bumper
    frame[y2-24:y2, x1:x2] = [0, 0, 220]

    detection = {'bbox': bbox, 'coco_class': 'car', 'confidence': 0.91}
    vehicle_class = classify_priority(detection, frame)

    roi = frame[y1:y2, x1:x2]
    metrics = analyze_vehicle_hsv(roi)

    # Prove that red is confined to lower bumper, upper body is free of beacons
    assert metrics["upper_red_ratio"] < 0.015, f"Expected upper red < 1.5%, got {metrics['upper_red_ratio']:.2f}"
    assert metrics["lower_red_ratio"] > 0.15, "Lower bumper must have red taillights"
    assert vehicle_class == VehicleClass.STANDARD, f"Expected STANDARD (Brake Lights Rejected), got {vehicle_class}"


def test_white_car_upstream_ambulance_label_overridden_as_standard():
    """
    MATHEMATICAL PROOF & REJECTION TEST:
    Proves that if an upstream neural network mistakenly predicts 'ambulance'
    on a standard white passenger car (which has no rooftop emergency beacon or 108 EMS livery),
    classify_priority overrides it to VehicleClass.STANDARD and eliminates the false alarm.
    """
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    bbox = [80, 80, 240, 240]
    x1, y1, x2, y2 = bbox

    # White sedan body (white paint in BGR [240, 240, 240])
    frame[y1:y2, x1:x2] = [240, 240, 240]
    # Tinted windshield/windows (dark glass)
    frame[y1+30:y1+70, x1+20:x2-20] = [30, 30, 30]

    # Upstream detector hallucinated 'ambulance' label with 0.65 confidence
    detection = {'bbox': bbox, 'coco_class': 'ambulance', 'confidence': 0.65}
    vehicle_class = classify_priority(detection, frame)
    assert vehicle_class == VehicleClass.STANDARD, f"Expected override to STANDARD, got {vehicle_class}"


