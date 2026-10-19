export type DirectionKey = "N" | "S" | "E" | "W";
export type SignalColor = "red" | "yellow" | "green";

export interface ApproachFeedData {
  approach_id: string;
  direction: DirectionKey;
  name: string;
  vehicles: number;
  queue_m: number;
  queueMeters?: number;
  density: number;
  signal: SignalColor;
  is_emergency: boolean;
  isEmergency?: boolean;
  classes?: Record<string, number>;
}

export interface CorridorRoutingState {
  origin_intersection: string;
  intersection_name: string;
  active_approach: string;
  corridor_path: string[];
  is_preempted: boolean;
  emergency_direction?: DirectionKey | null;
  emergency_confirmed?: boolean;
  emergency_hold_seconds?: number;
  destination: string;
  status: string;
  time_saved_minutes: number;
  speed_boost_percent: number;
}

export type TelemetryMode = "cctv" | "simulate";

export interface SimulationState {
  queueCounts: Record<DirectionKey, number>;
  queueMeters: Record<DirectionKey, number>;
  densities: Record<DirectionKey, number>;
  signalColors: Record<DirectionKey, SignalColor>;
  activePhase: string;
  phaseState: string;
  phaseCountdown: number;
  hasEmergency: boolean;
  emergencyDirection: DirectionKey | null;
  totalVehicles: number;
}

export interface VisionFeedState {
  videoUrl?: string | null;
  videoFileName?: string | null;
  streamSource?: "upload" | "webcam" | "screenshare" | string | null;
  isStreaming?: boolean;
  telemetryMode?: TelemetryMode;
  simulationState?: SimulationState | null;
  hasEmergency?: boolean;
  emergencyDirection?: DirectionKey | null;
  emergencyConfirmed?: boolean;
  liveDetectionsCount?: number;
  fps?: number;
  latency_ms?: number;
  intersectionId?: string;
  activePhase?: string;
  phaseState?: "GREEN" | "YELLOW" | "PREEMPTED" | string;
  phaseCountdown?: number;
  signalColors?: Record<DirectionKey, SignalColor>;
  approaches?: Record<DirectionKey, ApproachFeedData>;
  corridorRouting?: CorridorRoutingState | null;
  timestamp?: string | null;
  formattedDate?: string | null;
  feedSourceTag?: string | null;
  classCounts?: Record<string, number>;
  cumulativeClassCounts?: Record<string, number>;
}

let currentState: VisionFeedState = {
  videoUrl: null,
  videoFileName: null,
  streamSource: null,
  isStreaming: false,
  telemetryMode: "simulate",
  simulationState: null,
  hasEmergency: false,
  emergencyDirection: null,
  liveDetectionsCount: 0,
  fps: 0,
  latency_ms: 0,
  intersectionId: "IX-104",
  activePhase: "Approach-N",
  phaseState: "GREEN",
  phaseCountdown: 24.0,
  signalColors: {
    N: "green",
    S: "red",
    E: "red",
    W: "red",
  },
  approaches: {
    N: { approach_id: "Approach-N", direction: "N", name: "North Approach (OMR Inbound)", vehicles: 0, queue_m: 0, density: 0, signal: "green", is_emergency: false },
    S: { approach_id: "Approach-S", direction: "S", name: "South Approach (OMR Outbound)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
    E: { approach_id: "Approach-E", direction: "E", name: "East Approach (ECR / EMS Link)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
    W: { approach_id: "Approach-W", direction: "W", name: "West Approach (Medavakkam Rd)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
  },
  corridorRouting: {
    origin_intersection: "IX-104",
    intersection_name: "Sholinganallur Junction",
    active_approach: "Approach-N",
    corridor_path: ["IX-104", "IX-103", "IX-102", "IX-101"],
    is_preempted: false,
    emergency_direction: null,
    destination: "Gleneagles Global Health City",
    status: "DYNAMIC_PROGRESSION",
    time_saved_minutes: 2.1,
    speed_boost_percent: 38.5,
  },
  timestamp: null,
  formattedDate: null,
  feedSourceTag: null,
  classCounts: {},
  cumulativeClassCounts: {},
};

type Listener = (state: VisionFeedState) => void;
const listeners = new Set<Listener>();

export function getVisionFeedState(): VisionFeedState {
  return currentState;
}

export function setGlobalTelemetryMode(mode: TelemetryMode): void {
  updateVisionFeedState({ telemetryMode: mode });
}

export function updateSimulationTelemetry(simState: SimulationState): void {
  updateVisionFeedState({ simulationState: simState });
}

export function updateVisionFeedState(update: Partial<VisionFeedState>): void {
  currentState = {
    ...currentState,
    ...update,
  };
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch (err) {
      console.error("[visionFeedStore] Error in listener:", err);
    }
  });
}

export function subscribeVisionFeed(listener: Listener): () => void {
  listeners.add(listener);
  // Emit current state on initial subscription
  try {
    listener(currentState);
  } catch (err) {
    console.error("[visionFeedStore] Error in initial subscriber callback:", err);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function resetVisionFeedState(): void {
  currentState = {
    videoUrl: null,
    videoFileName: null,
    streamSource: null,
    isStreaming: false,
    hasEmergency: false,
    emergencyDirection: null,
    liveDetectionsCount: 0,
    fps: 0,
    latency_ms: 0,
    intersectionId: "IX-104",
    activePhase: "Approach-N",
    phaseState: "GREEN",
    phaseCountdown: 24.0,
    signalColors: {
      N: "green",
      S: "red",
      E: "red",
      W: "red",
    },
    approaches: {
      N: { approach_id: "Approach-N", direction: "N", name: "North Approach (OMR Inbound)", vehicles: 0, queue_m: 0, density: 0, signal: "green", is_emergency: false },
      S: { approach_id: "Approach-S", direction: "S", name: "South Approach (OMR Outbound)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
      E: { approach_id: "Approach-E", direction: "E", name: "East Approach (ECR / EMS Link)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
      W: { approach_id: "Approach-W", direction: "W", name: "West Approach (Medavakkam Rd)", vehicles: 0, queue_m: 0, density: 0, signal: "red", is_emergency: false },
    },
    corridorRouting: {
      origin_intersection: "IX-104",
      intersection_name: "Sholinganallur Junction",
      active_approach: "Approach-N",
      corridor_path: ["IX-104", "IX-103", "IX-102", "IX-101"],
      is_preempted: false,
      emergency_direction: null,
      destination: "Gleneagles Global Health City",
      status: "DYNAMIC_PROGRESSION",
      time_saved_minutes: 2.1,
      speed_boost_percent: 38.5,
    },
    timestamp: null,
    formattedDate: null,
    feedSourceTag: null,
    classCounts: {},
    cumulativeClassCounts: {},
  };
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch (err) {
      console.error("[visionFeedStore] Error in reset listener:", err);
    }
  });
}

