"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  updateVisionFeedState,
  DirectionKey,
  SignalColor,
  ApproachFeedData,
  CorridorRoutingState,
} from "../../lib/visionFeedStore";

interface Detection {
  bbox: [number, number, number, number];
  class: string;
  confidence: number;
  normalized_bbox: [number, number, number, number];
  approach?: string;
  assigned_lane?: string;
}

interface WsInferenceResponse {
  success: boolean;
  latency_ms: number;
  fps: number;
  detections_count: number;
  class_counts: Record<string, number>;
  detections: Detection[];
  image_size?: [number, number];
  intersection_id?: string;
  active_phase?: string;
  phase_state?: string;
  phase_countdown_s?: number;
  signal_colors?: Record<string, SignalColor>;
  approaches?: Record<string, ApproachFeedData>;
  corridor_routing?: CorridorRoutingState;
  green_splits?: Record<string, number>;
  active_camera_connections?: number;
  connected_cameras?: Record<string, number>;
  current_camera?: string;
}

interface TrackedVehicle {
  id: number;
  class: string;
  confidence: number;
  norm_bbox: [number, number, number, number];
  missedFrames: number;
  ambulanceConfirmCount?: number;
  standardConfirmCount?: number;
}

export interface ApproachSourceConfig {
  key: DirectionKey;
  id: string; // "Approach-N"
  camNumber: number; // 1, 2, 3, 4
  camTag: string; // "Cam 1", "Cam 2", "Cam 3", "Cam 4"
  name: string; // "North (OMR In)"
  subtitle: string; // "OMR Inbound Mainline"
  road: string; // "Rajiv Gandhi Salai"
  sampleVideo: string;
  ambulanceVideo?: string;
}

export const APPROACH_SOURCES: Record<DirectionKey, ApproachSourceConfig> = {
  N: {
    key: "N",
    id: "Approach-N",
    camNumber: 1,
    camTag: "Cam 1",
    name: "North (OMR In)",
    subtitle: "OMR Inbound Mainline (Top-Down CCTV)",
    road: "Rajiv Gandhi Salai",
    sampleVideo: "/sample_videos/cam1_north_omr_inbound.mp4",
  },
  S: {
    key: "S",
    id: "Approach-S",
    camNumber: 2,
    camTag: "Cam 2",
    name: "South (OMR Out)",
    subtitle: "OMR Outbound to Siruseri (Top-Down CCTV)",
    road: "Siruseri IT Expressway",
    sampleVideo: "/sample_videos/cam2_south_omr_outbound.mp4",
  },
  E: {
    key: "E",
    id: "Approach-E",
    camNumber: 3,
    camTag: "Cam 3",
    name: "East (ECR/EMS)",
    subtitle: "ECR Link & Hospital Route (Top-Down CCTV)",
    road: "ECR EMS Link Road (108 Priority)",
    sampleVideo: "/sample_videos/cam3_east_ecr_normal.mp4",
    ambulanceVideo: "/sample_videos/cam3_east_ecr_ambulance.mp4",
  },
  W: {
    key: "W",
    id: "Approach-W",
    camNumber: 4,
    camTag: "Cam 4",
    name: "West (Medavakkam)",
    subtitle: "Tambaram Arterial Link (Top-Down CCTV)",
    road: "Medavakkam Main Rd",
    sampleVideo: "/sample_videos/cam4_west_medavakkam.mp4",
  },
};

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
  // ── 4-APPROACH SOURCE SELECTION & INDIVIDUAL VIDEO REFS ─────────────────────────────
  const [selectedApproach, setSelectedApproach] = useState<DirectionKey>("N");
  const selectedApproachRef = useRef<DirectionKey>("N");
  const [eastAmbulanceMode, setEastAmbulanceMode] = useState<boolean>(false);

  useEffect(() => {
    selectedApproachRef.current = selectedApproach;
  }, [selectedApproach]);

  // Individual video uploads for each of the 4 approaches (all 4 approaches ready out-of-the-box with authentic Indian road videos)
  const [approachVideos, setApproachVideos] = useState<Record<DirectionKey, {
    url: string;
    fileName: string;
    file?: File;
    isCustomUpload: boolean;
  }>>({
    N: { url: "/sample_videos/cam1_north_omr_inbound.mp4", fileName: "Cam 1 -  North (OMR Inbound - Rajiv Gandhi Salai).mp4", isCustomUpload: false },
    S: { url: "/sample_videos/cam2_south_omr_outbound.mp4", fileName: "Cam 2 - South (OMR Outbound - Siruseri IT Expressway).mp4", isCustomUpload: false },
    E: { url: "/sample_videos/cam3_east_ecr_normal.mp4", fileName: "Cam 3 (Normal) - East (ECR   EMS Link Road - No Ambulance).mp4", isCustomUpload: false },
    W: { url: "/sample_videos/cam4_west_medavakkam.mp4", fileName: "Cam 4 - West (Medavakkam Main Rd).mp4", isCustomUpload: false },
  });

  // Individual camera streaming state (allows Cam 1, Cam 2, Cam 3, Cam 4 to run/terminate independently)
  const [cameraStreaming, setCameraStreaming] = useState<Record<DirectionKey, boolean>>({
    N: false,
    S: false,
    E: false,
    W: false,
  });
  const cameraStreamingRef = useRef<Record<DirectionKey, boolean>>({
    N: false,
    S: false,
    E: false,
    W: false,
  });

  const viewportFrameRef = useRef<HTMLDivElement | null>(null);
  const fileInputNRef = useRef<HTMLInputElement | null>(null);
  const fileInputSRef = useRef<HTMLInputElement | null>(null);
  const fileInputERef = useRef<HTMLInputElement | null>(null);
  const fileInputWRef = useRef<HTMLInputElement | null>(null);

  const getFileInputRef = (dir: DirectionKey) => {
    switch (dir) {
      case "N": return fileInputNRef;
      case "S": return fileInputSRef;
      case "E": return fileInputERef;
      case "W": return fileInputWRef;
    }
  };

  // ── LIVE STREAMING & WEBSOCKET STATE ─────────────────────────────
  const [streamSource, setStreamSource] = useState<"webcam" | "screenshare" | "upload" | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [allowAllClasses, setAllowAllClasses] = useState<boolean>(false);
  const [confThreshold, setConfThreshold] = useState<number>(0.20);
  const [liveDetections, setLiveDetections] = useState<Detection[]>([]);
  const [trackedVehicles, setTrackedVehicles] = useState<TrackedVehicle[]>([]);
  const [liveLatency, setLiveLatency] = useState<number>(0);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveClassCounts, setLiveClassCounts] = useState<Record<string, number>>({});
  const [streamError, setStreamError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [videoDisplaySize, setVideoDisplaySize] = useState<{ w: number; h: number }>({ w: 640, h: 460 });
  const [isVideoPaused, setIsVideoPaused] = useState<boolean>(false);
  const [activeWsConnections, setActiveWsConnections] = useState<number>(1);
  const [connectedCameras, setConnectedCameras] = useState<Record<string, number>>({});
  const [availableWebcams, setAvailableWebcams] = useState<MediaDeviceInfo[]>([]);
  const [selectedWebcamDevices, setSelectedWebcamDevices] = useState<Record<DirectionKey, string>>({
    N: "",
    S: "",
    E: "",
    W: "",
  });

  // ── CUMULATIVE SESSION INFLOW STATE (START TO END) ─────────────────────────────
  const [telemetryMode, setTelemetryMode] = useState<"instant" | "cumulative">("cumulative");
  const [cumulativeVehicleCount, setCumulativeVehicleCount] = useState<number>(0);
  const [cumulativeClassCounts, setCumulativeClassCounts] = useState<Record<string, number>>({});
  const [peakDensity, setPeakDensity] = useState<number>(0);
  const [streamDurationSec, setStreamDurationSec] = useState<number>(0);

  // ── 4-PATH APPROACH SIGNAL & CORRIDOR ROUTING LINKED STATE ──
  const [approachesData, setApproachesData] = useState<Record<string, ApproachFeedData>>({
    N: { approach_id: "Approach-N", direction: "N", name: "North Approach (OMR Inbound)", vehicles: 0, queue_m: 0, density: 0, signal: "green", is_emergency: false },
    S: { approach_id: "Approach-S", direction: "S", name: "South Approach (OMR Outbound)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
    E: { approach_id: "Approach-E", direction: "E", name: "East Approach (ECR / EMS Link)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
    W: { approach_id: "Approach-W", direction: "W", name: "West Approach (Medavakkam Rd)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
  });
  const [activePhase, setActivePhase] = useState<string>("Approach-N");
  const [phaseState, setPhaseState] = useState<string>("GREEN");
  const [phaseCountdown, setPhaseCountdown] = useState<number>(24.0);
  const [signalColors, setSignalColors] = useState<Record<string, SignalColor>>({
    N: "green",
    S: "red",
    E: "red",
    W: "red",
  });
  const [corridorRouting, setCorridorRouting] = useState<CorridorRoutingState | null>({
    origin_intersection: "IX-104",
    intersection_name: "Sholinganallur Junction",
    active_approach: "Approach-N",
    corridor_path: ["IX-104", "IX-103", "IX-102", "IX-101"],
    is_preempted: false,
    destination: "Gleneagles Global Health City",
    status: "DYNAMIC_PROGRESSION",
    time_saved_minutes: 2.1,
    speed_boost_percent: 38.5,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const canvasCaptureRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameSentTimeRef = useRef<number>(0);
  const approachTimesRef = useRef<Record<DirectionKey, number>>({
    N: 0,
    S: 0,
    E: 0,
    W: 0,
  });

  const scheduleNextFrame = () => {
    if (!isStreamingRef.current) return;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    rafIdRef.current = requestAnimationFrame(sendCurrentFrame);
  };

  const playVideoSource = (url: string, fileName: string, targetTime?: number) => {
    setStreamError(null);
    const video = videoRef.current;
    if (!video) return;

    const dir = selectedApproachRef.current;
    setCameraStreaming((prev) => ({ ...prev, [dir]: true }));
    cameraStreamingRef.current[dir] = true;

    // Reset processing flag so streaming can flow
    isProcessingFrameRef.current = false;

    if (video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }

    setIsStreaming(true);
    isStreamingRef.current = true;
    setStreamSource("upload");

    updateVisionFeedState({
      videoUrl: url,
      videoFileName: fileName,
      streamSource: "upload",
      isStreaming: true,
      activePhase: `Approach-${selectedApproachRef.current}`,
    });

    // Ensure audio policy does not block autoplay in any browser
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    const currentSrc = video.currentSrc || video.src || "";
    const isSameSrc = (currentSrc.includes(url) || url.includes(currentSrc)) && url.length > 5;

    const startPlayback = async () => {
      try {
        if (typeof targetTime === "number" && Number.isFinite(targetTime) && targetTime > 0) {
          if (video.duration && targetTime < video.duration) {
            video.currentTime = targetTime;
          }
        }
        await video.play();
        setIsVideoPaused(false);
        updateVideoDisplaySize();
      } catch (err) {
        console.warn("Video play notice:", err);
        setIsVideoPaused(true);
      } finally {
        isProcessingFrameRef.current = false;
        scheduleNextFrame();
      }
    };

    if (isSameSrc && video.readyState >= 2) {
      startPlayback();
      return;
    }

    // New source loading: assign and load
    video.pause();
    video.src = url;

    // Listen to multiple readiness events so it starts as soon as browser decodes
    let started = false;
    const triggerStart = () => {
      if (started) return;
      started = true;
      video.removeEventListener("canplay", triggerStart);
      video.removeEventListener("loadeddata", triggerStart);
      video.removeEventListener("loadedmetadata", triggerStart);
      startPlayback();
    };

    video.addEventListener("canplay", triggerStart, { once: true });
    video.addEventListener("loadeddata", triggerStart, { once: true });
    video.addEventListener("loadedmetadata", triggerStart, { once: true });

    // Fallback trigger after 200ms in case events already passed or stalled
    setTimeout(() => {
      if (!started) {
        triggerStart();
      }
    }, 200);

    video.load();
    if (video.readyState >= 2) {
      triggerStart();
    }
  };

  const switchEastVideoMode = (withAmbulance: boolean) => {
    setEastAmbulanceMode(withAmbulance);
    const url = withAmbulance
      ? "/sample_videos/cam3_east_ecr_ambulance.mp4"
      : "/sample_videos/cam3_east_ecr_normal.mp4";
    const fileName = withAmbulance
      ? "Cam 3 (Ambulance)- East (ECR  EMS Link Road - 108 Priority).mp4"
      : "Cam 3 (Normal) - East (ECR   EMS Link Road - No Ambulance).mp4";

    setApproachVideos((prev) => ({
      ...prev,
      E: { url, fileName, isCustomUpload: false },
    }));

    if (selectedApproachRef.current === "E") {
      approachTimesRef.current.E = 0;
      playVideoSource(url, fileName, 0);
    }
  };

  const loadSampleForApproach = (dir: DirectionKey, forceAmbulance?: boolean) => {
    const config = APPROACH_SOURCES[dir];
    let url = config.sampleVideo;
    let fileName = `${dir.toLowerCase()}_approach.mp4`;

    if (dir === "E") {
      const isAmb = forceAmbulance !== undefined ? forceAmbulance : eastAmbulanceMode;
      url = isAmb
        ? (config.ambulanceVideo || "/sample_videos/cam3_east_ecr_ambulance.mp4")
        : (config.sampleVideo || "/sample_videos/cam3_east_ecr_normal.mp4");
      fileName = isAmb
        ? "Cam 3 (Ambulance)- East (ECR  EMS Link Road - 108 Priority).mp4"
        : "Cam 3 (Normal) - East (ECR   EMS Link Road - No Ambulance).mp4";
      if (forceAmbulance !== undefined) {
        setEastAmbulanceMode(forceAmbulance);
      }
    } else if (dir === "N") {
      url = "/sample_videos/cam1_north_omr_inbound.mp4";
      fileName = "Cam 1 -  North (OMR Inbound - Rajiv Gandhi Salai).mp4";
    } else if (dir === "S") {
      url = "/sample_videos/cam2_south_omr_outbound.mp4";
      fileName = "Cam 2 - South (OMR Outbound - Siruseri IT Expressway).mp4";
    } else if (dir === "W") {
      url = "/sample_videos/cam4_west_medavakkam.mp4";
      fileName = "Cam 4 - West (Medavakkam Main Rd).mp4";
    }

    setApproachVideos((prev) => ({
      ...prev,
      [dir]: { url, fileName, isCustomUpload: false },
    }));
    setSelectedApproach(dir);
    selectedApproachRef.current = dir;
    approachTimesRef.current[dir] = 0;
    playVideoSource(url, fileName, 0);
  };

  const loadSampleJunctionVideo = () => {
    loadSampleForApproach(selectedApproachRef.current);
  };

  const handleApproachFileUpload = (dir: DirectionKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setApproachVideos((prev) => ({
      ...prev,
      [dir]: { url, fileName: file.name, file, isCustomUpload: true },
    }));
    setSelectedApproach(dir);
    selectedApproachRef.current = dir;
    approachTimesRef.current[dir] = 0;
    playVideoSource(url, file.name, 0);
    e.target.value = "";
  };

  const handleCctvVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleApproachFileUpload(selectedApproachRef.current, e);
  };

  const switchApproach = (dir: DirectionKey, shouldPlay = true) => {
    const prevDir = selectedApproachRef.current;

    // Save current approach playback timestamp
    if (videoRef.current && Number.isFinite(videoRef.current.currentTime)) {
      approachTimesRef.current[prevDir] = videoRef.current.currentTime;
    }

    setSelectedApproach(dir);
    selectedApproachRef.current = dir;

    // Clear old detections immediately for clean visual cut
    setLiveDetections([]);
    setTrackedVehicles([]);
    currentTracksRef.current = [];

    const targetVideo = approachVideos[dir] || {
      url: APPROACH_SOURCES[dir].sampleVideo,
      fileName: `${dir.toLowerCase()}_approach.mp4`,
      isCustomUpload: false,
    };

    const targetUrl = targetVideo.url || APPROACH_SOURCES[dir].sampleVideo;
    const targetFileName = targetVideo.fileName || `${dir.toLowerCase()}_approach.mp4`;
    const targetTime = approachTimesRef.current[dir] ?? 0;

    // If shouldPlay is true: run this camera individually!
    if (shouldPlay) {
      setCameraStreaming((prev) => ({ ...prev, [dir]: true }));
      cameraStreamingRef.current[dir] = true;
      playVideoSource(targetUrl, targetFileName, targetTime);
    } else {
      setCameraStreaming((prev) => ({ ...prev, [dir]: false }));
      cameraStreamingRef.current[dir] = false;
      stopActiveCameraOnly();
      updateVisionFeedState({
        videoUrl: targetUrl,
        videoFileName: targetFileName,
        activePhase: `Approach-${dir}`,
      });
      updateVideoDisplaySize();
    }
  };

  const startCamera = (dir: DirectionKey) => {
    switchApproach(dir, true);
  };

  const terminateCamera = (dir: DirectionKey) => {
    setCameraStreaming((prev) => ({ ...prev, [dir]: false }));
    cameraStreamingRef.current[dir] = false;
    if (selectedApproachRef.current === dir) {
      stopActiveCameraOnly();
    }
  };

  const terminateAllCameras = () => {
    setCameraStreaming({ N: false, S: false, E: false, W: false });
    cameraStreamingRef.current = { N: false, S: false, E: false, W: false };
    stopActiveCameraOnly();
  };

  const startAllCameras = () => {
    setCameraStreaming({ N: true, S: true, E: true, W: true });
    cameraStreamingRef.current = { N: true, S: true, E: true, W: true };
    startCamera(selectedApproachRef.current);
  };

  const stopActiveCameraOnly = () => {
    const activeDir = selectedApproachRef.current;
    setCameraStreaming((prev) => ({ ...prev, [activeDir]: false }));
    cameraStreamingRef.current[activeDir] = false;

    // 1. Instantly trip streaming and processing flags
    isStreamingRef.current = false;
    isProcessingFrameRef.current = false;

    // 2. Cancel any pending animation frame immediately
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 3. Completely shut down and unload video element
    if (videoRef.current) {
      const vid = videoRef.current;
      vid.pause();
      vid.currentTime = 0;
      if (vid.srcObject) {
        const stream = vid.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        vid.srcObject = null;
      }
      vid.removeAttribute("src");
      vid.load(); // Forces HTML5 media engine to release video pipeline
    }

    // 4. Reset all live metrics and detections
    setIsStreaming(false);
    setStreamSource(null);
    setLiveDetections([]);
    setTrackedVehicles([]);
    currentTracksRef.current = [];
    setFrameCount(0);
    setLiveFps(0);
    setLiveLatency(0);
    setLiveClassCounts({});

    // 5. Explicitly notify store that stream is dead
    updateVisionFeedState({
      isStreaming: false,
      streamSource: null,
      liveDetectionsCount: 0,
      fps: 0,
      latency_ms: 0,
    });
  };

  const stopStream = stopActiveCameraOnly;
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

  // Enumerate physical webcams connected to host machine
  useEffect(() => {
    const enumerateCameras = async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          setAvailableWebcams(videoDevices);
        }
      } catch (err) {
        console.warn("Unable to enumerate media devices:", err);
      }
    };
    enumerateCameras();
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener?.("devicechange", enumerateCameras);
      return () => {
        navigator.mediaDevices.removeEventListener?.("devicechange", enumerateCameras);
      };
    }
  }, []);

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
        return "#ffab1a"; // Heavy Commercial Bus Orange
      case "truck":
        return "#f97316"; // Freight Truck Orange
      case "auto_rickshaw":
      case "auto":
      case "rickshaw":
        return "#f59e0b"; // Auto-Rickshaw Amber
      case "motorcycle":
      case "motorbike":
      case "bike":
      case "bicycle":
        return "#00c97a"; // Two-Wheeler Green
      case "car":
      case "standard":
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


  // ── UPDATE VIDEO DISPLAY RECT (PREVENTS FEED SHRINKING ON SWITCH) ───────────
  const updateVideoDisplaySize = () => {
    const frame = viewportFrameRef.current;
    const video = videoRef.current;
    if (!frame) return;

    // Measure the outer fixed viewport frame enclosure, NEVER the inner resizable div
    const rect = frame.getBoundingClientRect();
    const frameW = Math.max(frame.clientWidth, rect.width, 640);
    const frameH = Math.max(frame.clientHeight, rect.height, 480);

    // Use video native aspect ratio, defaulting to standard 16:9 widescreen
    const vW = (video && video.videoWidth > 0) ? video.videoWidth : 16;
    const vH = (video && video.videoHeight > 0) ? video.videoHeight : 9;
    const aspect = vW / vH;

    let w = frameW;
    let h = frameW / aspect;

    if (h > frameH) {
      h = frameH;
      w = frameH * aspect;
    }

    setVideoDisplaySize({
      w: Math.round(w),
      h: Math.round(h),
    });
  };

  useEffect(() => {
    updateVideoDisplaySize();
    if (!viewportFrameRef.current) return;
    const ro = new ResizeObserver(() => {
      updateVideoDisplaySize();
    });
    ro.observe(viewportFrameRef.current);
    window.addEventListener("resize", updateVideoDisplaySize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateVideoDisplaySize);
    };
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
    if (!videoRef.current) return;

    const video = videoRef.current;

    // 1. If WebSocket is disconnected or connecting, keep loop waiting and retry gracefully
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        setTimeout(sendCurrentFrame, 200);
      });
      return;
    }

    // 2. Protect against stuck in-flight inference (> 1200ms lock reset)
    if (isProcessingFrameRef.current) {
      if (Date.now() - lastFrameSentTimeRef.current > 1200) {
        isProcessingFrameRef.current = false;
      } else {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          setTimeout(sendCurrentFrame, 40);
        });
        return;
      }
    }

    // 3. If video metadata is still loading, keep polling until frame 1 is ready
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(sendCurrentFrame);
      return;
    }

    // 4. If video is paused by browser, kick it to play and keep polling
    if (video.paused && !video.ended) {
      video.play().catch(() => {});
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(sendCurrentFrame);
      return;
    }

    try {
      if (!canvasCaptureRef.current) {
        canvasCaptureRef.current = document.createElement("canvas");
      }

      const canvas = canvasCaptureRef.current;
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        scheduleNextFrame();
        return;
      }

      ctx.drawImage(video, 0, 0, 480, 270);
      const base64Data = canvas.toDataURL("image/jpeg", 0.45);

      isProcessingFrameRef.current = true;
      lastFrameSentTimeRef.current = Date.now();

      wsRef.current.send(
        JSON.stringify({
          image: base64Data,
          camera_id: "Approach-" + selectedApproachRef.current,
          approach_id: "Approach-" + selectedApproachRef.current,
          direction: selectedApproachRef.current,
          allow_all: allowAllRef.current,
          conf_threshold: confThresholdRef.current,
        })
      );
    } catch (err) {
      console.warn("Frame capture error:", err);
      isProcessingFrameRef.current = false;
      scheduleNextFrame();
    }
  };

  // ── WEBSOCKET CONNECTION & LIFECYCLE ─────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectWs = () => {
      setWsStatus("connecting");
      try {
        const rawHost = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "127.0.0.1";
        const host = rawHost === "localhost" ? "127.0.0.1" : rawHost;
        const wsUrl = `ws://${host}:8000/ws/vision`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus("connected");
          setStreamError(null);
        };

        ws.onmessage = (event) => {
          // If stream was terminated while this inference packet was in-flight, discard immediately!
          if (!isStreamingRef.current) {
            isProcessingFrameRef.current = false;
            return;
          }

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

                  // Robust Multi-Frame Confirmation & Anti-Flapping Filter:
                  // Prevents transient detector noise from misclassifying standard cars as ambulances,
                  // while maintaining smooth tracking for genuine 108 emergency priority vehicles.
                  let targetClass = inc.class;
                  let ambCount = track.ambulanceConfirmCount ?? (track.class === "ambulance" ? 2 : 0);
                  let stdCount = track.standardConfirmCount ?? 0;

                  if (inc.class === "ambulance") {
                    ambCount += 1;
                    stdCount = 0;
                    // Require at least 2 consecutive detections to promote/confirm emergency vehicle status
                    if (ambCount >= 2 || track.class === "ambulance") {
                      targetClass = "ambulance";
                    } else {
                      targetClass = "car";
                    }
                  } else {
                    stdCount += 1;
                    // If incoming detection is a standard roadway vehicle (car/bus/truck) for 2 or more frames, cleanly demote back to car!
                    if (stdCount >= 2) {
                      targetClass = inc.class;
                      ambCount = 0;
                    } else if (track.class === "ambulance") {
                      // 1-frame grace period for genuine ambulances experiencing brief occlusions
                      targetClass = "ambulance";
                    }
                  }

                  updatedTracks.push({
                    id: track.id,
                    class: targetClass,
                    confidence: Math.round((track.confidence * 0.3 + inc.confidence * 0.7) * 100) / 100,
                    norm_bbox: [
                      tx * (1 - alpha) + nx * alpha,
                      ty * (1 - alpha) + ny * alpha,
                      tw * (1 - alpha) + nw * alpha,
                      th * (1 - alpha) + nh * alpha,
                    ],
                    missedFrames: 0,
                    ambulanceConfirmCount: ambCount,
                    standardConfirmCount: stdCount,
                  });
                } else if (track.missedFrames < 4) {
                  // Coast object for up to 4 frames to prevent flash/flicker
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

                  const initialClass = inc.class === "ambulance" && inc.confidence < 0.50 ? "car" : inc.class;

                  updatedTracks.push({
                    id: trackIdCounterRef.current,
                    class: initialClass,
                    confidence: inc.confidence,
                    norm_bbox: inc.normalized_bbox,
                    missedFrames: 0,
                    ambulanceConfirmCount: inc.class === "ambulance" && inc.confidence >= 0.50 ? 2 : 0,
                    standardConfirmCount: inc.class === "ambulance" ? 0 : 1,
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

              // 4-path approach and signal states
              if (data.approaches) {
                setApproachesData(data.approaches);
              }
              if (data.active_phase) {
                setActivePhase(data.active_phase);
              }
              if (data.phase_state) {
                setPhaseState(data.phase_state);
              }
              if (data.phase_countdown_s !== undefined) {
                setPhaseCountdown(data.phase_countdown_s);
              }
              if (data.signal_colors) {
                setSignalColors(data.signal_colors);
              }
              if (data.corridor_routing) {
                setCorridorRouting(data.corridor_routing);
              }
              if (data.active_camera_connections !== undefined) {
                setActiveWsConnections(data.active_camera_connections);
              }
              if (data.connected_cameras) {
                setConnectedCameras(data.connected_cameras);
              }

              // Dispatch real-time perception, actuation & preemption state to shared store
              // Temporal stability gate: Emergency is only broadcast if verified by gateway debounce filter
              const isEmerg = Boolean(
                data.corridor_routing?.is_preempted ||
                data.corridor_routing?.emergency_confirmed
              );
              const emergDir = (data.corridor_routing?.emergency_direction as DirectionKey) || (isEmerg ? "E" : null);
              const emergConfirmed = Boolean(data.corridor_routing?.emergency_confirmed || data.corridor_routing?.is_preempted);

              const now = new Date();
              const dateStr = now.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const timeStr = now.toLocaleTimeString("en-IN", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const formattedDate = `${dateStr} · ${timeStr} IST`;
              const sourceTag = `${APPROACH_SOURCES[selectedApproachRef.current || "N"].camTag} · ${APPROACH_SOURCES[selectedApproachRef.current || "N"].name}`;

              updateVisionFeedState({
                hasEmergency: isEmerg,
                emergencyDirection: emergDir,
                emergencyConfirmed: emergConfirmed,
                liveDetectionsCount: incoming.length,
                fps: data.fps,
                latency_ms: data.latency_ms,
                isStreaming: true,
                intersectionId: data.intersection_id || "IX-104",
                activePhase: data.active_phase || activePhase,
                phaseState: data.phase_state || phaseState,
                phaseCountdown: data.phase_countdown_s ?? phaseCountdown,
                signalColors: data.signal_colors || signalColors,
                approaches: data.approaches || approachesData,
                corridorRouting: data.corridor_routing || corridorRouting,
                timestamp: now.toISOString(),
                formattedDate,
                feedSourceTag: sourceTag,
                classCounts: data.class_counts || liveClassCounts,
                cumulativeClassCounts,
              });
            }
          } catch (e) {
            console.error("Failed to parse WS response", e);
          } finally {
            isProcessingFrameRef.current = false;
            if (isStreamingRef.current) {
              scheduleNextFrame();
            }
          }
        };

        ws.onclose = () => {
          setWsStatus("disconnected");
          reconnectTimer = setTimeout(connectWs, 2000);
        };

        ws.onerror = () => {
          setWsStatus("disconnected");
          setStreamError(`FastAPI WebSocket server unreachable at ws://${host}:8000/ws/vision`);
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
  const startWebcamStream = async (targetDeviceId?: string) => {
    setStreamError(null);
    try {
      const dir = selectedApproachRef.current;
      const deviceId = targetDeviceId || selectedWebcamDevices[dir] || undefined;
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Refresh webcam list now that user granted permission
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setAvailableWebcams(devices.filter((d) => d.kind === "videoinput"));
        }
      } catch {}

      setCameraStreaming((prev) => ({ ...prev, [dir]: true }));
      cameraStreamingRef.current[dir] = true;

      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        isStreamingRef.current = true;
        setStreamSource("webcam");
        updateVideoDisplaySize();

        updateVisionFeedState({
          streamSource: "webcam",
          isStreaming: true,
          activePhase: `Approach-${dir}`,
        });

        isProcessingFrameRef.current = false;
        scheduleNextFrame();
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
        scheduleNextFrame();
      }
    } catch (err: any) {
      setStreamError(`Screen Share Cancelled: ${err.message || "Not Selected"}`);
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  };

  const boxesToRender = trackedVehicles.length > 0
    ? trackedVehicles
    : liveDetections.map((d, i) => ({
        id: i + 1,
        class: d.class || "vehicle",
        confidence: d.confidence || 0.8,
        norm_bbox: d.normalized_bbox || [0, 0, 0, 0],
        missedFrames: 0,
      }));

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-full pb-8">
      {/* ── TOP CONTROL BAR ───────────────────────────── */}
      <div className="glass-panel-elevated p-4 flex items-center justify-between flex-wrap gap-4 shadow-lg z-10 w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-state-calm/10 border border-state-calm-border flex items-center justify-center text-state-calm">
            <span className="material-symbols-rounded text-2xl">videocam</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-on-surface tracking-tight">
                Edge YOLOv8 Perception & Spatial Homography
              </h2>
              <span
                className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  wsStatus === "connected"
                    ? "bg-state-calm/15 text-state-calm border-state-calm-border shadow-[0_0_8px_rgba(0,201,122,0.2)]"
                    : wsStatus === "connecting"
                    ? "bg-state-building/15 text-state-building border-state-warn-border"
                    : "bg-state-preempted/15 text-state-preempted border-state-crit-border"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    wsStatus === "connected" ? "bg-state-calm animate-ping" : "bg-state-preempted"
                  }`}
                ></span>
                WS {wsStatus.toUpperCase()} (PORT 8000)
              </span>
              <span
                className="font-mono text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1.5 bg-primary/15 text-primary border-primary/30"
                title="Concurrent multi-channel WebSocket architecture supporting 4 simultaneous camera/webcam feeds"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                4-CAM CONCURRENT WS · {activeWsConnections >= 4 ? "4/4 LIVE" : `${activeWsConnections} ACTIVE`}
              </span>
            </div>
            <p className="font-mono text-xs text-on-surface-variant mt-0.5">
              Chennai Metropolitan Area (CMA) Sector 4 · 4-Approach Multi-Source Perception Console
            </p>
          </div>
        </div>

        {/* Active Approach Indicator in Header */}
        <div className="flex items-center gap-2.5 bg-surface-low border border-outline px-3.5 py-1.5 rounded-xl font-mono text-xs">
          <span className="text-on-surface-variant">Active Source:</span>
          <span className="font-bold text-primary flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {APPROACH_SOURCES[selectedApproach].name}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            signalColors[selectedApproach] === "green"
              ? "bg-emerald-500/20 text-emerald-400"
              : signalColors[selectedApproach] === "yellow"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-red-500/20 text-red-400"
          }`}>
            {signalColors[selectedApproach].toUpperCase()}
          </span>
        </div>
      </div>

      {/* Hidden Individual File Inputs for All 4 Approaches */}
      <input
        type="file"
        ref={fileInputNRef}
        onChange={(e) => handleApproachFileUpload("N", e)}
        accept="video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputSRef}
        onChange={(e) => handleApproachFileUpload("S", e)}
        accept="video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputERef}
        onChange={(e) => handleApproachFileUpload("E", e)}
        accept="video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputWRef}
        onChange={(e) => handleApproachFileUpload("W", e)}
        accept="video/*"
        className="hidden"
      />

      {/* ── 4-APPROACH MULTI-SOURCE SWITCHER DOCK ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {(["N", "S", "E", "W"] as const).map((dir) => {
          const cfg = APPROACH_SOURCES[dir];
          const app = approachesData[dir] || {
            name: cfg.name,
            vehicles: 0,
            queue_m: 0,
            density: 0,
            is_emergency: false,
          };
          const color = signalColors[dir] || "red";
          const isSelected = selectedApproach === dir;
          const videoData = approachVideos[dir];
          const isEmergency = Boolean(app.is_emergency || (dir === "E" && hasEmergencyVehicle));

          return (
            <div
              key={dir}
              onClick={() => switchApproach(dir, true)}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between shadow-md hover:shadow-lg ${
                isSelected
                  ? "bg-surface-mid border-primary shadow-[0_0_18px_rgba(59,130,246,0.22)] ring-1 ring-primary/40"
                  : "bg-surface hover:bg-surface-mid/80 border-outline hover:border-outline-variant"
              }`}
            >
              {/* Top Row: Approach Name, ID & Active Badge */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      color === "green"
                        ? "bg-state-calm shadow-[0_0_8px_#00c97a]"
                        : color === "yellow"
                        ? "bg-state-building shadow-[0_0_8px_#ffab1a]"
                        : "bg-state-preempted shadow-[0_0_8px_#ff4060]"
                    }`} />
                    <span className="font-bold text-xs md:text-sm text-on-surface tracking-tight">
                      {cfg.camTag} · {cfg.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      cameraStreaming[dir]
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-surface-low text-on-surface-variant border border-outline"
                    }`}>
                      {cameraStreaming[dir] ? "● LIVE" : "○ IDLE"}
                    </span>
                    <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isSelected
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-low text-on-surface-variant border border-outline"
                    }`}>
                      {isSelected ? "Active View" : cfg.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant mb-2">
                  <span>{cfg.subtitle}</span>
                  <span className="text-[9px] opacity-75">{cfg.road}</span>
                </div>

                {/* Middle: Real-Time Queue & Signal Telemetry */}
                <div className="bg-surface-low/90 p-2.5 rounded-xl border border-outline flex items-center justify-between my-2 font-mono">
                  <div>
                    <span className="text-[9px] text-on-surface-variant uppercase block">Queue:</span>
                    <span className="text-sm font-bold text-on-surface">
                      {app.vehicles} veh ({Math.round(app.queue_m || 0)}m)
                    </span>
                  </div>

                  {/* Signal Status Pill */}
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${
                      color === "green"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : color === "yellow"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        color === "green" ? "bg-emerald-400 animate-ping" : color === "yellow" ? "bg-amber-400" : "bg-red-400"
                      }`} />
                      {color.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Emergency Tag if Preempted */}
                {isEmergency && (
                  <div className="mb-2 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
                    <span>🚨</span>
                    <span>108 EMS / CORRIDOR PREEMPTION</span>
                  </div>
                )}

                {/* For Cam 3 (East): Quick Scenario Selector */}
                {dir === "E" && (
                  <div className="mb-2 flex items-center gap-1 p-1 rounded-lg bg-surface-low/90 border border-outline">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        switchEastVideoMode(false);
                      }}
                      className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        !eastAmbulanceMode
                          ? "bg-primary text-white shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                      title="Load standard traffic without ambulance"
                    >
                      <span>🚗</span>
                      <span>Normal</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        switchEastVideoMode(true);
                      }}
                      className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        eastAmbulanceMode
                          ? "bg-red-500 text-white shadow-sm animate-pulse"
                          : "text-red-400 hover:bg-red-500/10"
                      }`}
                      title="Load 108 Emergency Ambulance Priority Preemption scenario"
                    >
                      <span>🚨</span>
                      <span>108 Amb</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom: Video Source Status & Individual Upload/Run/Stop Buttons */}
              <div className="pt-2 border-t border-outline/70 mt-1 flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 font-mono text-[10px] truncate max-w-[120px] text-on-surface-variant">
                  {videoData ? (
                    <>
                      <span className="material-symbols-rounded text-xs text-state-calm">check_circle</span>
                      <span className="truncate" title={videoData.fileName}>{videoData.fileName}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-xs opacity-60">video_library</span>
                      <span>No Video</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {cameraStreaming[dir] ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        terminateCamera(dir);
                      }}
                      className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title={`Terminate ${cfg.camTag} stream`}
                    >
                      <span className="material-symbols-rounded text-xs">stop_circle</span>
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera(dir);
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title={`Run ${cfg.camTag} stream`}
                    >
                      <span className="material-symbols-rounded text-xs">play_circle</span>
                      <span>Run</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      getFileInputRef(dir).current?.click();
                    }}
                    className="px-2 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title={`Upload video file for ${cfg.name}`}
                  >
                    <span className="material-symbols-rounded text-xs">upload</span>
                    <span>Upload</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSampleForApproach(dir);
                    }}
                    className="px-2 py-1 rounded-lg bg-surface-low hover:bg-surface-high text-on-surface-variant hover:text-on-surface border border-outline text-[10px] font-mono transition-all cursor-pointer"
                    title={`Load demo video for ${cfg.name}`}
                  >
                    Demo
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
          {/* Live Video Viewport (8 Cols) */}
          <div className="lg:col-span-8 card p-4 flex flex-col gap-3 shadow-xl">
            {/* Viewport Header Bar */}
            <div className="flex justify-between items-center border-b border-outline pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isStreaming ? "bg-state-calm animate-pulse" : "bg-[#9096a8]"
                  }`}
                ></span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-mono text-[10px] font-bold">
                    {APPROACH_SOURCES[selectedApproach].camTag} · {APPROACH_SOURCES[selectedApproach].id}
                  </span>
                  <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
                    {APPROACH_SOURCES[selectedApproach].name}
                  </span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {isStreaming
                      ? `· LIVE ${streamSource?.toUpperCase()} FEED ➔ PYTHON YOLOv8`
                      : "· STANDBY (NO ACTIVE STREAM)"}
                  </span>
                </div>
                {isStreaming && (
                  <span className="font-mono text-[10px] bg-surface-low text-on-surface-variant px-2.5 py-0.5 rounded-full border border-outline">
                    Frame #{frameCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isStreaming ? (
                  <>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-state-calm/15 text-state-calm px-3 py-1 rounded-lg border border-state-calm-border font-bold">
                      <span className="material-symbols-rounded text-sm">bolt</span>
                      <span>{liveLatency} ms</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-primary/15 text-primary px-3 py-1 rounded-lg border border-primary/30 font-bold">
                      <span className="material-symbols-rounded text-sm">speed</span>
                      <span>{liveFps} FPS</span>
                    </div>
                    <button
                      onClick={() => terminateCamera(selectedApproach)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-state-preempted hover:bg-red-600 text-white font-mono text-[11px] font-bold uppercase tracking-wider shadow-md hover:shadow-red-500/30 transition-all cursor-pointer"
                      title={`Terminate ${APPROACH_SOURCES[selectedApproach].camTag} stream only`}
                    >
                      <span className="material-symbols-rounded text-sm">stop_circle</span>
                      <span>Terminate {APPROACH_SOURCES[selectedApproach].camTag}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startCamera(selectedApproach)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-[11px] font-bold uppercase tracking-wider shadow-md hover:shadow-emerald-500/30 transition-all cursor-pointer"
                    title={`Start ${APPROACH_SOURCES[selectedApproach].camTag} stream`}
                  >
                    <span className="material-symbols-rounded text-sm">play_circle</span>
                    <span>Run {APPROACH_SOURCES[selectedApproach].camTag}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick 4-Camera Approach Switcher Strip */}
            <div className="flex items-center justify-between bg-surface-low/80 p-2 rounded-xl border border-outline/70 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider px-1">
                <span className="material-symbols-rounded text-sm text-primary">cameraswitch</span>
                <span>Switch Camera:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1 max-w-2xl">
                {(["N", "S", "E", "W"] as const).map((dir) => {
                  const cfg = APPROACH_SOURCES[dir];
                  const isSelected = selectedApproach === dir;
                  const isRunning = cameraStreaming[dir];
                  const color = signalColors[dir] || "red";
                  const vehCount = approachesData[dir]?.vehicles || 0;
                  return (
                    <button
                      key={dir}
                      onClick={() => switchApproach(dir, true)}
                      className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-between gap-1.5 border cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-md ring-1 ring-primary/50"
                          : "bg-surface-mid hover:bg-surface-high text-on-surface border-outline hover:border-outline-variant"
                      }`}
                      title={`Switch and view ${cfg.camTag} (${cfg.name})`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          isRunning ? "bg-state-calm animate-ping" : "bg-on-surface-variant/40"
                        }`} />
                        <span className="truncate">{cfg.camTag}: {cfg.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[8px] px-1 py-0.2 rounded uppercase font-bold ${
                          isRunning ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-low text-on-surface-variant"
                        }`}>
                          {isRunning ? "LIVE" : "IDLE"}
                        </span>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                          isSelected ? "bg-white/20 text-white" : "bg-surface-low text-on-surface-variant"
                        }`}>
                          {vehCount}v
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cam 3 Specific: Scenario Selection Bar (Standard Traffic vs 108 Ambulance Priority) */}
            {selectedApproach === "E" && (
              <div className="flex items-center justify-between bg-surface-low/95 px-3 py-2 rounded-xl border border-primary/40 gap-2 flex-wrap shadow-sm">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="material-symbols-rounded text-sm text-amber-400">emergency</span>
                  <span className="text-on-surface font-bold">Cam 3 (East ECR/EMS) Scenario:</span>
                  <span className="text-on-surface-variant text-[10px] hidden sm:inline">(Top-down Indian road with left-hand traffic)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => switchEastVideoMode(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      !eastAmbulanceMode
                        ? "bg-primary text-white border-primary shadow-sm ring-1 ring-primary/40"
                        : "bg-surface-mid text-on-surface-variant border-outline hover:text-on-surface"
                    }`}
                  >
                    <span>🚗</span>
                    <span>Standard Traffic (No Ambulance)</span>
                  </button>
                  <button
                    onClick={() => switchEastVideoMode(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      eastAmbulanceMode
                        ? "bg-red-500 text-white border-red-400 shadow-md animate-pulse ring-2 ring-red-400/50"
                        : "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
                    }`}
                  >
                    <span>🚨</span>
                    <span>108 Ambulance Priority (Overtakes Queue)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Video Canvas Container with HUD Viewfinder */}
            <div
              ref={viewportFrameRef}
              className="relative w-full h-[480px] bg-surface-mid rounded-2xl overflow-hidden border border-outline flex items-center justify-center shadow-inner"
            >
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
                style={{
                  width: `${videoDisplaySize.w}px`,
                  height: `${videoDisplaySize.h}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                {/* HTML5 Video Element */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  loop
                  onLoadedMetadata={() => {
                    updateVideoDisplaySize();
                    scheduleNextFrame();
                  }}
                  onLoadedData={() => {
                    updateVideoDisplaySize();
                    scheduleNextFrame();
                  }}
                  onCanPlay={() => {
                    setIsVideoPaused(false);
                    updateVideoDisplaySize();
                    scheduleNextFrame();
                  }}
                  onPlay={() => {
                    setIsVideoPaused(false);
                    updateVideoDisplaySize();
                    scheduleNextFrame();
                  }}
                  onPlaying={() => {
                    setIsVideoPaused(false);
                    updateVideoDisplaySize();
                    scheduleNextFrame();
                  }}
                  onPause={() => {
                    setIsVideoPaused(true);
                  }}
                  onError={(e) => {
                    console.error("Video element error:", e);
                    setStreamError("Unable to decode video file. Please verify video format.");
                  }}
                  className="w-full h-full object-fill rounded-xl"
                />

                {/* Click to Play / Resume Overlay if video is paused by browser */}
                {isStreaming && isVideoPaused && (
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play().then(() => {
                          setIsVideoPaused(false);
                          scheduleNextFrame();
                        }).catch(console.warn);
                      }
                    }}
                    className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center gap-2.5 text-white z-40 cursor-pointer backdrop-blur-sm transition-all"
                  >
                    <span className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-2xl shadow-xl animate-pulse">
                      ▶
                    </span>
                    <span className="font-mono text-xs font-bold tracking-wide">
                      Click to Play Video & Start AI Inference
                    </span>
                  </button>
                )}

                {/* Smooth Multi-Object Tracked Bounding Box Overlay Cards */}
                {isStreaming &&
                  boxesToRender.map((track) => {
                    const [normX, normY, normW, normH] = track.norm_bbox;
                    const isPriority = track.class === "ambulance" || track.class === "police";
                    const color = getClassColor(track.class);
                    const displayClass = (track.class === "standard" || !track.class)
                      ? "CAR"
                      : (track.class.toLowerCase() === "motorcycle" || track.class.toLowerCase() === "motorbike")
                      ? "MOTORCYCLE"
                      : (track.class.toLowerCase() === "auto_rickshaw" || track.class.toLowerCase() === "auto" || track.class.toLowerCase() === "rickshaw")
                      ? "AUTO"
                      : (track.class.toLowerCase() === "bus")
                      ? "BUS"
                      : track.class.toUpperCase();

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
                          {displayClass} {(track.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}

                {/* 4-Way Approach HUD Directional Badges (North, South, East, West) */}
                {isStreaming && (
                  <>
                    {/* North Approach HUD Badge (Top) */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-low/95 backdrop-blur-md border border-outline shadow-xl text-[10px] font-mono">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          signalColors.N === "green" ? "bg-state-calm shadow-[0_0_8px_#00c97a]" :
                          signalColors.N === "yellow" ? "bg-state-building shadow-[0_0_8px_#ffab1a]" : "bg-state-preempted shadow-[0_0_8px_#ff4060]"
                        }`}></span>
                        <span className="font-bold text-on-surface">NORTH (OMR INBOUND)</span>
                        <span className="text-on-surface-variant font-bold">{approachesData.N?.vehicles || 0} veh</span>
                        <span className="text-on-surface-variant">({approachesData.N?.queue_m || 0}m)</span>
                        {activePhase === "Approach-N" && (
                          <span className="px-1.5 py-0.5 bg-state-calm/20 text-state-calm rounded text-[9px] font-bold">
                            {phaseState === "YELLOW" ? "YELLOW" : "GREEN"} {Math.round(phaseCountdown)}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* South Approach HUD Badge (Bottom) */}
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-low/95 backdrop-blur-md border border-outline shadow-xl text-[10px] font-mono">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          signalColors.S === "green" ? "bg-state-calm shadow-[0_0_8px_#00c97a]" :
                          signalColors.S === "yellow" ? "bg-state-building shadow-[0_0_8px_#ffab1a]" : "bg-state-preempted shadow-[0_0_8px_#ff4060]"
                        }`}></span>
                        <span className="font-bold text-on-surface">SOUTH (OMR OUTBOUND)</span>
                        <span className="text-on-surface-variant font-bold">{approachesData.S?.vehicles || 0} veh</span>
                        <span className="text-on-surface-variant">({approachesData.S?.queue_m || 0}m)</span>
                        {activePhase === "Approach-S" && (
                          <span className="px-1.5 py-0.5 bg-state-calm/20 text-state-calm rounded text-[9px] font-bold">
                            {phaseState === "YELLOW" ? "YELLOW" : "GREEN"} {Math.round(phaseCountdown)}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* West Approach HUD Badge (Left) */}
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
                      <div className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl bg-surface-low/95 backdrop-blur-md border border-outline shadow-xl text-[10px] font-mono">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          signalColors.W === "green" ? "bg-state-calm shadow-[0_0_8px_#00c97a]" :
                          signalColors.W === "yellow" ? "bg-state-building shadow-[0_0_8px_#ffab1a]" : "bg-state-preempted shadow-[0_0_8px_#ff4060]"
                        }`}></span>
                        <span className="font-bold text-on-surface">WEST</span>
                        <span className="text-[9px] text-on-surface-variant font-bold">{approachesData.W?.vehicles || 0} veh</span>
                        {activePhase === "Approach-W" && (
                          <span className="px-1.5 py-0.5 bg-state-calm/20 text-state-calm rounded text-[8px] font-bold">
                            {Math.round(phaseCountdown)}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* East Approach HUD Badge (Right) */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
                      <div className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl bg-surface-low/95 backdrop-blur-md border border-outline shadow-xl text-[10px] font-mono">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          signalColors.E === "green" ? "bg-state-calm shadow-[0_0_8px_#00c97a]" :
                          signalColors.E === "yellow" ? "bg-state-building shadow-[0_0_8px_#ffab1a]" : "bg-state-preempted shadow-[0_0_8px_#ff4060]"
                        }`}></span>
                        <span className="font-bold text-on-surface">EAST</span>
                        <span className="text-[9px] text-on-surface-variant font-bold">{approachesData.E?.vehicles || 0} veh</span>
                        {approachesData.E?.is_emergency && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[8px] font-bold animate-pulse">EMERGENCY</span>
                        )}
                        {activePhase === "Approach-E" && (
                          <span className="px-1.5 py-0.5 bg-state-calm/20 text-state-calm rounded text-[8px] font-bold">
                            {Math.round(phaseCountdown)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* High-Tech Full-Width Empty State Launch Cards */}
              {!isStreaming && (
                <div className="flex flex-col justify-between items-center w-full h-full p-6 text-center z-10 relative">
                  {/* Subtle Tech Radial Ambient Glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.07),transparent_65%)] pointer-events-none" />

                  <div className="flex flex-col items-center relative z-10">
                    <span className="font-mono text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/25 font-bold uppercase tracking-widest inline-flex items-center gap-1.5 mb-2 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Active Camera: {APPROACH_SOURCES[selectedApproach].camTag} · {APPROACH_SOURCES[selectedApproach].name} ({APPROACH_SOURCES[selectedApproach].id})
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">
                      {approachVideos[selectedApproach]
                        ? `Video Ready for ${APPROACH_SOURCES[selectedApproach].camTag}: ${approachVideos[selectedApproach]?.fileName}`
                        : `No Video Uploaded for ${APPROACH_SOURCES[selectedApproach].camTag}`}
                    </h3>
                    <p className="font-mono text-xs text-on-surface-variant max-w-xl mx-auto mt-1 leading-relaxed">
                      {approachVideos[selectedApproach]
                        ? `Click Run ${APPROACH_SOURCES[selectedApproach].camTag} Stream below to begin real-time YOLOv8 vehicle detection, queue accumulation, and signal priority.`
                        : `Upload an individual video file for ${APPROACH_SOURCES[selectedApproach].name} or load the instant demo video to start live inference.`}
                    </p>
                  </div>

                  {/* Hidden CCTV File Input (Fallback) */}
                  <input
                    type="file"
                    ref={fileUploadRef}
                    onChange={handleCctvVideoUpload}
                    accept="video/*"
                    className="hidden"
                  />

                  {/* Instant Demo / Play Active Video Banner */}
                  {approachVideos[selectedApproach] ? (
                    <div
                      onClick={() => startCamera(selectedApproach)}
                      className="w-full max-w-4xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 hover:from-emerald-500/30 hover:to-teal-500/25 border-2 border-emerald-500/50 hover:border-emerald-500 p-4 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between shadow-lg my-2 text-left group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-110 transition-transform shrink-0">
                          <span className="material-symbols-rounded text-2xl">play_circle</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm md:text-base font-bold text-on-surface">
                              Play {APPROACH_SOURCES[selectedApproach].camTag} ({APPROACH_SOURCES[selectedApproach].id}) Stream: {approachVideos[selectedApproach]?.fileName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              READY
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                            Streams {APPROACH_SOURCES[selectedApproach].name} into Python YOLOv8 & Webster signal allocation.
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shrink-0 group-hover:bg-emerald-400 transition-colors">
                        <span>Run {APPROACH_SOURCES[selectedApproach].camTag} Stream</span>
                        <span className="material-symbols-rounded text-sm">arrow_forward</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => loadSampleForApproach(selectedApproach)}
                      className="w-full max-w-4xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/10 hover:from-emerald-500/30 hover:to-teal-500/25 border-2 border-emerald-500/50 hover:border-emerald-500 p-4 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between shadow-lg my-2 text-left group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-110 transition-transform shrink-0">
                          <span className="material-symbols-rounded text-2xl">play_circle</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm md:text-base font-bold text-on-surface">
                              Instant Demo: Load Sample Video for {APPROACH_SOURCES[selectedApproach].name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              1-CLICK RUN
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                            Loads high-definition CCTV video for {APPROACH_SOURCES[selectedApproach].id}, actuates signal priority, and tracks queue density.
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shrink-0 group-hover:bg-emerald-400 transition-colors">
                        <span>Run Pipeline</span>
                        <span className="material-symbols-rounded text-sm">arrow_forward</span>
                      </div>
                    </div>
                  )}

                  {/* 3-Card Launch Grid Filling Container */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl my-auto relative z-10">
                    {/* Card 1: Upload CCTV Video File for Selected Approach */}
                    <div
                      onClick={() => getFileInputRef(selectedApproach).current?.click()}
                      className="group relative bg-surface hover:bg-surface-mid border-2 border-primary/30 hover:border-primary p-5 rounded-2xl cursor-pointer transition-all duration-200 text-left flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                            <span className="material-symbols-rounded text-2xl">upload_file</span>
                          </div>
                          <span className="font-mono text-[9px] bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {APPROACH_SOURCES[selectedApproach].id} Upload
                          </span>
                        </div>
                        <h4 className="text-sm md:text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                          Upload Video for {APPROACH_SOURCES[selectedApproach].id}
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                          Upload MP4/WebM footage specifically for {APPROACH_SOURCES[selectedApproach].name}.
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>Individual File • Live Inference</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-outline flex items-center justify-between text-xs font-mono font-bold text-primary">
                        <span>Select Video File</span>
                        <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:translate-x-1 transition-all">
                          <span className="material-symbols-rounded text-sm">arrow_forward</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: YouTube Tab / Screen Share */}
                    <div
                      onClick={startScreenShareStream}
                      className="group relative bg-surface hover:bg-surface-mid border-2 border-state-preempted/30 hover:border-state-preempted p-5 rounded-2xl cursor-pointer transition-all duration-200 text-left flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-state-preempted/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-11 h-11 rounded-xl bg-state-preempted/15 text-state-preempted border border-state-preempted/25 flex items-center justify-center group-hover:scale-110 group-hover:bg-state-preempted group-hover:text-white transition-all shadow-sm">
                            <span className="material-symbols-rounded text-2xl">screen_share</span>
                          </div>
                          <span className="font-mono text-[9px] bg-state-preempted/15 text-state-preempted border border-state-preempted/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Tab Stream
                          </span>
                        </div>
                        <h4 className="text-sm md:text-base font-bold text-on-surface group-hover:text-state-preempted transition-colors">
                          Share YouTube Tab
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                          Stream live 1080p YouTube traffic feeds or drone clips directly into YOLO.
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant">
                          <span className="w-1.5 h-1.5 rounded-full bg-state-preempted" />
                          <span>Browser Tab • 60 FPS</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-outline flex items-center justify-between text-xs font-mono font-bold text-state-preempted">
                        <span>Launch Tab Stream</span>
                        <div className="w-6 h-6 rounded-lg bg-state-preempted/10 border border-state-preempted/20 flex items-center justify-center group-hover:bg-state-preempted group-hover:text-white group-hover:translate-x-1 transition-all">
                          <span className="material-symbols-rounded text-sm">arrow_forward</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Physical Webcam */}
                    <div
                      onClick={() => startWebcamStream()}
                      className="group relative bg-surface hover:bg-surface-mid border-2 border-state-calm/30 hover:border-state-calm p-5 rounded-2xl cursor-pointer transition-all duration-200 text-left flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-state-calm/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-11 h-11 rounded-xl bg-state-calm/15 text-state-calm border border-state-calm-border flex items-center justify-center group-hover:scale-110 group-hover:bg-state-calm group-hover:text-white transition-all shadow-sm">
                            <span className="material-symbols-rounded text-2xl">videocam</span>
                          </div>
                          <span className="font-mono text-[9px] bg-state-calm/15 text-state-calm border border-state-calm-border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {availableWebcams.length > 1 ? `${availableWebcams.length} Webcams Detected` : "Hardware"}
                          </span>
                        </div>
                        <h4 className="text-sm md:text-base font-bold text-on-surface group-hover:text-state-calm transition-colors">
                          Physical Webcam ({APPROACH_SOURCES[selectedApproach].camTag})
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                          Connect USB or built-in webcam directly to {APPROACH_SOURCES[selectedApproach].name}.
                        </p>

                        {/* Webcam Device Selector if multiple webcams detected */}
                        {availableWebcams.length > 0 && (
                          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-mono text-on-surface-variant block mb-1">
                              Select USB Camera:
                            </label>
                            <select
                              value={selectedWebcamDevices[selectedApproach] || ""}
                              onChange={(e) => {
                                const devId = e.target.value;
                                setSelectedWebcamDevices((prev) => ({ ...prev, [selectedApproach]: devId }));
                              }}
                              className="w-full bg-surface-low border border-outline rounded-lg px-2.5 py-1 text-[11px] font-mono text-on-surface focus:outline-none focus:border-state-calm"
                            >
                              <option value="">Default System Webcam</option>
                              {availableWebcams.map((cam, idx) => (
                                <option key={cam.deviceId || idx} value={cam.deviceId}>
                                  {cam.label || `Camera ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant">
                          <span className="w-1.5 h-1.5 rounded-full bg-state-calm" />
                          <span>Direct Camera • 4-Camera WS Port 8000</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-outline flex items-center justify-between text-xs font-mono font-bold text-state-calm">
                        <span>Start Camera Feed</span>
                        <div className="w-6 h-6 rounded-lg bg-state-calm/10 border border-state-calm-border flex items-center justify-center group-hover:bg-state-calm group-hover:text-white group-hover:translate-x-1 transition-all">
                          <span className="material-symbols-rounded text-sm">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── MODULE 2: LIVE 4-PATH SIGNAL ACTUATOR (DRIVEN BY VIDEO) ── */}
            <div className="card p-4 flex flex-col gap-3.5 bg-surface/90 border border-outline shadow-xl rounded-2xl">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-outline pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-state-calm animate-pulse"></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
                        Signal Actuation Engine · IX-104 (4-Path Junction)
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                        phaseState === "PREEMPTED"
                          ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                          : phaseState === "YELLOW"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      }`}>
                        {phaseState === "PREEMPTED" ? "🚨 PREEMPTION HOLD" : phaseState === "YELLOW" ? "CLEARANCE" : "DEMAND GREEN"}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                      Live Webster saturation flow kinematics dynamically allocating green splits based on 4-approach camera queues
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <span className="text-[9px] text-on-surface-variant uppercase block">Phase Timer</span>
                    <span className="text-base font-bold text-primary">
                      {Math.round(phaseCountdown)}s remaining
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-surface-high border border-outline flex items-center justify-center font-mono font-bold text-lg text-primary shadow-inner">
                    {Math.round(phaseCountdown)}
                  </div>
                </div>
              </div>

              {/* 4 Approach Signal Heads Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["N", "S", "E", "W"] as const).map((dir) => {
                  const app = approachesData[dir] || {
                    name: `${dir} Approach`,
                    vehicles: 0,
                    queue_m: 0,
                    density: 0,
                    is_emergency: false,
                  };
                  const color = signalColors[dir] || "red";
                  const isCurrentActive = activePhase === `Approach-${dir}`;

                  return (
                    <div
                      key={dir}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        isCurrentActive
                          ? color === "green"
                            ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_12px_rgba(0,201,122,0.15)]"
                            : "bg-amber-500/10 border-amber-500/50"
                          : "bg-surface-mid/80 border-outline/70"
                      }`}
                    >
                      {/* Top: Approach Name & Orientation */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] font-bold text-on-surface uppercase">
                          {dir === "N" ? "North (OMR In)" : dir === "S" ? "South (OMR Out)" : dir === "E" ? "East (ECR/EMS)" : "West (Medavakkam)"}
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-surface-low border border-outline text-on-surface-variant">
                          Approach-{dir}
                        </span>
                      </div>

                      {/* Middle: 3-Lamp Traffic Signal Head */}
                      <div className="flex items-center justify-center gap-2 py-2 my-1 bg-surface-low/90 rounded-lg border border-outline/50 shadow-inner">
                        {/* Red Lamp */}
                        <div
                          className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            color === "red"
                              ? "bg-[#ff4060] shadow-[0_0_10px_#ff4060]"
                              : "bg-[#3a1a22] opacity-40"
                          }`}
                        />
                        {/* Yellow Lamp */}
                        <div
                          className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            color === "yellow"
                              ? "bg-[#ffab1a] shadow-[0_0_10px_#ffab1a]"
                              : "bg-[#3a2e15] opacity-40"
                          }`}
                        />
                        {/* Green Lamp */}
                        <div
                          className={`w-4 h-4 rounded-full transition-all duration-300 ${
                            color === "green"
                              ? "bg-[#00c97a] shadow-[0_0_10px_#00c97a]"
                              : "bg-[#0b2b1e] opacity-40"
                          }`}
                        />
                      </div>

                      {/* Bottom: Live Queue & Status */}
                      <div className="mt-2 flex justify-between items-center text-[10px] font-mono">
                        <div>
                          <span className="text-on-surface-variant block">Queue:</span>
                          <span className="font-bold text-on-surface">{app.vehicles} veh ({app.queue_m}m)</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          color === "green"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : color === "yellow"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-surface-low text-on-surface-variant"
                        }`}>
                          {color.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── MODULE 3: DIRECTED GRAPH CORRIDOR ROUTING & PATH MAPPING ── */}
            <div className="card p-4 flex flex-col gap-3.5 bg-surface/90 border border-outline shadow-xl rounded-2xl">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-outline pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary border border-primary/25 flex items-center justify-center font-bold">
                    <span className="material-symbols-rounded text-lg">alt_route</span>
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider block">
                      Directed Graph Corridor Routing · Green Wave Wavefront
                    </span>
                    <span className="font-mono text-[11px] text-on-surface-variant">
                      Origin: IX-104 Sholinganallur · Mapped Downstream on OMR Arterial Network
                    </span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                  corridorRouting?.is_preempted
                    ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${corridorRouting?.is_preempted ? "bg-red-500" : "bg-emerald-500"}`} />
                  {corridorRouting?.is_preempted ? "EMERGENCY GREEN WAVE ACTIVE" : "COORDINATED GREEN CORRIDOR"}
                </span>
              </div>

              {/* Corridor Path Chain Visualizer */}
              <div className="bg-surface-mid/80 p-3.5 rounded-xl border border-outline/70 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                  {(corridorRouting?.corridor_path || ["IX-104", "IX-103", "IX-102", "IX-101"]).map((nodeId, idx, arr) => {
                    const isOrigin = idx === 0;
                    return (
                      <React.Fragment key={nodeId}>
                        <div className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 ${
                          isOrigin
                            ? "bg-primary/20 text-primary border-primary/40 shadow-sm"
                            : "bg-surface text-on-surface border-outline"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            isOrigin
                              ? "bg-primary animate-ping"
                              : corridorRouting?.is_preempted ? "bg-emerald-500" : "bg-primary/70"
                          }`} />
                          <span>{nodeId}</span>
                          {isOrigin && <span className="text-[9px] text-primary/80 font-normal">(ACTIVE SIGNAL)</span>}
                        </div>
                        {idx < arr.length - 1 && (
                          <span className="text-primary font-bold">➔</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <span className="text-on-surface-variant font-bold">➔</span>
                  <div className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 font-bold flex items-center gap-1.5">
                    <span>🏥</span>
                    <span>{corridorRouting?.destination || "Gleneagles Hospital"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] text-on-surface-variant block uppercase">Time Saved</span>
                    <span className="font-bold text-state-calm">-{corridorRouting?.time_saved_minutes || 4.8} min (38.5%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {streamError && (
              <div className="p-3.5 rounded-xl bg-state-preempted/15 border border-state-crit-border text-state-preempted text-xs font-mono flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-base">warning</span>
                  <span>{streamError}</span>
                </div>
                <span className="font-bold bg-state-preempted/20 px-2 py-0.5 rounded">FastAPI :8000</span>
              </div>
            )}
          </div>

          {/* Control & Stream Telemetry Panel (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Stream Action Controls Card */}
            <div className="card p-4 flex flex-col gap-3.5 shadow-sm">
              <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-rounded text-sm text-primary">tune</span>
                <span>Stream Controller</span>
              </span>

              {isStreaming ? (
                <div className="space-y-2">
                  <button
                    onClick={() => terminateCamera(selectedApproach)}
                    className="w-full py-3 bg-state-preempted hover:bg-[#e03554] text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_16px_rgba(255,64,96,0.4)]"
                  >
                    <span className="material-symbols-rounded text-base">stop_circle</span>
                    <span>Terminate {APPROACH_SOURCES[selectedApproach].camTag} ({APPROACH_SOURCES[selectedApproach].id})</span>
                  </button>

                  <button
                    onClick={terminateAllCameras}
                    className="w-full py-2 bg-surface-low hover:bg-surface-high text-on-surface-variant hover:text-state-preempted border border-outline font-mono text-[11px] font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="Stop all 4 cameras and return to full standby"
                  >
                    <span className="material-symbols-rounded text-sm">power_settings_new</span>
                    <span>Terminate All 4 Cameras</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => startCamera(selectedApproach)}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25"
                  >
                    <span className="material-symbols-rounded text-base">play_circle</span>
                    <span>Run {APPROACH_SOURCES[selectedApproach].camTag} Stream</span>
                  </button>

                  <button
                    onClick={() => getFileInputRef(selectedApproach).current?.click()}
                    className="w-full py-2.5 bg-primary hover:bg-blue-600 text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-rounded text-sm">upload_file</span>
                    <span>Upload Video ({APPROACH_SOURCES[selectedApproach].camTag})</span>
                  </button>

                  <button
                    onClick={() => loadSampleForApproach(selectedApproach)}
                    className="w-full py-2.5 bg-surface-low hover:bg-surface-high text-on-surface border border-outline font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-rounded text-sm">play_circle</span>
                    <span>Load Demo Video ({APPROACH_SOURCES[selectedApproach].camTag})</span>
                  </button>

                  <button
                    onClick={startAllCameras}
                    className="w-full py-2 bg-surface-low hover:bg-surface-high text-primary border border-outline font-mono text-[11px] font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="Start active camera stream and ready all approaches"
                  >
                    <span className="material-symbols-rounded text-sm">play_arrow</span>
                    <span>Run All 4 Cameras</span>
                  </button>

                  <button
                    onClick={startScreenShareStream}
                    className="w-full py-2.5 bg-state-preempted hover:bg-[#e03554] text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-rounded text-sm">screen_share</span>
                    <span>Share YouTube Tab</span>
                  </button>

                  <button
                    onClick={() => startWebcamStream()}
                    className="w-full py-2.5 bg-state-calm hover:bg-[#00b06b] text-white font-mono text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <span className="material-symbols-rounded text-sm">videocam</span>
                    <span>Start Physical Webcam</span>
                  </button>
                </div>
              )}

              {/* Class Detection Scope Selector */}
              <div className="flex items-center justify-between p-2.5 bg-surface-low border border-outline rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-sm text-on-surface-variant">filter_alt</span>
                  <span className="font-mono text-xs text-on-surface-variant">Scope:</span>
                </div>
                <button
                  onClick={() => setAllowAllClasses(!allowAllClasses)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    allowAllClasses
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-state-calm/20 text-state-calm border border-state-calm-border"
                  }`}
                >
                  {allowAllClasses ? "All 80 COCO" : "Traffic Only"}
                </button>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="p-3 bg-surface-low border border-outline rounded-xl flex flex-col gap-2">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-on-surface-variant">Confidence Threshold:</span>
                  <span className="text-state-calm font-bold">{(confThreshold * 100).toFixed(0)}%</span>
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
                <div className="flex justify-between font-mono text-[9px] text-on-surface-variant">
                  <span>10% (Dense)</span>
                  <span>32% (Optimal)</span>
                  <span>80% (Strict)</span>
                </div>
              </div>
            </div>

            {/* Emergency Priority Alert Banner */}
            {hasEmergencyVehicle && (
              <div className="bg-gradient-to-r from-[#ff4060]/20 via-[#ff4060]/10 to-transparent border border-[#ff4060] rounded-2xl p-3.5 flex items-center gap-3 animate-pulse shadow-[0_0_18px_rgba(255,64,96,0.3)]">
                <div className="w-10 h-10 rounded-xl bg-state-preempted text-white flex items-center justify-center font-bold text-lg">
                  🚨
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-state-preempted uppercase block">
                    Priority Preemption Triggered
                  </span>
                  <span className="font-mono text-[11px] text-on-surface">
                    108 Emergency / Police detected in corridor
                  </span>
                </div>
              </div>
            )}

            {/* Dual-Mode Live Spectrum & Cumulative Session Ledger Card */}
            <div className="card p-4 flex flex-col gap-3 shadow-sm flex-1">
              {/* Header & Mode Switcher */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-surface-low p-1 rounded-xl border border-outline">
                  <button
                    onClick={() => setTelemetryMode("cumulative")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      telemetryMode === "cumulative"
                        ? "bg-state-calm/20 text-state-calm border border-state-calm-border"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-rounded text-xs">receipt_long</span>
                    <span>Session Inflow</span>
                  </button>
                  <button
                    onClick={() => setTelemetryMode("instant")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      telemetryMode === "instant"
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "text-on-surface-variant hover:text-on-surface"
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
                  className="p-1.5 bg-surface-low hover:bg-surface-high text-on-surface-variant hover:text-on-surface rounded-lg border border-outline transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                >
                  <span className="material-symbols-rounded text-xs">rotate_left</span>
                  <span>Reset</span>
                </button>
              </div>

              {/* ── VIEW 1: CUMULATIVE SESSION INFLOW (START TO END) ── */}
              {telemetryMode === "cumulative" && (
                <div className="flex flex-col gap-3 flex-1">
                  {/* Big Hero Inflow Readout */}
                  <div className="bg-gradient-to-br from-emerald-500/10 via-surface-mid to-surface p-4 rounded-xl border border-state-calm-border flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-state-calm uppercase tracking-wider block">
                        Total Unique Inflow (Start → End)
                      </span>
                      <span className="text-3xl font-bold font-mono text-on-surface tracking-tight">
                        {cumulativeVehicleCount}{" "}
                        <span className="text-xs text-on-surface-variant font-normal">vehicles</span>
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[9px] text-on-surface-variant uppercase block">Session Time</span>
                      <span className="text-sm font-bold text-primary">
                        {formatDuration(streamDurationSec)}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="metric-tile">
                      <span className="text-[9px] text-on-surface-variant uppercase block">Peak Density</span>
                      <span className="text-lg font-bold text-state-building">
                        {peakDensity} veh/frame
                      </span>
                    </div>
                    <div className="metric-tile">
                      <span className="text-[9px] text-on-surface-variant uppercase block">Active In Frame</span>
                      <span className="text-lg font-bold text-state-calm">
                        {liveDetections.length}
                      </span>
                    </div>
                  </div>

                  {/* Cumulative Classification Ledger */}
                  <div className="metric-tile flex flex-col gap-2 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[9px] text-on-surface-variant uppercase">
                        Cumulative Class Ledger
                      </span>
                      <span className="font-mono text-[9px] text-state-calm font-bold">
                        {cumulativeVehicleCount} Passed
                      </span>
                    </div>

                    {Object.keys(cumulativeClassCounts).length === 0 ? (
                      <div className="flex flex-col items-center justify-center my-auto py-5 text-center">
                        <span className="material-symbols-rounded text-xl text-on-surface-variant mb-1">history_toggle_off</span>
                        <span className="font-mono text-[11px] text-on-surface-variant">
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
                              className="bg-surface-mid p-2 rounded-lg border border-outline flex justify-between items-center"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: color }}
                                ></span>
                                <span className="text-on-surface uppercase truncate text-[11px]">{cls.replace(/_/g, " ")}</span>
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
                    <div className="metric-tile">
                      <span className="text-[9px] text-on-surface-variant uppercase block">Active Targets</span>
                      <span className="text-2xl font-bold text-state-calm">
                        {liveDetections.length}
                      </span>
                    </div>
                    <div className="metric-tile">
                      <span className="text-[9px] text-on-surface-variant uppercase block">Edge Latency</span>
                      <span className="text-2xl font-bold text-primary">
                        {liveLatency} ms
                      </span>
                    </div>
                  </div>

                  <div className="metric-tile flex flex-col gap-2 flex-1">
                    <span className="font-mono text-[9px] text-on-surface-variant uppercase block">
                      Current Frame Distribution
                    </span>

                    {Object.keys(liveClassCounts).length === 0 ? (
                      <div className="flex flex-col items-center justify-center my-auto py-6 text-center">
                        <span className="material-symbols-rounded text-2xl text-on-surface-variant mb-1">radar</span>
                        <span className="font-mono text-xs text-on-surface-variant">
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
                              className="bg-surface-mid p-2 rounded-lg border border-outline flex justify-between items-center"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: color }}
                                ></span>
                                <span className="text-on-surface uppercase truncate">{cls.replace(/_/g, " ")}</span>
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
    </div>
  );
}
