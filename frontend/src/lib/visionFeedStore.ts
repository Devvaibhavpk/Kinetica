export type DirectionKey = "N" | "S" | "E" | "W";

export interface VisionFeedState {
  videoUrl?: string | null;
  videoFileName?: string | null;
  streamSource?: "upload" | "webcam" | "screenshare" | string | null;
  isStreaming?: boolean;
  hasEmergency?: boolean;
  emergencyDirection?: DirectionKey | null;
  liveDetectionsCount?: number;
  fps?: number;
  latency_ms?: number;
}

let currentState: VisionFeedState = {
  videoUrl: null,
  videoFileName: null,
  streamSource: null,
  isStreaming: false,
  hasEmergency: false,
  emergencyDirection: null,
  liveDetectionsCount: 0,
  fps: 0,
  latency_ms: 0,
};

type Listener = (state: VisionFeedState) => void;
const listeners = new Set<Listener>();

export function getVisionFeedState(): VisionFeedState {
  return currentState;
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
  };
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch (err) {
      console.error("[visionFeedStore] Error in reset listener:", err);
    }
  });
}
