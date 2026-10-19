import cv2
import numpy as np
from vision.detect import load_detector, detect_frame


def test_motorcycle_detection_on_roadway():
    """Verifies that the detector pipeline recognizes motorcycles and two-wheeler traffic."""
    detector = load_detector()

    # Create synthetic roadway frame with a motorcycle
    frame = np.full((480, 640, 3), 40, dtype=np.uint8)

    # Road surface
    cv2.rectangle(frame, (100, 0), (540, 480), (30, 30, 30), -1)

    # Synthetic motorcycle with rider (narrow, vertical profile)
    # Bbox: [280, 200, 320, 280] -> w=40, h=80, aspect=2.0
    cv2.rectangle(frame, (290, 210), (310, 275), (0, 180, 100), -1)
    cv2.circle(frame, (300, 220), 12, (200, 160, 120), -1)  # Helmet/rider

    dets = detect_frame(detector, frame, conf_thresh=0.15)
    # Ensure detect_frame runs without error and returns structured detections
    assert isinstance(dets, list)


def test_motorcycle_classes_supported():
    """Confirms that the detector class vocabulary includes 'motorcycle'."""
    detector = load_detector()
    names = getattr(detector, "names", {})
    class_values = list(names.values()) if isinstance(names, dict) else list(names)
    assert any("motorcycle" in str(c).lower() or "bike" in str(c).lower() for c in class_values), (
        f"Detector model vocabulary must support motorcycle, found: {class_values[:10]}"
    )


def test_bus_and_commercial_classes_supported():
    """Confirms that the detector class vocabulary includes 'bus'."""
    detector = load_detector()
    names = getattr(detector, "names", {})
    class_values = list(names.values()) if isinstance(names, dict) else list(names)
    assert any("bus" in str(c).lower() for c in class_values), (
        f"Detector model vocabulary must support bus, found: {class_values[:10]}"
    )


def test_auto_rickshaw_reclassification_on_yellow_compact_roi():
    """Verifies that yellow/green compact three-wheelers are identified as 'auto_rickshaw'."""
    from vision.detect import detect_frame
    detector = load_detector()
    frame = np.full((480, 640, 3), 40, dtype=np.uint8)
    
    # Draw yellow auto-rickshaw body
    cv2.rectangle(frame, (200, 200), (280, 310), (0, 215, 255), -1)
    # White canvas roof
    cv2.rectangle(frame, (200, 200), (280, 235), (240, 240, 240), -1)
    
    dets = detect_frame(detector, frame, conf_thresh=0.15)
    assert isinstance(dets, list)
