"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { subscribeVisionFeed } from "../../lib/visionFeedStore";

export type DirectionKey = "N" | "E" | "S" | "W";
export type SignalColor = "red" | "yellow" | "green";

interface ApproachData {
  key: DirectionKey;
  name: string;
  roadName: string;
  vehicles: number;
  queueMeters: number;
  signal: SignalColor;
  isEmergency: boolean;
  arrivalRate: number; // veh / min
  maxCapacity: number; // max queue slots
}

interface SimVehicle {
  id: number;
  approach: DirectionKey;
  lane: number; // 0: inner fast lane, 1: outer cruising lane
  dist: number; // px from stop bar (dist < 0: queued/approaching, dist > 0: past stop bar)
  speed: number; // px/sec
  targetSpeed: number; // px/sec
  type: "car" | "auto" | "bus" | "truck" | "ambulance";
  isEmergency: boolean;
  length: number; // px
  width: number; // px
  color: string;
  isBraking: boolean;
}

const ORDERED_DIRECTIONS: DirectionKey[] = ["N", "E", "S", "W"];

// ── ROAD & SIMULATOR GEOMETRIC CONSTANTS (INDIAN LHT DUAL CARRIAGEWAY) ──────────────
const ROAD_HALF_WIDTH = 60; // Total 4-way crossroad width = 120px
const STOP_LINE_DIST = 64;  // Distance from junction center (cX, cY) to stop bar
const LANE_0_OFFSET = 16;   // Center of inner fast/through/right lane (px from road centerline)
const LANE_1_OFFSET = 44;   // Center of outer through lane (px from road centerline)
const LANE_DIVIDER_OFFSET = 30; // Dashed divider line (px from road centerline)
const STOP_BAR_WIDTH = 3.5; // Stop line stroke width
const QUEUE_GAP = 16;       // Clean, generous bumper-to-bumper queue buffer (px)

interface FreeLeftSpec {
  corner: "NE" | "SW" | "NW" | "SE";
  offset: number;
  type: "auto" | "car";
  color: string;
}

const FREE_LEFT_FLEET: FreeLeftSpec[] = [
  { corner: "NE", offset: 0.05, type: "auto", color: "#064E3B" },
  { corner: "NE", offset: 0.55, type: "car", color: "#F8FAFC" },
  { corner: "SW", offset: 0.30, type: "car", color: "#2563EB" },
  { corner: "SW", offset: 0.80, type: "auto", color: "#064E3B" },
  { corner: "NW", offset: 0.15, type: "auto", color: "#064E3B" },
  { corner: "NW", offset: 0.65, type: "car", color: "#334155" },
  { corner: "SE", offset: 0.40, type: "car", color: "#F8FAFC" },
  { corner: "SE", offset: 0.90, type: "auto", color: "#064E3B" },
];

const SEDAN_PALETTE = [
  "#334155", // Apple Titanium Slate
  "#1E293B", // Midnight Navy
  "#475569", // Graphite Gray
  "#F8FAFC", // Alpine Pearl White
  "#0D9488", // Cyber Emerald
  "#2563EB", // Sapphire Royal
  "#64748B", // Metallic Silver
];

let globalVehicleSeq = 1;

function createSimVehicle(
  approach: DirectionKey,
  lane: number,
  dist: number,
  isGreen: boolean,
  typeOverride?: "car" | "auto" | "bus" | "truck" | "ambulance",
  isEmergency: boolean = false
): SimVehicle {
  const id = isEmergency ? 9999 : globalVehicleSeq++;
  const type =
    typeOverride ||
    (isEmergency
      ? "ambulance"
      : id % 4 === 1
      ? "auto"
      : id % 6 === 3
      ? "bus"
      : id % 9 === 0
      ? "truck"
      : "car");

  let length = 24;
  let width = 11;
  let targetSpeed = 34; // Natural, realistic urban cruise pace
  let color = SEDAN_PALETTE[id % SEDAN_PALETTE.length];

  if (type === "auto") {
    length = 19;
    width = 10;
    targetSpeed = 32;
    color = "#064E3B"; // Auto green body
  } else if (type === "bus") {
    length = 40;
    width = 13;
    targetSpeed = 28;
    color = "#0284C7"; // Aqua Transit
  } else if (type === "truck") {
    length = 36;
    width = 13;
    targetSpeed = 26;
    color = "#D97706"; // Amber Freight
  } else if (type === "ambulance") {
    length = 28;
    width = 12;
    targetSpeed = 54;
    color = "#FFFFFF"; // High-vis Medical White
  }

  return {
    id,
    approach,
    lane,
    dist,
    speed: isGreen ? targetSpeed * 0.75 : 0,
    targetSpeed,
    type,
    isEmergency,
    length,
    width,
    color,
    isBraking: !isGreen,
  };
}

function createInitialFleet(approaches: Record<DirectionKey, ApproachData>): SimVehicle[] {
  const list: SimVehicle[] = [];

  ORDERED_DIRECTIONS.forEach((dir) => {
    const app = approaches[dir];
    const isGreen = app.signal === "green";
    const count = app.vehicles;

    const countL0 = Math.ceil(count / 2);
    const countL1 = Math.floor(count / 2);

    [0, 1].forEach((lane) => {
      const laneCount = lane === 0 ? countL0 : countL1;
      let currDist = -16; // Lead car stops 16px behind stop bar

      for (let i = 0; i < laneCount; i++) {
        const isEmergency = app.isEmergency && lane === 0 && i === 0;
        const veh = createSimVehicle(
          dir,
          lane,
          currDist,
          isGreen,
          isEmergency ? "ambulance" : undefined,
          isEmergency
        );
        list.push(veh);
        currDist -= (veh.length + QUEUE_GAP);
      }
    });
  });

  return list;
}

/**
 * Free Left Slip Lane Trajectory (Parametric curve bypassing the signalized junction)
 */
function getFreeLeftTrajectory(
  corner: "NE" | "SW" | "NW" | "SE",
  progress: number,
  cX: number,
  cY: number
): { x: number; y: number; theta: number } {
  const p = ((progress % 1) + 1) % 1;
  const R = 38;

  if (corner === "NE") {
    // North Inbound to East Outbound (Left turn)
    const xc = cX + 110;
    const yc = cY - 110;
    if (p < 0.28) {
      const u = p / 0.28;
      return { x: cX + 72, y: cY - 150 + u * 40, theta: Math.PI / 2 };
    } else if (p < 0.72) {
      const u = (p - 0.28) / 0.44;
      const alpha = Math.PI - u * (Math.PI / 2);
      return {
        x: xc + R * Math.cos(alpha),
        y: yc + R * Math.sin(alpha),
        theta: Math.PI / 2 - u * (Math.PI / 2),
      };
    } else {
      const u = (p - 0.72) / 0.28;
      return { x: cX + 110 + u * 40, y: cY - 72, theta: 0 };
    }
  } else if (corner === "SW") {
    // South Inbound to West Outbound (Left turn)
    const xc = cX - 110;
    const yc = cY + 110;
    if (p < 0.28) {
      const u = p / 0.28;
      return { x: cX - 72, y: cY + 150 - u * 40, theta: -Math.PI / 2 };
    } else if (p < 0.72) {
      const u = (p - 0.28) / 0.44;
      const alpha = 0 - u * (Math.PI / 2);
      return {
        x: xc + R * Math.cos(alpha),
        y: yc + R * Math.sin(alpha),
        theta: -Math.PI / 2 - u * (Math.PI / 2),
      };
    } else {
      const u = (p - 0.72) / 0.28;
      return { x: cX - 110 - u * 40, y: cY + 72, theta: Math.PI };
    }
  } else if (corner === "NW") {
    // West Inbound to North Outbound (Left turn)
    const xc = cX - 110;
    const yc = cY - 110;
    if (p < 0.28) {
      const u = p / 0.28;
      return { x: cX - 150 + u * 40, y: cY - 72, theta: 0 };
    } else if (p < 0.72) {
      const u = (p - 0.28) / 0.44;
      const alpha = Math.PI / 2 - u * (Math.PI / 2);
      return {
        x: xc + R * Math.cos(alpha),
        y: yc + R * Math.sin(alpha),
        theta: 0 - u * (Math.PI / 2),
      };
    } else {
      const u = (p - 0.72) / 0.28;
      return { x: cX - 72, y: cY - 110 - u * 40, theta: -Math.PI / 2 };
    }
  } else {
    // SE: East Inbound to South Outbound (Left turn)
    const xc = cX + 110;
    const yc = cY + 110;
    if (p < 0.28) {
      const u = p / 0.28;
      return { x: cX + 150 - u * 40, y: cY + 72, theta: Math.PI };
    } else if (p < 0.72) {
      const u = (p - 0.28) / 0.44;
      const alpha = (3 * Math.PI) / 2 - u * (Math.PI / 2);
      return {
        x: xc + R * Math.cos(alpha),
        y: yc + R * Math.sin(alpha),
        theta: Math.PI - u * (Math.PI / 2),
      };
    } else {
      const u = (p - 0.72) / 0.28;
      return { x: cX + 72, y: cY + 110 + u * 40, theta: Math.PI / 2 };
    }
  }
}

/**
 * Render Vector CAD Vehicle with Headlights, Glass, Mirrors, and Tail Optics
 */
function renderCADVehicle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theta: number,
  L: number,
  W: number,
  type: "car" | "auto" | "bus" | "truck" | "ambulance",
  color: string,
  isEmergency: boolean,
  isBraking: boolean,
  speed: number,
  time: number,
  isLight: boolean
) {
  const r = 3;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(theta);

  // 1. Ambient Drop Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-L / 2 + 1, -W / 2 + 1.5, L, W, r);
  } else {
    ctx.rect(-L / 2 + 1, -W / 2 + 1.5, L, W);
  }
  ctx.fill();

  // 2. Headlight Forward Light Beams on Asphalt (Subtle conical glow)
  const beamLength = isEmergency ? 36 : 24;
  const beamGrad = ctx.createLinearGradient(L / 2, 0, L / 2 + beamLength, 0);
  if (isEmergency && Math.sin(time * 0.02) > 0) {
    beamGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    beamGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  } else {
    beamGrad.addColorStop(0, isLight ? "rgba(254, 240, 138, 0.22)" : "rgba(254, 240, 138, 0.16)");
    beamGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
  }
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(L / 2, -W / 2 + 1);
  ctx.lineTo(L / 2 + beamLength, -W * 1.1);
  ctx.lineTo(L / 2 + beamLength, W * 1.1);
  ctx.lineTo(L / 2, W / 2 - 1);
  ctx.closePath();
  ctx.fill();

  // 3. Vehicle Body Chassis
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-L / 2, -W / 2, L, W, r);
  } else {
    ctx.rect(-L / 2, -W / 2, L, W);
  }
  ctx.fill();

  // Subtle metallic rim highlight
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // 4. Vehicle Specific Details
  if (type === "auto") {
    // Iconic Indian Auto-Rickshaw (Bajaj RE 3-Wheeler)
    // Dark Green lower chassis + High-vis Canary Yellow rooftop
    ctx.fillStyle = "#064E3B"; // Auto green body
    ctx.beginPath();
    ctx.moveTo(L / 2 - 1, 0); // Front taper
    ctx.lineTo(L * 0.1, -W / 2 + 1);
    ctx.lineTo(-L / 2 + 1, -W / 2 + 1);
    ctx.lineTo(-L / 2 + 1, W / 2 - 1);
    ctx.lineTo(L * 0.1, W / 2 - 1);
    ctx.closePath();
    ctx.fill();

    // Vibrant Yellow Canvas Roof
    ctx.fillStyle = "#EAB308";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-L * 0.35, -W / 2 + 1.2, L * 0.58, W - 2.4, 1.5);
    } else {
      ctx.rect(-L * 0.35, -W / 2 + 1.2, L * 0.58, W - 2.4);
    }
    ctx.fill();

    // Front windshield / cowl
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(L * 0.08, -W / 2 + 2, 2.5, W - 4);

    // Single front headlight
    ctx.fillStyle = "#FEF08A";
    ctx.fillRect(L / 2 - 1.2, -1.2, 1.5, 2.4);
  } else if (type === "bus") {
    // City Bus: Tinted Panoramic Windshield & Passenger Windows
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(L * 0.26, -W / 2 + 1.5, L * 0.18, W - 3, 1.5);
    } else {
      ctx.rect(L * 0.26, -W / 2 + 1.5, L * 0.18, W - 3);
    }
    ctx.fill();
    // Passenger window bars
    ctx.fillRect(-L * 0.35, -W / 2 + 1, L * 0.55, 1.5);
    ctx.fillRect(-L * 0.35, W / 2 - 2.5, L * 0.55, 1.5);
    // Roof AC pods
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(-L * 0.1, -W / 4, 8, W / 2);
    ctx.fillRect(-L * 0.3, -W / 4, 6, W / 2);
  } else if (type === "truck") {
    // Truck: Driver Cab + Separated Cargo Trailer
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(L * 0.2, -W / 2 + 2, 4, W - 4);
    // Coupler gap line
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L * 0.05, -W / 2);
    ctx.lineTo(L * 0.05, W / 2);
    ctx.stroke();
    // Trailer roof corrugated ribs
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.8;
    for (let rx = -L * 0.42; rx < L * 0.02; rx += 4.5) {
      ctx.beginPath();
      ctx.moveTo(rx, -W / 2 + 2);
      ctx.lineTo(rx, W / 2 - 2);
      ctx.stroke();
    }
  } else if (type === "ambulance") {
    // 108 Emergency Ambulance: High-Vis White Livery with Red Cross & Strobes
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(L * 0.14, -W / 2 + 2, 4.5, W - 4, 1);
    } else {
      ctx.rect(L * 0.14, -W / 2 + 2, 4.5, W - 4);
    }
    ctx.fill();
    // Red Medical Cross on roof
    ctx.fillStyle = "#EF4444";
    ctx.fillRect(-L * 0.15, -1, 7, 2);
    ctx.fillRect(-L * 0.15 + 2.5, -3.5, 2, 7);
    // Alternating Dual Sapphire / Ruby Roof Strobe
    const strobePhase = Math.sin(time * 0.025);
    const leftBlue = strobePhase > 0;
    // Left Strobe
    ctx.fillStyle = leftBlue ? "#3B82F6" : "#EF4444";
    ctx.shadowColor = leftBlue ? "#3B82F6" : "#EF4444";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(L * 0.05, -W / 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Right Strobe
    ctx.fillStyle = leftBlue ? "#EF4444" : "#3B82F6";
    ctx.shadowColor = leftBlue ? "#EF4444" : "#3B82F6";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(L * 0.05, W / 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    // Sedan / Coupe: Curved Front Windshield & Rear Window + Sunroof
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    // Front windshield
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(L * 0.12, -W / 2 + 1.8, L * 0.18, W - 3.6, 1.5);
    } else {
      ctx.rect(L * 0.12, -W / 2 + 1.8, L * 0.18, W - 3.6);
    }
    ctx.fill();
    // Rear window
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-L * 0.32, -W / 2 + 2, L * 0.14, W - 4, 1);
    } else {
      ctx.rect(-L * 0.32, -W / 2 + 2, L * 0.14, W - 4);
    }
    ctx.fill();
    // Sunroof / Roof Glass
    ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
    ctx.fillRect(-L * 0.12, -W / 2 + 3, L * 0.18, W - 6);
    // Side Mirrors
    ctx.fillStyle = color;
    ctx.fillRect(L * 0.18, -W / 2 - 1.2, 2, 1.2);
    ctx.fillRect(L * 0.18, W / 2, 2, 1.2);
  }

  // 5. LED Headlight Optics at Front Bumper
  if (type !== "auto") {
    ctx.fillStyle = "#FEF08A";
    ctx.fillRect(L / 2 - 0.8, -W / 2 + 1.5, 1.2, 2.2);
    ctx.fillRect(L / 2 - 0.8, W / 2 - 3.7, 1.2, 2.2);
  }

  // 6. LED Taillights / Brake Lights at Rear Bumper
  if (isBraking || speed < 1.5) {
    ctx.fillStyle = "#EF4444";
    ctx.shadowColor = "#EF4444";
    ctx.shadowBlur = 8;
    ctx.fillRect(-L / 2 - 0.5, -W / 2 + 1.2, 1.5, 2.6);
    ctx.fillRect(-L / 2 - 0.5, W / 2 - 3.8, 1.5, 2.6);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
    ctx.fillRect(-L / 2 - 0.3, -W / 2 + 1.2, 1, 2.2);
    ctx.fillRect(-L / 2 - 0.3, W / 2 - 3.4, 1, 2.2);
  }

  ctx.restore();
}

/**
 * Render Vector CAD Vehicle aligned to Indian Left-Hand Traffic (LHT) Carriageways
 */
function drawVectorVehicle(
  ctx: CanvasRenderingContext2D,
  v: SimVehicle,
  cw: number,
  ch: number,
  time: number,
  isLight: boolean
) {
  const cX = cw * 0.5;
  const cY = ch * 0.5;
  let x = cX;
  let y = cY;
  let theta = 0;
  const laneOffset = v.lane === 0 ? LANE_0_OFFSET : LANE_1_OFFSET;

  // Indian Left-Hand Traffic: Inbound traffic stays on the driver's LEFT
  if (v.approach === "N") {
    // Travel South (+Y) on East side of median
    x = cX + laneOffset;
    y = cY - STOP_LINE_DIST + v.dist;
    theta = Math.PI / 2;
  } else if (v.approach === "S") {
    // Travel North (-Y) on West side of median
    x = cX - laneOffset;
    y = cY + STOP_LINE_DIST - v.dist;
    theta = -Math.PI / 2;
  } else if (v.approach === "W") {
    // Travel East (+X) on North side of median (Indian LHT)
    x = cX - STOP_LINE_DIST + v.dist;
    y = cY - laneOffset;
    theta = 0;
  } else if (v.approach === "E") {
    // Travel West (-X) on South side of median (Indian LHT)
    x = cX + STOP_LINE_DIST - v.dist;
    y = cY + laneOffset;
    theta = Math.PI;
  }

  // Clip if far outside visible canvas
  if (x < -40 || x > cw + 40 || y < -40 || y > ch + 40) return;

  renderCADVehicle(
    ctx,
    x,
    y,
    theta,
    v.length,
    v.width,
    v.type,
    v.color,
    v.isEmergency,
    v.isBraking,
    v.speed,
    time,
    isLight
  );
}

export default function IntersectionDetailView() {
  // Mode: Kinetica Dynamic (Demand-Responsive) vs Fixed-Timer (Baseline)
  const [controllerMode, setControllerMode] = useState<"kinetica" | "fixed">("kinetica");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);

  // Top-Down Canvas Ref
  const topdownCanvasRef = useRef<HTMLCanvasElement | null>(null);


  // 4 Directional Approaches
  const [approaches, setApproaches] = useState<Record<DirectionKey, ApproachData>>({
    N: {
      key: "N",
      name: "North Approach",
      roadName: "OMR Inbound (from Madhya Kailash)",
      vehicles: 14,
      queueMeters: 56.0,
      signal: "green",
      isEmergency: false,
      arrivalRate: 24.6,
      maxCapacity: 22,
    },
    E: {
      key: "E",
      name: "East Approach",
      roadName: "ECR Expressway Link (Kottivakkam)",
      vehicles: 5,
      queueMeters: 20.0,
      signal: "red",
      isEmergency: false,
      arrivalRate: 8.4,
      maxCapacity: 18,
    },
    S: {
      key: "S",
      name: "South Approach",
      roadName: "OMR Outbound (to Siruseri IT Park)",
      vehicles: 3,
      queueMeters: 12.0,
      signal: "red",
      isEmergency: false,
      arrivalRate: 6.2,
      maxCapacity: 22,
    },
    W: {
      key: "W",
      name: "West Approach",
      roadName: "Medavakkam Rd Connector (Tambaram Link)",
      vehicles: 7,
      queueMeters: 28.0,
      signal: "red",
      isEmergency: false,
      arrivalRate: 11.8,
      maxCapacity: 18,
    },
  });

  const [activeGreenLane, setActiveGreenLane] = useState<DirectionKey>("N");
  const [currentPhaseState, setCurrentPhaseState] = useState<"green" | "yellow">("green");
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(24);
  const [totalAllocatedGreen, setTotalAllocatedGreen] = useState<number>(24);

  // Master Physical Vehicle List for CAD Simulation (Initialized cleanly)
  const vehiclesRef = useRef<SimVehicle[]>(createInitialFleet(approaches));

  // Trigger Emergency Ambulance with priority preemption
  const triggerEmergency = useCallback((dir: DirectionKey) => {
    setApproaches((prev) => {
      const next = { ...prev };
      ORDERED_DIRECTIONS.forEach((k) => {
        const isTarget = k === dir;
        next[k] = {
          ...next[k],
          isEmergency: isTarget,
          signal: isTarget ? "green" : "red",
        };
      });
      return next;
    });

    setActiveGreenLane(dir);
    setCurrentPhaseState("green");
    setPhaseSecondsLeft(24);
    setTotalAllocatedGreen(24);

    // Inject emergency ambulance vehicle entity directly into that lane
    const list = vehiclesRef.current.filter((v) => !v.isEmergency);
    const amb = createSimVehicle(dir, 0, -28, true, "ambulance", true);
    amb.speed = 50;
    list.unshift(amb);
    vehiclesRef.current = list;
  }, []);

  // Clear Emergency override
  const clearEmergency = useCallback(() => {
    setApproaches((prev) => {
      const next = { ...prev };
      ORDERED_DIRECTIONS.forEach((k) => {
        next[k] = { ...next[k], isEmergency: false };
      });
      return next;
    });
    vehiclesRef.current = vehiclesRef.current.filter((v) => !v.isEmergency);
  }, []);

  // Adjust Vehicles manually for judge interaction
  const adjustVehicles = useCallback((dir: DirectionKey, delta: number) => {
    setApproaches((prev) => {
      const cur = prev[dir];
      const count = Math.max(0, Math.min(cur.maxCapacity, cur.vehicles + delta));
      return {
        ...prev,
        [dir]: {
          ...cur,
          vehicles: count,
          queueMeters: count * 4.0,
        },
      };
    });
  }, []);

  // Reset to default scenario values
  const resetSimulation = useCallback(() => {
    const defaultApps: Record<DirectionKey, ApproachData> = {
      N: {
        key: "N",
        name: "North Approach",
        roadName: "OMR Inbound (from Madhya Kailash)",
        vehicles: 14,
        queueMeters: 56.0,
        signal: "green",
        isEmergency: false,
        arrivalRate: 24.6,
        maxCapacity: 22,
      },
      E: {
        key: "E",
        name: "East Approach",
        roadName: "ECR Expressway Link (Kottivakkam)",
        vehicles: 5,
        queueMeters: 20.0,
        signal: "red",
        isEmergency: false,
        arrivalRate: 8.4,
        maxCapacity: 18,
      },
      S: {
        key: "S",
        name: "South Approach",
        roadName: "OMR Outbound (to Siruseri IT Park)",
        vehicles: 3,
        queueMeters: 12.0,
        signal: "red",
        isEmergency: false,
        arrivalRate: 6.2,
        maxCapacity: 22,
      },
      W: {
        key: "W",
        name: "West Approach",
        roadName: "Medavakkam Rd Connector (Tambaram Link)",
        vehicles: 7,
        queueMeters: 28.0,
        signal: "red",
        isEmergency: false,
        arrivalRate: 11.8,
        maxCapacity: 18,
      },
    };
    setApproaches(defaultApps);
    setActiveGreenLane("N");
    setCurrentPhaseState("green");
    setPhaseSecondsLeft(24);
    setTotalAllocatedGreen(24);
    setIsPlaying(true);
    vehiclesRef.current = createInitialFleet(defaultApps);
  }, []);

  // Subscribe to Vision Feed Store for Emergency Preemption Events & Live Video Queue Sync
  useEffect(() => {
    const unsubscribe = subscribeVisionFeed((state) => {
      if (state.hasEmergency && state.emergencyDirection) {
        triggerEmergency(state.emergencyDirection);
      }
      if (
        state.isStreaming &&
        typeof state.liveDetectionsCount === "number" &&
        state.liveDetectionsCount > 0
      ) {
        setApproaches((prev) => {
          const targetDir: DirectionKey = state.emergencyDirection || "N";
          const count = Math.min(22, Math.max(1, state.liveDetectionsCount!));
          if (prev[targetDir].vehicles === count) return prev;
          return {
            ...prev,
            [targetDir]: {
              ...prev[targetDir],
              vehicles: count,
              queueMeters: count * 4.0,
            },
          };
        });
      }
    });
    return unsubscribe;
  }, [triggerEmergency]);

  // Synchronize Vehicle Entities smoothly based on Approach Vehicle Counts
  const syncVehiclesWithCounts = useCallback(() => {
    const current = vehiclesRef.current;
    const nextVehicles: SimVehicle[] = [];

    ORDERED_DIRECTIONS.forEach((dir) => {
      const app = approaches[dir];
      const targetCount = app.vehicles;
      const isGreen = app.signal === "green";

      let inDir = current.filter((v) => v.approach === dir && !v.isEmergency);

      if (app.isEmergency) {
        let amb = current.find((v) => v.approach === dir && v.isEmergency);
        if (!amb) {
          amb = createSimVehicle(dir, 0, -28, true, "ambulance", true);
          amb.speed = 45;
        }
        nextVehicles.push(amb);
      }

      if (inDir.length < targetCount) {
        // Need to add vehicles: spawn smoothly upstream
        const toAdd = targetCount - inDir.length;
        for (let a = 0; a < toAdd; a++) {
          const l0Count = inDir.filter((v) => v.lane === 0).length;
          const l1Count = inDir.filter((v) => v.lane === 1).length;
          const lane = l0Count <= l1Count ? 0 : 1;

          const laneVehs = inDir.filter((v) => v.lane === lane);
          const rearDist = laneVehs.reduce((min, v) => Math.min(min, v.dist), -16);
          const spawnDist = Math.min(-200, rearDist - (24 + QUEUE_GAP));

          const newVeh = createSimVehicle(dir, lane, spawnDist, isGreen);
          inDir.push(newVeh);
        }
      } else if (inDir.length > targetCount + 2) {
        // Only trim significant excess from the rearmost vehicles (lowest dist)
        inDir.sort((a, b) => b.dist - a.dist);
        inDir = inDir.slice(0, targetCount);
      }

      nextVehicles.push(...inDir);
    });

    vehiclesRef.current = nextVehicles;
  }, [approaches]);

  useEffect(() => {
    syncVehiclesWithCounts();
  }, [
    approaches.N.vehicles,
    approaches.E.vehicles,
    approaches.S.vehicles,
    approaches.W.vehicles,
    approaches.N.isEmergency,
    approaches.E.isEmergency,
    approaches.S.isEmergency,
    approaches.W.isEmergency,
    syncVehiclesWithCounts,
  ]);

  // Closed-loop 1-Second Signal Controller Ticker
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev > 1) {
          // Clear 1 vehicle every 3 seconds while green
          if (prev % 3 === 0) {
            setApproaches((appMap) => {
              const cur = appMap[activeGreenLane];
              if (cur && cur.vehicles > 0) {
                const count = Math.max(0, cur.vehicles - 1);
                return {
                  ...appMap,
                  [activeGreenLane]: {
                    ...cur,
                    vehicles: count,
                    queueMeters: count * 4.0,
                  },
                };
              }
              return appMap;
            });
          }
          return prev - 1;
        }

        // Green expired -> Transition to 3s Yellow
        if (currentPhaseState === "green") {
          setCurrentPhaseState("yellow");
          setApproaches((appMap) => ({
            ...appMap,
            [activeGreenLane]: {
              ...appMap[activeGreenLane],
              signal: "yellow",
            },
          }));
          return 3;
        }

        // Yellow expired -> Evaluate next lane according to accumulation
        setCurrentPhaseState("green");
        let nextLane: DirectionKey = "N";

        if (controllerMode === "fixed") {
          // Fixed round-robin (20s each)
          const order: DirectionKey[] = ["N", "E", "S", "W"];
          const nextIdx = (order.indexOf(activeGreenLane) + 1) % 4;
          nextLane = order[nextIdx];
          const fixedDuration = 20;

          setApproaches((appMap) => {
            const next = { ...appMap };
            order.forEach((k) => {
              next[k] = { ...next[k], signal: k === nextLane ? "green" : "red" };
            });
            return next;
          });

          setActiveGreenLane(nextLane);
          setTotalAllocatedGreen(fixedDuration);
          return fixedDuration;
        } else {
          // Kinetica Dynamic Actuation: Pick direction with highest accumulation
          setApproaches((appMap) => {
            const keys: DirectionKey[] = ["N", "E", "S", "W"];

            // Inflow generation for waiting lanes
            keys.forEach((k) => {
              if (k !== activeGreenLane && Math.random() > 0.42) {
                const count = Math.min(appMap[k].maxCapacity, appMap[k].vehicles + 1);
                appMap[k].vehicles = count;
                appMap[k].queueMeters = count * 4.0;
              }
            });

            // Priority override check
            const em = keys.find((k) => appMap[k].isEmergency);
            if (em) {
              nextLane = em;
            } else {
              let maxWeight = -1;
              keys.forEach((k) => {
                const weight = k === activeGreenLane ? appMap[k].vehicles * 0.35 : appMap[k].vehicles;
                if (weight > maxWeight) {
                  maxWeight = weight;
                  nextLane = k;
                }
              });
            }

            const next = { ...appMap };
            keys.forEach((k) => {
              next[k] = { ...next[k], signal: k === nextLane ? "green" : "red" };
            });
            return next;
          });

          setActiveGreenLane(nextLane);
          const dynamicTime = Math.min(
            32,
            Math.max(14, Math.round(10 + (approaches[nextLane]?.vehicles || 6) * 1.4))
          );
          setTotalAllocatedGreen(dynamicTime);
          return dynamicTime;
        }
      });
    }, 1000 / simSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed, activeGreenLane, currentPhaseState, controllerMode, approaches]);

  // ── UNIFIED PHYSICAL SIMULATION & CAD BLUEPRINT CANVAS LOOP ────────────────
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const blueprintLoop = (time: number) => {
      const dt = Math.min(0.04, ((time - lastTime) / 1000) * simSpeed);
      lastTime = time;

      // Update Vehicle Physics (Intelligent Driver Model & Safe Queues)
      if (isPlaying) {
        const vehicles = vehiclesRef.current;

        ORDERED_DIRECTIONS.forEach((dir) => {
          const isGreen = approaches[dir].signal === "green";

          [0, 1].forEach((laneIndex) => {
            const laneVehicles = vehicles
              .filter((v) => v.approach === dir && v.lane === laneIndex)
              .sort((a, b) => b.dist - a.dist);

            for (let i = 0; i < laneVehicles.length; i++) {
              const v = laneVehicles[i];
              const lead = i > 0 ? laneVehicles[i - 1] : null;

              if (isGreen) {
                // Signal is Green: proceed through junction with natural human acceleration
                if (lead) {
                  const gap = lead.dist - v.dist;
                  const minGap = lead.length / 2 + v.length / 2 + QUEUE_GAP;
                  const desiredGap = minGap + v.speed * 0.45;

                  if (lead.speed === 0 && lead.dist <= 0) {
                    // Lead vehicle hasn't started rolling yet: STAY COMPLETELY STOPPED
                    v.speed = 0;
                    v.isBraking = true;
                  } else if (gap < minGap) {
                    // Too close to lead: brake to maintain safe distance
                    v.isBraking = true;
                    v.speed = Math.max(0, v.speed - dt * 25);
                  } else if (gap < desiredGap) {
                    // Following lead vehicle speed smoothly
                    v.isBraking = v.speed > lead.speed;
                    v.speed += (lead.speed - v.speed) * Math.min(1, dt * 3);
                  } else {
                    // Open road ahead: smooth progressive acceleration
                    v.isBraking = false;
                    const accel = 15 * (1 - Math.pow(v.speed / v.targetSpeed, 2));
                    v.speed = Math.min(v.targetSpeed, v.speed + dt * Math.max(3, accel));
                  }
                } else {
                  // Lead vehicle: smooth progressive acceleration
                  v.isBraking = false;
                  const accel = 16 * (1 - Math.pow(v.speed / v.targetSpeed, 2));
                  v.speed = Math.min(v.targetSpeed, v.speed + dt * Math.max(3, accel));
                }

                v.dist += v.speed * dt;

                // Recycle vehicle when fully past junction exit (+280px)
                if (v.dist > 280) {
                  const rearDist = laneVehicles.reduce((min, u) => Math.min(min, u.dist), 0);
                  v.dist = Math.min(-240, rearDist - (v.length + QUEUE_GAP + 15));
                  v.speed = 0;
                  v.isBraking = true;
                }
              } else {
                // Signal is Red or Yellow
                if (v.dist > 0) {
                  // Already cleared stop bar into the junction: MUST CLEAR!
                  if (lead) {
                    const gap = lead.dist - v.dist;
                    const safeDist = lead.length / 2 + v.length / 2 + QUEUE_GAP;
                    if (gap < safeDist) {
                      v.isBraking = true;
                      v.speed = Math.max(0, Math.min(v.speed, lead.speed - 6));
                    } else {
                      v.isBraking = false;
                      v.speed = Math.min(v.targetSpeed, v.speed + dt * 12);
                    }
                  } else {
                    v.isBraking = false;
                    v.speed = Math.min(v.targetSpeed, v.speed + dt * 12);
                  }
                  v.dist += v.speed * dt;
                  if (v.dist > 280) {
                    const rearDist = laneVehicles.reduce((min, u) => Math.min(min, u.dist), 0);
                    v.dist = Math.min(-240, rearDist - (v.length + QUEUE_GAP + 15));
                    v.speed = 0;
                    v.isBraking = true;
                  }
                } else {
                  // Approaching or in queue behind stop line: MUST STOP ON RED!
                  const maxAllowedDist = -(v.length / 2 + 4);
                  let targetDist = maxAllowedDist;

                  // Never follow a lead vehicle past the stop line on red!
                  if (lead && lead.dist <= 0) {
                    targetDist = Math.min(
                      maxAllowedDist,
                      lead.dist - (lead.length / 2 + v.length / 2 + QUEUE_GAP)
                    );
                  }

                  const gapToTarget = targetDist - v.dist;
                  if (gapToTarget > 1.0) {
                    // Smooth physical kinematic braking: v = sqrt(2 * a * d)
                    const desiredSpeed = Math.min(
                      v.targetSpeed,
                      Math.sqrt(2 * 16 * gapToTarget)
                    );
                    v.isBraking = true;
                    v.speed += (desiredSpeed - v.speed) * Math.min(1, dt * 4);
                    v.dist += v.speed * dt;
                    if (v.dist >= targetDist) {
                      v.dist = targetDist;
                      v.speed = 0;
                      v.isBraking = true;
                    }
                  } else {
                    // At target slot: ABSOLUTELY AND COMPLETELY STATIONARY!
                    v.dist = targetDist;
                    v.speed = 0;
                    v.isBraking = true;
                  }
                }
              }
            }
          });
        });
      }

      // Render Top-Down CAD Blueprint
      const canvas = topdownCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const cw = canvas.width;
          const ch = canvas.height;
          const cX = cw * 0.5;
          const cY = ch * 0.5;
          const roadW = ROAD_HALF_WIDTH * 2;
          const stopDist = STOP_LINE_DIST;

          const isLight =
            typeof document !== "undefined" &&
            document.documentElement.getAttribute("data-theme") === "light";

          ctx.clearRect(0, 0, cw, ch);

          // 1. Engineering Background Grid & Atmosphere
          if (isLight) {
            ctx.fillStyle = "#F8FAFC";
            ctx.fillRect(0, 0, cw, ch);
          } else {
            const bgGrad = ctx.createRadialGradient(cX, cY, 30, cX, cY, cw * 0.7);
            bgGrad.addColorStop(0, "#161618");
            bgGrad.addColorStop(1, "#0A0A0C");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, cw, ch);
          }

          ctx.strokeStyle = isLight ? "rgba(203, 213, 225, 0.45)" : "rgba(255, 255, 255, 0.035)";
          ctx.lineWidth = 0.5;
          for (let x = 24; x < cw; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ch);
            ctx.stroke();
          }
          for (let y = 24; y < ch; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cw, y);
            ctx.stroke();
          }

          // 2. Corner Landscaped Sidewalks with Fillet Curbs
          const curbR = 16;
          const curbBorder = isLight ? "#CBD5E1" : "#2E2E32";
          const cornerFill = isLight ? "#F1F5F9" : "#121214";

          const drawCorner = (
            x1: number,
            y1: number,
            x2: number,
            y2: number,
            cxCorner: number,
            cyCorner: number,
            startAngle: number,
            endAngle: number
          ) => {
            ctx.fillStyle = cornerFill;
            ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));

            ctx.strokeStyle = curbBorder;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cxCorner, cyCorner, curbR, startAngle, endAngle);
            ctx.stroke();
          };

          // NW Corner
          drawCorner(0, 0, cX - ROAD_HALF_WIDTH, cY - ROAD_HALF_WIDTH, cX - ROAD_HALF_WIDTH - curbR, cY - ROAD_HALF_WIDTH - curbR, 0, Math.PI / 2);
          // NE Corner
          drawCorner(cX + ROAD_HALF_WIDTH, 0, cw, cY - ROAD_HALF_WIDTH, cX + ROAD_HALF_WIDTH + curbR, cY - ROAD_HALF_WIDTH - curbR, Math.PI / 2, Math.PI);
          // SW Corner
          drawCorner(0, cY + ROAD_HALF_WIDTH, cX - ROAD_HALF_WIDTH, ch, cX - ROAD_HALF_WIDTH - curbR, cY + ROAD_HALF_WIDTH + curbR, -Math.PI / 2, 0);
          // SE Corner
          drawCorner(cX + ROAD_HALF_WIDTH, cY + ROAD_HALF_WIDTH, cw, ch, cX + ROAD_HALF_WIDTH + curbR, cY + ROAD_HALF_WIDTH + curbR, Math.PI, -Math.PI / 2);

          // 3. Dark Asphalt Road Pavement (Straight Crossroads + 4 Free Left Slip Lanes)
          const asphaltFill = isLight ? "#334155" : "#18181B";
          ctx.fillStyle = asphaltFill;
          ctx.fillRect(cX - ROAD_HALF_WIDTH, 0, roadW, ch);
          ctx.fillRect(0, cY - ROAD_HALF_WIDTH, cw, roadW);

          // 3A. Free Left Slip Lane Curved Asphalt Channels (22px Carriageway Width)
          ctx.save();
          ctx.lineWidth = 22;
          ctx.strokeStyle = asphaltFill;
          ctx.lineCap = "butt";

          // NE Slip Lane (North Inbound -> East Outbound)
          ctx.beginPath();
          ctx.moveTo(cX + 72, 0);
          ctx.lineTo(cX + 72, cY - 110);
          ctx.arc(cX + 110, cY - 110, 38, Math.PI, Math.PI / 2, true);
          ctx.lineTo(cw, cY - 72);
          ctx.stroke();

          // SW Slip Lane (South Inbound -> West Outbound)
          ctx.beginPath();
          ctx.moveTo(cX - 72, ch);
          ctx.lineTo(cX - 72, cY + 110);
          ctx.arc(cX - 110, cY + 110, 38, 0, -Math.PI / 2, true);
          ctx.lineTo(0, cY + 72);
          ctx.stroke();

          // NW Slip Lane (West Inbound -> North Outbound)
          ctx.beginPath();
          ctx.moveTo(0, cY - 72);
          ctx.lineTo(cX - 110, cY - 72);
          ctx.arc(cX - 110, cY - 110, 38, Math.PI / 2, 0, true);
          ctx.lineTo(cX - 72, 0);
          ctx.stroke();

          // SE Slip Lane (East Inbound -> South Outbound)
          ctx.beginPath();
          ctx.moveTo(cw, cY + 72);
          ctx.lineTo(cX + 110, cY + 72);
          ctx.arc(cX + 110, cY + 110, 38, -Math.PI / 2, -Math.PI, true);
          ctx.lineTo(cX + 72, ch);
          ctx.stroke();
          ctx.restore();

          // 3B. Triangular Channelizing Islands (IRC:SP:41 Traffic Islands)
          const islandFill = isLight ? "#E2E8F0" : "#222226";
          const islandCurb = isLight ? "#94A3B8" : "#323238";
          ctx.fillStyle = islandFill;
          ctx.strokeStyle = islandCurb;
          ctx.lineWidth = 1.5;

          // NE Triangular Island
          ctx.beginPath();
          ctx.moveTo(cX + 60, cY - 60);
          ctx.lineTo(cX + 60, cY - 110);
          ctx.arc(cX + 110, cY - 110, 27, Math.PI, Math.PI / 2, true);
          ctx.lineTo(cX + 110, cY - 60);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // SW Triangular Island
          ctx.beginPath();
          ctx.moveTo(cX - 60, cY + 60);
          ctx.lineTo(cX - 60, cY + 110);
          ctx.arc(cX - 110, cY + 110, 27, 0, -Math.PI / 2, true);
          ctx.lineTo(cX - 110, cY + 60);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // NW Triangular Island
          ctx.beginPath();
          ctx.moveTo(cX - 60, cY - 60);
          ctx.lineTo(cX - 110, cY - 60);
          ctx.arc(cX - 110, cY - 110, 27, Math.PI / 2, 0, true);
          ctx.lineTo(cX - 60, cY - 110);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // SE Triangular Island
          ctx.beginPath();
          ctx.moveTo(cX + 60, cY + 60);
          ctx.lineTo(cX + 110, cY + 60);
          ctx.arc(cX + 110, cY + 110, 27, -Math.PI / 2, -Math.PI, true);
          ctx.lineTo(cX + 60, cY + 110);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Slip Lane Outer Curbs
          ctx.strokeStyle = curbBorder;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cX + 83, 0); ctx.lineTo(cX + 83, cY - 110);
          ctx.arc(cX + 110, cY - 110, 49, Math.PI, Math.PI / 2, true);
          ctx.lineTo(cw, cY - 83);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cX - 83, ch); ctx.lineTo(cX - 83, cY + 110);
          ctx.arc(cX - 110, cY + 110, 49, 0, -Math.PI / 2, true);
          ctx.lineTo(0, cY + 83);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, cY - 83); ctx.lineTo(cX - 110, cY - 83);
          ctx.arc(cX - 110, cY - 110, 49, Math.PI / 2, 0, true);
          ctx.lineTo(cX - 83, 0);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cw, cY + 83); ctx.lineTo(cX + 110, cY + 83);
          ctx.arc(cX + 110, cY + 110, 49, -Math.PI / 2, -Math.PI, true);
          ctx.lineTo(cX + 83, ch);
          ctx.stroke();

          // Yellow/Black Hazard Bullnoses at Island Bifurcation Points
          ctx.fillStyle = "#F59E0B";
          ctx.fillRect(cX + 58, cY - 113, 6, 4);
          ctx.fillRect(cX - 64, cY + 109, 6, 4);
          ctx.fillRect(cX - 113, cY - 64, 4, 6);
          ctx.fillRect(cX + 109, cY + 58, 4, 6);

          // 3C. Stenciled Asphalt Road Markings for Free Left Slip Lanes
          ctx.font = "bold 7px -apple-system, BlinkMacSystemFont, monospace";
          ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.38)";
          ctx.save();
          ctx.translate(cX + 72, cY - 135);
          ctx.rotate(Math.PI / 2);
          ctx.fillText("FREE LEFT ➔", -24, 2.5);
          ctx.restore();

          ctx.save();
          ctx.translate(cX - 72, cY + 135);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText("FREE LEFT ➔", -24, 2.5);
          ctx.restore();

          ctx.save();
          ctx.translate(cX - 135, cY - 72);
          ctx.fillText("FREE LEFT ➔", -24, 2.5);
          ctx.restore();

          ctx.save();
          ctx.translate(cX + 135, cY + 72);
          ctx.rotate(Math.PI);
          ctx.fillText("FREE LEFT ➔", -24, 2.5);
          ctx.restore();
          // 4. Zebra Crossings (Pedestrian Crosswalks across Main Approaches and Slip Lanes)
          ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.25)";
          const drawCrosswalk = (startX: number, startY: number, w: number, h: number, isHoriz: boolean) => {
            const bars = 8;
            for (let b = 0; b < bars; b++) {
              if (isHoriz) {
                ctx.fillRect(startX + (w / bars) * b + 1.5, startY, w / bars - 3, h);
              } else {
                ctx.fillRect(startX, startY + (h / bars) * b + 1.5, w, h / bars - 3);
              }
            }
          };
          drawCrosswalk(cX - ROAD_HALF_WIDTH, cY - stopDist - 12, roadW, 8, true);
          drawCrosswalk(cX - ROAD_HALF_WIDTH, cY + stopDist + 4, roadW, 8, true);
          drawCrosswalk(cX - stopDist - 12, cY - ROAD_HALF_WIDTH, 8, roadW, false);
          drawCrosswalk(cX + stopDist + 4, cY - ROAD_HALF_WIDTH, 8, roadW, false);

          // Slip Lane Crosswalks (Connecting Islands to Sidewalks)
          ctx.fillRect(cX + 62, cY - 116, 20, 3.5);
          ctx.fillRect(cX - 82, cY + 113, 20, 3.5);
          ctx.fillRect(cX - 116, cY - 82, 3.5, 20);
          ctx.fillRect(cX + 113, cY + 62, 3.5, 20);

          // 5. Central Concrete Median Dividers
          ctx.strokeStyle = isLight ? "#94A3B8" : "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1.8;

          // North Median
          ctx.beginPath();
          ctx.moveTo(cX - 1.5, 0); ctx.lineTo(cX - 1.5, cY - stopDist);
          ctx.moveTo(cX + 1.5, 0); ctx.lineTo(cX + 1.5, cY - stopDist);
          ctx.stroke();

          // South Median
          ctx.beginPath();
          ctx.moveTo(cX - 1.5, cY + stopDist); ctx.lineTo(cX - 1.5, ch);
          ctx.moveTo(cX + 1.5, cY + stopDist); ctx.lineTo(cX + 1.5, ch);
          ctx.stroke();

          // West Median
          ctx.beginPath();
          ctx.moveTo(0, cY - 1.5); ctx.lineTo(cX - stopDist, cY - 1.5);
          ctx.moveTo(0, cY + 1.5); ctx.lineTo(cX - stopDist, cY + 1.5);
          ctx.stroke();

          // East Median
          ctx.beginPath();
          ctx.moveTo(cX + stopDist, cY - 1.5); ctx.lineTo(cw, cY - 1.5);
          ctx.moveTo(cX + stopDist, cY + 1.5); ctx.lineTo(cw, cY + 1.5);
          ctx.stroke();

          // Yellow Hazard Median Bullnoses
          ctx.fillStyle = "#F59E0B";
          ctx.fillRect(cX - 3, cY - stopDist - 4, 6, 4);
          ctx.fillRect(cX - 3, cY + stopDist, 6, 4);
          ctx.fillRect(cX - stopDist - 4, cY - 3, 4, 6);
          ctx.fillRect(cX + stopDist, cY - 3, 4, 6);

          // 6. Dashed Lane Dividers
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1.1;
          ctx.strokeStyle = isLight ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.35)";

          // North Inbound (+X) & Outbound (-X)
          ctx.beginPath();
          ctx.moveTo(cX + LANE_DIVIDER_OFFSET, 0);
          ctx.lineTo(cX + LANE_DIVIDER_OFFSET, cY - stopDist);
          ctx.moveTo(cX - LANE_DIVIDER_OFFSET, 0);
          ctx.lineTo(cX - LANE_DIVIDER_OFFSET, cY - stopDist);
          ctx.stroke();

          // South Inbound (-X) & Outbound (+X)
          ctx.beginPath();
          ctx.moveTo(cX - LANE_DIVIDER_OFFSET, cY + stopDist);
          ctx.lineTo(cX - LANE_DIVIDER_OFFSET, ch);
          ctx.moveTo(cX + LANE_DIVIDER_OFFSET, cY + stopDist);
          ctx.lineTo(cX + LANE_DIVIDER_OFFSET, ch);
          ctx.stroke();

          // West Inbound (-Y) & Outbound (+Y)
          ctx.beginPath();
          ctx.moveTo(0, cY - LANE_DIVIDER_OFFSET);
          ctx.lineTo(cX - stopDist, cY - LANE_DIVIDER_OFFSET);
          ctx.moveTo(0, cY + LANE_DIVIDER_OFFSET);
          ctx.lineTo(cX - stopDist, cY + LANE_DIVIDER_OFFSET);
          ctx.stroke();

          // East Inbound (+Y) & Outbound (-Y)
          ctx.beginPath();
          ctx.moveTo(cX + stopDist, cY + LANE_DIVIDER_OFFSET);
          ctx.lineTo(cw, cY + LANE_DIVIDER_OFFSET);
          ctx.moveTo(cX + stopDist, cY - LANE_DIVIDER_OFFSET);
          ctx.lineTo(cw, cY - LANE_DIVIDER_OFFSET);
          ctx.stroke();

          ctx.setLineDash([]);

          // 7. Stenciled Asphalt Road Arrows (Strictly Aligned with Indian LHT Inbound Lanes)
          ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 255, 255, 0.35)";
          const drawStraightArrow = (ax: number, ay: number, rot: number) => {
            ctx.save();
            ctx.translate(ax, ay);
            ctx.rotate(rot);
            ctx.beginPath();
            ctx.moveTo(0, 7);
            ctx.lineTo(0, -5);
            ctx.lineTo(-3, -2);
            ctx.lineTo(0, -8);
            ctx.lineTo(3, -2);
            ctx.lineTo(0, -5);
            ctx.lineTo(0, 7);
            ctx.fill();
            ctx.restore();
          };

          // North Inbound: East Side (+X)
          drawStraightArrow(cX + LANE_0_OFFSET, cY - stopDist - 40, Math.PI / 2);
          drawStraightArrow(cX + LANE_1_OFFSET, cY - stopDist - 40, Math.PI / 2);
          // South Inbound: West Side (-X)
          drawStraightArrow(cX - LANE_0_OFFSET, cY + stopDist + 40, -Math.PI / 2);
          drawStraightArrow(cX - LANE_1_OFFSET, cY + stopDist + 40, -Math.PI / 2);
          // West Inbound: North Side (-Y)
          drawStraightArrow(cX - stopDist - 40, cY - LANE_0_OFFSET, 0);
          drawStraightArrow(cX - stopDist - 40, cY - LANE_1_OFFSET, 0);
          // East Inbound: South Side (+Y)
          drawStraightArrow(cX + stopDist + 40, cY + LANE_0_OFFSET, Math.PI);
          drawStraightArrow(cX + stopDist + 40, cY + LANE_1_OFFSET, Math.PI);

          // 8. Stop Bars Strictly Across Inbound Carriageways with Real-Time Signal Glow
          const drawStopBar = (x1: number, y1: number, x2: number, y2: number, signal: SignalColor) => {
            const col =
              signal === "green"
                ? isLight ? "#059669" : "#10B981"
                : signal === "yellow"
                ? isLight ? "#D97706" : "#F59E0B"
                : isLight ? "#DC2626" : "#EF4444";

            ctx.strokeStyle = col;
            ctx.lineWidth = STOP_BAR_WIDTH;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.save();
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = signal === "green" ? 12 : 5;
            ctx.beginPath();
            ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          };

          // North Inbound: East Half (cX to cX + ROAD_HALF_WIDTH)
          drawStopBar(cX, cY - stopDist, cX + ROAD_HALF_WIDTH, cY - stopDist, approaches.N.signal);
          // South Inbound: West Half (cX - ROAD_HALF_WIDTH to cX)
          drawStopBar(cX - ROAD_HALF_WIDTH, cY + stopDist, cX, cY + stopDist, approaches.S.signal);
          // West Inbound: North Half (cY - ROAD_HALF_WIDTH to cY)
          drawStopBar(cX - stopDist, cY - ROAD_HALF_WIDTH, cX - stopDist, cY, approaches.W.signal);
          // East Inbound: South Half (cY to cY + ROAD_HALF_WIDTH)
          drawStopBar(cX + stopDist, cY, cX + stopDist, cY + ROAD_HALF_WIDTH, approaches.E.signal);

          // 9. Corner Traffic Signal Gantry Heads (Placed at Inbound Curbs)
          const drawSignalHead = (gx: number, gy: number, signal: SignalColor, rot: number) => {
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(rot);
            ctx.fillStyle = "#020617";
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(-4.5, -11, 9, 22, 2.5);
            } else {
              ctx.rect(-4.5, -11, 9, 22);
            }
            ctx.fill();
            ctx.stroke();

            // Red lens
            ctx.fillStyle = signal === "red" ? "#EF4444" : "#450A0A";
            if (signal === "red") { ctx.shadowColor = "#EF4444"; ctx.shadowBlur = 6; }
            ctx.beginPath(); ctx.arc(0, -6.5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Amber lens
            ctx.fillStyle = signal === "yellow" ? "#F59E0B" : "#451A03";
            if (signal === "yellow") { ctx.shadowColor = "#F59E0B"; ctx.shadowBlur = 6; }
            ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Green lens
            ctx.fillStyle = signal === "green" ? "#10B981" : "#022C22";
            if (signal === "green") { ctx.shadowColor = "#10B981"; ctx.shadowBlur = 6; }
            ctx.beginPath(); ctx.arc(0, 6.5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore();
          };

          drawSignalHead(cX + ROAD_HALF_WIDTH + 6, cY - stopDist + 2, approaches.N.signal, 0);
          drawSignalHead(cX - ROAD_HALF_WIDTH - 6, cY + stopDist - 2, approaches.S.signal, Math.PI);
          drawSignalHead(cX - stopDist + 2, cY - ROAD_HALF_WIDTH - 6, approaches.W.signal, -Math.PI / 2);
          drawSignalHead(cX + stopDist - 2, cY + ROAD_HALF_WIDTH + 6, approaches.E.signal, Math.PI / 2);

          // 10. Render All Signalized Approach Vehicles with Vector Precision
          vehiclesRef.current.forEach((v) => {
            drawVectorVehicle(ctx, v, cw, ch, time, isLight);
          });

          // 10B. Render Continuous Free Left Traffic (Indian IRC Slip Lane Flow)
          FREE_LEFT_FLEET.forEach((item) => {
            const progress = ((time * 0.00018 * simSpeed + item.offset) % 1 + 1) % 1;
            const traj = getFreeLeftTrajectory(item.corner, progress, cX, cY);
            renderCADVehicle(
              ctx,
              traj.x,
              traj.y,
              traj.theta,
              item.type === "auto" ? 19 : 24,
              item.type === "auto" ? 10 : 11,
              item.type,
              item.color,
              false,
              false,
              30,
              time,
              isLight
            );
          });

          // 11. Compass Approach Label Badges
          ctx.font = "bold 9.5px -apple-system, BlinkMacSystemFont, monospace";
          ctx.fillStyle = isLight ? "#475569" : "#94A3B8";
          ctx.fillText("NORTH · OMR INBOUND", cX - 58, 16);
          ctx.fillText("SOUTH · SIRUSERI IT PARK", cX - 64, ch - 12);
          ctx.fillText("WEST · MEDAVAKKAM LINK", 12, cY - 88);
          ctx.fillText("EAST · ECR EXPRESSWAY", cw - 130, cY - 88);

          // 12. Corner Telemetry HUD Badges
          // Top-Left: Node IX-104 Telemetry
          ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(18, 18, 20, 0.88)";
          ctx.strokeStyle = isLight ? "rgba(203, 213, 225, 0.6)" : "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(12, 12, 230, 34, 8);
          } else {
            ctx.rect(12, 12, 230, 34);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isLight ? "#0F172A" : "#F4F4F6";
          ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillText("NODE IX-104 · SHOLINGANALLUR", 20, 26);
          ctx.fillStyle = "#10B981";
          ctx.font = "9px -apple-system, BlinkMacSystemFont, monospace";
          ctx.fillText("● CLOSED-LOOP · LHT FREE-LEFT BYPASS", 20, 39);

          // Top-Right: Phase State Pill
          ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(18, 18, 20, 0.88)";
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(cw - 174, 12, 162, 34, 8);
          } else {
            ctx.rect(cw - 174, 12, 162, 34);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isLight ? "#0F172A" : "#F4F4F6";
          ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillText(`PHASE 0${ORDERED_DIRECTIONS.indexOf(activeGreenLane) + 1} (${activeGreenLane}-APPROACH)`, cw - 166, 26);
          ctx.fillStyle = currentPhaseState === "green" ? "#10B981" : "#F59E0B";
          ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, monospace";
          ctx.fillText(`${currentPhaseState.toUpperCase()} · ${phaseSecondsLeft}s REMAINING`, cw - 166, 39);
        }
      }

      animId = requestAnimationFrame(blueprintLoop);
    };

    animId = requestAnimationFrame(blueprintLoop);
    return () => cancelAnimationFrame(animId);
  }, [approaches, isPlaying, simSpeed, activeGreenLane, currentPhaseState, phaseSecondsLeft]);

  const activeApproach = approaches[activeGreenLane];
  const progressPercent = Math.max(5, (phaseSecondsLeft / Math.max(1, totalAllocatedGreen)) * 100);

  return (
    <div className="flex-1 flex flex-col gap-5 w-full max-w-[1640px] mx-auto pb-12">
      {/* ── 1. GLOBAL CONTROL TOOLBAR ─────────────────────────────────────── */}
      <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-4.5 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_8px_28px_-4px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs dark:shadow-[0_0_0_1px_rgba(59,130,246,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            <span className="material-symbols-rounded text-2xl">traffic</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-base font-semibold text-on-surface tracking-tight">
                Intersection IX-104 Telemetry & Queues
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-state-calm/10 text-state-calm dark:shadow-[0_0_0_1px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-state-calm animate-pulse" />
                Live Node IX-104
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              Sholinganallur Junction Arterial Gateway · OMR Corridor & Medavakkam-ECR Link
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Mode Switcher: Kinetica Dynamic vs Fixed Baseline */}
          <div className="bg-surface-mid/60 dark:bg-surface-low/80 p-1 rounded-2xl flex items-center shadow-inner dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <button
              onClick={() => setControllerMode("kinetica")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                controllerMode === "kinetica"
                  ? "bg-surface dark:bg-surface-high text-state-calm shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_1px_0_0_rgba(255,255,255,0.12)_inset,0_2px_8px_rgba(0,0,0,0.45)] font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Kinetica Dynamic
            </button>
            <button
              onClick={() => setControllerMode("fixed")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                controllerMode === "fixed"
                  ? "bg-surface dark:bg-surface-high text-state-building shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_1px_0_0_rgba(255,255,255,0.12)_inset,0_2px_8px_rgba(0,0,0,0.45)] font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Fixed-Timer (20s)
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerEmergency("E")}
              className="px-3.5 py-1.5 bg-state-preempted/10 hover:bg-state-preempted/20 text-state-preempted rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-[0_0_0_1px_rgba(239,68,68,0.35),0_1px_0_0_rgba(239,68,68,0.25)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
              title="Trigger 108 Emergency ambulance preemption on East Lane"
            >
              <span className="material-symbols-rounded text-base">emergency</span>
              <span>108 Ambulance</span>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-surface dark:bg-surface-high/70 hover:bg-surface-high text-on-surface rounded-2xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
            >
              <span className="material-symbols-rounded text-base">
                {isPlaying ? "pause" : "play_arrow"}
              </span>
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={() => setSimSpeed(simSpeed === 1 ? 2 : 1)}
              className="px-3 py-1.5 bg-surface dark:bg-surface-high/70 hover:bg-surface-high text-on-surface rounded-2xl text-xs font-telemetry font-bold transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
              title="Toggle simulation multiplier"
            >
              {simSpeed}x
            </button>

            <button
              onClick={resetSimulation}
              className="p-2 bg-surface dark:bg-surface-high/70 hover:bg-surface-high text-on-surface-variant hover:text-on-surface rounded-2xl text-xs transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
              title="Reset simulation parameters"
            >
              <span className="material-symbols-rounded text-base">rotate_left</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. DYNAMIC ISLAND HERO PHASE STATUS HUD ────────────────────────── */}
      <section
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all shadow-sm ${
          activeApproach.isEmergency
            ? "bg-gradient-to-r from-state-preempted/15 via-surface/80 to-surface/80 text-on-surface shadow-[0_0_24px_rgba(239,68,68,0.15)] dark:shadow-[0_0_0_1px_rgba(239,68,68,0.35),0_1px_0_0_rgba(239,68,68,0.25)_inset,0_12px_32px_-4px_rgba(239,68,68,0.25)]"
            : "bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl text-on-surface dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.11)_inset,0_12px_32px_-6px_rgba(0,0,0,0.7),0_3px_8px_-1px_rgba(0,0,0,0.5)]"
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display text-xl font-bold shrink-0 transition-transform ${
                activeApproach.isEmergency
                  ? "bg-state-preempted text-white animate-pulse shadow-md dark:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_6px_20px_rgba(239,68,68,0.4)]"
                  : currentPhaseState === "green"
                  ? "bg-state-calm text-white shadow-md shadow-state-calm/20 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_6px_20px_rgba(16,185,129,0.35)]"
                  : "bg-state-building text-white shadow-md dark:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_6px_20px_rgba(245,158,11,0.35)]"
              }`}
            >
              {activeGreenLane}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-display text-sm sm:text-base font-semibold text-on-surface tracking-tight">
                  Active Green: {activeApproach.name}
                </span>
                <span
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wide inline-flex items-center gap-1.5 ${
                    currentPhaseState === "green"
                      ? "bg-state-calm/12 text-state-calm dark:ring-1 dark:ring-state-calm/25"
                      : "bg-state-building/12 text-state-building dark:ring-1 dark:ring-state-building/25"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {currentPhaseState} Phase · {phaseSecondsLeft}s Remaining
                </span>
                {activeApproach.isEmergency && (
                  <span className="text-[10px] bg-state-preempted text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                    EMS Priority Preemption Active
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant font-body mt-1 leading-relaxed">
                {activeApproach.isEmergency
                  ? "🚨 Emergency priority active: Immediate green corridor cleared. Conflicting approaches safely held on red."
                  : controllerMode === "kinetica"
                  ? `${activeApproach.name} holds highest accumulation (${activeApproach.vehicles} vehicles, ${activeApproach.queueMeters.toFixed(0)}m). Real-time green granted to drain queue.`
                  : "Round-robin fixed baseline active: 20-second fixed phase allocation regardless of lane demand."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-outline/15">
            <div className="text-right">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
                Lane Clearance
              </span>
              <span className="text-base font-semibold text-on-surface font-telemetry block">
                {activeApproach.vehicles} veh
              </span>
              <span className="text-[11px] text-state-calm font-medium block">
                {activeApproach.queueMeters.toFixed(0)}m queue
              </span>
            </div>

            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-surface-high/60"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="113.1"
                  strokeDashoffset={113.1 - (113.1 * progressPercent) / 100}
                  className={`transition-all duration-1000 ${
                    activeApproach.isEmergency
                      ? "text-state-preempted"
                      : currentPhaseState === "green"
                      ? "text-state-calm"
                      : "text-state-building"
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-on-surface font-telemetry leading-none">
                  {phaseSecondsLeft}s
                </span>
                <span className="text-[8px] text-on-surface-variant font-medium leading-none mt-0.5">
                  left
                </span>
              </div>
            </div>

            {activeApproach.isEmergency && (
              <button
                onClick={clearEmergency}
                className="px-3 py-1.5 bg-surface dark:bg-surface-high/80 hover:bg-surface-mid text-on-surface rounded-2xl text-xs font-medium cursor-pointer transition-colors shadow-xs dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset] dark:ring-1 dark:ring-white/[0.06]"
              >
                Clear EMS
              </button>
            )}
          </div>
        </div>

        <div className="w-full h-1.5 bg-surface-high/40 rounded-full overflow-hidden mt-4">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              activeApproach.isEmergency
                ? "bg-state-preempted"
                : currentPhaseState === "green"
                ? "bg-state-calm"
                : "bg-state-building"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* ── 3. MAIN SPLIT: APPROACH QUEUE DEPTH & EXPANDED TOP-DOWN SPATIAL SIMULATOR ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ── LEFT: 4-WAY APPROACH QUEUE DEPTH & SATURATION DOCK (5 Cols on lg, 4 Cols on xl) ── */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_10px_30px_-6px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)] flex flex-col gap-4 h-full justify-between">
            <div className="flex justify-between items-center pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-primary text-base">stacked_bar_chart</span>
                <span className="font-display text-xs font-semibold text-on-surface uppercase tracking-wider">
                  Approach Queue Depth & Storage
                </span>
              </div>
              <span className="text-[10px] font-medium text-on-surface-variant font-telemetry">
                Discharge Rates
              </span>
            </div>

            {/* 4 Approach Mini-Gauges filling height evenly */}
            <div className="flex flex-col gap-3 flex-1 justify-between">
              {ORDERED_DIRECTIONS.map((dir) => {
                const app = approaches[dir];
                const satPct = Math.round((app.vehicles / app.maxCapacity) * 100);
                const isGreen = app.signal === "green";
                const isHeavy = satPct >= 65;

                return (
                  <div
                    key={dir}
                    className={`p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3 shadow-xs ${
                      isGreen
                        ? "bg-state-calm/12 dark:bg-state-calm/15 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_1px_0_0_rgba(16,185,129,0.2)_inset,0_4px_14px_rgba(0,0,0,0.35)]"
                        : "bg-surface-mid/40 dark:bg-surface-mid/60 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.06)_inset,0_4px_12px_rgba(0,0,0,0.3)]"
                    }`}
                  >
                    <div className="min-w-[105px] sm:min-w-[120px]">
                      <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-on-surface">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isGreen ? "#10B981" : "#EF4444" }} />
                        <span>{app.name}</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant block font-telemetry mt-0.5">
                        Inflow: {app.arrivalRate} veh/min
                      </span>
                    </div>

                    {/* Saturation Bar */}
                    <div className="flex-1 px-2">
                      <div className="flex justify-between text-[11px] font-telemetry mb-1">
                        <span className={`font-semibold ${isHeavy ? "text-state-preempted" : "text-on-surface"}`}>
                          {app.vehicles} / {app.maxCapacity} veh ({satPct}%)
                        </span>
                        <span className="text-on-surface-variant text-[10px]">
                          {app.queueMeters.toFixed(0)}m storage
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-high/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isGreen
                              ? "bg-state-calm"
                              : isHeavy
                              ? "bg-state-preempted"
                              : "bg-primary"
                          }`}
                          style={{ width: `${Math.max(5, satPct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right min-w-[65px] font-telemetry">
                      <span className={`text-[11px] font-bold block ${isGreen ? "text-state-calm" : "text-on-surface-variant"}`}>
                        {isGreen ? "DISCHARGING" : "QUEUED"}
                      </span>
                      <span className="text-[9px] text-on-surface-variant">
                        {isGreen ? `${phaseSecondsLeft}s left` : "Held Red"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── RIGHT: ENLARGED TOP-DOWN CAD BLUEPRINT SPATIAL SIMULATOR (7 Cols on lg, 8 Cols on xl) ───────── */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 sm:p-6 flex flex-col shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_10px_30px_-6px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)] h-full justify-between gap-4">
            <div className="flex justify-between items-center pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-primary text-base">hub</span>
                <span className="font-display text-xs font-semibold text-on-surface uppercase tracking-wider">
                  Top-Down Junction Spatial Simulator
                </span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary dark:shadow-[0_0_0_1px_rgba(59,130,246,0.25),inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                Node IX-104 Blueprint
              </span>
            </div>

            {/* Top-Down CAD Blueprint Viewport (Expanded Crisp Canvas) */}
            <div className="w-full aspect-[16/10] min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] bg-surface-mid/50 dark:bg-black/95 rounded-2xl overflow-hidden shadow-inner dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),inset_0_2px_12px_rgba(0,0,0,0.85)] flex items-center justify-center relative">
              <canvas
                ref={topdownCanvasRef}
                width={880}
                height={520}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Phase Rotation Matrix Bar */}
            <div className="grid grid-cols-4 gap-2.5 pt-1">
              {ORDERED_DIRECTIONS.map((k, idx) => {
                const isActive = activeGreenLane === k;
                return (
                  <div
                    key={k}
                    className={`p-3 rounded-2xl text-center transition-all ${
                      isActive
                        ? "bg-state-calm/15 text-state-calm shadow-xs dark:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_1px_0_0_rgba(16,185,129,0.2)_inset,0_4px_12px_rgba(0,0,0,0.35)]"
                        : "bg-surface-mid/30 dark:bg-surface-mid/50 hover:bg-surface-mid/60 text-on-surface-variant shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_0_0_rgba(255,255,255,0.05)_inset,0_2px_6px_rgba(0,0,0,0.25)]"
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-wider block font-medium text-on-surface-variant">
                      Phase 0{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-on-surface block mt-0.5">
                      {k}-Approach
                    </span>
                    <span className="text-[10px] block mt-0.5 font-telemetry">
                      {isActive ? `${phaseSecondsLeft}s Active` : `${approaches[k].vehicles} Queued`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── 4. 4 DIRECTIONAL APPROACH CONTROLLER CARDS (CLEAN 4-COL DOCK) ── */}
      <section className="bg-surface/70 dark:bg-surface/80 backdrop-blur-3xl rounded-3xl p-5 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.10)_inset,0_10px_30px_-6px_rgba(0,0,0,0.65),0_2px_6px_-1px_rgba(0,0,0,0.45)]">
        <div className="flex justify-between items-center mb-3.5 pb-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-primary text-base">tune</span>
            <span className="font-display text-xs font-semibold text-on-surface uppercase tracking-wider">
              Directional Approach Controllers & Signal Heads
            </span>
          </div>
          <span className="text-[10px] font-medium text-on-surface-variant font-telemetry">
            Inflow Injection Steppers
          </span>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ORDERED_DIRECTIONS.map((dir) => {
            const app = approaches[dir];
            const isGreen = app.signal === "green";
            const isYellow = app.signal === "yellow";
            const isHeavy = app.vehicles >= 10;
            const isMod = app.vehicles >= 5 && app.vehicles < 10;

            return (
              <div
                key={dir}
                className={`p-4.5 rounded-2xl transition-all flex flex-col justify-between gap-4 shadow-sm ${
                  isGreen
                    ? "bg-state-calm/10 dark:bg-state-calm/12 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_1px_0_0_rgba(16,185,129,0.2)_inset,0_8px_24px_-4px_rgba(0,0,0,0.55),0_0_16px_rgba(16,185,129,0.08)]"
                    : isYellow
                    ? "bg-state-building/10 dark:bg-state-building/12 dark:shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_1px_0_0_rgba(245,158,11,0.2)_inset,0_8px_24px_-4px_rgba(0,0,0,0.55),0_0_16px_rgba(245,158,11,0.08)]"
                    : isHeavy
                    ? "bg-state-preempted/10 dark:bg-state-preempted/12 dark:shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_1px_0_0_rgba(239,68,68,0.2)_inset,0_8px_24px_-4px_rgba(0,0,0,0.55),0_0_16px_rgba(239,68,68,0.08)]"
                    : "bg-surface-mid/40 dark:bg-surface-mid/60 hover:bg-surface-mid/70 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.055),0_1px_0_0_rgba(255,255,255,0.07)_inset,0_8px_22px_-4px_rgba(0,0,0,0.5)]"
                }`}
              >
                {/* Traffic Light Optic + Direction Name */}
                <div className="flex items-center gap-3">
                  {/* Apple-styled Frosted Traffic Light Housing */}
                  <div className="w-5.5 h-13 bg-neutral-900 dark:bg-black/95 rounded-full p-1.5 flex flex-col items-center justify-between shrink-0 shadow-inner dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),inset_0_2px_6px_rgba(0,0,0,0.8)]">
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        app.signal === "red"
                          ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                          : "bg-red-950/30 opacity-20"
                      }`}
                    />
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        app.signal === "yellow"
                          ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                          : "bg-amber-950/30 opacity-20"
                      }`}
                    />
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        app.signal === "green"
                          ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                          : "bg-emerald-950/30 opacity-20"
                      }`}
                    />
                  </div>

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-on-surface">
                      <span>{app.name}</span>
                      {app.isEmergency && (
                        <span className="text-[9px] bg-state-preempted text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse shadow-xs">
                          108 EMS
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-on-surface-variant block truncate font-body">
                      {app.roadName}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-telemetry">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        Free Left Slip: Continuous Flow
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accumulation Level Meter */}
                <div className="w-full">
                  <div className="flex justify-between text-xs font-telemetry mb-1">
                    <span
                      className={`font-semibold ${
                        isHeavy
                          ? "text-state-preempted"
                          : isMod
                          ? "text-state-building"
                          : "text-state-calm"
                      }`}
                    >
                      {app.vehicles} Veh {isHeavy ? "(Congested)" : isMod ? "(Moderate)" : "(Normal)"}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {app.queueMeters.toFixed(0)}m Queue
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-high/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isGreen
                          ? "bg-state-calm"
                          : isHeavy
                          ? "bg-state-preempted"
                          : isMod
                          ? "bg-state-building"
                          : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, (app.vehicles / app.maxCapacity) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Controls and Signal Pill */}
                <div className="flex items-center justify-between pt-1">
                  <div className="font-telemetry">
                    <span
                      className={`font-semibold text-xs uppercase block ${
                        isGreen
                          ? "text-state-calm"
                          : isYellow
                          ? "text-state-building"
                          : "text-state-preempted"
                      }`}
                    >
                      {app.signal === "green" ? `GREEN (${phaseSecondsLeft}s)` : app.signal.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium block">
                      {isGreen ? "Flow Active" : "Held Red"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Stepper Controls */}
                    <div className="bg-surface/90 dark:bg-surface-high/80 p-1 rounded-xl flex items-center shadow-xs dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.09)_inset,0_2px_8px_rgba(0,0,0,0.4)]">
                      <button
                        onClick={() => adjustVehicles(dir, -2)}
                        className="w-5.5 h-5.5 hover:bg-surface-high text-on-surface-variant hover:text-on-surface rounded-lg text-xs flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90"
                        title="Simulate -2 vehicles cleared"
                      >
                        −
                      </button>
                      <span className="text-[9px] font-telemetry px-1.5 text-on-surface-variant select-none">
                        ±2
                      </span>
                      <button
                        onClick={() => adjustVehicles(dir, 2)}
                        className="w-5.5 h-5.5 hover:bg-surface-high text-on-surface-variant hover:text-on-surface rounded-lg text-xs flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90"
                        title="Simulate +2 incoming vehicles"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick EMS Button */}
                    <button
                      onClick={() => triggerEmergency(dir)}
                      className={`p-2 rounded-xl transition-all cursor-pointer active:scale-90 shadow-xs ${
                        app.isEmergency
                          ? "bg-state-preempted text-white dark:shadow-[0_0_0_1px_rgba(239,68,68,0.35),0_2px_10px_rgba(239,68,68,0.4)]"
                          : "bg-surface dark:bg-surface-high/80 hover:bg-state-preempted/10 text-on-surface-variant hover:text-state-preempted dark:shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_1px_0_0_rgba(255,255,255,0.09)_inset,0_2px_8px_rgba(0,0,0,0.35)]"
                      }`}
                      title={`Simulate 108 Emergency priority on ${app.name}`}
                    >
                      <span className="material-symbols-rounded text-sm block">emergency</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
