"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Map, LayerGroup, Marker, Polyline, TileLayer } from "leaflet";
import { subscribeVisionFeed, setGlobalTelemetryMode, type TelemetryMode } from "../lib/visionFeedStore";

export interface HospitalLocation {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  traumaLevel: string;
  emergencyContact: string;
  nearestIntersection: string;
}

export const CHENNAI_HOSPITALS: HospitalLocation[] = [
  {
    id: "HOSP-01",
    name: "Apollo Speciality Hospitals OMR",
    zone: "Perungudi / OMR IT Corridor",
    lat: 12.96325,
    lon: 80.24572,
    traumaLevel: "Level-1 Emergency Trauma Center",
    emergencyContact: "1066 / +91-44-2496-1111",
    nearestIntersection: "IX-103",
  },
  {
    id: "HOSP-02",
    name: "Gleneagles Global Health City",
    zone: "Perumbakkam / Sholinganallur Hub",
    lat: 12.90550,
    lon: 80.20800,
    traumaLevel: "Multi-Organ Transplant & Trauma Center",
    emergencyContact: "105711 / +91-44-4477-7777",
    nearestIntersection: "IX-104",
  },
  {
    id: "HOSP-03",
    name: "Fortis Malar Hospital",
    zone: "Adyar / Gandhi Nagar Gateway",
    lat: 13.01012,
    lon: 80.25891,
    traumaLevel: "Cardiac & Acute Trauma Center",
    emergencyContact: "+91-44-4289-2222",
    nearestIntersection: "IX-101",
  },
  {
    id: "HOSP-04",
    name: "MIOT International Hospital",
    zone: "Manapakkam / Kathipara Hub",
    lat: 13.02068,
    lon: 80.18507,
    traumaLevel: "Advanced Orthopedic & Trauma Care",
    emergencyContact: "+91-44-4200-2288",
    nearestIntersection: "IX-105",
  },
  {
    id: "HOSP-05",
    name: "Chettinad Health City",
    zone: "Padur / OMR Expressway South",
    lat: 12.82500,
    lon: 80.22200,
    traumaLevel: "Super Speciality & Emergency Hub",
    emergencyContact: "+91-44-4741-1000",
    nearestIntersection: "IX-104",
  },
  {
    id: "HOSP-06",
    name: "VHS Multispeciality Hospital",
    zone: "Taramani / Rajiv Gandhi Salai",
    lat: 13.00212,
    lon: 80.24657,
    traumaLevel: "Tertiary Trauma & Stroke Center",
    emergencyContact: "+91-44-2254-1972",
    nearestIntersection: "IX-102",
  },
  {
    id: "HOSP-07",
    name: "Kauvery Hospital",
    zone: "Alwarpet / TTK Road",
    lat: 13.04651,
    lon: 80.26041,
    traumaLevel: "Critical Care & Emergency Ward",
    emergencyContact: "+91-44-4000-6000",
    nearestIntersection: "IX-101",
  },
  {
    id: "HOSP-08",
    name: "Rajiv Gandhi Govt General Hospital",
    zone: "Chennai Central / Park Town",
    lat: 13.08153,
    lon: 80.27751,
    traumaLevel: "State Level-1 Apex Trauma Institute",
    emergencyContact: "108 / +91-44-2530-5000",
    nearestIntersection: "IX-108",
  },
];

// Exact surveyed road curves (turn-by-turn road driving coordinates) from Node IX-104 (Sholinganallur)
// to Gleneagles Global Health City via Medavakkam Main Rd & Perumbakkam Main Rd
export const IX104_TO_GLENEAGLES_ROAD_PATH: [number, number][] = [
  [12.90092, 80.22797], [12.90092, 80.22789], [12.90092, 80.22781], [12.90093, 80.22769],
  [12.90093, 80.22697], [12.90096, 80.22629], [12.90097, 80.22591], [12.90100, 80.22500],
  [12.90101, 80.22483], [12.90104, 80.22436], [12.90105, 80.22384], [12.90103, 80.22360],
  [12.90107, 80.22301], [12.90109, 80.22279], [12.90117, 80.22219], [12.90117, 80.22217],
  [12.90127, 80.22120], [12.90127, 80.22105], [12.90124, 80.22079], [12.90123, 80.22068],
  [12.90124, 80.22061], [12.90125, 80.22052], [12.90130, 80.22029], [12.90136, 80.22010],
  [12.90145, 80.21983], [12.90147, 80.21972], [12.90154, 80.21920], [12.90163, 80.21840],
  [12.90165, 80.21820], [12.90174, 80.21771], [12.90195, 80.21673], [12.90205, 80.21646],
  [12.90271, 80.21478], [12.90308, 80.21384], [12.90316, 80.21364], [12.90326, 80.21336],
  [12.90340, 80.21303], [12.90344, 80.21291], [12.90346, 80.21287], [12.90393, 80.21164],
  [12.90408, 80.21127], [12.90471, 80.20966], [12.90487, 80.20922], [12.90502, 80.20885],
  [12.90520, 80.20841], [12.90538, 80.20798], [12.90542, 80.20790], [12.90553, 80.20791],
  [12.90549, 80.20800],
];

export interface ChennaiNode {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  queueLengthM: number;
  density: number;
  arrivalRate: string;
  activePhase: string;
  status: "nominal" | "building" | "preempted" | "offline";
  policy: "FIXED-TIME" | "ADAPTIVE" | "MAX-PREEMPT" | "OFFLINE";
  nemaSplit: string;
  speedKmH: number;
  classCounts: {
    cars: number;
    twoWheelers: number;
    autos: number;
    buses: number;
    ambulances: number;
  };
  activePreemption?: {
    vehicle: "AMBULANCE" | "POLICE" | "FIRE";
    etaSeconds: number;
    corridorName: string;
  };
}

interface ChennaiRealMapProps {
  selectedNodeId: string;
  onSelectNode: (node: ChennaiNode) => void;
  backendData?: any;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

function getMovingAmbulanceIconHtml(heading: number, speed: number): string {
  return `
    <div class="relative w-20 h-20 flex items-center justify-center select-none pointer-events-none">
      <!-- 360 Emergency Wave Rings & Corridor Halo -->
      <div class="absolute inset-2 rounded-full bg-red-500/20 animate-ping pointer-events-none"></div>
      <div class="absolute inset-4 rounded-full bg-emerald-400/25 animate-pulse pointer-events-none"></div>

      <!-- Rotated Vehicle Chassis (Aligns Smoothly with Road Bearing - NEVER Upside Down) -->
      <div class="ambulance-vehicle-rotator flex items-center justify-center" style="transform: rotate(${heading}deg); transform-origin: 17px 30px; transition: transform 0.1s linear;">
        <svg width="34" height="60" viewBox="0 0 34 60" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-[0_4px_16px_rgba(239,68,68,0.75)]">
          <!-- Forward Headlight Beams (Illuminating Road Lanes Ahead) -->
          <path d="M5 14 L-4 -8 L13 -8 Z" fill="url(#headlight-grad)" opacity="0.6" />
          <path d="M29 14 L21 -8 L38 -8 Z" fill="url(#headlight-grad)" opacity="0.6" />

          <defs>
            <linearGradient id="headlight-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#FEF08A" stop-opacity="0" />
            </linearGradient>
          </defs>

          <!-- Vehicle Shadow -->
          <rect x="3" y="9" width="28" height="46" rx="8" fill="#000000" opacity="0.45" />

          <!-- Wheels / Tires Protruding -->
          <rect x="2" y="16" width="3" height="7" rx="1.5" fill="#18181B" />
          <rect x="29" y="16" width="3" height="7" rx="1.5" fill="#18181B" />
          <rect x="2" y="42" width="3" height="7" rx="1.5" fill="#18181B" />
          <rect x="29" y="42" width="3" height="7" rx="1.5" fill="#18181B" />

          <!-- Main Chassis (White AIS-125 Ambulance Body) -->
          <rect x="4" y="8" width="26" height="46" rx="7" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.2" />

          <!-- Fluorescent Red Emergency Side Chevrons -->
          <rect x="4" y="24" width="2.5" height="22" fill="#DC2626" />
          <rect x="27.5" y="24" width="2.5" height="22" fill="#DC2626" />

          <!-- High-Vis Battenburg Yellow Accent Strips -->
          <rect x="4" y="32" width="2.5" height="6" fill="#FACC15" />
          <rect x="27.5" y="32" width="2.5" height="6" fill="#FACC15" />

          <!-- Front Hood & Tinted Windshield -->
          <path d="M7 16 C7 13 9 11 17 11 C25 11 27 13 27 16 L26 21 L8 21 Z" fill="#0F172A" />

          <!-- Red Star of Life / Medical Cross on Roof -->
          <rect x="15" y="29" width="4" height="13" rx="1" fill="#DC2626" />
          <rect x="10.5" y="33.5" width="13" height="4" rx="1" fill="#DC2626" />
          <circle cx="17" cy="35.5" r="1.5" fill="#FFFFFF" />

          <!-- High-Intensity Emergency Lightbar (Dual Flashing Strobes) -->
          <rect x="9" y="19" width="16" height="4.5" rx="2" fill="#09090B" stroke="#27272A" stroke-width="0.5" />
          <!-- Cyan/Blue LED Strobe (Left) -->
          <circle cx="12" cy="21.2" r="2.2" fill="#38BDF8">
            <animate attributeName="opacity" values="1;0.2;1" dur="0.4s" repeatCount="indefinite" />
          </circle>
          <!-- Red LED Strobe (Right) -->
          <circle cx="22" cy="21.2" r="2.2" fill="#EF4444">
            <animate attributeName="opacity" values="0.2;1;0.2" dur="0.4s" repeatCount="indefinite" />
          </circle>
          <!-- Center White Strobe -->
          <circle cx="17" cy="21.2" r="1.2" fill="#FFFFFF" />

          <!-- Front Headlights -->
          <circle cx="7.5" cy="10" r="1.6" fill="#FEF08A" />
          <circle cx="26.5" cy="10" r="1.6" fill="#FEF08A" />

          <!-- Rear Windows & Taillights -->
          <rect x="8" y="50" width="18" height="2" rx="1" fill="#1E293B" />
          <rect x="5.5" y="52" width="3.5" height="1.5" rx="0.5" fill="#DC2626" />
          <rect x="25" y="52" width="3.5" height="1.5" rx="0.5" fill="#DC2626" />
        </svg>
      </div>

      <!-- Upright Status Badge & Speed HUD (Stationary - NEVER Upside Down) -->
      <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-zinc-950/95 backdrop-blur-md border border-red-500/50 shadow-2xl text-[10px] font-mono text-white whitespace-nowrap flex items-center gap-1.5 pointer-events-none">
        <span class="text-xs">🚑</span>
        <span class="text-red-400 font-bold">108 EMS</span>
        <span class="text-zinc-500">·</span>
        <span class="ambulance-speed-label text-emerald-400 font-bold">${speed} KM/H · ALL GREEN</span>
      </div>
    </div>
  `;
}

function getArrivedAmbulanceIconHtml(): string {
  return `
    <div class="relative w-20 h-20 flex items-center justify-center select-none pointer-events-none">
      <div class="absolute inset-2 rounded-full bg-emerald-500/40 animate-ping"></div>
      <div class="relative">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-400 border-2 border-white shadow-[0_0_32px_rgba(16,185,129,0.95)] flex items-center justify-center text-2xl text-white font-bold">
          🏥
        </div>
      </div>
      <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-zinc-950/95 backdrop-blur-md border border-emerald-400 text-[10px] font-mono font-bold text-emerald-300 whitespace-nowrap shadow-2xl flex items-center gap-1.5 pointer-events-none">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span>TRAUMA ARRIVAL COMPLETE</span>
      </div>
    </div>
  `;
}

export default function ChennaiRealMap({
  selectedNodeId,
  onSelectNode,
  backendData,
}: ChennaiRealMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const trafficFlowLayerRef = useRef<TileLayer | null>(null);

  // Google Maps Style Ambulance Navigation State
  // Google Maps Style Ambulance Navigation State
  const [originQuery, setOriginQuery] = useState<string>("Madhya Kailash (OMR Gateway)");
  const [originCoord, setOriginCoord] = useState<{ lat: number; lon: number; name: string }>({
    lat: 13.00666,
    lon: 80.24603,
    name: "Madhya Kailash (OMR Gateway)",
  });
  const [destQuery, setDestQuery] = useState<string>("Apollo Speciality Hospitals OMR");
  const [destCoord, setDestCoord] = useState<{ lat: number; lon: number; name: string; type?: string }>({
    lat: 12.96325,
    lon: 80.24572,
    name: "Apollo Speciality Hospitals OMR",
    type: "hospital",
  });

  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<"origin" | "dest" | null>(null);

  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isDispatchPanelCollapsed, setIsDispatchPanelCollapsed] = useState<boolean>(false);

  // Moving Ambulance Drive Simulation State
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);
  const [isDrivePaused, setIsDrivePaused] = useState<boolean>(false);
  const [driveProgress, setDriveProgress] = useState<number>(0);
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState<number>(54);
  const [driveStatus, setDriveStatus] = useState<"idle" | "en_route" | "arrived">("idle");
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<number>(1);
  const movingMarkerRef = useRef<Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPanTimeRef = useRef<number>(0);
  const driveStateRef = useRef<{
    coords: [number, number][];
    totalDistanceM: number;
    distances: number[];
    isPaused: boolean;
    speedMultiplier: number;
    currentDistanceM: number;
    lastTimestamp: number | null;
    currentHeading: number;
  }>({
    coords: [],
    totalDistanceM: 0,
    distances: [],
    isPaused: false,
    speedMultiplier: 1,
    currentDistanceM: 0,
    lastTimestamp: null,
    currentHeading: 0,
  });

  const stopAmbulanceSimulation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (movingMarkerRef.current && routeLayerRef.current) {
      routeLayerRef.current.removeLayer(movingMarkerRef.current);
      movingMarkerRef.current = null;
    }
    setIsSimulatingDrive(false);
    setIsDrivePaused(false);
    setDriveProgress(0);
    setDriveStatus("idle");
  };

  const startAmbulanceSimulation = async (coords: [number, number][], summary?: any) => {
    if (!coords || coords.length < 2 || !routeLayerRef.current || !mapInstanceRef.current) return;
    const L = (window as any).L || (await import("leaflet"));

    // Cancel any previous simulation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (movingMarkerRef.current && routeLayerRef.current) {
      routeLayerRef.current.removeLayer(movingMarkerRef.current);
      movingMarkerRef.current = null;
    }

    // Precalculate cumulative road distances
    const distances: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < coords.length; i++) {
      const d = getDistanceMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
      totalDist += d;
      distances.push(totalDist);
    }

    const initialHeading = calculateBearing(coords[0][0], coords[0][1], coords[1][0], coords[1][1]);

    driveStateRef.current = {
      coords,
      totalDistanceM: totalDist,
      distances,
      isPaused: false,
      speedMultiplier: 1,
      currentDistanceM: 0,
      lastTimestamp: null,
      currentHeading: initialHeading,
    };

    setIsSimulatingDrive(true);
    setIsDrivePaused(false);
    setDriveProgress(0);
    setDriveStatus("en_route");
    setCurrentSpeedKmH(54);
    setSimSpeedMultiplier(1);

    const ambIcon = L.divIcon({
      html: getMovingAmbulanceIconHtml(initialHeading, 54),
      className: "moving-ambulance-marker",
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });

    const marker = L.marker([coords[0][0], coords[0][1]], {
      icon: ambIcon,
      zIndexOffset: 1000,
    }).addTo(routeLayerRef.current);

    movingMarkerRef.current = marker;

    // Desired simulation duration: ~20 seconds at 1x
    const tripDurationSeconds = 20;
    const baseSpeedMPerSec = totalDist / tripDurationSeconds;

    const animate = (timestamp: number) => {
      const state = driveStateRef.current;
      if (!state.lastTimestamp) state.lastTimestamp = timestamp;
      const dt = Math.min((timestamp - state.lastTimestamp) / 1000, 0.1);
      state.lastTimestamp = timestamp;

      if (!state.isPaused) {
        state.currentDistanceM += baseSpeedMPerSec * state.speedMultiplier * dt;

        if (state.currentDistanceM >= state.totalDistanceM) {
          state.currentDistanceM = state.totalDistanceM;
          setDriveProgress(100);
          setDriveStatus("arrived");
          setIsSimulatingDrive(false);

          const finalPt = state.coords[state.coords.length - 1];
          if (movingMarkerRef.current) {
            movingMarkerRef.current.setLatLng([finalPt[0], finalPt[1]]);
            const LRef = (window as any).L;
            if (LRef) {
              movingMarkerRef.current.setIcon(
                LRef.divIcon({
                  html: getArrivedAmbulanceIconHtml(),
                  className: "moving-ambulance-marker",
                  iconSize: [80, 80],
                  iconAnchor: [40, 40],
                })
              );
            }
          }
          return;
        }

        // Interpolate position along current distance
        const curDist = state.currentDistanceM;
        const progressPct = (curDist / state.totalDistanceM) * 100;
        setDriveProgress(progressPct);

        // Find leg
        let legIdx = 0;
        for (let i = 0; i < state.distances.length - 1; i++) {
          if (curDist >= state.distances[i] && curDist <= state.distances[i + 1]) {
            legIdx = i;
            break;
          }
        }

        const legStartDist = state.distances[legIdx];
        const legEndDist = state.distances[legIdx + 1];
        const legLen = legEndDist - legStartDist;
        const t = legLen > 0 ? (curDist - legStartDist) / legLen : 0;

        const p1 = state.coords[legIdx];
        const p2 = state.coords[legIdx + 1] || p1;

        const lat = p1[0] + (p2[0] - p1[0]) * t;
        const lon = p1[1] + (p2[1] - p1[1]) * t;

        // Smooth shortest angular path bearing tracking
        const distLeg = getDistanceMeters(p1[0], p1[1], p2[0], p2[1]);
        if (distLeg > 0.5) {
          const rawBearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
          let diff = (rawBearing - state.currentHeading) % 360;
          if (diff < -180) diff += 360;
          if (diff > 180) diff -= 360;
          state.currentHeading += diff;
        }

        // Simulated emergency cruising speed
        const simulatedSpeed = Math.round(52 + Math.sin(curDist / 60) * 8);
        setCurrentSpeedKmH(simulatedSpeed);

        if (movingMarkerRef.current) {
          movingMarkerRef.current.setLatLng([lat, lon]);
          const el = movingMarkerRef.current.getElement();
          if (el) {
            const rotator = el.querySelector(".ambulance-vehicle-rotator") as HTMLElement | null;
            if (rotator) rotator.style.transform = `rotate(${state.currentHeading}deg)`;
            const spd = el.querySelector(".ambulance-speed-label");
            if (spd) spd.textContent = `${simulatedSpeed} KM/H · ALL GREEN`;
          }
        }

        // Camera follow if out of central view
        if (mapInstanceRef.current) {
          const now = performance.now();
          if (now - lastPanTimeRef.current > 1200) {
            lastPanTimeRef.current = now;
            const bounds = mapInstanceRef.current.getBounds();
            if (bounds && !bounds.pad(-0.15).contains([lat, lon])) {
              mapInstanceRef.current.panTo([lat, lon], { animate: true, duration: 0.6 });
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const [mapType, setMapType] = useState<"tomtom" | "satellite">("tomtom");
  const [showLiveTraffic, setShowLiveTraffic] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [visionState, setVisionState] = useState<any>(null);
  const lastCorridorSigRef = useRef<string>("");

  useEffect(() => {
    setIsClient(true);
    const unsub = subscribeVisionFeed((v) => {
      setVisionState(v);
    });
    return () => {
      unsub();
      stopAmbulanceSimulation();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const isBackendOnline = Boolean(
    backendData &&
      backendData.metrics &&
      (backendData.metrics.totalObservations > 0 || backendData.metrics.totalDecisions > 0)
  );

  // Exact Surveyed Chennai Signal Intersection Coordinates
  const chennaiNodes: ChennaiNode[] = React.useMemo(() => {
    const baseNodes: ChennaiNode[] = [
      {
        id: "IX-101",
        name: "Madhya Kailash Junction",
        zone: "Adyar / Sardar Patel Rd & OMR Gateway",
        lat: 13.00666,
        lon: 80.24603,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "OMR Main Phase Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-102",
        name: "TIDEL Park Junction",
        zone: "Thiruvanmiyur / CSIR Rd & OMR",
        lat: 12.98640,
        lon: 80.25156,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "CSIR Cross Phase Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-103",
        name: "SRP Tools Junction",
        zone: "Perungudi / OMR IT Expressway Hub",
        lat: 12.98007,
        lon: 80.25290,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Southbound Corridor Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-104",
        name: "Sholinganallur Junction",
        zone: "OMR & Medavakkam-Kandanchavadi Arterial Link",
        lat: 12.90092,
        lon: 80.22797,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Medavakkam Cross Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-105",
        name: "Kathipara Cloverleaf Junction",
        zone: "Guindy / GST Road & Inner Ring Link (NH-45)",
        lat: 13.00652,
        lon: 80.20367,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "GST Mainline Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-108",
        name: "Chennai Central Junction",
        zone: "George Town / EVR Periyar Salai & Wall Tax Rd",
        lat: 13.08186,
        lon: 80.27625,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Terminal Approach Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-109",
        name: "Vijayanagar Junction",
        zone: "Velachery / 100ft Bypass Rd & Taramani Link",
        lat: 12.97500,
        lon: 80.22070,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Velachery Bypass Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
    ];

    if (backendData && backendData.laneStates) {
      const mapping: Record<string, string> = {
        lane_N: "IX-101",
        lane_S: "IX-102",
        lane_E: "IX-103",
        lane_W: "IX-104",
      };

      for (const [laneId, laneData] of Object.entries(backendData.laneStates)) {
        const nodeId = mapping[laneId];
        const targetNode = baseNodes.find((n) => n.id === nodeId);
        if (targetNode) {
          const typedLane = laneData as any;
          targetNode.queueLengthM = Number(typedLane.queue_length_m) || 0;
          targetNode.density = Number(typedLane.density_veh_per_m) || 0;
          targetNode.status =
            typedLane.state === "preempted"
              ? "preempted"
              : typedLane.state === "building"
              ? "building"
              : "nominal";
          targetNode.arrivalRate = ((typedLane.vehicle_count || 0) / 10).toFixed(2) + " V/S";

          const count = typedLane.vehicle_count || 0;
          targetNode.classCounts = {
            cars: Math.floor(count * 0.4),
            twoWheelers: Math.floor(count * 0.45),
            autos: Math.floor(count * 0.1),
            buses: Math.floor(count * 0.05),
            ambulances: typedLane.state === "preempted" ? 1 : 0,
          };

          targetNode.speedKmH = Math.max(0, Math.round(55 * (1 - targetNode.density)));
        }
      }

      if (backendData.recentDecisions && Array.isArray(backendData.recentDecisions)) {
        const decisionsByIx = backendData.recentDecisions.reduce((acc: any, dec: any) => {
          const id = dec.intersection_id || mapping[dec.active_lane_id] || "IX-101";
          acc[id] = dec;
          return acc;
        }, {});

        for (const [nodeId, dec] of Object.entries(decisionsByIx)) {
          const targetNode = baseNodes.find((n) => n.id === nodeId);
          if (targetNode) {
            const d = dec as any;
            targetNode.policy = d.reason === "preempted" ? "MAX-PREEMPT" : "ADAPTIVE";
            targetNode.activePhase = d.active_lane_id
              ? `Live Active: ${d.active_lane_id}`
              : "Phase Active";
            targetNode.nemaSplit = d.reason === "preempted" ? "G: HOLD (Preempt)" : "G: Dynamic";
          }
        }
      }
    }

    // ── BI-DIRECTIONAL MODE SYNC FOR NODE IX-104 (CCTV vs. SIMULATE) ──
    const ix104 = baseNodes.find((n) => n.id === "IX-104");
    if (ix104) {
      const mode: TelemetryMode = visionState?.telemetryMode || "simulate";
      if (mode === "simulate" && visionState?.simulationState) {
        const sim = visionState.simulationState;
        const maxQ = Math.max(
          sim.queueMeters?.N || 0,
          sim.queueMeters?.S || 0,
          sim.queueMeters?.E || 0,
          sim.queueMeters?.W || 0
        );
        const maxDensity = Math.max(
          sim.densities?.N || 0,
          sim.densities?.S || 0,
          sim.densities?.E || 0,
          sim.densities?.W || 0
        );
        ix104.queueLengthM = Number(maxQ.toFixed(1));
        ix104.density = Number(maxDensity.toFixed(3));
        ix104.arrivalRate = ((sim.totalVehicles || 0) / 4).toFixed(1) + " V/M";
        ix104.status = sim.hasEmergency ? "preempted" : "nominal";
        ix104.policy = sim.hasEmergency ? "MAX-PREEMPT" : "ADAPTIVE";
        ix104.activePhase = `Sim Approach-${sim.activePhase} (${sim.phaseState})`;
        ix104.nemaSplit = `${sim.phaseState}: ${sim.phaseCountdown}s`;
        ix104.speedKmH = Math.max(0, Math.round(55 * (1 - ix104.density)));
        ix104.classCounts = {
          cars: Math.round(sim.totalVehicles * 0.45),
          twoWheelers: Math.round(sim.totalVehicles * 0.35),
          autos: Math.round(sim.totalVehicles * 0.15),
          buses: Math.round(sim.totalVehicles * 0.05),
          ambulances: sim.hasEmergency ? 1 : 0,
        };
      } else if (visionState?.approaches) {
        const appN = visionState.approaches?.N;
        const appS = visionState.approaches?.S;
        const appE = visionState.approaches?.E;
        const appW = visionState.approaches?.W;
        const totalVeh = (appN?.vehicles || 0) + (appS?.vehicles || 0) + (appE?.vehicles || 0) + (appW?.vehicles || 0);
        const maxQ = Math.max(
          appN?.queue_m ?? appN?.queueMeters ?? 0,
          appS?.queue_m ?? appS?.queueMeters ?? 0,
          appE?.queue_m ?? appE?.queueMeters ?? 0,
          appW?.queue_m ?? appW?.queueMeters ?? 0
        );
        ix104.queueLengthM = Number(maxQ.toFixed(1));
        ix104.density = Number((totalVeh / 80).toFixed(3));
        ix104.arrivalRate = (totalVeh / 4).toFixed(1) + " V/M";
        ix104.status = visionState.hasEmergency ? "preempted" : "nominal";
        ix104.policy = visionState.hasEmergency ? "MAX-PREEMPT" : "ADAPTIVE";
        ix104.activePhase = `CCTV Approach-${visionState.activePhase || "N"} (${visionState.phaseState || "GREEN"})`;
        ix104.nemaSplit = `${visionState.phaseState || "GREEN"}: ${visionState.phaseCountdown || 20}s`;
        ix104.speedKmH = Math.max(0, Math.round(55 * (1 - ix104.density)));
        if (visionState.classCounts && Object.keys(visionState.classCounts).length > 0) {
          ix104.classCounts = {
            cars: visionState.classCounts["car"] || Math.round(totalVeh * 0.45),
            twoWheelers: (visionState.classCounts["motorcycle"] || 0) + (visionState.classCounts["two_wheeler"] || 0) || Math.round(totalVeh * 0.35),
            autos: (visionState.classCounts["autorickshaw"] || 0) + (visionState.classCounts["auto"] || 0) || Math.round(totalVeh * 0.15),
            buses: (visionState.classCounts["bus"] || 0) + (visionState.classCounts["truck"] || 0) || Math.round(totalVeh * 0.05),
            ambulances: visionState.hasEmergency ? 1 : 0,
          };
        } else {
          ix104.classCounts = {
            cars: Math.round(totalVeh * 0.45),
            twoWheelers: Math.round(totalVeh * 0.35),
            autos: Math.round(totalVeh * 0.15),
            buses: Math.round(totalVeh * 0.05),
            ambulances: visionState.hasEmergency ? 1 : 0,
          };
        }
      }
    }

    return baseNodes;
  }, [backendData, isBackendOnline, visionState]);

  const baseTileLayerRef = useRef<TileLayer | null>(null);

  // 1. Leaflet Map Instance & Layer Setup — Runs ONLY ONCE on mount
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;
    let isMounted = true;

    const initMap = async () => {
      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        const map = L.map(mapContainerRef.current, {
          center: [12.90092, 80.22797], // Center directly on Node IX-104 (Sholinganallur Junction)
          zoom: 13.5,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
        });

        // Initialize base tile layer (TomTom default)
        const baseLayer = L.tileLayer("/api/tile/tomtom?type=basic&z={z}&x={x}&y={y}", {
          maxZoom: 19,
          subdomains: "abcd",
        }).addTo(map);
        baseTileLayerRef.current = baseLayer;

        // Initialize real-time TomTom traffic flow layer
        const trafficLayer = L.tileLayer("/api/tile/tomtom?type=flow&z={z}&x={x}&y={y}", {
          maxZoom: 19,
          opacity: 0.9,
        }).addTo(map);
        trafficFlowLayerRef.current = trafficLayer;

        // Overlay layer groups
        markersLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 150);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient]);

  // 2. Basemap & Traffic Toggle Effect — Runs ONLY when user explicitly toggles map controls (Zero reload on telemetry)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseTileLayerRef.current) return;

    if (mapType === "satellite") {
      baseTileLayerRef.current.setUrl(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      );
    } else {
      baseTileLayerRef.current.setUrl("/api/tile/tomtom?type=basic&z={z}&x={x}&y={y}");
    }

    if (trafficFlowLayerRef.current) {
      if (showLiveTraffic) {
        if (!map.hasLayer(trafficFlowLayerRef.current)) {
          trafficFlowLayerRef.current.addTo(map);
        }
      } else {
        if (map.hasLayer(trafficFlowLayerRef.current)) {
          map.removeLayer(trafficFlowLayerRef.current);
        }
      }
    }
  }, [mapType, showLiveTraffic]);

  // 3. Signal Marker Overlay Update Effect — Updates marker badges without touching map tiles or triggering API requests
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const renderMarkers = async () => {
      const L = (window as any).L || (await import("leaflet"));

      chennaiNodes.forEach((node) => {
        const isSelected = node.id === selectedNodeId;
        const isRouteSignal = Boolean(routeResult?.intersectionsOnRoute?.some((ix: any) => ix.id === node.id));
        const isEmergencyActive = Boolean(visionState?.hasEmergency && (node.id === "IX-104" || node.id === "IX-103"));
        const isPreempted = node.status === "preempted" || isRouteSignal || isEmergencyActive;
        const isIX104 = node.id === "IX-104";
        const currentMode: TelemetryMode = visionState?.telemetryMode || "simulate";
        const isSimMode = isIX104 && currentMode === "simulate";
        const isCctvMode = isIX104 && currentMode === "cctv";
        const statusColor =
          isPreempted
            ? "#00c97a"
            : node.status === "building"
            ? "#ffab1a"
            : node.status === "offline"
            ? "#64748b"
            : isSimMode
            ? "#a855f7"
            : "#00c97a";

        const markerHtml = `
          <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
            ${
              isPreempted
                ? '<div class="absolute -inset-3 rounded-full bg-emerald-500/40 animate-ping"></div><div class="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-pulse"></div>'
                : isSimMode
                ? '<div class="absolute -inset-2 rounded-full bg-purple-500/25 animate-pulse"></div>'
                : isCctvMode
                ? '<div class="absolute -inset-2 rounded-full bg-blue-500/25 animate-pulse"></div>'
                : ""
            }
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--surface-low)]/95 backdrop-blur-md border ${
              isSelected
                ? "border-[#4d9fff] shadow-[0_0_14px_rgba(77,159,255,0.6)]"
                : isPreempted
                ? "border-emerald-500 shadow-[0_0_14px_rgba(0,201,122,0.6)] ring-1 ring-emerald-400/50"
                : isSimMode
                ? "border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)] ring-1 ring-purple-400/40"
                : isCctvMode
                ? "border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.45)] ring-1 ring-blue-400/40"
                : "border-[var(--border)]"
            } text-[var(--text-primary)] text-[10px] font-mono whitespace-nowrap shadow-md">
              <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${statusColor}; box-shadow: ${isPreempted ? '0 0 10px #00c97a' : isSimMode ? '0 0 8px #c084fc' : isCctvMode ? '0 0 8px #60a5fa' : 'none'};"></span>
              <span class="font-bold">${node.id}</span>
              ${
                isPreempted
                  ? '<span class="text-[#00c97a] font-bold text-[9px] bg-emerald-500/15 border border-emerald-500/30 px-1 rounded flex items-center gap-0.5"><span>⚡</span><span>ALL GREEN</span></span>'
                  : isSimMode
                  ? '<span class="text-purple-400 font-bold text-[9px] bg-purple-500/15 border border-purple-400/30 px-1 rounded flex items-center gap-0.5"><span>🎮</span><span>SIMULATED</span></span>'
                  : isCctvMode
                  ? '<span class="text-blue-400 font-bold text-[9px] bg-blue-500/15 border border-blue-400/30 px-1 rounded flex items-center gap-0.5"><span>📹</span><span>CCTV LIVE</span></span>'
                  : `<span class="text-[var(--text-secondary)] text-[9px] hidden group-hover:inline">${node.name.split(" ")[0]}</span>`
              }
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: "custom-leaflet-marker",
          iconSize: [60, 24],
          iconAnchor: [30, 12],
        });

        const marker = L.marker([node.lat, node.lon], { icon: customIcon });

        marker.on("click", () => {
          onSelectNode(node);
        });

        marker.bindTooltip(
          `
            <div style="padding: 5px; font-family: monospace; font-size: 11px;">
              <b style="color: #4d9fff;">${node.id} — ${node.name}</b><br/>
              <span style="color: var(--text-secondary);">${node.zone}</span><br/>
              <hr style="margin: 4px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);"/>
              ${isSimMode ? '<span style="color: #c084fc; font-weight: bold;">🎮 SIMULATION CAD TELEMETRY LINKED (NODE IX-104)</span><br/>' : ''}
              ${isCctvMode ? '<span style="color: #60a5fa; font-weight: bold;">📹 LIVE ONNX CCTV PERCEPTION LINKED (NODE IX-104)</span><br/>' : ''}
              <span>Queue: <b style="color: ${
                node.queueLengthM > 35 ? "#ffab1a" : "#00c97a"
              };">${isBackendOnline || isSimMode || isCctvMode ? `${node.queueLengthM.toFixed(1)}m` : "Offline"}</b></span><br/>
              <span>Signal Status: <b style="color: ${statusColor};">${isPreempted ? "⚡ 100% HOLD GREEN (SYNCED)" : node.status.toUpperCase()}</b></span><br/>
              <span>Corridor Mode: <b>${isPreempted ? "AMBULANCE GREEN WAVE PREEMPTION" : node.policy}</b></span>
            </div>
          `,
          {
            direction: "top",
            offset: [0, -12],
            className: "leaflet-node-popup",
          }
        );

        marker.addTo(markersGroup);
      });
    };

    renderMarkers();
  }, [chennaiNodes, selectedNodeId, isBackendOnline, onSelectNode, routeResult, visionState]);


  const selectedNode = chennaiNodes.find((n) => n.id === selectedNodeId) || chennaiNodes[3];

  const searchLocations = async (query: string, field: "origin" | "dest") => {
    if (!query.trim()) {
      if (field === "origin") setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/route/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (field === "origin") setOriginSuggestions(data.results || []);
        else setDestSuggestions(data.results || []);
      }
    } catch (e) {
      console.warn("Search error:", e);
    }
  };

  const dispatchAmbulanceRoute = async (
    targetDest?: {
      lat: number;
      lon: number;
      name: string;
      type?: string;
    },
    targetOrigin?: {
      lat: number;
      lon: number;
      name: string;
    }
  ) => {
    setIsRouting(true);
    setRouteError(null);
    const dest = targetDest || destCoord;
    const orig = targetOrigin || originCoord;

    try {
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { lat: orig.lat, lon: orig.lon, id: "ORIGIN", name: orig.name },
          end: { lat: dest.lat, lon: dest.lon, id: "DEST", name: dest.name },
          isEmergency: true,
          hospital:
            dest.type === "hospital" || dest.name.toLowerCase().includes("hospital")
              ? { name: dest.name, lat: dest.lat, lon: dest.lon }
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to calculate optimal route");
      }

      setRouteResult(data);

      if (routeLayerRef.current && mapInstanceRef.current) {
        const L = (window as any).L || (await import("leaflet"));
        routeLayerRef.current.clearLayers();

        // High-visibility glowing emerald emergency preemption corridor with all signals synchronized
        const polyline = L.polyline(data.coordinates, {
          color: "#00c97a",
          weight: 6,
          opacity: 0.95,
          dashArray: "10, 8",
          lineCap: "round",
          lineJoin: "round",
        });

        polyline.bindTooltip(
          `🚑 AMBULANCE 100% GREEN WAVE: ${dest.name} · ETA: ${data.summary.totalEtaMinutes} (-${data.summary.timeSavedMinutes} saved via All-Green Signals)`,
          { sticky: true, className: "leaflet-custom-tooltip" }
        );
        polyline.addTo(routeLayerRef.current);

        // Origin marker (108 EMS Dispatch Base Station)
        const originIcon = L.divIcon({
          html: '<div class="relative w-8 h-8 flex items-center justify-center cursor-pointer"><div class="absolute -inset-2 rounded-full bg-blue-500/35 animate-ping"></div><div class="w-8 h-8 rounded-xl bg-zinc-950 border-2 border-blue-400 flex items-center justify-center text-xs shadow-2xl text-blue-300 font-bold font-mono">🚨</div><div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-zinc-950/95 border border-blue-500/40 text-[8px] font-mono font-bold text-blue-300 whitespace-nowrap shadow-lg">ORIGIN</div></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Destination marker (Hospital 🏥 or Location 📍)
        const isHosp = dest.type === "hospital" || dest.name.toLowerCase().includes("hospital");
        const destIcon = L.divIcon({
          html: `<div class="relative w-9 h-9 flex items-center justify-center cursor-pointer"><div class="absolute -inset-2 rounded-full ${
            isHosp ? "bg-red-600/35" : "bg-primary/35"
          } animate-pulse"></div><div class="w-9 h-9 rounded-2xl ${
            isHosp ? "bg-red-600" : "bg-primary"
          } border-2 border-white flex items-center justify-center text-sm shadow-2xl text-white font-bold">${
            isHosp ? "🏥" : "📍"
          }</div><div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-zinc-950/95 border ${
            isHosp ? "border-red-500/50 text-red-300" : "border-primary/50 text-primary"
          } text-[8px] font-mono font-bold whitespace-nowrap shadow-lg">${
            isHosp ? "HOSPITAL" : "DEST"
          }</div></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        L.marker([orig.lat, orig.lon], { icon: originIcon })
          .bindTooltip(`<b>108 Emergency Dispatch Station</b><br/>${orig.name}`, { direction: "top" })
          .addTo(routeLayerRef.current);

        L.marker([dest.lat, dest.lon], { icon: destIcon })
          .bindTooltip(
            `<div style="padding: 4px; font-family: var(--font-body); font-size: 11px;"><b style="color: ${
              isHosp ? "#ff4060" : "var(--primary)"
            };">${dest.name}</b><br/><span style="color: #00c97a; font-weight: bold; font-size: 9px;">CORRIDOR CLEARED · 100% ALL GREEN SYNC</span></div>`,
            { direction: "top" }
          )
          .addTo(routeLayerRef.current);

        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [60, 60] });

        // Immediately launch the live moving ambulance simulation along the actual road!
        startAmbulanceSimulation(data.coordinates, data.summary);
      }
    } catch (err: any) {
      setRouteError(err.message || "Failed to dispatch ambulance route");
    } finally {
      setIsRouting(false);
    }
  };

  const clearRoute = () => {
    stopAmbulanceSimulation();
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    lastCorridorSigRef.current = "";
    setRouteResult(null);
    setRouteError(null);
    setDriveStatus("idle");
    setDriveProgress(0);
  };

  // Draw Directed-Graph Coordinated Corridor Route on the Map (IX-104 ➔ IX-103 ➔ IX-102 ➔ IX-101)
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current || routeResult) return;

    // Stability Gate: Verified emergency confirmation required to prevent false-alarm routing
    const pathNodes: string[] = visionState?.corridorRouting?.corridor_path || visionState?.corridorRouting?.path || backendData?.corridorPath || ["IX-104", "IX-103", "IX-102", "IX-101"];
    const isEmergency = Boolean(
      (visionState?.hasEmergency && visionState?.emergencyConfirmed) ||
      visionState?.corridorRouting?.is_preempted ||
      backendData?.laneStates?.lane_E?.state === "preempted"
    );

    // Prevent map redraw flicker and routing instability if the state signature hasn't changed
    const sig = `${pathNodes.join("-")}_${isEmergency}`;
    if (sig === lastCorridorSigRef.current) return;
    lastCorridorSigRef.current = sig;

    const routeGroup = routeLayerRef.current;
    routeGroup.clearLayers();

    const drawCorridor = async () => {
      const L = (window as any).L || (await import("leaflet"));

      const coords: [number, number][] = [];
      pathNodes.forEach((nodeId: string) => {
        const found = chennaiNodes.find((n) => n.id === nodeId);
        if (found) coords.push([found.lat, found.lon]);
      });

      if (isEmergency) {
        // Preemption corridor from IX-104 to Gleneagles Global Health City
        const hosp = CHENNAI_HOSPITALS.find((h) => h.id === "HOSP-02") || CHENNAI_HOSPITALS[1];
        const ix104 = chennaiNodes.find((n) => n.id === "IX-104") || { lat: 12.90092, lon: 80.22797 };
        const emergencyPath = IX104_TO_GLENEAGLES_ROAD_PATH;

        const emPoly = L.polyline(emergencyPath, {
          color: "#EF4444",
          weight: 6,
          opacity: 0.95,
          dashArray: "8, 6",
          lineCap: "round",
          lineJoin: "round",
        });

        emPoly.bindTooltip(
          `🚨 <b>EMS PREEMPTION WAVE ACTIVE (VERIFIED)</b><br/>Node IX-104 ➔ ${hosp.name}<br/>Green Wave Granted · Conflicting Approaches Held`,
          { sticky: true, className: "leaflet-custom-tooltip" }
        );
        emPoly.addTo(routeGroup);

        const ambIcon = L.divIcon({
          html: '<div class="relative w-8 h-8 flex items-center justify-center cursor-pointer"><div class="absolute -inset-2.5 rounded-full bg-red-500/40 animate-ping"></div><div class="w-8 h-8 rounded-full bg-state-preempted border-2 border-white flex items-center justify-center text-sm shadow-2xl">🚑</div></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([ix104.lat, ix104.lon], { icon: ambIcon })
          .bindTooltip(`<b>Node IX-104 Origin (Live Camera)</b><br/>108 Ambulance Preemption Inbound (AIS-125 Verified)`, { direction: "top" })
          .addTo(routeGroup);

        const hospIcon = L.divIcon({
          html: `<div class="relative w-8 h-8 flex items-center justify-center cursor-pointer"><div class="absolute -inset-2 rounded-full bg-red-600/30 animate-pulse"></div><div class="w-8 h-8 rounded-xl bg-red-600 border-2 border-white flex items-center justify-center text-sm shadow-2xl text-white font-bold">🏥</div></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([hosp.lat, hosp.lon], { icon: hospIcon })
          .bindTooltip(`<b>${hosp.name}</b><br/>Preempted Destination Trauma Center`, { direction: "top" })
          .addTo(routeGroup);
      } else if (coords.length >= 2) {
        // Coordinated Green-Wave Arterial Path
        const polyline = L.polyline(coords, {
          color: "#10B981",
          weight: 5,
          opacity: 0.85,
          dashArray: "8, 6",
          lineCap: "round",
          lineJoin: "round",
        });

        polyline.bindTooltip(
          `🛣️ <b>OMR ARTERIAL CORRIDOR</b><br/>Coordinated Path: ${pathNodes.join(" ➔ ")}<br/>Node IX-104 Live Camera Feed Mapped`,
          { sticky: true, className: "leaflet-custom-tooltip" }
        );
        polyline.addTo(routeGroup);
      }
    };

    drawCorridor();
  }, [chennaiNodes, backendData, visionState, routeResult]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-[var(--bg)] rounded-2xl overflow-hidden flex flex-col justify-between">
      {/* ── TOP CONTROLS: GOOGLE MAPS STYLE SEARCH & TOMTOM TRAFFIC TOGGLES ── */}
      <div className="absolute top-4 left-4 right-4 z-[400] pointer-events-auto flex items-start justify-between gap-3">
        {/* Google Maps Style Navigation Deck */}
        {isDispatchPanelCollapsed ? (
          <div className="bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-xl px-3.5 py-2 flex items-center gap-3 text-xs text-[var(--text-primary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-state-preempted animate-ping shrink-0" />
            <span className="font-bold text-xs uppercase tracking-wider font-mono">
              {isSimulatingDrive ? "🚑 108 EN ROUTE" : driveStatus === "arrived" ? "🏥 ARRIVED" : "EMS Dispatch"}
            </span>
            {isSimulatingDrive && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                <span>{driveProgress.toFixed(0)}%</span>
                <span>·</span>
                <span>{currentSpeedKmH} km/h</span>
              </div>
            )}
            {routeResult && !isSimulatingDrive && driveStatus !== "arrived" && (
              <span className="badge badge-crit text-[9px] uppercase font-bold">100% Green Corridor</span>
            )}
            <button
              onClick={() => setIsDispatchPanelCollapsed(false)}
              className="ml-1 px-2 py-1 rounded-lg bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[10px] font-bold text-primary border border-[var(--border)] transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Expand Ambulance Dispatch Console"
            >
              <span>➕ Expand Console</span>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-[420px] bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-xs text-[var(--text-primary)] transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-state-preempted animate-ping" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] font-mono">
                  Ambulance Emergency Dispatch
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {routeResult ? (
                  <span className="badge badge-crit text-[9px] uppercase font-bold">Corridor Cleared</span>
                ) : (
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">TomTom Routing</span>
                )}
                <button
                  onClick={() => setIsDispatchPanelCollapsed(true)}
                  className="px-2 py-0.5 rounded-md bg-[var(--surface-high)] hover:bg-[var(--surface-mid)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all cursor-pointer"
                  title="Collapse panel to pan and explore map freely"
                >
                  − Collapse
                </button>
              </div>
            </div>

          {/* Search Field 1: Origin with Live CCTV Signal Linking */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                Ambulance Origin Point:
              </span>
              <button
                type="button"
                onClick={() => {
                  setOriginQuery("Node IX-104 · Sholinganallur Junction (Live CCTV)");
                  setOriginCoord({
                    lat: 12.90092,
                    lon: 80.22797,
                    name: "Node IX-104 · Sholinganallur Junction (Live CCTV)",
                  });
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all cursor-pointer"
                title="Link the live CCTV camera intersection (Node IX-104) as ambulance pickup location"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>📹 Link Live Signal (IX-104)</span>
              </button>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--primary)] transition-all">
                <span className="text-sm">🚨</span>
                <input
                  type="text"
                  value={originQuery}
                  onFocus={() => setActiveSearchField("origin")}
                  onChange={(e) => {
                    setOriginQuery(e.target.value);
                    searchLocations(e.target.value, "origin");
                  }}
                  placeholder="Search pickup location or link Live Signal..."
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/60 font-medium"
                />
                {originQuery && (
                  <button
                    onClick={() => {
                      setOriginQuery("");
                      setOriginSuggestions([]);
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Origin Autocomplete Suggestions Dropdown */}
              {activeSearchField === "origin" && originSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-[var(--border)]">
                  {originSuggestions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setOriginQuery(item.name);
                        setOriginCoord({ lat: item.lat, lon: item.lon, name: item.name });
                        setActiveSearchField(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--surface-high)] flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="text-sm shrink-0 mt-0.5">
                        {item.type === "hospital" ? "🏥" : item.type === "intersection" ? "🚦" : "📍"}
                      </span>
                      <div className="overflow-hidden">
                        <b className="text-xs text-[var(--text-primary)] block truncate">{item.name}</b>
                        <span className="text-[10px] text-[var(--text-secondary)] truncate block">
                          {item.address}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Field 2: Destination Hospital or Place */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-state-preempted transition-all">
              <span className="text-sm">🏥</span>
              <input
                type="text"
                value={destQuery}
                onFocus={() => setActiveSearchField("dest")}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  searchLocations(e.target.value, "dest");
                }}
                placeholder="Search any hospital or destination in Chennai..."
                className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/60 font-medium"
              />
              {destQuery && (
                <button
                  onClick={() => {
                    setDestQuery("");
                    setDestSuggestions([]);
                  }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Destination Autocomplete Suggestions Dropdown */}
            {activeSearchField === "dest" && destSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-[var(--border)]">
                {destSuggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDestQuery(item.name);
                      setDestCoord({ lat: item.lat, lon: item.lon, name: item.name, type: item.type });
                      setActiveSearchField(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--surface-high)] flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="text-sm shrink-0 mt-0.5">
                      {item.type === "hospital" ? "🏥" : item.type === "intersection" ? "🚦" : "📍"}
                    </span>
                    <div className="overflow-hidden">
                      <b className="text-xs text-[var(--text-primary)] block truncate">{item.name}</b>
                      <span className="text-[10px] text-[var(--text-secondary)] truncate block">
                        {item.address}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hospital Chips from Live CCTV Signal (IX-104) */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center justify-between">
              <span>Quick Dispatch from Live CCTV Signal (IX-104):</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
              {CHENNAI_HOSPITALS.slice(0, 5).map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    const cctvOrigin = {
                      lat: 12.90092,
                      lon: 80.22797,
                      name: "Node IX-104 · Sholinganallur Junction (Live CCTV)",
                    };
                    setOriginQuery(cctvOrigin.name);
                    setOriginCoord(cctvOrigin);
                    setDestQuery(h.name);
                    setDestCoord({ lat: h.lat, lon: h.lon, name: h.name, type: "hospital" });
                    dispatchAmbulanceRoute(
                      { lat: h.lat, lon: h.lon, name: h.name, type: "hospital" },
                      cctvOrigin
                    );
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide shrink-0 transition-all border cursor-pointer ${
                    destCoord.name.includes(h.name.split(" ")[0])
                      ? "bg-state-preempted text-white border-state-preempted shadow-sm"
                      : "bg-[var(--surface-high)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  title={`Fast dispatch from Live Signal IX-104 to ${h.name}`}
                >
                  🏥 {h.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => dispatchAmbulanceRoute()}
              disabled={isRouting}
              className="flex-1 rounded-xl py-2.5 bg-state-preempted hover:bg-state-preempted/90 text-white font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow-crit cursor-pointer"
            >
              {isRouting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Clearing Signals & Routing...</span>
                </>
              ) : (
                <span>🚨 Dispatch Ambulance & Clear All Green</span>
              )}
            </button>
            {routeResult && (
              <button
                onClick={clearRoute}
                className="px-3 py-2.5 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Error Message */}
          {routeError && (
            <div className="p-2.5 rounded-xl bg-state-crit-dim border border-state-crit-border text-state-preempted text-xs">
              {routeError}
            </div>
          )}

          {/* Live Preemption Telemetry Card with All Green Signal Sync */}
          {routeResult && (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3 flex flex-col gap-2 mt-0.5 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-emerald-500/30 font-bold">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>CORRIDOR LOCKED · 100% ALL GREEN SYNC</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                  {routeResult.summary.totalEtaMinutes} ETA
                </span>
              </div>

              {/* Moving Ambulance Driving Simulation HUD */}
              <div className="flex flex-col gap-2 bg-black/40 p-2.5 rounded-xl border border-emerald-500/30">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <span className="text-sm">🚑</span>
                    <span>
                      {driveStatus === "arrived"
                        ? "Arrival Complete (Trauma Handover)"
                        : isSimulatingDrive
                        ? "Ambulance En Route (Simulating Drive)"
                        : "Ready to Simulate Route"}
                    </span>
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                    {driveProgress.toFixed(0)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden relative border border-emerald-500/30">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-150 shadow-[0_0_12px_#10b981]"
                    style={{ width: `${Math.min(100, Math.max(0, driveProgress))}%` }}
                  />
                </div>

                {/* Live Speed & Signal Cleared Info */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300 pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400">Speed:</span>
                    <b className="text-emerald-400">{driveStatus === "arrived" ? 0 : currentSpeedKmH} km/h</b>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-400">Green Wave:</span>
                    <b className="text-emerald-400">{routeResult.signalsSynchronizedCount || 4}/4 Held Green</b>
                  </span>
                </div>

                {/* Interactive Playback Controls */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-500/20">
                  {isSimulatingDrive ? (
                    <>
                      <button
                        onClick={() => {
                          const nextPaused = !isDrivePaused;
                          setIsDrivePaused(nextPaused);
                          driveStateRef.current.isPaused = nextPaused;
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[10px] font-bold border border-zinc-600 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>{isDrivePaused ? "▶️ Resume" : "⏸️ Pause"}</span>
                      </button>
                      <button
                        onClick={() => {
                          const nextMult = simSpeedMultiplier === 1 ? 2 : simSpeedMultiplier === 2 ? 3 : 1;
                          setSimSpeedMultiplier(nextMult);
                          driveStateRef.current.speedMultiplier = nextMult;
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono text-[10px] font-bold border border-zinc-600 transition-all cursor-pointer active:scale-95"
                        title="Toggle Simulation Speed"
                      >
                        {simSpeedMultiplier}x Speed
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (routeResult?.coordinates) {
                          startAmbulanceSimulation(routeResult.coordinates, routeResult.summary);
                        }
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold border border-emerald-400/40 shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>🔄 Replay Moving Ambulance</span>
                    </button>
                  )}
                  <button
                    onClick={clearRoute}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-emerald-200/90 font-mono">
                <span>All {routeResult.signalsSynchronizedCount || routeResult.intersectionsOnRoute?.length || 0} Signals in Path:</span>
                <span className="font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  HOLD GREEN ⚡
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--text-secondary)] pt-1 border-t border-emerald-500/20">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
                    Distance
                  </span>
                  <b className="text-xs text-[var(--text-primary)]">{routeResult.summary.distanceKm}</b>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
                    Time Saved
                  </span>
                  <b className="text-xs text-state-calm font-bold">-{routeResult.summary.timeSavedMinutes}</b>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
                    Routing Engine
                  </span>
                  <b className="text-xs text-emerald-400 truncate block">Kinetica + TomTom</b>
                </div>
              </div>

              {routeResult.intersectionsOnRoute?.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-emerald-500/20 flex flex-col gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  <div className="text-[10px] font-mono text-emerald-300 font-semibold flex items-center gap-1">
                    <span className="material-symbols-rounded text-xs">traffic</span>
                    <span>Synchronized Signal Sequence (All Green):</span>
                  </div>
                  {routeResult.intersectionsOnRoute.map((ix: any, idx: number) => (
                    <div
                      key={ix.id}
                      className="flex items-center justify-between bg-surface-high/70 px-2 py-1.5 rounded text-[11px] border border-emerald-500/20"
                    >
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[170px] flex items-center gap-1">
                        <span className="text-[9px] text-emerald-400 font-mono font-bold">#{idx + 1}</span>
                        <span>{ix.name}</span>
                        {ix.id === "IX-104" && (
                          <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded font-mono">CCTV</span>
                        )}
                      </span>
                      <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded font-mono shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#00c97a]" />
                        HOLD GREEN
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Map Layers, Mode Switcher & TomTom Traffic Toggles (Top Right) */}
        <div className="p-1.5 flex items-center gap-2 shadow-lg backdrop-blur-md rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 shrink-0">
          {/* Synchronized IX-104 Telemetry Mode Switcher */}
          <div className="flex items-center gap-1 bg-[var(--surface-high)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setGlobalTelemetryMode("cctv")}
              className={`px-2 py-1 rounded-md text-[11px] font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer ${
                (visionState?.telemetryMode || "simulate") === "cctv"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              title="Use Live CCTV Camera Perception Feeds for Node IX-104"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${(visionState?.telemetryMode || "simulate") === "cctv" ? "bg-white animate-pulse" : "bg-blue-400"}`} />
              <span>📹 CCTV</span>
            </button>
            <button
              onClick={() => setGlobalTelemetryMode("simulate")}
              className={`px-2 py-1 rounded-md text-[11px] font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer ${
                (visionState?.telemetryMode || "simulate") === "simulate"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              title="Use Interactive Traffic Simulator for Node IX-104"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${(visionState?.telemetryMode || "simulate") === "simulate" ? "bg-white animate-pulse" : "bg-purple-400"}`} />
              <span>🎮 Simulate</span>
            </button>
          </div>

          <div className="w-[1px] h-4 bg-[var(--border)]" />

          {/* Live Traffic Toggle */}
          <button
            onClick={() => setShowLiveTraffic(!showLiveTraffic)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              showLiveTraffic
                ? "bg-state-calm/15 text-state-calm border border-state-calm/30 shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${showLiveTraffic ? "bg-state-calm animate-pulse" : "bg-gray-400"}`}
            />
            <span>TomTom Traffic</span>
          </button>

          <div className="w-[1px] h-4 bg-[var(--border)]" />

          {/* Basemap Switcher */}
          <button
            onClick={() => setMapType("tomtom")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer ${
              mapType === "tomtom"
                ? "bg-[var(--surface-high)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            TomTom
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer ${
              mapType === "satellite"
                ? "bg-[var(--primary)] text-white shadow-sm font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* ── LEAFLET CONTAINER ── */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-10" style={{ minHeight: "480px" }} />

      {/* ── APPLE / GOOGLE MAPS STYLE FLOATING NAVIGATION DECK ── */}
      <div className="absolute bottom-28 right-5 sm:right-6 z-[420] pointer-events-auto flex flex-col items-end gap-2.5">
        {/* Recenter Node IX-104 Pill (Apple Maps location anchor) */}
        <button
          onClick={() => {
            mapInstanceRef.current?.flyTo([12.90092, 80.22797], 14.5, {
              duration: 1.0,
              easeLinearity: 0.25,
            });
          }}
          className="group relative flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-2xl bg-zinc-900/85 hover:bg-zinc-800/95 backdrop-blur-2xl border border-white/[0.14] shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/40 transition-all duration-200 active:scale-95 cursor-pointer"
          title="Recenter on Node IX-104 (Sholinganallur Junction)"
        >
          {/* Target Reticle Vector Icon */}
          <div className="relative flex items-center justify-center">
            <span className="absolute -inset-1 rounded-full bg-blue-500/30 animate-ping" />
            <svg
              className="w-4 h-4 text-blue-400 relative z-10 transition-transform duration-300 group-hover:rotate-45"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.4" />
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          <div className="flex flex-col text-left leading-none">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold text-white tracking-wider">IX-104</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (visionState?.telemetryMode || "simulate") === "simulate"
                    ? "bg-purple-400 shadow-[0_0_6px_#c084fc]"
                    : "bg-blue-400 shadow-[0_0_6px_#60a5fa]"
                }`}
              />
            </div>
            <span className="text-[9px] text-zinc-400 font-sans tracking-tight">Sholinganallur</span>
          </div>

          {/* Hover Tooltip */}
          <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-zinc-950/95 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            Recenter IX-104
          </div>
        </button>

        {/* Fit Route / Network Extents Squircle FAB */}
        <button
          onClick={() => {
            if (!mapInstanceRef.current) return;
            if (routeResult?.coordinates?.length) {
              mapInstanceRef.current.fitBounds(routeResult.coordinates as any, {
                padding: [60, 60],
                maxZoom: 15,
              });
            } else {
              const allCoords: [number, number][] = chennaiNodes.map((n) => [n.lat, n.lon]);
              mapInstanceRef.current.fitBounds(allCoords as any, {
                padding: [50, 50],
              });
            }
          }}
          className="group relative w-10 h-10 rounded-2xl bg-zinc-900/85 hover:bg-zinc-800/95 backdrop-blur-2xl border border-white/[0.14] shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/40 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
          title="Fit Route or All Chennai Intersections"
        >
          <svg
            className="w-4 h-4 text-zinc-300 group-hover:text-white transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>

          {/* Hover Tooltip */}
          <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-zinc-950/95 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            Fit Network Extents
          </div>
        </button>

        {/* Apple Maps Signature Vertical Zoom Capsule */}
        <div className="flex flex-col w-10 rounded-2xl bg-zinc-900/85 backdrop-blur-2xl border border-white/[0.14] shadow-[0_12px_36px_rgba(0,0,0,0.5)] ring-1 ring-black/40 overflow-hidden divide-y divide-white/10">
          {/* Zoom In */}
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="group relative w-10 h-10 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all duration-150 cursor-pointer active:scale-95"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <svg
              className="w-4 h-4 text-zinc-300 group-hover:text-white transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>

            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-zinc-950/95 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
              Zoom In
            </div>
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="group relative w-10 h-10 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all duration-150 cursor-pointer active:scale-95"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <svg
              className="w-4 h-4 text-zinc-300 group-hover:text-white transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>

            <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-zinc-950/95 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
              Zoom Out
            </div>
          </button>
        </div>
      </div>

      {/* ── BOTTOM HUD TELEMETRY STRIP ── */}
      <div className="relative z-[400] bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              Intersection:
            </span>
            <span className="font-bold text-[var(--text-primary)] bg-[var(--surface-high)] px-2.5 py-0.5 rounded border border-[var(--border)]">
              {selectedNode.id} — {selectedNode.name}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Zone:</span>
            <span className="text-[var(--text-primary)] font-medium">{selectedNode.zone}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              GPS:
            </span>
            <span className="text-[var(--primary)] font-semibold tabular-nums">
              {selectedNode.lat.toFixed(5)}° N, {selectedNode.lon.toFixed(5)}° E
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              Queue:
            </span>
            <span
              className={`font-bold tabular-nums ${
                !isBackendOnline
                  ? "text-[var(--text-secondary)]"
                  : selectedNode.queueLengthM > 35
                  ? "text-[var(--warn)]"
                  : "text-[var(--calm)]"
              }`}
            >
              {isBackendOnline ? `${selectedNode.queueLengthM.toFixed(1)}m` : "Offline"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              Policy:
            </span>
            <span
              className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded border ${
                !isBackendOnline
                  ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  : selectedNode.status === "preempted"
                  ? "bg-state-preempted/10 text-state-preempted border-state-crit-border"
                  : selectedNode.status === "building"
                  ? "bg-state-warn/10 text-state-warn border-state-warn-border"
                  : "bg-state-calm/10 text-state-calm border-state-calm-border"
              }`}
            >
              {isBackendOnline ? selectedNode.policy : "BACKEND OFFLINE"}
            </span>
          </div>
          {selectedNode.id === "IX-104" && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
              <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
                Source:
              </span>
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  (visionState?.telemetryMode || "simulate") === "simulate"
                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                    : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                }`}
              >
                <span>{(visionState?.telemetryMode || "simulate") === "simulate" ? "🎮 SIMULATED" : "📹 CCTV LIVE"}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
