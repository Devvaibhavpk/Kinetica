import pytest
import numpy as np
from pathlib import Path
from vision.model_zoo import (
    BaseDetector,
    YOLOv8Detector,
    RTDETRDetector,
    MobileNetSSDDetector,
    get_detector,
)

def test_factory_get_detector():
    det_yolo = get_detector("yolov8")
    assert isinstance(det_yolo, YOLOv8Detector)

    det_rt = get_detector("rtdetr")
    assert isinstance(det_rt, RTDETRDetector)

    det_ssd = get_detector("mobilenet_ssd")
    assert isinstance(det_ssd, MobileNetSSDDetector)

    with pytest.raises(ValueError):
        get_detector("invalid_model_type")

def test_yolov8_detector_loads_weights():
    # Should automatically find weights/best.pt or best.pt
    det = YOLOv8Detector()
    assert det.model is not None
    # Verify 7 classes from custom training
    assert len(det.class_names) == 7
    assert det.class_names[0] == "car"
    assert det.class_names[5] == "ambulance"
    assert det.class_names[6] == "police"

def test_emergency_filtering():
    det = MobileNetSSDDetector()
    sample_dets = [
        {"class": "car", "confidence": 0.95, "bbox": [10, 10, 50, 50]},
        {"class": "ambulance", "confidence": 0.92, "bbox": [100, 100, 150, 150]},
        {"class": "police", "confidence": 0.84, "bbox": [200, 200, 250, 250]},  # < 0.85
        {"class": "truck", "confidence": 0.89, "bbox": [300, 300, 350, 350]},
    ]

    emergency = det.filter_emergency(sample_dets, min_conf=0.85)
    assert len(emergency) == 1
    assert emergency[0]["class"] == "ambulance"
    assert emergency[0]["confidence"] == 0.92

def test_detector_infer_contract():
    det = MobileNetSSDDetector()
    fake_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    results = det.infer(fake_frame)

    assert isinstance(results, list)
    assert len(results) > 0
    d = results[0]
    assert "bbox" in d
    assert "class" in d
    assert "confidence" in d
    assert "bottom_center" in d
    assert "normalized_bbox" in d
    assert len(d["bbox"]) == 4
    assert len(d["bottom_center"]) == 2

def test_yolov8_inference_on_real_frame():
    test_img = Path("data/raw/Car Tracking & Object Detection Dataset/images/frame_000000.PNG")
    if not test_img.exists():
        pytest.skip("Test image not present")

    import cv2
    frame = cv2.imread(str(test_img))
    assert frame is not None

    det = YOLOv8Detector("weights/best.pt")
    results = det.infer(frame, conf_threshold=0.25)
    assert len(results) > 0
    for r in results:
        assert r["confidence"] >= 0.25
        assert r["class"] in det.class_names.values()
