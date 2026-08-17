"use client";

import React, { useState, useRef, useMemo } from "react";

export interface ChennaiNode {
  id: string;
  name: string;
  zone: string;
  x: number; // relative SVG percentage (0-1000)
  y: number; // relative SVG percentage (0-700)
  lat: string;
  lon: string;
  queueLengthM: number;
  density: number; // 0 to 1
  arrivalRate: string; // e.g. "1.42 V/S"
  activePhase: string;
  status: "nominal" | "building" | "preempted";
  policy: "FIXED-TIME" | "ADAPTIVE" | "MAX-PREEMPT";
  isSchoolZone?: boolean;
  activePreemption?: {
    vehicle: "AMBULANCE" | "POLICE" | "FIRE";
    etaSeconds: number;
    corridorName: string;
  };
}

interface ChennaiTopologyMapProps {
  scenario: "normal" | "building" | "preempted";
  selectedNodeId: string;
  onSelectNode: (node: ChennaiNode) => void;
}

export default function ChennaiTopologyMap({
  scenario,
  selectedNodeId,
  onSelectNode,
}: ChennaiTopologyMapProps) {
  // Map transform state for smooth pan & zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer filters
  const [showGreenWave, setShowGreenWave] = useState<boolean>(true);
  const [showCameras, setShowCameras] = useState<boolean>(true);
  const [showDensityHeat, setShowDensityHeat] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Chennai Intersections Data
  const nodes: ChennaiNode[] = useMemo(() => {
    const isPreempt = scenario === "preempted";
    const isBuild = scenario === "building";

    return [
      {
        id: "IX-101",
        name: "Madhya Kailash Junction",
        zone: "Adyar / OMR Gateway",
        x: 480,
        y: 280,
        lat: "13.0067° N",
        lon: "80.2435° E",
        queueLengthM: isBuild ? 28.4 : 12.0,
        density: isBuild ? 0.65 : 0.28,
        arrivalRate: isBuild ? "1.25 V/S" : "0.78 V/S",
        activePhase: "OMR Inbound Green (32s)",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        activePreemption: isPreempt
          ? {
              vehicle: "AMBULANCE",
              etaSeconds: 18,
              corridorName: "OMR Rajiv Gandhi Express Corridor",
            }
          : undefined,
      },
      {
        id: "IX-102",
        name: "TIDEL Park Junction",
        zone: "Thiruvanmiyur / OMR",
        x: 520,
        y: 360,
        lat: "12.9892° N",
        lon: "80.2486° E",
        queueLengthM: isBuild ? 41.2 : 14.5,
        density: isBuild ? 0.82 : 0.35,
        arrivalRate: isBuild ? "1.58 V/S" : "0.86 V/S",
        activePhase: "North-South Green (Ext +6s)",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        activePreemption: isPreempt
          ? {
              vehicle: "AMBULANCE",
              etaSeconds: 32,
              corridorName: "OMR Rajiv Gandhi Express Corridor",
            }
          : undefined,
      },
      {
        id: "IX-103",
        name: "SRP Tools Junction",
        zone: "Perungudi / OMR IT Hub",
        x: 550,
        y: 440,
        lat: "12.9734° N",
        lon: "80.2458° E",
        queueLengthM: isBuild ? 48.0 : 18.2,
        density: isBuild ? 0.88 : 0.42,
        arrivalRate: isBuild ? "1.72 V/S" : "0.92 V/S",
        activePhase: "Southbound Clearing",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        activePreemption: isPreempt
          ? {
              vehicle: "AMBULANCE",
              etaSeconds: 48,
              corridorName: "OMR Rajiv Gandhi Express Corridor",
            }
          : undefined,
      },
      {
        id: "IX-104",
        name: "Sholinganallur Junction",
        zone: "OMR & Medavakkam Link",
        x: 600,
        y: 560,
        lat: "12.9010° N",
        lon: "80.2279° E",
        queueLengthM: isPreempt ? 34.0 : isBuild ? 52.6 : 12.4,
        density: isPreempt ? 0.74 : isBuild ? 0.91 : 0.31,
        arrivalRate: isPreempt ? "1.42 V/S" : isBuild ? "1.90 V/S" : "0.84 V/S",
        activePhase: "E-Thru Preempted Green",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        activePreemption: isPreempt
          ? {
              vehicle: "AMBULANCE",
              etaSeconds: 65,
              corridorName: "OMR Rajiv Gandhi Express Corridor",
            }
          : undefined,
      },
      {
        id: "IX-105",
        name: "Kathipara Junction",
        zone: "Guindy / GST Cloverleaf",
        x: 320,
        y: 290,
        lat: "13.0076° N",
        lon: "80.2032° E",
        queueLengthM: isBuild ? 38.0 : 15.0,
        density: isBuild ? 0.70 : 0.32,
        arrivalRate: isBuild ? "1.34 V/S" : "0.80 V/S",
        activePhase: "GST Mainline Ph-1",
        status: isBuild ? "building" : "nominal",
        policy: isBuild ? "ADAPTIVE" : "FIXED-TIME",
      },
      {
        id: "IX-106",
        name: "Anna Nagar Roundtana",
        zone: "Anna Nagar / 2nd Avenue",
        x: 310,
        y: 110,
        lat: "13.0850° N",
        lon: "80.2101° E",
        queueLengthM: isBuild ? 24.5 : 9.5,
        density: isBuild ? 0.58 : 0.22,
        arrivalRate: "0.72 V/S",
        activePhase: "Roundtana Rotary Circulator",
        status: "nominal",
        policy: "FIXED-TIME",
      },
      {
        id: "IX-107",
        name: "Panagal Park / Usman Rd",
        zone: "T. Nagar Commercial Core",
        x: 430,
        y: 200,
        lat: "13.0405° N",
        lon: "80.2337° E",
        queueLengthM: isBuild ? 46.8 : 22.0,
        density: isBuild ? 0.86 : 0.49,
        arrivalRate: isBuild ? "1.65 V/S" : "0.95 V/S",
        activePhase: "Usman Flyover Northbound",
        status: isBuild ? "building" : "nominal",
        policy: isBuild ? "ADAPTIVE" : "FIXED-TIME",
      },
      {
        id: "IX-108",
        name: "Chennai Central Junction",
        zone: "George Town / EVR Periyar Salai",
        x: 580,
        y: 120,
        lat: "13.0827° N",
        lon: "80.2757° E",
        queueLengthM: isBuild ? 35.0 : 16.5,
        density: isBuild ? 0.72 : 0.38,
        arrivalRate: "1.10 V/S",
        activePhase: "Wall Tax Ph-3",
        status: "nominal",
        policy: "FIXED-TIME",
      },
      {
        id: "IX-109",
        name: "Vijayanagar Junction",
        zone: "Velachery / 100ft Bypass",
        x: 420,
        y: 420,
        lat: "12.9784° N",
        lon: "80.2185° E",
        queueLengthM: isBuild ? 33.2 : 11.8,
        density: isBuild ? 0.68 : 0.27,
        arrivalRate: "0.88 V/S",
        activePhase: "Bypass West Bound",
        status: isBuild ? "building" : "nominal",
        policy: isBuild ? "ADAPTIVE" : "FIXED-TIME",
      },
    ];
  }, [scenario]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[3]; // default IX-104

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.75), 2.2));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getNodeColor = (node: ChennaiNode) => {
    if (node.status === "preempted") return "#ff4060";
    if (node.status === "building") return "#ffab1a";
    return "#00c97a";
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-full min-h-[460px] bg-[#0c0e12] rounded-b-[24px] overflow-hidden select-none cursor-grab active:cursor-grabbing flex flex-col justify-between"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(77, 159, 255, 0.04) 0%, transparent 80%),
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 40px 40px, 40px 40px",
      }}
    >
      {/* ── MAP HEADER OVERLAY ───────────────────────────── */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="bg-[#161820]/90 backdrop-blur-md border border-[#2e3140] px-3 py-1.5 rounded-lg flex items-center gap-2.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#00c97a] animate-pulse" />
          <span className="font-mono text-xs font-bold text-[#e8eaf0] tracking-wide uppercase">
            CHENNAI METROPOLITAN SECTOR 4
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#2c2f3a] text-[#9096a8]">
            OMR / GST CORRIDORS
          </span>
        </div>

        {/* Layer Filter Toggles */}
        <div className="hidden sm:flex items-center gap-1 bg-[#161820]/90 backdrop-blur-md border border-[#2e3140] p-1 rounded-lg">
          <button
            onClick={() => setShowGreenWave((p) => !p)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              showGreenWave
                ? "bg-[#ff4060]/20 text-[#ff4060] border border-[#ff4060]/40 font-semibold"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            Green Wave
          </button>
          <button
            onClick={() => setShowDensityHeat((p) => !p)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              showDensityHeat
                ? "bg-[#00c97a]/20 text-[#00c97a] border border-[#00c97a]/40 font-semibold"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            Density Heat
          </button>
          <button
            onClick={() => setShowCameras((p) => !p)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              showCameras
                ? "bg-[#4d9fff]/20 text-[#4d9fff] border border-[#4d9fff]/40 font-semibold"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            YOLO Cams
          </button>
        </div>
      </div>

      {/* ── ZOOM & RESET CONTROLS ───────────────────────────── */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => handleZoom(0.2)}
          className="w-8 h-8 rounded-lg bg-[#161820]/90 backdrop-blur-md border border-[#2e3140] text-[#e8eaf0] hover:bg-[#2c2f3a] flex items-center justify-center text-sm font-bold shadow-md cursor-pointer transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="w-8 h-8 rounded-lg bg-[#161820]/90 backdrop-blur-md border border-[#2e3140] text-[#e8eaf0] hover:bg-[#2c2f3a] flex items-center justify-center text-sm font-bold shadow-md cursor-pointer transition-colors"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={handleReset}
          className="w-8 h-8 rounded-lg bg-[#161820]/90 backdrop-blur-md border border-[#2e3140] text-[#9096a8] hover:text-[#e8eaf0] hover:bg-[#2c2f3a] flex items-center justify-center shadow-md cursor-pointer transition-colors"
          title="Reset Map View"
        >
          <span className="material-symbols-rounded text-[16px]">restart_alt</span>
        </button>
      </div>

      {/* ── SVG GEO-TOPOLOGY CANVAS ───────────────────────────── */}
      <div
        className="w-full h-full flex-1 transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <svg
          viewBox="0 0 1000 700"
          className="w-full h-full select-none"
          style={{ filter: "drop-shadow(0 0 20px rgba(0,0,0,0.8))" }}
        >
          <defs>
            {/* Pulsing Gradient for Active Preemption Corridor */}
            <linearGradient id="omrGreenWave" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4060" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ffab1a" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#00c97a" stopOpacity="0.9" />
            </linearGradient>

            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── BACKGROUND WATER / BAY OF BENGAL SHORELINE ── */}
          <path
            d="M 740,0 Q 760,180 730,350 T 780,700 L 1000,700 L 1000,0 Z"
            fill="rgba(77, 159, 255, 0.05)"
            stroke="rgba(77, 159, 255, 0.15)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x="850"
            y="350"
            fill="rgba(77, 159, 255, 0.3)"
            fontSize="12"
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="3"
          >
            BAY OF BENGAL
          </text>

          {/* ── ARTERIAL CORRIDORS / HIGHWAY ROAD MESH ── */}
          {/* 1. OMR (Rajiv Gandhi Salai) - Main Arterial Spine */}
          <path
            d="M 480,280 L 520,360 L 550,440 L 600,560 L 640,680"
            fill="none"
            stroke={scenario === "preempted" && showGreenWave ? "url(#omrGreenWave)" : "#2e3140"}
            strokeWidth={scenario === "preempted" && showGreenWave ? 4 : 2.5}
            strokeDasharray={scenario === "preempted" && showGreenWave ? "8 4" : "none"}
            className={scenario === "preempted" && showGreenWave ? "animate-pulse" : ""}
          />

          {/* 2. Anna Salai / GST Road Arterial */}
          <path
            d="M 580,120 L 430,200 L 320,290 L 260,420 L 210,580"
            fill="none"
            stroke="#232535"
            strokeWidth="2"
          />

          {/* 3. Inner Ring Road / Velachery Link */}
          <path
            d="M 320,290 L 420,420 L 550,440"
            fill="none"
            stroke="#232535"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* 4. Poonamallee High Rd / EVR Salai */}
          <path
            d="M 310,110 L 450,115 L 580,120"
            fill="none"
            stroke="#232535"
            strokeWidth="1.5"
          />

          {/* 5. 200ft Radial Road (Pallavaram - Thoraipakkam) */}
          <path
            d="M 260,420 L 420,420 L 550,440"
            fill="none"
            stroke="#232535"
            strokeWidth="1.5"
          />

          {/* 6. Medavakkam - Sholinganallur ECR Link */}
          <path
            d="M 400,560 L 600,560 L 730,560"
            fill="none"
            stroke="#232535"
            strokeWidth="1.5"
          />

          {/* ── ARTERIAL LABELS ── */}
          <text
            x="585"
            y="490"
            fill="rgba(144, 150, 168, 0.4)"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            transform="rotate(65, 585, 490)"
          >
            OMR (SH-49A) IT CORRIDOR
          </text>
          <text
            x="360"
            y="240"
            fill="rgba(144, 150, 168, 0.35)"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            transform="rotate(-38, 360, 240)"
          >
            ANNA SALAI (NH-45)
          </text>

          {/* ── DENSITY HEATMAP TRAILS ── */}
          {showDensityHeat &&
            nodes.map((n) => {
              if (n.density < 0.4) return null;
              return (
                <circle
                  key={`heat-${n.id}`}
                  cx={n.x}
                  cy={n.y}
                  r={n.density * 55}
                  fill={n.status === "preempted" ? "rgba(255, 64, 96, 0.12)" : "rgba(255, 171, 26, 0.1)"}
                  filter="url(#glow-red)"
                />
              );
            })}

          {/* ── INTERSECTION NODES ── */}
          {nodes.map((node) => {
            const isSelected = node.id === selectedNode.id;
            const nodeColor = getNodeColor(node);

            return (
              <g
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode(node);
                }}
                className="cursor-pointer group"
              >
                {/* Preemption Radar Rings (Animated) */}
                {node.status === "preempted" && (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="28"
                      fill="none"
                      stroke="#ff4060"
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                      className="animate-ping"
                      style={{ animationDuration: "2.5s", transformOrigin: `${node.x}px ${node.y}px` }}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="18"
                      fill="none"
                      stroke="#ff4060"
                      strokeWidth="1"
                      strokeOpacity="0.7"
                    />
                  </>
                )}

                {/* Selection Highlight Ring */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="15"
                    fill="none"
                    stroke="#4d9fff"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-spin"
                    style={{ animationDuration: "8s", transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                )}

                {/* Outer Glow Halo */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="10"
                  fill={nodeColor}
                  fillOpacity={isSelected ? "0.3" : "0.15"}
                />

                {/* Core Node Marker */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="5"
                  fill={nodeColor}
                  stroke="#111318"
                  strokeWidth="1.5"
                />

                {/* YOLO Camera Badge */}
                {showCameras && (
                  <circle
                    cx={node.x + 8}
                    cy={node.y - 8}
                    r="3"
                    fill="#4d9fff"
                    stroke="#111318"
                    strokeWidth="0.8"
                  />
                )}

                {/* Node Label Plate */}
                <rect
                  x={node.x + 12}
                  y={node.y - 12}
                  width="54"
                  height="16"
                  rx="3"
                  fill="#161820"
                  stroke={isSelected ? "#4d9fff" : "#2e3140"}
                  strokeWidth="1"
                />
                <text
                  x={node.x + 16}
                  y={node.y}
                  fill={isSelected ? "#4d9fff" : "#e8eaf0"}
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="bold"
                >
                  {node.id}
                </text>
              </g>
            );
          })}

          {/* ── AMBULANCE MOVING ICON OVERLAY (If Preempted Scenario) ── */}
          {scenario === "preempted" && showGreenWave && (
            <g transform="translate(560, 480)" className="animate-bounce">
              <circle cx="0" cy="0" r="14" fill="rgba(255, 64, 96, 0.3)" />
              <circle cx="0" cy="0" r="8" fill="#ff4060" />
              <text
                x="14"
                y="4"
                fill="#ff4060"
                fontSize="9"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="bold"
              >
                🚨 AMBULANCE (CORRIDOR SPEED: 52 KM/H)
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ── BOTTOM HUD TELEMETRY STRIP ───────────────────────────── */}
      <div className="relative z-20 bg-[#111318]/95 border-t border-[#2e3140] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#9096a8]">Selected:</span>
            <span className="font-bold text-[#e8eaf0] bg-[#1c1e24] px-2 py-0.5 rounded border border-[#2e3140]">
              {selectedNode.id} · {selectedNode.name}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[#9096a8]">
            <span>Zone:</span>
            <span className="text-[#e8eaf0]">{selectedNode.zone}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#9096a8]">Coord:</span>
            <span className="text-[#4d9fff]">{selectedNode.lat}, {selectedNode.lon}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#9096a8]">Queue:</span>
            <span className={`font-bold ${selectedNode.queueLengthM > 30 ? 'text-[#ffab1a]' : 'text-[#00c97a]'}`}>
              {selectedNode.queueLengthM.toFixed(1)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
