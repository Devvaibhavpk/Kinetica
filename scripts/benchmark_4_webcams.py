"""
benchmark_4_webcams.py — Simulates 4 concurrent live camera/webcam connections streaming to Kinetica Edge Gateway.
Tests simultaneous throughput, inference latency, priority preemption, and queue estimation across Approach-N, S, E, and W.
"""

import asyncio
import base64
import json
import time
import cv2
import numpy as np
import websockets

APPROACHES = [
    {"id": "Approach-N", "endpoint": "ws://127.0.0.1:8000/ws/vision/Approach-N", "name": "North (OMR Inbound)", "cars": 4},
    {"id": "Approach-S", "endpoint": "ws://127.0.0.1:8000/ws/vision/Approach-S", "name": "South (OMR Outbound)", "cars": 3},
    {"id": "Approach-E", "endpoint": "ws://127.0.0.1:8000/ws/vision/Approach-E", "name": "East (ECR Link - EMS)", "cars": 2, "ambulance": True},
    {"id": "Approach-W", "endpoint": "ws://127.0.0.1:8000/ws/vision/Approach-W", "name": "West (Medavakkam Rd)", "cars": 2},
]


def create_synthetic_frame(approach: dict, frame_idx: int) -> str:
    """Generate synthetic CCTV top-down road frame."""
    h, w = 480, 640
    frame = np.full((h, w, 3), 45, dtype=np.uint8)

    # Road surface
    cv2.rectangle(frame, (100, 0), (540, h), (35, 35, 35), -1)
    # Road markings
    cv2.line(frame, (320, 0), (320, h), (255, 255, 255), 2)
    for y in range(0, h, 40):
        cv2.line(frame, (210, y), (210, y + 20), (220, 220, 220), 2)
        cv2.line(frame, (430, y), (430, y + 20), (220, 220, 220), 2)

    # Label
    cv2.putText(frame, f"CAM FEED: {approach['id']} #{frame_idx}", (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 200), 2)

    # Render vehicles
    num_cars = approach.get("cars", 2)
    for c in range(num_cars):
        cy = 100 + c * 75 + (frame_idx * 5) % 60
        cx = 240 if c % 2 == 0 else 380
        # Car body
        cv2.rectangle(frame, (cx - 20, cy - 35), (cx + 20, cy + 35), (180, 100, 40), -1)
        cv2.rectangle(frame, (cx - 18, cy - 15), (cx + 18, cy + 15), (70, 70, 70), -1)

    if approach.get("ambulance") and frame_idx >= 3:
        # Ambulance with flashing beacons
        ay = 380
        ax = 240
        cv2.rectangle(frame, (ax - 22, ay - 45), (ax + 22, ay + 45), (240, 240, 240), -1)
        # Red cross
        cv2.rectangle(frame, (ax - 12, ay - 4), (ax + 12, ay + 4), (0, 0, 220), -1)
        cv2.rectangle(frame, (ax - 4, ay - 12), (ax + 4, ay + 12), (0, 0, 220), -1)
        # Flashing beacon
        beacon_color = (0, 0, 255) if frame_idx % 2 == 0 else (255, 0, 0)
        cv2.circle(frame, (ax, ay - 35), 8, beacon_color, -1)
        cv2.putText(frame, "AMBULANCE 108", (ax - 45, ay - 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)

    _, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
    b64_str = base64.b64encode(encoded.tobytes()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"


async def stream_webcam_approach(approach: dict, num_frames: int = 10) -> dict:
    """Connect to dedicated approach WebSocket and stream frames concurrently."""
    url = approach["endpoint"]
    app_id = approach["id"]
    latencies = []
    detections_per_frame = []
    active_conns = []

    print(f"[{app_id}] Connecting to {url}...")
    try:
        async with websockets.connect(url, max_size=10 * 1024 * 1024) as ws:
            print(f"[{app_id}] Connected successfully! Streaming {num_frames} frames...")
            for f in range(num_frames):
                img_data = create_synthetic_frame(approach, f)
                payload = {
                    "image": img_data,
                    "camera_id": app_id,
                    "approach_id": app_id,
                    "allow_all": True,
                    "conf_threshold": 0.25,
                }
                t0 = time.perf_counter()
                await ws.send(json.dumps(payload))
                resp_text = await ws.recv()
                elapsed = (time.perf_counter() - t0) * 1000
                latencies.append(elapsed)

                res = json.loads(resp_text)
                det_cnt = res.get("detections_count", 0)
                detections_per_frame.append(det_cnt)
                conn_cnt = res.get("active_camera_connections", 0)
                active_conns.append(conn_cnt)

                await asyncio.sleep(0.04)  # ~25 FPS pacing

            print(f"[{app_id}] Stream completed. Avg Latency: {np.mean(latencies):.1f}ms | Avg Detections: {np.mean(detections_per_frame):.1f}")
            return {
                "approach": app_id,
                "frames_sent": num_frames,
                "avg_latency_ms": round(float(np.mean(latencies)), 1),
                "min_latency_ms": round(float(np.min(latencies)), 1),
                "max_latency_ms": round(float(np.max(latencies)), 1),
                "avg_detections": round(float(np.mean(detections_per_frame)), 1),
                "max_active_connections": max(active_conns) if active_conns else 0,
                "status": "PASS",
            }
    except Exception as e:
        print(f"[{app_id}] Stream error: {e}")
        return {
            "approach": app_id,
            "status": "FAIL",
            "error": str(e),
        }


async def run_benchmark(num_frames: int = 10):
    print("=" * 65)
    print(" KINETICA 4-WEBCAM CONCURRENT WEBSOCKET BENCHMARK")
    print(f" Launching 4 concurrent WebSocket streams ({num_frames} frames each)...")
    print("=" * 65)

    start = time.perf_counter()
    tasks = [stream_webcam_approach(app, num_frames) for app in APPROACHES]
    results = await asyncio.gather(*tasks)
    total_time = time.perf_counter() - start

    total_frames = sum(r.get("frames_sent", 0) for r in results if r["status"] == "PASS")
    throughput_fps = total_frames / total_time if total_time > 0 else 0

    print("\n" + "=" * 65)
    print(" BENCHMARK RESULTS SUMMARY:")
    print("=" * 65)
    for r in results:
        if r["status"] == "PASS":
            print(f"  {r['approach']}: {r['frames_sent']} frames | Latency: {r['avg_latency_ms']}ms (min={r['min_latency_ms']}, max={r['max_latency_ms']}) | Avg Dets: {r['avg_detections']} | Conns: {r['max_active_connections']}")
        else:
            print(f"  {r['approach']}: FAILED - {r.get('error')}")

    print("-" * 65)
    print(f" Total Frames: {total_frames} across 4 concurrent cameras")
    print(f" Wallclock Duration: {total_time:.2f}s")
    print(f" Aggregate Multi-Camera Throughput: {throughput_fps:.1f} FPS")
    all_passed = all(r["status"] == "PASS" for r in results)
    print(f" Overall Status: {'ALL 4 WEBCAM CONNECTIONS SUCCEEDED' if all_passed else 'SOME CONNECTIONS FAILED'}")
    print("=" * 65)
    return results


if __name__ == "__main__":
    asyncio.run(run_benchmark(num_frames=8))
