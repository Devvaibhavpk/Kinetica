"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  subscribeVisionFeed,
  VisionFeedState,
} from "../../lib/visionFeedStore";

export type DirectionKey = "N" | "S" | "E" | "W";
export type SignalColor = "red" | "yellow" | "green";

interface ApproachData {
  key: DirectionKey;
  name: string;
  roadName: string;
  vehicles: number;
  queueMeters: number;
  signal: SignalColor;
  isEmergency: boolean;
}

interface VehicleSim {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  type: "car" | "bus" | "truck" | "ambulance";
  direction: DirectionKey;
}

export default function IntersectionDetailView() {
  // Mode: Kinetica Dynamic (Demand-Responsive) vs Fixed-Timer (Baseline)
  const [controllerMode, setControllerMode] = useState<"kinetica" | "fixed">("kinetica");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Vision Feed from Vision Perception module
  const [visionFeed, setVisionFeed] = useState<VisionFeedState | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cctvCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
    },
    S: {
      key: "S",
      name: "South Approach",
      roadName: "OMR Outbound (to Siruseri IT Park)",
      vehicles: 3,
      queueMeters: 12.0,
      signal: "red",
      isEmergency: false,
    },
    E: {
      key: "E",
      name: "East Approach",
      roadName: "ECR Expressway Link",
      vehicles: 2,
      queueMeters: 8.0,
      signal: "red",
      isEmergency: false,
    },
    W: {
      key: "W",
      name: "West Approach",
      roadName: "Medavakkam Rd Connector",
      vehicles: 4,
      queueMeters: 16.0,
      signal: "red",
      isEmergency: false,
    },
  });

  const [activeGreenLane, setActiveGreenLane] = useState<DirectionKey>("N");
  const [currentPhaseState, setCurrentPhaseState] = useState<"green" | "yellow">("green");
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(24);
  const [totalAllocatedGreen, setTotalAllocatedGreen] = useState<number>(24);

  // Vehicle simulations for CCTV feed and Top-Down junction
  const cctvVehiclesRef = useRef<VehicleSim[]>([]);
  const topdownVehiclesRef = useRef<VehicleSim[]>([]);

  // Subscribe to Vision Feed Store
  useEffect(() => {
    const unsubscribe = subscribeVisionFeed((state) => {
      setVisionFeed(state);
      if (state.hasEmergency && state.emergencyDirection) {
        triggerEmergency(state.emergencyDirection);
      }
    });
    return unsubscribe;
  }, []);

  // Initialize visual vehicle simulations
  const initSimulations = useCallback((counts: Record<DirectionKey, number>) => {
    const cctvList: VehicleSim[] = [];
    const topdownList: VehicleSim[] = [];
    let id = 1;

    (["N", "S", "E", "W"] as DirectionKey[]).forEach((dir) => {
      const count = counts[dir];
      for (let i = 0; i < count; i++) {
        const isAmb = approaches[dir]?.isEmergency && i === 0;

        // CCTV camera coordinate mapping
        let cx = 320;
        let cy = 180;
        let cvx = 0;
        let cvy = 0;

        if (dir === "N") {
          cx = 290 + (i % 2) * 26;
          cy = 30 + i * 16;
          cvy = 0.5;
        } else if (dir === "S") {
          cx = 300 + (i % 2) * 26;
          cy = 310 - i * 16;
          cvy = -0.5;
        } else if (dir === "W") {
          cx = 35 + i * 20;
          cy = 170 + (i % 2) * 20;
          cvx = 0.5;
        } else if (dir === "E") {
          cx = 585 - i * 20;
          cy = 150 + (i % 2) * 20;
          cvx = -0.5;
        }

        cctvList.push({
          id: id++,
          x: cx,
          y: cy,
          vx: cvx,
          vy: cvy,
          w: isAmb ? 32 : 24,
          h: isAmb ? 18 : 14,
          type: isAmb ? "ambulance" : i % 5 === 0 ? "bus" : i % 4 === 0 ? "truck" : "car",
          direction: dir,
        });

        // Top-Down Junction coordinate mapping (Canvas size ~400x260)
        let tx = 200;
        let ty = 130;
        let tvx = 0;
        let tvy = 0;

        if (dir === "N") {
          tx = 186 + (i % 2) * 16;
          ty = 20 + i * 14;
          tvy = 0.6;
        } else if (dir === "S") {
          tx = 202 + (i % 2) * 16;
          ty = 230 - i * 14;
          tvy = -0.6;
        } else if (dir === "W") {
          tx = 30 + i * 16;
          ty = 134 + (i % 2) * 16;
          tvx = 0.6;
        } else if (dir === "E") {
          tx = 360 - i * 16;
          ty = 118 + (i % 2) * 16;
          tvx = -0.6;
        }

        topdownList.push({
          id: id++,
          x: tx,
          y: ty,
          vx: tvx,
          vy: tvy,
          w: isAmb ? 22 : 16,
          h: isAmb ? 14 : 10,
          type: isAmb ? "ambulance" : i % 5 === 0 ? "bus" : i % 4 === 0 ? "truck" : "car",
          direction: dir,
        });
      }
    });

    cctvVehiclesRef.current = cctvList;
    topdownVehiclesRef.current = topdownList;
  }, [approaches]);

  useEffect(() => {
    initSimulations({
      N: approaches.N.vehicles,
      S: approaches.S.vehicles,
      E: approaches.E.vehicles,
      W: approaches.W.vehicles,
    });
  }, [
    approaches.N.vehicles,
    approaches.S.vehicles,
    approaches.E.vehicles,
    approaches.W.vehicles,
    initSimulations,
  ]);

  // Closed-loop 1-Second Signal Controller Ticker
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev > 1) {
          // Clear 1 car every 3 seconds while green
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
          const order: DirectionKey[] = ["N", "S", "E", "W"];
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
            const keys: DirectionKey[] = ["N", "S", "E", "W"];

            // Realistic arrival inflow to waiting lanes
            keys.forEach((k) => {
              if (k !== activeGreenLane && Math.random() > 0.4) {
                const count = Math.min(20, appMap[k].vehicles + 1);
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
                const weight = k === activeGreenLane ? appMap[k].vehicles * 0.4 : appMap[k].vehicles;
                if (weight > maxWeight) {
                  maxWeight = weight;
                  nextLane = k;
                }
              });
            }

            const targetVeh = appMap[nextLane].vehicles;
            const dynamicDuration = Math.min(32, Math.max(12, Math.round(10 + targetVeh * 1.5)));

            const next = { ...appMap };
            keys.forEach((k) => {
              next[k] = { ...next[k], signal: k === nextLane ? "green" : "red" };
            });
            return next;
          });

          setActiveGreenLane(nextLane);
          const dynamicTime = Math.min(
            32,
            Math.max(12, Math.round(10 + (approaches[nextLane]?.vehicles || 6) * 1.5))
          );
          setTotalAllocatedGreen(dynamicTime);
          return dynamicTime;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, activeGreenLane, currentPhaseState, controllerMode, approaches]);

  // CCTV Video & Detection Overlay Animation Loop
  useEffect(() => {
    let animId: number;

    const renderCctv = () => {
      const canvas = cctvCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      ctx.clearRect(0, 0, cw, ch);

      const isLight =
        typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-theme") === "light";

      // If Vision Feed has an active video element and is playing, draw it
      if (videoRef.current && visionFeed?.videoUrl && !videoRef.current.paused && !videoRef.current.ended) {
        ctx.drawImage(videoRef.current, 0, 0, cw, ch);
      } else {
        // Clean surveillance backdrop (Daylight pavement in light mode, deep night in dark mode)
        ctx.fillStyle = isLight ? "#E2E8F0" : "#12151E";
        ctx.fillRect(0, 0, cw, ch);

        // Crossroad asphalt (Slate 700 in light mode, deep asphalt in dark mode)
        ctx.fillStyle = isLight ? "#334155" : "#171B26";
        ctx.fillRect(cw / 2 - 42, 0, 84, ch);
        ctx.fillRect(0, ch / 2 - 42, cw, 84);

        // Lane markings
        ctx.strokeStyle = isLight ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        ctx.moveTo(cw / 2, 0);
        ctx.lineTo(cw / 2, ch / 2 - 42);
        ctx.moveTo(cw / 2, ch / 2 + 42);
        ctx.lineTo(cw / 2, ch);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, ch / 2);
        ctx.lineTo(cw / 2 - 42, ch / 2);
        ctx.moveTo(cw / 2 + 42, ch / 2);
        ctx.lineTo(cw, ch / 2);
        ctx.stroke();

        ctx.setLineDash([]);

        // Stop Lines
        ctx.strokeStyle = isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cw / 2 - 42, ch / 2 - 42);
        ctx.lineTo(cw / 2, ch / 2 - 42);
        ctx.moveTo(cw / 2, ch / 2 + 42);
        ctx.lineTo(cw / 2 + 42, ch / 2 + 42);
        ctx.moveTo(cw / 2 - 42, ch / 2);
        ctx.lineTo(cw / 2 - 42, ch / 2 + 42);
        ctx.moveTo(cw / 2 + 42, ch / 2 - 42);
        ctx.lineTo(cw / 2 + 42, ch / 2);
        ctx.stroke();
      }

      // Draw Directional Detection Quadrants
      const drawZone = (label: string, x: number, y: number, w: number, h: number, isGreen: boolean, count: number) => {
        ctx.save();
        const strokeColor = isGreen
          ? isLight ? "#059669" : "#10b981"
          : isLight ? "#dc2626" : "#ef4444";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = isGreen
          ? isLight ? "rgba(5, 150, 105, 0.12)" : "rgba(16, 185, 129, 0.08)"
          : isLight ? "rgba(220, 38, 38, 0.08)" : "rgba(239, 68, 68, 0.04)";
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = strokeColor;
        ctx.fillRect(x, y - 18, 98, 18);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`${label}: ${count} VEH`, x + 6, y - 5);
        ctx.restore();
      };

      drawZone("NORTH", cw / 2 - 46, 18, 92, ch / 2 - 64, approaches.N.signal === "green", approaches.N.vehicles);
      drawZone("SOUTH", cw / 2 - 46, ch / 2 + 46, 92, ch / 2 - 64, approaches.S.signal === "green", approaches.S.vehicles);
      drawZone("WEST", 18, ch / 2 - 42, cw / 2 - 66, 84, approaches.W.signal === "green", approaches.W.vehicles);
      drawZone("EAST", cw / 2 + 46, ch / 2 - 42, cw / 2 - 66, 84, approaches.E.signal === "green", approaches.E.vehicles);

      // Render Detected Vehicles with Bounding Boxes
      const list = cctvVehiclesRef.current;
      list.forEach((v) => {
        const isGreen = approaches[v.direction]?.signal === "green";
        if (isGreen && isPlaying) {
          v.x += v.vx * 1.5;
          v.y += v.vy * 1.5;

          if (v.direction === "N" && v.y > ch + 20) v.y = 20;
          if (v.direction === "S" && v.y < -20) v.y = ch - 20;
          if (v.direction === "W" && v.x > cw + 20) v.x = 20;
          if (v.direction === "E" && v.x < -20) v.x = cw - 20;
        }

        ctx.save();
        const isAmb = v.type === "ambulance";
        const color = isAmb
          ? (isLight ? "#dc2626" : "#f43f5e")
          : v.type === "bus"
          ? (isLight ? "#0284c7" : "#38bdf8")
          : (isLight ? "#059669" : "#22c55e");

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(v.x, v.y, v.w, v.h);
        ctx.fillStyle = isAmb
          ? "rgba(220, 38, 38, 0.25)"
          : isLight
          ? "rgba(5, 150, 105, 0.18)"
          : "rgba(34, 197, 94, 0.15)";
        ctx.fillRect(v.x, v.y, v.w, v.h);

        ctx.fillStyle = color;
        ctx.font = "bold 8px monospace";
        ctx.fillText(v.type.toUpperCase(), v.x, v.y - 3);
        ctx.restore();
      });

      // Bottom Status Line
      ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.85)" : "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(6, ch - 22, cw - 12, 16);
      ctx.fillStyle = isLight ? "#34d399" : "#10b981";
      ctx.font = "9px monospace";
      ctx.fillText(
        visionFeed?.videoFileName
          ? `● VISION MODULE LINK: ${visionFeed.videoFileName.toUpperCase()} | DIRECTIONAL ACCUMULATION ACTIVE`
          : "● CAM-01 SHOLINGANALLUR | YOLOv8 VEHICLE ACCUMULATION TRACKER",
        12,
        ch - 10
      );

      animId = requestAnimationFrame(renderCctv);
    };

    animId = requestAnimationFrame(renderCctv);
    return () => cancelAnimationFrame(animId);
  }, [approaches, isPlaying, visionFeed]);

  // Top-Down Graphical Junction Flow Simulator Animation Loop
  useEffect(() => {
    let animId: number;

    const renderTopdown = () => {
      const canvas = topdownCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      ctx.clearRect(0, 0, cw, ch);

      const isLight =
        typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-theme") === "light";

      // Junction background (Clean slate-50 in light mode, dark in dark mode)
      ctx.fillStyle = isLight ? "#F8FAFC" : "#171B26";
      ctx.fillRect(0, 0, cw, ch);

      // Subtle blueprint grid in light mode
      if (isLight) {
        ctx.strokeStyle = "rgba(203, 213, 225, 0.4)";
        ctx.lineWidth = 0.5;
        for (let x = 20; x < cw; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, ch);
          ctx.stroke();
        }
        for (let y = 20; y < ch; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(cw, y);
          ctx.stroke();
        }
      }

      // 4-Way Road Blueprint (Dark slate road in light mode)
      ctx.fillStyle = isLight ? "#334155" : "#161b24";
      ctx.fillRect(cw / 2 - 32, 0, 64, ch); // North-South
      ctx.fillRect(0, ch / 2 - 32, cw, 64); // West-East

      // Center intersection box
      ctx.fillStyle = isLight ? "#1E293B" : "#1c222e";
      ctx.fillRect(cw / 2 - 32, ch / 2 - 32, 64, 64);

      // Active Green Flow Corridor Glow
      ctx.save();
      if (activeGreenLane === "N" || activeGreenLane === "S") {
        ctx.fillStyle = isLight ? "rgba(16, 185, 129, 0.22)" : "rgba(16, 185, 129, 0.12)";
        ctx.fillRect(cw / 2 - 32, 0, 64, ch);
      } else {
        ctx.fillStyle = isLight ? "rgba(16, 185, 129, 0.22)" : "rgba(16, 185, 129, 0.12)";
        ctx.fillRect(0, ch / 2 - 32, cw, 64);
      }
      ctx.restore();

      // Road dividers
      ctx.strokeStyle = isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(cw / 2, 0);
      ctx.lineTo(cw / 2, ch / 2 - 32);
      ctx.moveTo(cw / 2, ch / 2 + 32);
      ctx.lineTo(cw / 2, ch);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, ch / 2);
      ctx.lineTo(cw / 2 - 32, ch / 2);
      ctx.moveTo(cw / 2 + 32, ch / 2);
      ctx.lineTo(cw / 2 + 32, ch / 2);
      ctx.moveTo(cw / 2 + 32, ch / 2);
      ctx.lineTo(cw, ch / 2);
      ctx.stroke();

      ctx.setLineDash([]);

      // Stop lines with Signal color indicators
      const drawStopLine = (dir: DirectionKey, x1: number, y1: number, x2: number, y2: number) => {
        const isGreen = approaches[dir].signal === "green";
        const isYellow = approaches[dir].signal === "yellow";
        const col = isGreen
          ? isLight ? "#059669" : "#10b981"
          : isYellow
          ? isLight ? "#d97706" : "#f59e0b"
          : isLight ? "#dc2626" : "#ef4444";

        ctx.strokeStyle = col;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Signal light circle
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, 4.5, 0, Math.PI * 2);
        ctx.fill();
      };

      drawStopLine("N", cw / 2 - 32, ch / 2 - 32, cw / 2, ch / 2 - 32);
      drawStopLine("S", cw / 2, ch / 2 + 32, cw / 2 + 32, ch / 2 + 32);
      drawStopLine("W", cw / 2 - 32, ch / 2, cw / 2 - 32, ch / 2 + 32);
      drawStopLine("E", cw / 2 + 32, ch / 2 - 32, cw / 2 + 32, ch / 2);

      // Render moving/queued cars on blueprint
      const list = topdownVehiclesRef.current;
      list.forEach((v) => {
        const isGreen = approaches[v.direction]?.signal === "green";
        if (isGreen && isPlaying) {
          v.x += v.vx * 1.5;
          v.y += v.vy * 1.5;

          if (v.direction === "N" && v.y > ch + 20) v.y = 15;
          if (v.direction === "S" && v.y < -20) v.y = ch - 15;
          if (v.direction === "W" && v.x > cw + 20) v.x = 15;
          if (v.direction === "E" && v.x < -20) v.x = cw - 15;
        }

        ctx.save();
        const isAmb = v.type === "ambulance";
        ctx.fillStyle = isAmb
          ? (isLight ? "#dc2626" : "#f43f5e")
          : isGreen
          ? (isLight ? "#059669" : "#10b981")
          : (isLight ? "#94a3b8" : "#94a3b8");
        ctx.fillRect(v.x, v.y, v.w, v.h);
        ctx.restore();
      });

      // Compass labels
      ctx.fillStyle = isLight ? "#1e293b" : "#64748b";
      ctx.font = "bold 9px monospace";
      ctx.fillText("N (OMR)", cw / 2 - 18, 14);
      ctx.fillText("S (SIRUSERI)", cw / 2 - 28, ch - 6);
      ctx.fillText("W (MEDAVAKKAM)", 6, ch / 2 - 36);
      ctx.fillText("E (ECR)", cw - 44, ch / 2 - 36);

      animId = requestAnimationFrame(renderTopdown);
    };

    animId = requestAnimationFrame(renderTopdown);
    return () => cancelAnimationFrame(animId);
  }, [approaches, isPlaying, activeGreenLane]);

  // Adjust Vehicles manually for judge interaction
  const adjustVehicles = (dir: DirectionKey, delta: number) => {
    setApproaches((prev) => {
      const cur = prev[dir];
      const count = Math.max(0, Math.min(22, cur.vehicles + delta));
      return {
        ...prev,
        [dir]: {
          ...cur,
          vehicles: count,
          queueMeters: count * 4.0,
        },
      };
    });
  };

  // Trigger Emergency Ambulance
  const triggerEmergency = (dir: DirectionKey) => {
    setApproaches((prev) => {
      const next = { ...prev };
      (Object.keys(next) as DirectionKey[]).forEach((k) => {
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
    setPhaseSecondsLeft(20);
    setTotalAllocatedGreen(20);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 w-full">
      {/* ── TOP HEADER & MODE CONTROLS ────────────────────────────────────── */}
      <section className="bg-surface border border-outline rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-primary text-[20px]">traffic</span>
          </div>
          <div>
            <h1 className="font-display text-xs font-bold text-on-surface uppercase tracking-wider">
              Intersection IX-104 Telemetry & Dynamic Signals
            </h1>
            <span className="font-mono text-[10px] text-on-surface-variant">
              {visionFeed?.videoFileName
                ? `Perception Feed Linked: ${visionFeed.videoFileName} (via Vision Module)`
                : "Perception Feed Linked: Sholinganallur Junction Camera CAM-01"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-surface-mid p-1 rounded-lg border border-outline flex items-center gap-1">
            <button
              onClick={() => setControllerMode("kinetica")}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                controllerMode === "kinetica"
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Kinetica Dynamic
            </button>
            <button
              onClick={() => setControllerMode("fixed")}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                controllerMode === "fixed"
                  ? "bg-state-building/20 text-state-building border border-state-building/40 font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Fixed-Timer (30s)
            </button>
          </div>

          {/* Emergency Ambulance Test Button */}
          <button
            onClick={() => triggerEmergency("E")}
            className="px-2.5 py-1 bg-state-preempted/10 hover:bg-state-preempted/20 text-state-preempted border border-state-preempted/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Simulate ambulance priority override on East Lane"
          >
            <span className="material-symbols-rounded text-sm">emergency</span>
            <span>Ambulance Test</span>
          </button>

          {/* Pause / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2 py-1 bg-surface-mid hover:bg-surface-high border border-outline rounded-lg text-xs font-mono text-on-surface cursor-pointer"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      </section>

      {/* ── CLEAN STATUS VERDICT BANNER WITH PROGRESS TIMER ────────────────── */}
      <section
        className={`rounded-xl p-3 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
          approaches[activeGreenLane].isEmergency
            ? "bg-state-preempted/15 border-state-preempted text-state-preempted"
            : "bg-surface border-outline text-on-surface"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display text-base font-black shrink-0 ${
              approaches[activeGreenLane].isEmergency
                ? "bg-state-preempted text-white animate-pulse"
                : currentPhaseState === "green"
                ? "bg-state-calm text-white shadow-sm"
                : "bg-state-building text-white shadow-sm"
            }`}
          >
            {activeGreenLane}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase">
                Active Green: {approaches[activeGreenLane].name} ({approaches[activeGreenLane].roadName})
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                  currentPhaseState === "green"
                    ? "bg-state-calm/20 text-state-calm border border-state-calm-border"
                    : "bg-state-building/20 text-state-building border border-state-building/40 font-bold"
                }`}
              >
                {currentPhaseState.toUpperCase()} · {phaseSecondsLeft}s Left
              </span>
            </div>
            <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
              {approaches[activeGreenLane].isEmergency
                ? "🚨 Emergency priority active: Immediate green granted, conflicting directions locked RED."
                : `${approaches[activeGreenLane].name} has the highest vehicle accumulation (${approaches[activeGreenLane].vehicles} vehicles). Other lanes held on RED.`}
            </p>
          </div>
        </div>

          {/* Phase Timeline Countdown Bar */}
          <div className="w-full sm:w-48 flex flex-col gap-1 shrink-0 font-mono">
            <div className="flex justify-between text-[10px]">
              <span className="text-on-surface-variant">Green Window:</span>
              <span className="font-bold text-state-calm">{phaseSecondsLeft}s / {totalAllocatedGreen}s</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-surface-mid rounded-full overflow-hidden border border-slate-300/80 dark:border-outline/50">
              <div
                className="h-full bg-state-calm transition-all duration-1000 rounded-full"
                style={{ width: `${Math.max(5, (phaseSecondsLeft / totalAllocatedGreen) * 100)}%` }}
              />
            </div>
          </div>
      </section>

      {/* ── BALANCED 2-COLUMN DISPLAY (FILLS VIEWPORT BEAUTIFULLY) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
        {/* ── LEFT: CCTV PERCEPTION & PHASE SEQUENCE (6 Cols) ── */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* CCTV Perception Feed Card */}
          <section className="bg-surface border border-outline rounded-xl p-3 flex flex-col shadow-sm flex-1">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-outline">
              <span className="font-display text-[11px] font-bold text-on-surface uppercase tracking-wider">
                CCTV Camera Feed & Accumulation ROIs
              </span>
              <span className="font-mono text-[9px] text-state-calm font-semibold">
                YOLOv8 PERCEPTION ENGINE
              </span>
            </div>

            {/* Video Canvas Container (Fills cleanly) */}
            <div className="relative w-full aspect-[16/10] bg-surface-mid rounded-xl overflow-hidden border border-outline shadow-sm flex items-center justify-center">
              {visionFeed?.videoUrl && (
                <video
                  ref={videoRef}
                  src={visionFeed.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="hidden"
                />
              )}

              <canvas
                ref={cctvCanvasRef}
                width={640}
                height={400}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* CCTV Directional Accumulation Strip */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-outline text-center font-mono">
              {(["N", "W", "S", "E"] as DirectionKey[]).map((k) => (
                <div
                  key={k}
                  className={`p-2 rounded-lg border transition-all ${
                    approaches[k].signal === "green"
                      ? "bg-state-calm/15 border-state-calm text-state-calm font-bold shadow-sm"
                      : "bg-surface hover:bg-surface-mid border-outline text-on-surface-variant shadow-sm"
                  }`}
                >
                  <div className="font-bold text-xs">{k}-APPROACH</div>
                  <div className="text-sm font-extrabold text-on-surface mt-0.5">
                    {approaches[k].vehicles} Veh
                  </div>
                  <div className="text-[9px] text-on-surface-variant">
                    {approaches[k].queueMeters.toFixed(0)}m queue
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Phase Cycle Ring & Schedule Bar */}
          <section className="bg-surface border border-outline rounded-xl p-3 shadow-sm">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-outline">
              <span className="font-display text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Controller Phase Ring & Sequence
              </span>
              <span className="font-mono text-[9px] text-on-surface-variant">
                CYCLE TICK: 10 Hz
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {(["N", "W", "S", "E"] as DirectionKey[]).map((k, idx) => {
                const isActive = activeGreenLane === k;
                return (
                  <div
                    key={k}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      isActive
                        ? "bg-state-calm/20 border-state-calm text-state-calm font-bold shadow-sm"
                        : "bg-surface hover:bg-surface-mid border-outline text-on-surface-variant shadow-sm"
                    }`}
                  >
                    <span className="text-[9px] uppercase block text-on-surface-variant">
                      Phase {idx + 1}
                    </span>
                    <span className="font-bold block mt-0.5">{k}-Approach</span>
                    <span className="text-[10px] block mt-0.5">
                      {isActive ? `${phaseSecondsLeft}s Active` : `${approaches[k].vehicles} Queued`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── RIGHT: TOP-DOWN JUNCTION BLUEPRINT + DIRECTIONAL SIGNALS (6 Cols) ── */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Top-Down 4-Way Crossroad Flow Simulator */}
          <section className="bg-surface border border-outline rounded-xl p-3 flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-outline">
              <span className="font-display text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Top-Down 4-Way Junction Flow Simulator
              </span>
              <span className="font-mono text-[9px] text-state-calm font-semibold">
                NODE IX-104 SPATIAL BLUEPRINT
              </span>
            </div>

            {/* Top-Down Canvas */}
            <div className="w-full h-[180px] bg-surface-mid rounded-xl overflow-hidden border border-outline shadow-inner flex items-center justify-center">
              <canvas
                ref={topdownCanvasRef}
                width={440}
                height={200}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </section>

          {/* 4 Directional Approach Control Cards */}
          <section className="bg-surface border border-outline rounded-xl p-3 flex flex-col shadow-sm flex-1">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-outline">
              <span className="font-display text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Directional Accumulation & Signals
              </span>
              <span className="font-mono text-[9px] text-on-surface-variant">
                DEMAND-RESPONSIVE GREEN ALLOCATION
              </span>
            </div>

            {/* 4 Approach Cards */}
            <div className="flex flex-col gap-2.5 flex-1 justify-between">
              {(["N", "W", "S", "E"] as DirectionKey[]).map((dir) => {
                const app = approaches[dir];
                const isGreen = app.signal === "green";
                const isYellow = app.signal === "yellow";
                const isHeavy = app.vehicles >= 10;
                const isMod = app.vehicles >= 5 && app.vehicles < 10;

                return (
                  <div
                    key={dir}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      isGreen
                        ? "bg-state-calm/10 border-2 border-state-calm shadow-md"
                        : isYellow
                        ? "bg-state-building/15 border-state-building/40"
                        : isHeavy
                        ? "bg-state-preempted/15 border-state-preempted/40"
                        : "bg-surface hover:bg-surface-mid border-outline shadow-sm"
                    }`}
                  >
                    {/* Traffic Light LED + Road Name */}
                    <div className="flex items-center gap-3 min-w-[170px]">
                      {/* Compact 3-bulb traffic light */}
                      <div className="w-5 h-12 bg-slate-900 border border-slate-700 dark:border-white/20 rounded p-0.5 flex flex-col items-center justify-between shrink-0 shadow-sm">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            app.signal === "red" ? "bg-red-500 shadow-[0_0_6px_#ef4444]" : "bg-red-950/40 opacity-30"
                          }`}
                        />
                        <div
                          className={`w-3 h-3 rounded-full ${
                            app.signal === "yellow" ? "bg-amber-400 shadow-[0_0_6px_#f59e0b]" : "bg-amber-950/40 opacity-30"
                          }`}
                        />
                        <div
                          className={`w-3 h-3 rounded-full ${
                            app.signal === "green" ? "bg-emerald-400 shadow-[0_0_6px_#10b981]" : "bg-emerald-950/40 opacity-30"
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-on-surface">
                          <span>{app.name}</span>
                          {app.isEmergency && (
                            <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black animate-pulse">
                              108 EMS
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-on-surface-variant block truncate">
                          {app.roadName}
                        </span>
                      </div>
                    </div>

                    {/* Accumulation Level Meter */}
                    <div className="flex-1 px-3">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span
                          className={`font-bold ${
                            isHeavy ? "text-state-preempted" : isMod ? "text-state-building" : "text-state-calm"
                          }`}
                        >
                          {app.vehicles} Vehicles {isHeavy ? "(Congested)" : isMod ? "(Moderate)" : "(Clear)"}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {app.queueMeters.toFixed(0)}m Queue
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-surface rounded-full overflow-hidden border border-slate-300/70 dark:border-outline/50">
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
                          style={{ width: `${Math.min(100, Math.max(5, (app.vehicles / 20) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Signal Status & + / - controls for judge testing */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right font-mono min-w-[70px]">
                        <span
                          className={`font-bold text-xs uppercase block ${
                            isGreen
                              ? "text-state-calm"
                              : isYellow
                              ? "text-state-building"
                              : "text-state-preempted"
                          }`}
                        >
                          {app.signal === "green" ? `GREEN (${phaseSecondsLeft}s)` : app.signal.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-on-surface-variant">
                          {isGreen ? "Queue Flowing" : "Held Red"}
                        </span>
                      </div>

                      {/* Interactive adjusters */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => adjustVehicles(dir, 2)}
                          className="w-6 h-5 bg-surface-mid hover:bg-surface-high text-on-surface rounded text-[10px] font-mono flex items-center justify-center border border-outline cursor-pointer shadow-xs"
                          title="Simulate +2 incoming vehicles"
                        >
                          +2
                        </button>
                        <button
                          onClick={() => adjustVehicles(dir, -2)}
                          className="w-6 h-5 bg-surface-mid hover:bg-surface-high text-on-surface rounded text-[10px] font-mono flex items-center justify-center border border-outline cursor-pointer shadow-xs"
                          title="Simulate -2 vehicles cleared"
                        >
                          -2
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
