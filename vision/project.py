import os
import json
import cv2
import numpy as np

def load_calibration(camera_id: str) -> dict:
    """
    Loads camera calibration data including homography matrix.
    Must raise FileNotFoundError if it doesn't exist, strictly no silent fallbacks.
    """
    file_path = f"data/calibration/{camera_id}.json"
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Calibration file {file_path} not found")
        
    with open(file_path, "r") as f:
        return json.load(f)

def project_to_lane_metrics(detections: list[dict], calibration: dict) -> dict[str, tuple[float, float]]:
    """
    Computes real-world metrics based on bounding boxes.
    Returns: dict mapping lane_id to (density_veh_per_m, queue_length_m)
    """
    H = np.array(calibration["homography_matrix"])
    ppm = calibration.get("pixels_per_meter", 1.0)
    
    # We will aggregate all detections into a single default lane for this MVP
    # In a full system, you would segment the homography plane into distinct lane polygons
    lane_id = "lane_0"
    
    if not detections:
        return {lane_id: (0.0, 0.0)}
        
    vehicle_count = len(detections)
    
    # Bottom-center points of bounding boxes: [x_center, y_bottom]
    points_2d = []
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        points_2d.append([[(x1 + x2) / 2.0, float(y2)]])
        
    points_2d = np.array(points_2d, dtype=np.float32)
    
    # Apply homography transform to bird's eye view
    points_bev = cv2.perspectiveTransform(points_2d, H)
    
    # Calculate queue length as the maximum Y distance in the transformed space (in meters)
    # Assuming the stop line is at y=0 in the transformed space, and y increases backwards
    # We will just take the max y coordinate divided by ppm
    y_coords = points_bev[:, 0, 1]
    
    # We take the 90th percentile to avoid outliers extending the queue length artificially, 
    # but for strict physics we could just take max()
    max_y_pixels = np.max(y_coords)
    queue_length_m = float(max(0, max_y_pixels / ppm))
    
    # Density = count / queue_length
    density = float(vehicle_count / queue_length_m) if queue_length_m > 0 else 0.0
    
    return {lane_id: (density, queue_length_m)}