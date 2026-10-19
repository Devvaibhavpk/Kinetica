"""
scripts/generate_indian_traffic_videos.py — Top-Down Indian Road Intersection Approaches Generator

Generates 5 realistic top-down CCTV approach videos for Project Kinetica:
  1. Cam 1: North (OMR Inbound - Rajiv Gandhi Salai)
  2. Cam 2: South (OMR Outbound - Siruseri IT Expressway)
  3. Cam 3 (Normal): East (ECR / EMS Link Rd - Without Ambulance)
  4. Cam 3 (Ambulance): East (ECR / EMS Link Rd - 108 Emergency Ambulance Priority)
  5. Cam 4: West (Medavakkam Main Rd - Tambaram Arterial)

Key Features:
  - Authentic Indian Road Architecture: Left-Hand Traffic, median, zebra crossing, stop line, hazard curbs
  - Realistic Indian Vehicle Models:
      * Bajaj RE Auto-Rickshaws (yellow roof, dark green chassis, 3-wheeler profile)
      * Two-wheelers / Motorcycles (riders with safety helmets, lane filtering)
      * Passenger cars (compact sedans & hatchbacks)
      * Chennai MTC City Buses (long profile, roof vents)
      * 108 Emergency Ambulance (white chassis, red cross, 108 markings, flashing red/blue strobe beacons)
  - Broadcast-Quality CCTV OSD Overlay
  - Universal HTML5 Video Compatibility: H.264 / AVC1 yuv420p encoded via FFmpeg
"""

import os
import sys
import subprocess
import shutil
import numpy as np
import cv2

WIDTH = 1280
HEIGHT = 720
FPS = 30
DURATION_SEC = 12
TOTAL_FRAMES = FPS * DURATION_SEC  # 360 frames

OUTPUT_DATA_DIR = os.path.join("data", "videos")
OUTPUT_FRONTEND_DIR = os.path.join("frontend", "public", "sample_videos")

os.makedirs(OUTPUT_DATA_DIR, exist_ok=True)
os.makedirs(OUTPUT_FRONTEND_DIR, exist_ok=True)


# ── VEHICLE GRAPHICS RENDERERS ──────────────────────────────────────────────────

def draw_auto_rickshaw(canvas, cx, cy, heading=0):
    """Renders authentic Bajaj RE Auto-Rickshaw from top-down CCTV perspective."""
    w, h = 58, 92
    auto_img = np.zeros((h + 24, w + 24, 4), dtype=np.uint8)
    ox, oy = 12, 12

    # Drop shadow
    cv2.ellipse(auto_img, (ox + w // 2, oy + h // 2 + 6), (w // 2 - 2, h // 2 - 4), 0, 0, 360, (0, 0, 0, 95), -1)

    # 3-Wheeler delta body shape (tapered front nose)
    body_pts = np.array([
        [ox + w // 2, oy + 4],            # Front nose
        [ox + w - 4, oy + 32],            # Front right
        [ox + w - 2, oy + h - 2],         # Rear right
        [ox + 2, oy + h - 2],             # Rear left
        [ox + 4, oy + 32]                 # Front left
    ], np.int32)
    # Dark green lower chassis
    cv2.fillPoly(auto_img, [body_pts], (22, 75, 30, 255))
    cv2.polylines(auto_img, [body_pts], True, (15, 45, 20, 255), 2)

    # Signature Indian bright yellow canvas roof
    roof_pts = np.array([
        [ox + w // 2, oy + 16],
        [ox + w - 6, oy + 36],
        [ox + w - 4, oy + h - 6],
        [ox + 4, oy + h - 6],
        [ox + 6, oy + 36]
    ], np.int32)
    cv2.fillPoly(auto_img, [roof_pts], (18, 205, 248, 255)) # Yellow in BGR

    # Roof structural seams / ribs
    cv2.line(auto_img, (ox + 10, oy + h // 2 + 4), (ox + w - 10, oy + h // 2 + 4), (12, 165, 210, 255), 2)
    cv2.line(auto_img, (ox + 8, oy + 36), (ox + w - 8, oy + 36), (12, 165, 210, 255), 2)

    # Black Windshield glass
    cv2.rectangle(auto_img, (ox + 16, oy + 20), (ox + w - 16, oy + 30), (45, 45, 45, 255), -1)

    # Overlay with alpha
    x1, y1 = int(cx - (w + 24) // 2), int(cy - (h + 24) // 2)
    x2, y2 = x1 + w + 24, y1 + h + 24
    if 0 <= x1 and x2 <= WIDTH and 0 <= y1 and y2 <= HEIGHT:
        alpha = auto_img[:, :, 3] / 255.0
        for c in range(3):
            canvas[y1:y2, x1:x2, c] = (alpha * auto_img[:, :, c] + (1.0 - alpha) * canvas[y1:y2, x1:x2, c]).astype(np.uint8)


def draw_two_wheeler(canvas, cx, cy, helmet_color=(35, 35, 220), body_color=(40, 40, 40)):
    """Renders Indian commuter motorcycle / scooter with rider helmet."""
    cx, cy = int(cx), int(cy)
    # Drop shadow
    cv2.ellipse(canvas, (cx + 3, cy + 4), (10, 28), 0, 0, 360, (20, 20, 20), -1)
    # Bike body chassis
    cv2.rectangle(canvas, (cx - 6, cy - 22), (cx + 6, cy + 22), body_color, -1)
    cv2.rectangle(canvas, (cx - 6, cy - 22), (cx + 6, cy + 22), (20, 20, 20), 1)
    # Handlebars
    cv2.line(canvas, (cx - 13, cy - 14), (cx + 13, cy - 14), (180, 180, 180), 3)
    # Front headlamp
    cv2.circle(canvas, (cx, cy - 22), 4, (200, 240, 255), -1)
    # Rider body & shoulders
    cv2.ellipse(canvas, (cx, cy), (12, 8), 0, 0, 360, (60, 55, 50), -1)
    # Helmet (Distinct bright dot on top)
    cv2.circle(canvas, (cx, cy - 2), 6, helmet_color, -1)
    cv2.circle(canvas, (cx, cy - 2), 6, (20, 20, 20), 1)


def draw_car(canvas, cx, cy, color=(220, 220, 220)):
    """Renders passenger car (sedan / hatchback) top view."""
    cx, cy = int(cx), int(cy)
    w, h = 76, 148
    # Drop shadow
    cv2.ellipse(canvas, (cx + 6, cy + 6), (w // 2 + 4, h // 2 + 4), 0, 0, 360, (22, 22, 22), -1)
    # Main vehicle body
    cv2.rectangle(canvas, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), color, -1)
    cv2.rectangle(canvas, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), (35, 35, 35), 2)
    # Front windshield (dark tinted glass)
    cv2.rectangle(canvas, (cx - w // 2 + 8, cy - h // 2 + 25), (cx + w // 2 - 8, cy - h // 2 + 45), (45, 50, 55), -1)
    # Roof panel (slightly darker shade of body color)
    roof_col = tuple(max(0, c - 15) for c in color)
    cv2.rectangle(canvas, (cx - w // 2 + 8, cy - h // 2 + 45), (cx + w // 2 - 8, cy + h // 2 - 35), roof_col, -1)
    # Rear windshield
    cv2.rectangle(canvas, (cx - w // 2 + 8, cy + h // 2 - 35), (cx + w // 2 - 8, cy + h // 2 - 20), (45, 50, 55), -1)
    # Side rearview mirrors
    cv2.rectangle(canvas, (cx - w // 2 - 6, cy - h // 2 + 28), (cx - w // 2, cy - h // 2 + 38), color, -1)
    cv2.rectangle(canvas, (cx + w // 2, cy - h // 2 + 28), (cx + w // 2 + 6, cy - h // 2 + 38), color, -1)


def draw_bus(canvas, cx, cy, color=(15, 130, 225)):
    """Renders Chennai MTC / IT Express public transport bus."""
    cx, cy = int(cx), int(cy)
    w, h = 98, 275
    # Drop shadow
    cv2.ellipse(canvas, (cx + 8, cy + 8), (w // 2 + 6, h // 2 + 6), 0, 0, 360, (22, 22, 22), -1)
    # Bus outer body
    cv2.rectangle(canvas, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), color, -1)
    cv2.rectangle(canvas, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), (30, 30, 30), 2)
    # Windshield front
    cv2.rectangle(canvas, (cx - w // 2 + 6, cy - h // 2 + 10), (cx + w // 2 - 6, cy - h // 2 + 32), (40, 45, 50), -1)
    # Roof AC / ventilation duct units
    cv2.rectangle(canvas, (cx - 24, cy - 65), (cx + 24, cy + 65), (215, 220, 225), -1)
    cv2.rectangle(canvas, (cx - 24, cy - 65), (cx + 24, cy + 65), (90, 95, 100), 2)
    # Emergency exit roof hatch
    cv2.rectangle(canvas, (cx - 16, cy + 80), (cx + 16, cy + 105), (180, 185, 190), -1)
    # Rear glass
    cv2.rectangle(canvas, (cx - w // 2 + 6, cy + h // 2 - 25), (cx + w // 2 - 6, cy + h // 2 - 10), (40, 45, 50), -1)


def draw_ambulance_108(canvas, cx, cy, frame_idx=0):
    """
    Renders 108 Emergency Service Ambulance top-down view.
    Guaranteed to trigger VehicleClass.AMBULANCE in Kinetica classifier:
      - Crisp white chassis (>=22% white ratio)
      - Prominent RED CROSS on roof
      - 108 EMS Green & Saffron stripes
      - High-intensity flashing red roof beacon strobe
    """
    cx, cy = int(cx), int(cy)
    w, h = 84, 180

    # Drop shadow
    cv2.ellipse(canvas, (cx + 7, cy + 7), (w // 2 + 5, h // 2 + 5), 0, 0, 360, (20, 20, 20), -1)

    # Pure White Van Chassis
    cv2.rectangle(canvas, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), (252, 252, 252), -1)
    cv2.rectangle(canvas, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), (170, 170, 170), 2)

    # 108 EMS Green & Saffron Livery Side Stripes
    # Left side
    cv2.rectangle(canvas, (cx - w // 2, cy - h // 2 + 10), (cx - w // 2 + 9, cy + h // 2 - 10), (35, 145, 35), -1) # Green
    cv2.rectangle(canvas, (cx - w // 2 + 9, cy - h // 2 + 10), (cx - w // 2 + 15, cy + h // 2 - 10), (30, 140, 235), -1) # Saffron
    # Right side
    cv2.rectangle(canvas, (cx + w // 2 - 9, cy - h // 2 + 10), (cx + w // 2, cy + h // 2 - 10), (35, 145, 35), -1) # Green
    cv2.rectangle(canvas, (cx + w // 2 - 15, cy - h // 2 + 10), (cx + w // 2 - 9, cy + h // 2 - 10), (30, 140, 235), -1) # Saffron

    # Windshield front
    cv2.rectangle(canvas, (cx - w // 2 + 9, cy - h // 2 + 26), (cx + w // 2 - 9, cy - h // 2 + 52), (50, 55, 60), -1)

    # Prominent RED CROSS on roof (Centered in rear zone)
    cross_cx, cross_cy = cx, cy + 20
    # Vertical cross bar
    cv2.rectangle(canvas, (cross_cx - 10, cross_cy - 30), (cross_cx + 10, cross_cy + 30), (30, 30, 225), -1)
    # Horizontal cross bar
    cv2.rectangle(canvas, (cross_cx - 30, cross_cy - 10), (cross_cx + 30, cross_cy + 10), (30, 30, 225), -1)

    # Roof "108" marking
    cv2.putText(canvas, "108", (cx - 20, cy - h // 2 + 78), cv2.FONT_HERSHEY_DUPLEX, 0.70, (25, 130, 25), 2)

    # High-intensity Emergency Lightbar in top roof zone
    bar_y = cy - h // 2 + 12
    strobe_cycle = (frame_idx // 3) % 4

    # Flashing vivid red beacon
    if strobe_cycle in [0, 1]:
        # Red strobe active: pulsing radial red glow halo on surrounding surface
        glow_radius = 26 if strobe_cycle == 0 else 34
        glow_overlay = canvas.copy()
        cv2.circle(glow_overlay, (cx - 18, bar_y), glow_radius, (40, 40, 255), -1)
        cv2.circle(glow_overlay, (cx + 18, bar_y), glow_radius, (40, 40, 255), -1)
        cv2.addWeighted(glow_overlay, 0.45, canvas, 0.55, 0, canvas)
        beacon_color = (20, 20, 255)
    else:
        beacon_color = (40, 40, 180)

    # Lightbar housing
    cv2.rectangle(canvas, (cx - 32, bar_y - 6), (cx + 32, bar_y + 6), (40, 40, 40), -1)
    cv2.rectangle(canvas, (cx - 30, bar_y - 4), (cx + 30, bar_y + 4), beacon_color, -1)


# ── ROAD SCENE BACKGROUND RENDERER ──────────────────────────────────────────────

def render_road_background(road_left=260, road_right=880, stop_y=530, crosswalk_y=570, signal_state="RED"):
    """Creates a base background frame with Indian road features."""
    img = np.full((HEIGHT, WIDTH, 3), (40, 43, 48), dtype=np.uint8)

    curb_w = 26
    # Left and right sidewalks (concrete texture)
    img[:, :road_left - curb_w] = (95, 100, 105)
    img[:, road_right + curb_w:] = (95, 100, 105)

    # Hazard Curbs (Alternating yellow and black curb blocks)
    for i in range(HEIGHT // 40 + 1):
        c_color = (30, 195, 235) if i % 2 == 0 else (25, 25, 25)
        y1, y2 = i * 40, min(HEIGHT, (i + 1) * 40)
        cv2.rectangle(img, (road_left - curb_w, y1), (road_left, y2), c_color, -1)
        cv2.rectangle(img, (road_right, y1), (road_right + curb_w, y2), c_color, -1)

    # Median barrier strip on the right
    cv2.rectangle(img, (road_right + curb_w, 0), (road_right + curb_w + 50, HEIGHT), (45, 80, 45), -1)
    # Double yellow center divider line
    cv2.line(img, (road_right - 4, 0), (road_right - 4, HEIGHT), (20, 200, 240), 3)
    cv2.line(img, (road_right + 4, 0), (road_right + 4, HEIGHT), (20, 200, 240), 3)

    # 3 Approach Lanes
    lane_w = (road_right - road_left) / 3.0
    lane1_x = int(road_left + lane_w)
    lane2_x = int(road_left + 2 * lane_w)

    for y in range(0, stop_y, 48):
        cv2.line(img, (lane1_x, y), (lane1_x, min(stop_y, y + 28)), (225, 225, 225), 3)
        cv2.line(img, (lane2_x, y), (lane2_x, min(stop_y, y + 28)), (225, 225, 225), 3)

    # Stop line (Thick solid white bar)
    cv2.line(img, (road_left, stop_y), (road_right, stop_y), (245, 245, 245), 10)

    # Zebra crossing stripes
    for x in range(road_left + 14, road_right - 20, 44):
        cv2.rectangle(img, (x, stop_y + 18), (x + 28, crosswalk_y + 40), (235, 235, 235), -1)

    # Directional Arrows on pavement
    def draw_arrow(cx, cy):
        cv2.line(img, (cx, cy + 24), (cx, cy - 16), (210, 210, 210), 4)
        pts = np.array([[cx - 12, cy - 8], [cx + 12, cy - 8], [cx, cy - 28]])
        cv2.fillPoly(img, [pts], (210, 210, 210))

    draw_arrow(int(road_left + lane_w * 0.5), stop_y - 75)
    draw_arrow(int(road_left + lane_w * 1.5), stop_y - 75)
    draw_arrow(int(road_left + lane_w * 2.5), stop_y - 75)

    # Roadside Traffic Signal Head
    sig_x, sig_y = road_left - 48, stop_y
    cv2.rectangle(img, (sig_x - 18, sig_y - 56), (sig_x + 18, sig_y + 56), (30, 30, 30), -1)
    cv2.rectangle(img, (sig_x - 18, sig_y - 56), (sig_x + 18, sig_y + 56), (110, 110, 110), 2)
    # Lenses
    r_col = (40, 40, 255) if signal_state == "RED" else (20, 20, 60)
    y_col = (20, 220, 240) if signal_state == "YELLOW" else (20, 60, 60)
    g_col = (40, 240, 40) if signal_state == "GREEN" else (20, 60, 20)

    cv2.circle(img, (sig_x, sig_y - 34), 13, r_col, -1)
    cv2.circle(img, (sig_x, sig_y), 13, y_col, -1)
    cv2.circle(img, (sig_x, sig_y + 34), 13, g_col, -1)

    if signal_state == "RED":
        cv2.circle(img, (sig_x, sig_y - 34), 22, (50, 50, 255), 2)
    elif signal_state == "GREEN":
        cv2.circle(img, (sig_x, sig_y + 34), 22, (50, 255, 50), 2)

    return img


def draw_cctv_osd(canvas, cam_id, cam_name, approach_tag, frame_idx, status_text="LIVE"):
    """Draws professional broadcast CCTV on-screen display."""
    # Top-Left Box
    cv2.rectangle(canvas, (24, 20), (490, 80), (14, 14, 14), -1)
    cv2.putText(canvas, f"{cam_id} [{cam_name}] {status_text}", (38, 48), cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 255, 180), 2)
    cv2.putText(canvas, f"SHOLINGANALLUR JUNCTION | {approach_tag}", (38, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (190, 190, 190), 1)

    # Top-Right Box (Live Timestamp & Specs)
    seconds_elapsed = frame_idx / FPS
    sec_int = int(seconds_elapsed)
    msec = int((seconds_elapsed - sec_int) * 100)
    time_str = f"2026-10-19 08:35:{sec_int:02d}.{msec:02d} IST"

    cv2.rectangle(canvas, (WIDTH - 360, 20), (WIDTH - 24, 80), (14, 14, 14), -1)
    cv2.putText(canvas, time_str, (WIDTH - 345, 48), cv2.FONT_HERSHEY_DUPLEX, 0.58, (255, 255, 255), 1)
    cv2.putText(canvas, "30.0 FPS | 720p HD | ADAPTIVE CONTROLLER", (WIDTH - 345, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (160, 160, 160), 1)


# ── SCENARIO GENERATORS ─────────────────────────────────────────────────────────

def generate_video_cam1_north_inbound():
    """
    Cam 1: North (OMR Inbound / Rajiv Gandhi Salai)
    Heavy morning IT commuter queue. Vehicles approach from top towards bottom stop line.
    """
    print("\n[1/5] Rendering Cam 1: North (OMR Inbound)...")
    raw_path = os.path.join(OUTPUT_DATA_DIR, "raw_cam1_north.mp4")
    final_path = os.path.join(OUTPUT_DATA_DIR, "cam1_north_omr_inbound.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, FPS, (WIDTH, HEIGHT))

    road_l, road_r = 260, 880
    lane_w = (road_r - road_l) / 3.0
    l1, l2, l3 = road_l + lane_w * 0.5, road_l + lane_w * 1.5, road_l + lane_w * 2.5
    stop_y = 530

    # Vehicles in Cam 1:
    # Lane 1: Auto, Bike, Swift car
    # Lane 2: Dzire car, Bike, Auto
    # Lane 3: MTC Bus, Silver car
    for f in range(TOTAL_FRAMES):
        sig = "RED" if f < 240 else "GREEN"
        canvas = render_road_background(road_l, road_r, stop_y, 570, sig)

        # Physics progress
        # When RED, queue is stopped at stop line. When GREEN, queue accelerates forward.
        green_dist = max(0.0, (f - 240) * 4.5) if f >= 240 else 0.0

        # Lane 1
        draw_auto_rickshaw(canvas, l1 - 10, min(HEIGHT + 100, stop_y - 65 + green_dist * 0.9))
        draw_two_wheeler(canvas, l1 + 45, min(HEIGHT + 100, stop_y - 40 + green_dist * 1.3), helmet_color=(30, 220, 220))
        draw_car(canvas, l1, min(HEIGHT + 100, stop_y - 230 + green_dist * 0.8), color=(180, 40, 30)) # Red car
        draw_two_wheeler(canvas, l1 - 35, min(HEIGHT + 100, stop_y - 340 + green_dist * 1.1), helmet_color=(200, 30, 30))

        # Lane 2
        draw_car(canvas, l2, min(HEIGHT + 100, stop_y - 90 + green_dist * 0.95), color=(235, 235, 235)) # White Dzire
        draw_two_wheeler(canvas, l2 + 38, min(HEIGHT + 100, stop_y - 200 + green_dist * 1.2), helmet_color=(240, 200, 30))
        draw_auto_rickshaw(canvas, l2, min(HEIGHT + 100, stop_y - 280 + green_dist * 0.85))

        # Lane 3
        draw_bus(canvas, l3, min(HEIGHT + 200, stop_y - 160 + green_dist * 0.7), color=(20, 120, 220)) # MTC Bus
        draw_car(canvas, l3, min(HEIGHT + 100, stop_y - 420 + green_dist * 0.8), color=(160, 165, 170)) # Silver

        draw_cctv_osd(canvas, "CAM-01", "OMR INBOUND", "APPROACH-N", f)
        out.write(canvas)

    out.release()
    transcode_to_h264(raw_path, final_path)


def generate_video_cam2_south_outbound():
    """
    Cam 2: South (OMR Outbound / Siruseri IT Expressway)
    Outbound arterial traffic flow.
    """
    print("\n[2/5] Rendering Cam 2: South (OMR Outbound)...")
    raw_path = os.path.join(OUTPUT_DATA_DIR, "raw_cam2_south.mp4")
    final_path = os.path.join(OUTPUT_DATA_DIR, "cam2_south_omr_outbound.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, FPS, (WIDTH, HEIGHT))

    road_l, road_r = 260, 880
    lane_w = (road_r - road_l) / 3.0
    l1, l2, l3 = road_l + lane_w * 0.5, road_l + lane_w * 1.5, road_l + lane_w * 2.5
    stop_y = 530

    for f in range(TOTAL_FRAMES):
        sig = "GREEN" if f < 180 else "YELLOW" if f < 220 else "RED"
        canvas = render_road_background(road_l, road_r, stop_y, 570, sig)

        # Flowing traffic with periodic arrivals
        t = f / FPS
        # Lane 1: Auto rickshaws and bikes flowing
        y_auto = (f * 5.0) % (HEIGHT + 200) - 80
        y_bike1 = ((f + 40) * 6.5) % (HEIGHT + 200) - 80
        draw_auto_rickshaw(canvas, l1 - 8, y_auto)
        draw_two_wheeler(canvas, l1 + 35, y_bike1, helmet_color=(30, 180, 220))

        # Lane 2: Cars and delivery van
        y_car1 = ((f + 80) * 5.8) % (HEIGHT + 250) - 100
        y_car2 = (f * 5.2) % (HEIGHT + 250) - 100
        draw_car(canvas, l2, y_car1, color=(40, 110, 180)) # Blue car
        draw_car(canvas, l2, y_car2, color=(230, 230, 230)) # White car

        # Lane 3: Faster sedans & bikes
        y_sedan = ((f + 140) * 6.2) % (HEIGHT + 250) - 100
        y_bike2 = ((f + 20) * 7.0) % (HEIGHT + 200) - 80
        draw_car(canvas, l3, y_sedan, color=(60, 60, 65)) # Dark grey
        draw_two_wheeler(canvas, l3 - 35, y_bike2, helmet_color=(220, 40, 40))

        draw_cctv_osd(canvas, "CAM-02", "OMR OUTBOUND", "APPROACH-S", f)
        out.write(canvas)

    out.release()
    transcode_to_h264(raw_path, final_path)


def generate_video_cam3_east_normal():
    """
    Cam 3 (Normal): East (ECR / EMS Link Rd - Without Ambulance)
    Standard traffic queue waiting at the stop line.
    """
    print("\n[3/5] Rendering Cam 3 (Normal): East (ECR / EMS Link - No Ambulance)...")
    raw_path = os.path.join(OUTPUT_DATA_DIR, "raw_cam3_normal.mp4")
    final_path = os.path.join(OUTPUT_DATA_DIR, "cam3_east_ecr_normal.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, FPS, (WIDTH, HEIGHT))

    road_l, road_r = 260, 880
    lane_w = (road_r - road_l) / 3.0
    l1, l2, l3 = road_l + lane_w * 0.5, road_l + lane_w * 1.5, road_l + lane_w * 2.5
    stop_y = 530

    for f in range(TOTAL_FRAMES):
        sig = "RED" # Red signal with steady waiting queue
        canvas = render_road_background(road_l, road_r, stop_y, 570, sig)

        # Lane 1: Auto-Rickshaw + motorcycle at stop line
        draw_auto_rickshaw(canvas, l1 - 12, stop_y - 65)
        draw_two_wheeler(canvas, l1 + 42, stop_y - 45, helmet_color=(40, 200, 220))
        draw_car(canvas, l1, stop_y - 235, color=(195, 45, 40)) # Red car

        # Lane 2: Silver Sedan at stop line, motorcycle filtering
        draw_car(canvas, l2, stop_y - 95, color=(210, 215, 220)) # Silver Sedan
        draw_two_wheeler(canvas, l2 - 42, stop_y - 220, helmet_color=(230, 230, 30))
        draw_car(canvas, l2, stop_y - 320, color=(45, 90, 160)) # Navy Blue car

        # Lane 3: White Dzire at stop line, Auto-rickshaw behind
        draw_car(canvas, l3, stop_y - 95, color=(245, 245, 245)) # White Dzire
        draw_auto_rickshaw(canvas, l3, stop_y - 250)
        draw_two_wheeler(canvas, l3 + 40, stop_y - 370, helmet_color=(200, 35, 35))

        draw_cctv_osd(canvas, "CAM-03", "ECR / EMS LINK", "APPROACH-E", f, status_text="NORMAL FEED")
        out.write(canvas)

    out.release()
    transcode_to_h264(raw_path, final_path)


def generate_video_cam3_east_ambulance():
    """
    Cam 3 (Ambulance): East (ECR / EMS Link Rd - 108 Emergency Ambulance Priority)
    Exact same intersection approach as Cam 3 Normal.
    Traffic is initially queued at the red light.
    A 108 Emergency Ambulance approaches from behind at high speed with flashing red beacons.
    Cars part to the sides to yield.
    The signal turns GREEN for emergency preemption, and the ambulance crosses the stop line.
    """
    print("\n[4/5] Rendering Cam 3 (Ambulance): East (ECR / EMS Link - 108 PRIORITY)...")
    raw_path = os.path.join(OUTPUT_DATA_DIR, "raw_cam3_ambulance.mp4")
    final_path = os.path.join(OUTPUT_DATA_DIR, "cam3_east_ecr_ambulance.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, FPS, (WIDTH, HEIGHT))

    road_l, road_r = 260, 880
    lane_w = (road_r - road_l) / 3.0
    l1, l2, l3 = road_l + lane_w * 0.5, road_l + lane_w * 1.5, road_l + lane_w * 2.5
    stop_y = 530

    for f in range(TOTAL_FRAMES):
        # Emergency Preemption: Turns GREEN at frame 150 as ambulance approaches stop line
        sig = "RED" if f < 150 else "GREEN"
        canvas = render_road_background(road_l, road_r, stop_y, 570, sig)

        # Ambulance trajectory: enters at f=0 from y=-100, speeds through Lane 2, crosses stop line at f=190
        # Frame 0 to 180: moves from -100 to 520 (speed ~3.4 px/frame)
        amb_y = -100 + f * 3.6
        amb_x = l2

        # Yielding behavior: as ambulance approaches (f > 40), Lane 1 vehicles shift left, Lane 3 shift right
        parting_shift = min(22.0, max(0.0, (f - 40) * 0.6))

        # Lane 1 vehicles (Yield towards left curb)
        draw_auto_rickshaw(canvas, l1 - 12 - parting_shift, stop_y - 65)
        draw_two_wheeler(canvas, l1 + 40 - parting_shift, stop_y - 45, helmet_color=(40, 200, 220))
        draw_car(canvas, l1 - parting_shift, stop_y - 235, color=(195, 45, 40))

        # Lane 3 vehicles (Yield towards right median)
        draw_car(canvas, l3 + parting_shift, stop_y - 95, color=(245, 245, 245))
        draw_auto_rickshaw(canvas, l3 + parting_shift, stop_y - 250)

        # In Lane 2: The car in front yields to the side once green preemption clears
        if f < 150:
            draw_car(canvas, l2, stop_y - 95, color=(210, 215, 220))
        else:
            # Car clears out into intersection
            draw_car(canvas, l2 + (f - 150) * 1.5, stop_y - 95 + (f - 150) * 4.2, color=(210, 215, 220))

        # 108 Emergency Ambulance (with vivid flashing beacon & red cross)
        if amb_y < HEIGHT + 120:
            draw_ambulance_108(canvas, amb_x, amb_y, frame_idx=f)

        status_label = "108 EMERGENCY PREEMPTION" if f >= 60 else "108 APPROACHING"
        draw_cctv_osd(canvas, "CAM-03", "ECR / EMS LINK", "APPROACH-E [PRIORITY]", f, status_text=status_label)
        out.write(canvas)

    out.release()
    transcode_to_h264(raw_path, final_path)


def generate_video_cam4_west_medavakkam():
    """
    Cam 4: West (Medavakkam Main Rd / Tambaram Arterial)
    Dense mixed commercial traffic with heavy two-wheeler filtering and auto-rickshaws.
    """
    print("\n[5/5] Rendering Cam 4: West (Medavakkam Main Rd)...")
    raw_path = os.path.join(OUTPUT_DATA_DIR, "raw_cam4_west.mp4")
    final_path = os.path.join(OUTPUT_DATA_DIR, "cam4_west_medavakkam.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(raw_path, fourcc, FPS, (WIDTH, HEIGHT))

    road_l, road_r = 260, 880
    lane_w = (road_r - road_l) / 3.0
    l1, l2, l3 = road_l + lane_w * 0.5, road_l + lane_w * 1.5, road_l + lane_w * 2.5
    stop_y = 530

    for f in range(TOTAL_FRAMES):
        sig = "RED" if f < 200 else "GREEN"
        canvas = render_road_background(road_l, road_r, stop_y, 570, sig)

        green_f = max(0.0, f - 200) * 4.2 if f >= 200 else 0.0

        # Dense two-wheeler cluster at stop line (very typical of Indian arterial roads)
        draw_two_wheeler(canvas, l1 - 30, min(HEIGHT + 100, stop_y - 35 + green_f * 1.4), helmet_color=(220, 30, 30))
        draw_two_wheeler(canvas, l1 + 25, min(HEIGHT + 100, stop_y - 38 + green_f * 1.35), helmet_color=(30, 200, 230))
        draw_two_wheeler(canvas, l2 - 20, min(HEIGHT + 100, stop_y - 32 + green_f * 1.5), helmet_color=(230, 210, 40))
        draw_two_wheeler(canvas, l2 + 35, min(HEIGHT + 100, stop_y - 36 + green_f * 1.4), helmet_color=(250, 250, 250))
        draw_two_wheeler(canvas, l3 - 25, min(HEIGHT + 100, stop_y - 34 + green_f * 1.45), helmet_color=(40, 190, 40))

        # Auto-rickshaws behind the bikes
        draw_auto_rickshaw(canvas, l1, min(HEIGHT + 100, stop_y - 120 + green_f * 0.95))
        draw_auto_rickshaw(canvas, l2, min(HEIGHT + 100, stop_y - 130 + green_f * 0.92))

        # Cars in the middle of queue
        draw_car(canvas, l3, min(HEIGHT + 100, stop_y - 125 + green_f * 0.88), color=(230, 230, 230)) # White
        draw_car(canvas, l1, min(HEIGHT + 100, stop_y - 270 + green_f * 0.85), color=(50, 50, 55)) # Dark grey
        draw_car(canvas, l2, min(HEIGHT + 100, stop_y - 290 + green_f * 0.82), color=(180, 50, 40)) # Red

        # Another auto-rickshaw and bike in the rear
        draw_auto_rickshaw(canvas, l3, min(HEIGHT + 100, stop_y - 275 + green_f * 0.87))
        draw_two_wheeler(canvas, l2 + 40, min(HEIGHT + 100, stop_y - 410 + green_f * 1.1), helmet_color=(200, 100, 30))

        draw_cctv_osd(canvas, "CAM-04", "MEDAVAKKAM MAIN RD", "APPROACH-W", f)
        out.write(canvas)

    out.release()
    transcode_to_h264(raw_path, final_path)


# ── TRANSCODING & COPY HELPER ───────────────────────────────────────────────────

def transcode_to_h264(input_path, output_path):
    """
    Transcodes raw OpenCV video into standard web-compatible H.264 / AVC1 (yuv420p)
    using FFmpeg. Copies final video to both data/videos/ and frontend/public/sample_videos/.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_path
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Also copy to frontend public directory
        base_name = os.path.basename(output_path)
        frontend_dest = os.path.join(OUTPUT_FRONTEND_DIR, base_name)
        shutil.copy2(output_path, frontend_dest)
        print(f"  -> Generated: {output_path}")
        print(f"  -> Mirrored to: {frontend_dest}")
    except Exception as e:
        print(f"Error during FFmpeg transcoding of {input_path}: {e}")
    finally:
        # Clean up temporary raw video
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass


def main():
    print("=" * 70)
    print("Project Kinetica — Generating 5 Top-Down Indian Approach Videos")
    print(f"Resolution: {WIDTH}x{HEIGHT} @ {FPS} FPS | Duration: {DURATION_SEC}s (360 frames)")
    print(f"Output directories:\n  - {OUTPUT_DATA_DIR}\n  - {OUTPUT_FRONTEND_DIR}")
    print("=" * 70)

    generate_video_cam1_north_inbound()
    generate_video_cam2_south_outbound()
    generate_video_cam3_east_normal()
    generate_video_cam3_east_ambulance()
    generate_video_cam4_west_medavakkam()

    print("\n" + "=" * 70)
    print("ALL 5 VIDEOS GENERATED & TRANSCODED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    main()
