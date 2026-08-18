"use client";

import React, { useState, useEffect, useRef } from "react";

interface Detection {
  bbox: [number, number, number, number];
  class: string;
  confidence: number;
  normalized_bbox: [number, number, number, number];
}

interface WsInferenceResponse {
  success: boolean;
  latency_ms: number;
  fps: number;
  detections_count: number;
  class_counts: Record<string, number>;
  detections: Detection[];
  image_size?: [number, number];
}

interface TrackedVehicle {
  id: number;
  class: string;
  confidence: number;
  norm_bbox: [number, number, number, number];
  missedFrames: number;
}

interface JunctionCamera {
  id: string;
  name: string;
  road: string;
  imageUrl: string;
  defaultStatus: string;
  homography: string;
}

const JUNCTION_CAMERAS: JunctionCamera[] = [
  {
    id: "CAM-01",
    name: "CAM-01 · SHOLINGANALLUR",
    road: "OMR NORTH CORRIDOR",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBR4YaC1rwAdRVTfJJPDE6cuRTlSXj4e4MFrETbRpG0HXgYWXnOZ8SaIBYxEX_H0Lbq5K1WUVbds-Vf0ib-3LkDjZB-f5GRR2gEAgd5iBpD4gh1PY9-pleNwMsVb1nntDiOXGYd9u18ZjhACHJnIDMEIqX7o5M9sMbR4B5GkRkUV3QrA578Rvz-PmbR4c6Ntgs34WFrUu17h6vtZPbIbtfDWkeeH6qUqZRxj1wQCzXdIyMk6vG_4x_fDA",
    defaultStatus: "108 EMS PREEMPTION ACTIVE",
    homography: "20 px/m",
  },
  {
    id: "CAM-02",
    name: "CAM-02 · MADHYA KAILASH",
    road: "SARDAR PATEL RD",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBJDlS4PL07UxmZlrJd_2YgT0q6LsxE_GqjsNV6bhdDuIqaLTWavgJeJTJptUoBXfjU29Hs2MjfEs82TuMhGud7bahfffkGcnGRbOvtVBGsMQYcHQzlt_WVhFQzHsAvAyNowtxCbMVE6dtUJyvRdegMtBv_Y0du_mbiM_gGosywMbyhjWqPxCt_JTe3tSa9C56TvLmzhRUzBidf53DFD5G6nBHkmVSy7HSHkGCIvI9pak9J2Exn4CuHBA",
    defaultStatus: "PATROL UNIT PASSING",
    homography: "18 px/m",
  },
  {
    id: "CAM-03",
    name: "CAM-03 · TIDEL PARK",
    road: "OMR FAST-LANE",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVMYifTcU3r-GoZi5JSVwCqek0920Tmoqwj-8jJk1xurcD_GiiQHds0eK3Y9FZuXcvehhhdRR_3mMSXxBhq2PE1Tf6imhmgwPI3kYh0oWUOjGeI3vlbYNDXADSyitn_nY6AItTLIwL-qadOqYUYVryV13tosO_BeP0wd-LkF3saop1ccrnRwCID3MR0VcetqMUSwudJw2Aq9zpqTHGzf34v8wEK9-s91lbSKey7EY4a4LbUw4vww04g",
    defaultStatus: "FAST-LANE CLEAR",
    homography: "22 px/m",
  },
  {
    id: "CAM-04",
    name: "CAM-04 · KATHIPARA FLYOVER",
    road: "GST HWY INTERCHANGE",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQhfLF-ooQ1z6ZhfZ1G20Eyxf6V-xiAaTJVSs4LHgPe_Cw88BIiYV-b11EGYoHjquxbhBRVxfql8dGMTYpWmVc9FkLb-rQpMSSWQQObvaYcQRd8XiRmvfeqQa50rmoeeldn5tz5GLEriq0g9mai2BBEg94EbOT6iyP7EjfC7fGChzWdNqzqT7MuI7Q1eCdBO7dMyR-OPvCc_Doal4lPR53TsTi6WQX4Kc_M1UCFFCuOQ1nZvYfVHcvfQ",
    defaultStatus: "HIGHWAY MAINLINE FLOW",
    homography: "15 px/m",
  },
];

function computeIoU(b1: [number, number, number, number], b2: [number, number, number, number]): number {
  const [x1, y1, w1, h1] = b1;
  const [x2, y2, w2, h2] = b2;
  const ix1 = Math.max(x1, x2);
  const iy1 = Math.max(y1, y2);
  const ix2 = Math.min(x1 + w1, x2 + w2);
  const iy2 = Math.min(y1 + h1, y2 + h2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const interArea = iw * ih;
  const area1 = w1 * h1;
  const area2 = w2 * h2;
  const unionArea = area1 + area2 - interArea;
  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

export default function VisionMonitorView() {
  const [activeTab, setActiveTab] = useState<"webcam" | "array">("webcam");

  // ── 4-CAMERA ARRAY STATE ─────────────────────────────
  const [arrayFilter, setArrayFilter] = useState<string>("all");
  const [arrayDetections, setArrayDetections] = useState<Record<string, { detections: Detection[]; latency_ms: number; fps: number }>>({});
  const [isArrayDetecting, setIsArrayDetecting] = useState<boolean>(false);

  // ── LIVE STREAMING & WEBSOCKET STATE ─────────────────────────────
  const [streamSource, setStreamSource] = useState<"webcam" | "screenshare" | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [allowAllClasses, setAllowAllClasses] = useState<boolean>(false);
  const [confThreshold, setConfThreshold] = useState<number>(0.32);
  const [liveDetections, setLiveDetections] = useState<Detection[]>([]);
  const [trackedVehicles, setTrackedVehicles] = useState<TrackedVehicle[]>([]);
  const [liveLatency, setLiveLatency] = useState<number>(0);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveClassCounts, setLiveClassCounts] = useState<Record<string, number>>({});
  const [streamError, setStreamError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [videoDisplaySize, setVideoDisplaySize] = useState<{ w: number; h: number }>({ w: 640, h: 460 });

  // ── CUMULATIVE SESSION INFLOW STATE (START TO END) ─────────────────────────────
  const [telemetryMode, setTelemetryMode] = useState<"instant" | "cumulative">("cumulative");
  const [cumulativeVehicleCount, setCumulativeVehicleCount] = useState<number>(0);
  const [cumulativeClassCounts, setCumulativeClassCounts] = useState<Record<string, number>>({});
  const [peakDensity, setPeakDensity] = useState<number>(0);
  const [streamDurationSec, setStreamDurationSec] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasCaptureRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const isStreamingRef = useRef<boolean>(false);
  const currentTracksRef = useRef<TrackedVehicle[]>([]);
  const trackIdCounterRef = useRef<number>(1);

  // Live session timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamDurationSec((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

  const resetCumulativeStats = () => {
    setCumulativeVehicleCount(0);
    setCumulativeClassCounts({});
    setPeakDensity(0);
    setStreamDurationSec(0);
    trackIdCounterRef.current = 0;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // ── COLOR CODING HELPER ─────────────────────────────
  const getClassColor = (className: string) => {
    switch (className.toLowerCase()) {
      case "ambulance":
      case "police":
        return "#ff4060"; // Emergency Red
      case "bus":
      case "truck":
        return "#ffab1a"; // Heavy Commercial Orange
      case "motorcycle":
      case "bicycle":
        return "#00c97a"; // Two-Wheeler Green
      case "car":
        return "#4d9fff"; // Passenger Blue
      case "person":
        return "#a855f7"; // Pedestrian Purple
      default:
        return "#00c97a";
    }
  };

  const hasEmergencyVehicle = Boolean(
    liveClassCounts.ambulance || liveClassCounts.police
  );

  // Helper for 4-Camera Array Bounding Box Filtering
  const getArrayDisplay = (boxClass: string) => {
    if (arrayFilter === "all") return undefined;
    return arrayFilter === boxClass ? undefined : "none";
  };

  // ── RUN BACKEND BATCH INFERENCE ON 4 CAMERAS ─────────────────────────────
  const runArrayInference = async () => {
    setIsArrayDetecting(true);
    try {
      const res = await fetch("http://localhost:8000/api/detect_batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameras: JUNCTION_CAMERAS.map((cam) => ({
            camera_id: cam.id,
            image_url: cam.imageUrl,
            conf_threshold: confThreshold,
            allow_all: allowAllClasses,
          })),
        }),
      });
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        const mapped: Record<string, any> = {};
        for (const item of data.results) {
          mapped[item.camera_id] = item;
        }
        setArrayDetections(mapped);
      }
    } catch (err) {
      console.warn("Backend batch inference fallback active:", err);
    } finally {
      setIsArrayDetecting(false);
    }
  };

  useEffect(() => {
    if (activeTab === "array") {
      runArrayInference();
    }
  }, [activeTab, confThreshold, allowAllClasses]);

  // ── UPDATE VIDEO DISPLAY RECT ─────────────────────────────
  const updateVideoDisplaySize = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const container = video.parentElement;
    if (!container) return;

    const containerW = container.clientWidth || 640;
    const containerH = container.clientHeight || 460;
    const vW = video.videoWidth || 640;
    const vH = video.videoHeight || 480;

    const aspect = vW / vH;
    let w = containerW;
    let h = containerW / aspect;

    if (h > containerH) {
      h = containerH;
      w = containerH * aspect;
    }

    setVideoDisplaySize({ w: Math.round(w), h: Math.round(h) });
  };

  useEffect(() => {
    window.addEventListener("resize", updateVideoDisplaySize);
    return () => window.removeEventListener("resize", updateVideoDisplaySize);
  }, []);

  const allowAllRef = useRef<boolean>(false);
  const confThresholdRef = useRef<number>(0.25);

  useEffect(() => {
    allowAllRef.current = allowAllClasses;
  }, [allowAllClasses]);

  useEffect(() => {
    confThresholdRef.current = confThreshold;
  }, [confThreshold]);

  // ── CAPTURE & SEND FRAME (ZERO-QUEUE FAST PIPELINE) ─────────────────────────────
  const sendCurrentFrame = () => {
    if (!isStreamingRef.current) return;
    if (isProcessingFrameRef.current) return;
    if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) return;

    if (!canvasCaptureRef.current) {
      canvasCaptureRef.current = document.createElement("canvas");
    }

    const canvas = canvasCaptureRef.current;
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 480, 270);
    const base64Data = canvas.toDataURL("image/jpeg", 0.45);

    isProcessingFrameRef.current = true;
    wsRef.current.send(
      JSON.stringify({
        image: base64Data,
        allow_all: allowAllRef.current,
        conf_threshold: confThresholdRef.current,
      })
    );
  };

  // ── WEBSOCKET CONNECTION & LIFECYCLE ─────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWs = () => {
      setWsStatus("connecting");
      try {
        ws = new WebSocket("ws://localhost:8000/ws/vision");
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus("connected");
          setStreamError(null);
        };

        ws.onmessage = (event) => {
          try {
            const data: WsInferenceResponse = JSON.parse(event.data);
            if (data.success) {
              setLiveDetections(data.detections);
              setLiveLatency(data.latency_ms);
              setLiveFps(data.fps);
              setLiveClassCounts(data.class_counts || {});
              setFrameCount((prev) => prev + 1);

              // Multi-Object Tracking & Exponential Moving Average (EMA) Coordinate Smoothing
              const incoming = data.detections;
              const updatedTracks: TrackedVehicle[] = [];
              const matchedIncomingIndices = new Set<number>();

              for (const track of currentTracksRef.current) {
                let bestIoU = 0;
                let bestIdx = -1;
                for (let i = 0; i < incoming.length; i++) {
                  if (matchedIncomingIndices.has(i)) continue;
                  const iou = computeIoU(track.norm_bbox, incoming[i].normalized_bbox);
                  if (iou > bestIoU && iou > 0.15) {
                    bestIoU = iou;
                    bestIdx = i;
                  }
                }

                if (bestIdx !== -1) {
                  matchedIncomingIndices.add(bestIdx);
                  const inc = incoming[bestIdx];
                  const [tx, ty, tw, th] = track.norm_bbox;
                  const [nx, ny, nw, nh] = inc.normalized_bbox;
                  const alpha = 0.65; // Smoothing factor: 65% fresh detection, 35% momentum

                  updatedTracks.push({
                    id: track.id,
                    class: inc.class,
                    confidence: Math.round((track.confidence * 0.3 + inc.confidence * 0.7) * 100) / 100,
                    norm_bbox: [
                      tx * (1 - alpha) + nx * alpha,
                      ty * (1 - alpha) + ny * alpha,
                      tw * (1 - alpha) + nw * alpha,
                      th * (1 - alpha) + nh * alpha,
                    ],
                    missedFrames: 0,
                  });
                } else if (track.missedFrames < 2) {
                  // Coast object for up to 2 frames to prevent flash/flicker
                  updatedTracks.push({
                    ...track,
                    missedFrames: track.missedFrames + 1,
                  });
                }
              }

              // Add new tracks for previously unseen vehicles (Cumulative Inflow)
              let newVehiclesCount = 0;
              const newClasses: Record<string, number> = {};

              for (let i = 0; i < incoming.length; i++) {
                if (!matchedIncomingIndices.has(i)) {
                  const inc = incoming[i];
                  trackIdCounterRef.current += 1;
                  newVehiclesCount += 1;
                  newClasses[inc.class] = (newClasses[inc.class] || 0) + 1;

                  updatedTracks.push({
                    id: trackIdCounterRef.current,
                    class: inc.class,
                    confidence: inc.confidence,
                    norm_bbox: inc.normalized_bbox,
                    missedFrames: 0,
                  });
                }
              }

              if (newVehiclesCount > 0) {
                setCumulativeVehicleCount((prev) => prev + newVehiclesCount);
                setCumulativeClassCounts((prev) => {
                  const updated = { ...prev };
                  for (const [cls, count] of Object.entries(newClasses)) {
                    updated[cls] = (updated[cls] || 0) + count;
                  }
                  return updated;
                });
              }

              setPeakDensity((prev) => Math.max(prev, incoming.length));

              currentTracksRef.current = updatedTracks;
              setTrackedVehicles([...updatedTracks]);
            }
          } catch (e) {
            console.error("Failed to parse WS response", e);
          } finally {
            isProcessingFrameRef.current = false;
            if (isStreamingRef.current) {
              requestAnimationFrame(sendCurrentFrame);
            }
          }
        };

        ws.onclose = () => {
          setWsStatus("disconnected");
          reconnectTimer = setTimeout(connectWs, 2000);
        };

        ws.onerror = () => {
          setWsStatus("disconnected");
          setStreamError("FastAPI WebSocket server unreachable at ws://localhost:8000/ws/vision");
        };
      } catch (err: any) {
        setWsStatus("disconnected");
        setStreamError(err.message || "Failed to initialize WebSocket");
        reconnectTimer = setTimeout(connectWs, 2000);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
      stopStream();
    };
  }, []);

  // ── START WEBCAM STREAM ─────────────────────────────
  const startWebcamStream = async () => {
    setStreamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        isStreamingRef.current = true;
        setStreamSource("webcam");
        updateVideoDisplaySize();

        isProcessingFrameRef.current = false;
        requestAnimationFrame(sendCurrentFrame);
      }
    } catch (err: any) {
      setStreamError(`Camera Error: ${err.message || "Permission Denied"}`);
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  };

  // ── START YOUTUBE TAB / SCREEN SHARE STREAM ─────────────────────────────
  const startScreenShareStream = async () => {
    setStreamError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        isStreamingRef.current = true;
        setStreamSource("screenshare");
        updateVideoDisplaySize();

        stream.getVideoTracks()[0].onended = () => {
          stopStream();
        };

        isProcessingFrameRef.current = false;
        requestAnimationFrame(sendCurrentFrame);
      }
    } catch (err: any) {
      setStreamError(`Screen Share Cancelled: ${err.message || "Not Selected"}`);
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  };

  const stopStream = () => {
    isStreamingRef.current = false;
    isProcessingFrameRef.current = false;

    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      videoRef.current.pause();
    }

    setIsStreaming(false);
    setStreamSource(null);
    setLiveDetections([]);
    setTrackedVehicles([]);
    currentTracksRef.current = [];
    setFrameCount(0);
  };

  return (
    <div className="flex flex-col gap-4 h-full text-[#e8eaf0] pb-8 overflow-y-auto font-sans">
      {/* ── TOP CONTROL BAR ───────────────────────────── */}
      <div className="bg-[#161820]/90 backdrop-blur-md border border-[#2e3140] rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00c97a]/10 border border-[#00c97a]/30 flex items-center justify-center text-[#00c97a]">
            <span className="material-symbols-rounded text-2xl">videocam</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#e8eaf0] tracking-tight">
                Edge YOLOv8 Perception & Spatial Homography
              </h2>
              <span
                className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  wsStatus === "connected"
                    ? "bg-[#00c97a]/15 text-[#00c97a] border-[#00c97a]/40 shadow-[0_0_8px_rgba(0,201,122,0.2)]"
                    : wsStatus === "connecting"
                    ? "bg-[#ffab1a]/15 text-[#ffab1a] border-[#ffab1a]/40"
                    : "bg-[#ff4060]/15 text-[#ff4060] border-[#ff4060]/40"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    wsStatus === "connected" ? "bg-[#00c97a] animate-ping" : "bg-[#ff4060]"
                  }`}
                ></span>
                WS {wsStatus.toUpperCase()} (PORT 8000)
              </span>
            </div>
            <p className="font-mono text-xs text-[#9096a8] mt-0.5">
              Chennai Metropolitan Area (CMA) Sector 4 · 4-Camera Multi-Lane Array & Live Stream
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-[#111318] border border-[#2e3140] p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab("webcam")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "webcam"
                ? "bg-[#00c97a]/20 text-[#00c97a] border border-[#00c97a]/40 shadow-sm"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            <span className="material-symbols-rounded text-[18px]">videocam</span>
            <span>Live Video / YouTube YOLO</span>
          </button>
          <button
            onClick={() => {
              stopStream();
              setActiveTab("array");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "array"
                ? "bg-[#2c2f3a] text-[#e8eaf0] border border-[#4d9fff]/30 shadow-sm"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            <span className="material-symbols-rounded text-[18px]">grid_view</span>
            <span>4-Camera Array</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: LIVE WEBCAM & YOUTUBE STREAMING (HERO) ───────────────────────────── */}
      {activeTab === "webcam" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 items-start">
          {/* Live Video Viewport (8 Cols) */}
          <div className="xl:col-span-8 bg-[#161820] border border-[#2e3140] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
            {/* Viewport Header Bar */}
            <div className="flex justify-between items-center border-b border-[#2e3140] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isStreaming ? "bg-[#00c97a] animate-pulse" : "bg-[#9096a8]"
                  }`}
                ></span>
                <span className="font-mono text-xs font-bold text-[#e8eaf0] uppercase tracking-wider">
                  {isStreaming
                    ? `LIVE ${streamSource?.toUpperCase()} STREAM -> PYTHON YOLOv8`
                    : "INPUT FEED STANDBY"}
                </span>
                {isStreaming && (
                  <span className="font-mono text-[10px] bg-[#111318] text-[#9096a8] px-2.5 py-0.5 rounded-full border border-[#2e3140]">
                    Frame #{frameCount}
                  </span>
                )}
              </div>

              {isStreaming && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#00c97a]/15 text-[#00c97a] px-3 py-1 rounded-lg border border-[#00c97a]/30 font-bold">
                    <span className="material-symbols-rounded text-sm">bolt</span>
                    <span>{liveLatency} ms</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#4d9fff]/15 text-[#4d9fff] px-3 py-1 rounded-lg border border-[#4d9fff]/30 font-bold">
                    <span className="material-symbols-rounded text-sm">speed</span>
                    <span>{liveFps} FPS</span>
                  </div>
                </div>
              )}
            </div>

            {/* Video Canvas Container with HUD Viewfinder */}
            <div className="relative w-full h-[480px] bg-[#0c0e12] rounded-xl overflow-hidden border border-[#2e3140] flex items-center justify-center">
              {/* HUD Corner Viewfinder Reticles */}
              <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-[#00c97a]/60 pointer-events-none z-20"></div>
              <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-[#00c97a]/60 pointer-events-none z-20"></div>
              <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-[#00c97a]/60 pointer-events-none z-20"></div>
              <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-[#00c97a]/60 pointer-events-none z-20"></div>

              {/* Viewport Video Container (Always mounted in DOM) */}
              <div
                className={`relative flex items-center justify-center ${
                  !isStreaming ? "hidden" : "flex"
                }`}
                style={{ width: videoDisplaySize.w, height: videoDisplaySize.h }}
              >
                {/* HTML5 Video Element */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  onLoadedMetadata={updateVideoDisplaySize}
                  onPlay={updateVideoDisplaySize}
                  className="w-full h-full object-contain"
                />

                {/* Smooth Multi-Object Tracked Bounding Box Overlay Cards */}
                {isStreaming &&
                  trackedVehicles.map((track) => {
                    const [normX, normY, normW, normH] = track.norm_bbox;
                    const isPriority = track.class === "ambulance" || track.class === "police";
                    const color = getClassColor(track.class);

                    return (
                      <div
                        key={track.id}
                        style={{
                          position: "absolute",
                          left: `${normX * 100}%`,
                          top: `${normY * 100}%`,
                          width: `${normW * 100}%`,
                          height: `${normH * 100}%`,
                          borderColor: color,
                          backgroundColor: `${color}20`,
                          opacity: track.missedFrames > 0 ? 0.6 : 1,
                          boxShadow: isPriority
                            ? `0 0 16px ${color}`
                            : `0 0 8px ${color}66`,
                          transition: "left 75ms ease-out, top 75ms ease-out, width 75ms ease-out, height 75ms ease-out",
                        }}
                        className="border-2 rounded-md pointer-events-none will-change-[left,top,width,height]"
                      >
                        {/* Label Tag */}
                        <div
                          style={{
                            backgroundColor: color,
                            color: color === "#ffab1a" ? "#000000" : "#ffffff",
                          }}
                          className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shadow-md whitespace-nowrap"
                        >
                          {track.class} {(track.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* High-Tech Full-Width Empty State Launch Cards */}
              {!isStreaming && (
                <div className="flex flex-col justify-between items-center w-full h-full p-6 text-center z-10">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[10px] bg-[#00c97a]/15 text-[#00c97a] px-3 py-1 rounded-full border border-[#00c97a]/30 font-bold uppercase tracking-widest inline-block mb-1.5">
                      Kinetica Computer Vision Subsystem
                    </span>
                    <h3 className="text-xl font-bold text-[#e8eaf0] tracking-tight">
                      Live Vehicle Inference & Priority Tracker
                    </h3>
                    <p className="font-mono text-xs text-[#9096a8] max-w-xl mx-auto mt-1 leading-relaxed">
                      Stream high-definition traffic camera feeds or physical cameras into Python YOLOv8 in real-time.
                    </p>
                  </div>

                  {/* Dual Launch Cards Filling Container */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl my-auto">
                    {/* Card 1: YouTube Tab / Screen Share */}
                    <div
                      onClick={startScreenShareStream}
                      className="group bg-gradient-to-br from-[#ff4060]/10 via-[#161820] to-[#111318] hover:from-[#ff4060]/20 border border-[#ff4060]/30 hover:border-[#ff4060] p-5 rounded-2xl cursor-pointer transition-all duration-200 text-left flex flex-col justify-between shadow-xl hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-11 h-11 rounded-xl bg-[#ff4060]/20 text-[#ff4060] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <span className="material-symbols-rounded text-2xl">screen_share</span>
                          </div>
                          <span className="font-mono text-[9px] bg-[#ff4060]/20 text-[#ff4060] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Recommended
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-[#e8eaf0] group-hover:text-[#ff4060] transition-colors">
                          Share YouTube Tab
                        </h4>
                        <p className="font-mono text-xs text-[#9096a8] mt-1.5 leading-relaxed">
                          Stream 1080p/4K YouTube traffic footage, OMR CCTV, or drone videos directly into YOLO.
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#2e3140] flex items-center justify-between text-xs font-mono font-bold text-[#ff4060]">
                        <span>Launch Tab Stream</span>
                        <span className="material-symbols-rounded text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </div>
                    </div>

                    {/* Card 2: Physical Webcam */}
                    <div
                      onClick={startWebcamStream}
                      className="group bg-gradient-to-br from-[#00c97a]/10 via-[#161820] to-[#111318] hover:from-[#00c97a]/20 border border-[#00c97a]/30 hover:border-[#00c97a] p-5 rounded-2xl cursor-pointer transition-all duration-200 text-left flex flex-col justify-between shadow-xl hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-11 h-11 rounded-xl bg-[#00c97a]/20 text-[#00c97a] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <span className="material-symbols-rounded text-2xl">videocam</span>
                          </div>
                          <span className="font-mono text-[9px] bg-[#00c97a]/20 text-[#00c97a] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Hardware
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-[#e8eaf0] group-hover:text-[#00c97a] transition-colors">
                          Start Physical Webcam
                        </h4>
                        <p className="font-mono text-xs text-[#9096a8] mt-1.5 leading-relaxed">
                          Use your laptop camera or external USB camera feed for live edge vehicle recognition.
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#2e3140] flex items-center justify-between text-xs font-mono font-bold text-[#00c97a]">
                        <span>Start Camera Feed</span>
                        <span className="material-symbols-rounded text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {streamError && (
              <div className="p-3.5 rounded-xl bg-[#ff4060]/15 border border-[#ff4060]/40 text-[#ff4060] text-xs font-mono flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-base">warning</span>
                  <span>{streamError}</span>
                </div>
                <span className="font-bold bg-[#ff4060]/20 px-2 py-0.5 rounded">FastAPI :8000</span>
              </div>
            )}
          </div>

          {/* Control & Stream Telemetry Panel (4 Cols) */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            {/* Stream Action Controls Card */}
            <div className="bg-[#161820] border border-[#2e3140] rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
              <span className="font-mono text-xs font-bold text-[#e8eaf0] uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-rounded text-sm text-[#4d9fff]">tune</span>
                <span>Stream Controller</span>
              </span>

              {isStreaming ? (
                <button
                  onClick={stopStream}
                  className="w-full py-3 bg-[#ff4060] hover:bg-[#e03554] text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_16px_rgba(255,64,96,0.4)]"
                >
                  <span className="material-symbols-rounded text-base">stop_circle</span>
                  <span>Terminate Active Stream</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={startScreenShareStream}
                    className="w-full py-2.5 bg-[#ff4060] hover:bg-[#e03554] text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-rounded text-sm">screen_share</span>
                    <span>Share YouTube Tab</span>
                  </button>

                  <button
                    onClick={startWebcamStream}
                    className="w-full py-2.5 bg-[#00c97a] hover:bg-[#00b06b] text-[#0a0c10] font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-rounded text-sm">videocam</span>
                    <span>Start Physical Webcam</span>
                  </button>
                </div>
              )}

              {/* Class Detection Scope Selector */}
              <div className="flex items-center justify-between p-2.5 bg-[#111318] border border-[#2e3140] rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-[#9096a8]">filter_alt</span>
                  <span className="font-mono text-xs text-[#9096a8]">Scope:</span>
                </div>
                <button
                  onClick={() => setAllowAllClasses(!allowAllClasses)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    allowAllClasses
                      ? "bg-[#4d9fff]/20 text-[#4d9fff] border border-[#4d9fff]/40"
                      : "bg-[#00c97a]/20 text-[#00c97a] border border-[#00c97a]/40"
                  }`}
                >
                  {allowAllClasses ? "All 80 COCO" : "Traffic Only"}
                </button>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="p-3 bg-[#111318] border border-[#2e3140] rounded-xl flex flex-col gap-2">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#9096a8]">Confidence Threshold:</span>
                  <span className="text-[#00c97a] font-bold">{(confThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.02"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full accent-[#00c97a] cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[9px] text-[#9096a8]">
                  <span>10% (Dense)</span>
                  <span>32% (Optimal)</span>
                  <span>80% (Strict)</span>
                </div>
              </div>
            </div>

            {/* Emergency Priority Alert Banner */}
            {hasEmergencyVehicle && (
              <div className="bg-gradient-to-r from-[#ff4060]/20 via-[#ff4060]/10 to-transparent border border-[#ff4060] rounded-2xl p-3.5 flex items-center gap-3 animate-pulse shadow-[0_0_18px_rgba(255,64,96,0.3)]">
                <div className="w-10 h-10 rounded-xl bg-[#ff4060] text-white flex items-center justify-center font-bold text-lg">
                  🚨
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-[#ff4060] uppercase block">
                    Priority Preemption Triggered
                  </span>
                  <span className="font-mono text-[11px] text-[#e8eaf0]">
                    108 Emergency / Police detected in corridor
                  </span>
                </div>
              </div>
            )}

            {/* Dual-Mode Live Spectrum & Cumulative Session Ledger Card */}
            <div className="bg-[#161820] border border-[#2e3140] rounded-2xl p-4 flex flex-col gap-3 shadow-sm flex-1">
              {/* Header & Mode Switcher */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-[#111318] p-1 rounded-xl border border-[#2e3140]">
                  <button
                    onClick={() => setTelemetryMode("cumulative")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      telemetryMode === "cumulative"
                        ? "bg-[#00c97a]/20 text-[#00c97a] border border-[#00c97a]/40"
                        : "text-[#9096a8] hover:text-[#e8eaf0]"
                    }`}
                  >
                    <span className="material-symbols-rounded text-xs">receipt_long</span>
                    <span>Session Inflow</span>
                  </button>
                  <button
                    onClick={() => setTelemetryMode("instant")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      telemetryMode === "instant"
                        ? "bg-[#4d9fff]/20 text-[#4d9fff] border border-[#4d9fff]/40"
                        : "text-[#9096a8] hover:text-[#e8eaf0]"
                    }`}
                  >
                    <span className="material-symbols-rounded text-xs">bolt</span>
                    <span>Active Now</span>
                  </button>
                </div>

                {/* Reset Session Counters Button */}
                <button
                  onClick={resetCumulativeStats}
                  title="Reset Session Inflow Counters"
                  className="p-1.5 bg-[#111318] hover:bg-[#2c2f3a] text-[#9096a8] hover:text-[#e8eaf0] rounded-lg border border-[#2e3140] transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                >
                  <span className="material-symbols-rounded text-xs">rotate_left</span>
                  <span>Reset</span>
                </button>
              </div>

              {/* ── VIEW 1: CUMULATIVE SESSION INFLOW (START TO END) ── */}
              {telemetryMode === "cumulative" && (
                <div className="flex flex-col gap-3 flex-1">
                  {/* Big Hero Inflow Readout */}
                  <div className="bg-gradient-to-br from-[#00c97a]/15 via-[#111318] to-[#161820] p-3.5 rounded-xl border border-[#00c97a]/30 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#00c97a] uppercase tracking-wider block">
                        Total Unique Inflow (Start → End)
                      </span>
                      <span className="text-3xl font-bold font-mono text-[#e8eaf0] tracking-tight">
                        {cumulativeVehicleCount}{" "}
                        <span className="text-xs text-[#9096a8] font-normal">vehicles</span>
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[9px] text-[#9096a8] uppercase block">Session Time</span>
                      <span className="text-sm font-bold text-[#4d9fff]">
                        {formatDuration(streamDurationSec)}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="bg-[#111318] p-2.5 rounded-xl border border-[#2e3140]">
                      <span className="text-[9px] text-[#9096a8] uppercase block">Peak Density</span>
                      <span className="text-lg font-bold text-[#ffab1a]">
                        {peakDensity} veh/frame
                      </span>
                    </div>
                    <div className="bg-[#111318] p-2.5 rounded-xl border border-[#2e3140]">
                      <span className="text-[9px] text-[#9096a8] uppercase block">Active In Frame</span>
                      <span className="text-lg font-bold text-[#00c97a]">
                        {liveDetections.length}
                      </span>
                    </div>
                  </div>

                  {/* Cumulative Classification Ledger */}
                  <div className="bg-[#111318] p-3 rounded-xl border border-[#2e3140] flex flex-col gap-2 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[9px] text-[#9096a8] uppercase">
                        Cumulative Class Ledger
                      </span>
                      <span className="font-mono text-[9px] text-[#00c97a] font-bold">
                        {cumulativeVehicleCount} Passed
                      </span>
                    </div>

                    {Object.keys(cumulativeClassCounts).length === 0 ? (
                      <div className="flex flex-col items-center justify-center my-auto py-5 text-center">
                        <span className="material-symbols-rounded text-xl text-[#9096a8] mb-1">history_toggle_off</span>
                        <span className="font-mono text-[11px] text-[#9096a8]">
                          Start streaming to accumulate traffic inflow
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                        {Object.entries(cumulativeClassCounts).map(([cls, count]) => {
                          const color = getClassColor(cls);
                          return (
                            <div
                              key={cls}
                              className="bg-[#1c1e24] p-2 rounded-lg border border-[#2e3140] flex justify-between items-center"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: color }}
                                ></span>
                                <span className="text-[#e8eaf0] uppercase truncate text-[11px]">{cls}</span>
                              </div>
                              <span
                                style={{ backgroundColor: `${color}20`, color: color }}
                                className="font-bold px-2 py-0.5 rounded font-mono text-xs"
                              >
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── VIEW 2: INSTANTANEOUS ACTIVE MONITOR ── */}
              {telemetryMode === "instant" && (
                <div className="flex flex-col gap-3 flex-1">
                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="bg-[#111318] p-3 rounded-xl border border-[#2e3140]">
                      <span className="text-[9px] text-[#9096a8] uppercase block">Active Targets</span>
                      <span className="text-2xl font-bold text-[#00c97a]">
                        {liveDetections.length}
                      </span>
                    </div>
                    <div className="bg-[#111318] p-3 rounded-xl border border-[#2e3140]">
                      <span className="text-[9px] text-[#9096a8] uppercase block">Edge Latency</span>
                      <span className="text-2xl font-bold text-[#4d9fff]">
                        {liveLatency} ms
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#111318] p-3 rounded-xl border border-[#2e3140] flex flex-col gap-2 flex-1">
                    <span className="font-mono text-[9px] text-[#9096a8] uppercase block">
                      Current Frame Distribution
                    </span>

                    {Object.keys(liveClassCounts).length === 0 ? (
                      <div className="flex flex-col items-center justify-center my-auto py-6 text-center">
                        <span className="material-symbols-rounded text-2xl text-[#9096a8] mb-1">radar</span>
                        <span className="font-mono text-xs text-[#9096a8]">
                          {isStreaming ? "Scanning incoming video frames..." : "Standby for video feed input"}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                        {Object.entries(liveClassCounts).map(([cls, count]) => {
                          const color = getClassColor(cls);
                          return (
                            <div
                              key={cls}
                              className="bg-[#1c1e24] p-2 rounded-lg border border-[#2e3140] flex justify-between items-center"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: color }}
                                ></span>
                                <span className="text-[#e8eaf0] uppercase truncate">{cls}</span>
                              </div>
                              <span
                                style={{ backgroundColor: `${color}20`, color: color }}
                                className="font-bold px-2 py-0.5 rounded font-mono text-xs"
                              >
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DYNAMIC PYTHON BACKEND 4-CAMERA MONITORING ARRAY ───────────────────────────── */}
      {activeTab === "array" && (
        <div className="flex flex-col gap-4">
          {/* FILTER & ROI OVERLAY BAR */}
          <div className="bg-[#161820] border border-[#2e3140] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-[#9096a8] uppercase">Class Filter:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setArrayFilter("all")}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                    arrayFilter === "all"
                      ? "bg-[#00c97a]/20 text-[#00c97a] border border-[#00c97a]/40 font-bold"
                      : "bg-[#111318] text-[#9096a8] hover:text-[#e8eaf0] border border-[#2e3140]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setArrayFilter("ambulance")}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                    arrayFilter === "ambulance"
                      ? "bg-[#ff4060]/20 text-[#ff4060] border border-[#ff4060]/40 font-bold"
                      : "bg-[#111318] text-[#9096a8] hover:text-[#e8eaf0] border border-[#2e3140]"
                  }`}
                >
                  🚑 108 EMS
                </button>
                <button
                  onClick={() => setArrayFilter("police")}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                    arrayFilter === "police"
                      ? "bg-[#4d9fff]/20 text-[#4d9fff] border border-[#4d9fff]/40 font-bold"
                      : "bg-[#111318] text-[#9096a8] hover:text-[#e8eaf0] border border-[#2e3140]"
                  }`}
                >
                  🚔 Police
                </button>
                <button
                  onClick={() => setArrayFilter("school_van")}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                    arrayFilter === "school_van"
                      ? "bg-[#ffab1a]/20 text-[#ffab1a] border border-[#ffab1a]/40 font-bold"
                      : "bg-[#111318] text-[#9096a8] hover:text-[#e8eaf0] border border-[#2e3140]"
                  }`}
                >
                  🚌 School Van
                </button>
                <button
                  onClick={() => setArrayFilter("motorcycle")}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                    arrayFilter === "motorcycle" || arrayFilter === "two-wheeler"
                      ? "bg-[#00c97a]/20 text-[#00c97a] border border-[#00c97a]/40 font-bold"
                      : "bg-[#111318] text-[#9096a8] hover:text-[#e8eaf0] border border-[#2e3140]"
                  }`}
                >
                  🛵 2-Wheeler
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={runArrayInference}
                disabled={isArrayDetecting}
                className="px-3 py-1 bg-[#00c97a]/15 hover:bg-[#00c97a]/25 text-[#00c97a] border border-[#00c97a]/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-rounded text-sm ${isArrayDetecting ? "animate-spin" : ""}`}>
                  sync
                </span>
                <span>{isArrayDetecting ? "Running YOLO..." : "Re-Scan Array with Backend"}</span>
              </button>
            </div>
          </div>

          {/* MAIN 4-CAMERA GRID + RIGHT TELEMETRY COLUMN */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* 4 Camera Feeds (8 Cols) */}
            <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {JUNCTION_CAMERAS.map((cam) => {
                const detResult = arrayDetections[cam.id];
                const detections = detResult?.detections || [];
                const latency = detResult?.latency_ms || 8.0;
                const fps = detResult?.fps || 30.0;
                const hasPreemption = detections.some((d) => d.class === "ambulance" || d.class === "police");

                return (
                  <div
                    key={cam.id}
                    className="bg-[#1c1e24] border border-[#2e3140] rounded-xl overflow-hidden relative h-[270px] shadow-md flex flex-col justify-between"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-b from-[#0d0f13]/90 via-[#0d0f13]/50 to-transparent p-3 flex justify-between items-center z-10">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hasPreemption ? "bg-[#ff4060] animate-pulse" : "bg-[#00c97a]"
                          }`}
                        ></span>
                        <span className="font-mono text-xs font-bold text-[#e8eaf0]">
                          {cam.name} ({cam.road})
                        </span>
                      </div>
                      <span className="font-mono text-[9px] bg-[#00c97a]/20 text-[#00c97a] px-2 py-0.5 rounded border border-[#00c97a]/30 font-bold">
                        {fps.toFixed(0)} FPS · {latency} MS
                      </span>
                    </div>

                    {/* Camera Feed Background */}
                    <div
                      className="w-full h-full absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${cam.imageUrl}')` }}
                    >
                      {/* DYNAMIC PYTHON YOLOv8 BOUNDING BOXES */}
                      {detections.length > 0 ? (
                        detections.map((det, idx) => {
                          const [normX, normY, normW, normH] = det.normalized_bbox;
                          const isPriority = det.class === "ambulance" || det.class === "police";
                          const color = getClassColor(det.class);

                          if (arrayFilter !== "all" && arrayFilter !== det.class && !(arrayFilter === "motorcycle" && det.class === "two-wheeler")) {
                            return null;
                          }

                          return (
                            <div
                              key={idx}
                              style={{
                                position: "absolute",
                                left: `${normX * 100}%`,
                                top: `${normY * 100}%`,
                                width: `${normW * 100}%`,
                                height: `${normH * 100}%`,
                                borderColor: color,
                                backgroundColor: `${color}20`,
                                boxShadow: isPriority ? `0 0 16px ${color}` : `0 0 8px ${color}66`,
                              }}
                              className="border-2 rounded-md pointer-events-none transition-all duration-75"
                            >
                              <div
                                style={{
                                  backgroundColor: color,
                                  color: color === "#ffab1a" ? "#000000" : "#ffffff",
                                }}
                                className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shadow-md whitespace-nowrap"
                              >
                                {det.class} {(det.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        /* Fallback Mock Overlay if Network Loading */
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isArrayDetecting && (
                            <div className="bg-[#111318]/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[#2e3140] font-mono text-xs text-[#00c97a] flex items-center gap-2">
                              <span className="material-symbols-rounded text-sm animate-spin">sync</span>
                              <span>Computing YOLOv8...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Banner */}
                    <div className="p-2.5 z-10 flex gap-2">
                      <span
                        className={`font-mono text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${
                          hasPreemption
                            ? "bg-[#ff4060]/20 text-[#ff4060] border-[#ff4060]/40 animate-pulse"
                            : "bg-[#00c97a]/20 text-[#00c97a] border-[#00c97a]/40"
                        }`}
                      >
                        {hasPreemption ? "108 EMS PREEMPTION ACTIVE" : cam.defaultStatus}
                      </span>
                      <span className="font-mono text-[9px] bg-[#111318]/90 text-[#9096a8] px-2 py-0.5 rounded border border-[#2e3140]">
                        HOMOGRAPHY: {cam.homography}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Telemetry Column (4 Cols) */}
            <div className="xl:col-span-4 flex flex-col gap-4">
              {/* YOLOv8 Edge Model Health Card */}
              <div className="bg-[#161820] border border-[#2e3140] rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-xs font-bold text-[#e8eaf0] uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-rounded text-sm text-[#00c97a]">memory</span>
                    <span>YOLOv8 Edge Engine Health</span>
                  </span>
                  <span className="font-mono text-[10px] bg-[#00c97a]/20 text-[#00c97a] px-2 py-0.5 rounded border border-[#00c97a]/30 font-bold">
                    55 FPS ONNX
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono mb-3">
                  <div className="bg-[#111318] p-2 rounded-xl border border-[#2e3140]">
                    <span className="text-[9px] text-[#9096a8] block">mAP@50</span>
                    <span className="text-base font-bold text-[#00c97a]">0.924</span>
                  </div>
                  <div className="bg-[#111318] p-2 rounded-xl border border-[#2e3140]">
                    <span className="text-[9px] text-[#9096a8] block">Precision</span>
                    <span className="text-base font-bold text-[#e8eaf0]">0.891</span>
                  </div>
                  <div className="bg-[#111318] p-2 rounded-xl border border-[#2e3140]">
                    <span className="text-[9px] text-[#9096a8] block">Recall</span>
                    <span className="text-base font-bold text-[#e8eaf0]">0.905</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-[#9096a8] bg-[#111318] p-2.5 rounded-xl border border-[#2e3140] flex items-center justify-between">
                  <span>Model: YOLOv8n (ONNX Runtime)</span>
                  <span>Params: 3.2M</span>
                </div>
              </div>

              {/* Vehicle Class Confidence Distribution */}
              <div className="bg-[#161820] border border-[#2e3140] rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <span className="font-mono text-xs font-bold text-[#e8eaf0] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-[#4d9fff]">bar_chart</span>
                  <span>Vehicle Class Confidence</span>
                </span>

                <div className="space-y-2.5 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#ff4060] font-bold">🚑 108 Ambulance</span>
                      <span className="text-[#ff4060] font-bold">0.98</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                      <div className="h-full bg-[#ff4060]" style={{ width: "98%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#4d9fff] font-bold">🚔 Police Unit</span>
                      <span className="text-[#4d9fff] font-bold">0.96</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                      <div className="h-full bg-[#4d9fff]" style={{ width: "96%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#ffab1a] font-bold">🚌 School Van / Bus</span>
                      <span className="text-[#ffab1a] font-bold">0.95</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                      <div className="h-full bg-[#ffab1a]" style={{ width: "95%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#e8eaf0]">🚗 Standard Car / Taxi</span>
                      <span className="text-[#e8eaf0]">0.91</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                      <div className="h-full bg-[#4d9fff]" style={{ width: "91%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#00c97a] font-bold">🛵 Two-Wheeler</span>
                      <span className="text-[#00c97a] font-bold">0.89</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                      <div className="h-full bg-[#00c97a]" style={{ width: "89%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spatial Homography & Queue Estimation */}
              <div className="bg-[#161820] border border-[#2e3140] rounded-2xl p-4 shadow-sm font-mono text-xs flex flex-col gap-2">
                <span className="font-bold text-[#e8eaf0] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-[#ffab1a]">straighten</span>
                  <span>Spatial Homography Extents</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-center mt-1">
                  <div className="bg-[#111318] p-2.5 rounded-xl border border-[#2e3140]">
                    <span className="text-[9px] text-[#9096a8] uppercase block">Queue Dist</span>
                    <span className="text-base font-bold text-[#ffab1a]">48.2 m</span>
                  </div>
                  <div className="bg-[#111318] p-2.5 rounded-xl border border-[#2e3140]">
                    <span className="text-[9px] text-[#9096a8] uppercase block">Flow Rate</span>
                    <span className="text-base font-bold text-[#00c97a]">84 v/min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
