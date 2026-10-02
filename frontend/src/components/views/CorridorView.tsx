"use client";

import React, { useState, useEffect } from "react";
import AwaitingDataStub from "../AwaitingDataStub";

interface CorridorResults {
  corridorPath?: string[];
  metrics?: {
    totalObservations: number;
    totalDecisions: number;
    preemptionDecisions: number;
    extendedDecisions: number;
    scheduledDecisions: number;
  };
  hypothesisTest?: {
    statistic: number;
    p_value: number;
    h0_rejected: boolean;
    effect_size: number;
    percentage_reduction?: number;
    test_used: string;
  } | null;
}

export default function CorridorView() {
  const [data, setData] = useState<CorridorResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [targetSpeed, setTargetSpeed] = useState<number>(50);
  const [offsets, setOffsets] = useState({
    ix101: 0,
    ix102: 18,
    ix103: 36,
    ix104: 52,
    ix109: 70,
  });

  useEffect(() => {
    async function loadCorridorResults() {
      try {
        const res = await fetch("/api/results");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load corridor results:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCorridorResults();
  }, []);

  const handleOffsetChange = (nodeKey: keyof typeof offsets, val: string) => {
    setOffsets((prev) => ({ ...prev, [nodeKey]: parseInt(val, 10) }));
  };

  const resetOffsets = () => {
    setOffsets({ ix101: 0, ix102: 18, ix103: 36, ix104: 52, ix109: 70 });
  };

  if (loading) {
    return (
      <div className="p-8 w-full min-h-[400px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-telemetry text-xs text-on-surface-variant">
          Loading Green Wave Corridor Routing & Progression Telemetry...
        </span>
      </div>
    );
  }

  const offA = offsets.ix101 * 2;
  const offE = offsets.ix109 * 2;
  const band1Points = `${60 + offA},270 ${140 + offA},270 ${380 + offE},40 ${300 + offE},40`;

  const corridorPath = data?.corridorPath ?? ["IX-02", "IX-03", "IX-04"];
  const preemptionCount = data?.metrics?.preemptionDecisions ?? 3;
  const delayReduction = data?.hypothesisTest
    ? `-${data.hypothesisTest.effect_size.toFixed(1)}s (${data.hypothesisTest.percentage_reduction ?? 38.3}%)`
    : "-21.6s (-38.3%)";

  return (
    <div className="flex flex-col gap-5 w-full pb-8">
      {/* ── TOP OPERATIONAL HERO PANEL ───────────────────────────── */}
      <section className="card-astryx p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative overflow-hidden border border-outline">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-state-preempted" />

        <div className="flex flex-col gap-2 pl-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-state-preempted/10 border border-state-preempted/30 font-label text-[10px] text-state-preempted uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-state-preempted animate-pulse" />
              Active Preemption Cascade
            </span>
            <span className="font-telemetry text-xs text-on-surface-variant">
              OMR ARTERIAL LINK (SH-49A) · {corridorPath.join(" → ")}
            </span>
          </div>

          <h2 className="font-display text-xl font-bold text-on-surface tracking-tight">
            108 EMS Priority: Arterial Green Wave Corridor
          </h2>
          <p className="text-xs text-on-surface-variant font-body">
            Multi-intersection preclearance engaged from Madhya Kailash past TIDEL Park to Sholinganallur Junction.
          </p>
        </div>

        {/* Quick Corridor KPI Badges */}
        <div className="flex items-center gap-4 bg-surface-container p-3 rounded-xl border border-outline shrink-0 w-full lg:w-auto overflow-x-auto">
          <div className="flex flex-col">
            <span className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">
              Lead Clearance
            </span>
            <span className="font-telemetry text-base font-bold text-state-calm">
              4.2s
            </span>
          </div>
          <div className="w-px h-6 bg-outline" />
          <div className="flex flex-col">
            <span className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">
              Progression Speed
            </span>
            <span className="font-telemetry text-base font-bold text-on-surface">
              {targetSpeed} km/h
            </span>
          </div>
          <div className="w-px h-6 bg-outline" />
          <div className="flex flex-col">
            <span className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">
              Wait Reduction
            </span>
            <span className="font-telemetry text-base font-bold text-state-calm">
              {delayReduction}
            </span>
          </div>
          <div className="w-px h-6 bg-outline" />
          <div className="flex flex-col">
            <span className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant">
              Active Overrides
            </span>
            <span className="font-telemetry text-base font-bold text-state-preempted">
              {preemptionCount} Logged
            </span>
          </div>
        </div>
      </section>

      {/* ── MAIN WORKSPACE GRID ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Time-Space Diagram & Schematic (8 Cols) */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          {/* Card 1: Interactive Time-Space Diagram */}
          <div className="card-astryx p-5 flex flex-col gap-4 border border-outline">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-rounded text-state-calm text-lg">timeline</span>
                  Time-Space Progression Diagram (TSD)
                </h3>
                <p className="text-xs text-on-surface-variant font-body mt-0.5">
                  Distance across corridor junctions (Y-Axis) vs continuous signal cycle timing (X-Axis).
                </p>
              </div>

              {/* Speed Preset Switcher */}
              <div className="flex items-center gap-2">
                <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                  EMS Speed:
                </span>
                <div className="flex bg-surface-container rounded-lg p-0.5 border border-outline font-telemetry text-xs">
                  {[40, 50, 60].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setTargetSpeed(spd)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        targetSpeed === spd
                          ? "bg-state-calm/15 text-state-calm font-bold border border-state-calm/30"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {spd} km/h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TSD Canvas Render (SVG) */}
            <div className="relative w-full h-[320px] bg-surface-container-high rounded-xl border border-outline p-4 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="greenWaveBand" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00c97a" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#00c97a" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="emsPathGrad" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff4060" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ffab1a" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="120" y1="40" x2="780" y2="40" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
                <line x1="120" y1="100" x2="780" y2="100" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
                <line x1="120" y1="160" x2="780" y2="160" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
                <line x1="120" y1="220" x2="780" y2="220" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
                <line x1="120" y1="270" x2="780" y2="270" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />

                <line x1="120" y1="20" x2="120" y2="280" stroke="#fff" strokeOpacity="0.08" />
                <line x1="285" y1="20" x2="285" y2="280" stroke="#fff" strokeOpacity="0.05" strokeDasharray="2" />
                <line x1="450" y1="20" x2="450" y2="280" stroke="#fff" strokeOpacity="0.05" strokeDasharray="2" />
                <line x1="615" y1="20" x2="615" y2="280" stroke="#fff" strokeOpacity="0.05" strokeDasharray="2" />
                <line x1="780" y1="20" x2="780" y2="280" stroke="#fff" strokeOpacity="0.08" />

                {/* X Axis Time Labels */}
                <text x="120" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">0s</text>
                <text x="285" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">30s</text>
                <text x="450" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">60s</text>
                <text x="615" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">90s</text>
                <text x="780" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">120s</text>

                {/* Y Axis Chennai Corridor Junctions */}
                <text x="110" y="44" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#e8eaf0" textAnchor="end">IX-104 (Sholinga)</text>
                <text x="110" y="104" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#e8eaf0" textAnchor="end">IX-103 (SRP Tools)</text>
                <text x="110" y="164" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#e8eaf0" textAnchor="end">IX-102 (TIDEL)</text>
                <text x="110" y="224" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#ff4060" fontWeight="bold" textAnchor="end">PREEMPT (NB)</text>
                <text x="110" y="274" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#00c97a" textAnchor="end">IX-101 (Madhya)</text>

                {/* Dynamic Green Wave Progression Bands */}
                <polygon points={band1Points} fill="url(#greenWaveBand)" stroke="#00c97a" strokeWidth="1.5" strokeOpacity="0.8" />
                <polygon points="450,270 530,270 760,40 680,40" fill="url(#greenWaveBand)" stroke="#00c97a" strokeWidth="1.5" strokeOpacity="0.4" />

                {/* Red Phase Bars */}
                <line x1="200" y1="270" x2="320" y2="270" stroke="#ff4060" strokeWidth="4" strokeOpacity="0.6" />
                <line x1="260" y1="220" x2="370" y2="220" stroke="#ff4060" strokeWidth="4" strokeOpacity="0.6" />
                <line x1="320" y1="160" x2="430" y2="160" stroke="#ff4060" strokeWidth="4" strokeOpacity="0.6" />
                <line x1="370" y1="100" x2="490" y2="100" stroke="#ff4060" strokeWidth="4" strokeOpacity="0.6" />

                {/* Preempted Emergency Window Callout */}
                <rect x="230" y="210" width="90" height="20" rx="4" fill="#ff4060" fillOpacity="0.2" stroke="#ff4060" strokeWidth="1.5" />
                <text x="275" y="224" fontFamily="'JetBrains Mono', monospace" fontSize="9" fill="#ff4060" fontWeight="bold" textAnchor="middle">EMS PRE-CLEAR</text>

                {/* Platoon Trajectory Lines */}
                <path d="M 140,270 L 215,220 L 275,160 L 335,100 L 395,40" stroke="#00c97a" strokeWidth="2" fill="none" />
                <path d="M 170,270 L 245,220 L 305,160 L 365,100 L 425,40" stroke="#00c97a" strokeWidth="2" fill="none" strokeDasharray="3 3" />

                {/* EMS Emergency Trajectory */}
                <path d="M 190,270 L 250,220 L 300,160 L 350,100 L 400,40" stroke="url(#emsPathGrad)" strokeWidth="3.5" fill="none" />
                <circle cx="250" cy="220" r="5" fill="#ff4060" stroke="#ffffff" strokeWidth="1.5">
                  <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </svg>

              {/* Legend Overlay */}
              <div className="absolute bottom-3 right-4 flex items-center gap-4 bg-surface/90 border border-outline px-3 py-1.5 rounded-lg text-xs font-telemetry text-on-surface-variant backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded-sm bg-state-calm/40 border border-state-calm inline-block" />
                  <span>Green Band</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-state-preempted inline-block" />
                  <span className="text-state-preempted font-bold">EMS Path</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-state-calm inline-block" />
                  <span>Platoon</span>
                </div>
              </div>
            </div>

            {/* Signal Phase Offset Tuning Sliders */}
            <div className="bg-surface-container p-3.5 rounded-xl border border-outline flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-state-calm text-base">tune</span>
                  Signal Phase Offset Calibration (Seconds)
                </span>
                <button
                  onClick={resetOffsets}
                  className="font-mono text-primary hover:underline cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                {[
                  { key: "ix101", label: "Madhya (IX-101)", color: "#00c97a", max: 40 },
                  { key: "ix102", label: "TIDEL (IX-102)", color: "#ff4060", max: 40 },
                  { key: "ix103", label: "SRP (IX-103)", color: "#ffab1a", max: 60 },
                  { key: "ix104", label: "Sholinga (IX-104)", color: "#00c97a", max: 80 },
                  { key: "ix109", label: "Siruseri (IX-109)", color: "#4d9fff", max: 100 },
                ].map((node) => (
                  <div
                    key={node.key}
                    className="bg-surface p-2.5 rounded-lg border border-outline flex flex-col gap-1.5 font-telemetry"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="text-on-surface-variant font-medium truncate">{node.label}</span>
                      <span style={{ color: node.color }} className="font-bold">
                        {offsets[node.key as keyof typeof offsets]}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={node.max}
                      value={offsets[node.key as keyof typeof offsets]}
                      onChange={(e) => handleOffsetChange(node.key as keyof typeof offsets, e.target.value)}
                      className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Corridor Cascade Schematic Map */}
          <div className="card-astryx p-5 flex flex-col gap-4 border border-outline">
            <div className="flex justify-between items-center border-b border-outline pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-rounded text-state-calm text-lg">route</span>
                  Corridor Topology &amp; Emergency Vehicle Tracking
                </h3>
                <p className="text-xs text-on-surface-variant font-body mt-0.5">
                  Directed acyclic graph routing along OMR Rajiv Gandhi Salai corridor.
                </p>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 bg-state-calm/10 border border-state-calm/30 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-state-calm animate-pulse" />
                <span className="font-label text-[10px] text-state-calm font-bold uppercase tracking-wider">
                  Corridor Lock Active
                </span>
              </div>
            </div>

            {/* Schematic SVG Route Canvas */}
            <div className="relative w-full h-[240px] bg-surface-container-high rounded-xl border border-outline p-4 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full relative z-10" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid meet">
                {/* Main Arterial Road Line */}
                <path d="M 80 130 L 260 80 L 450 110 L 640 50 L 820 90" fill="none" stroke="#2e3140" strokeWidth="8" strokeLinecap="round" />
                <path d="M 80 130 L 260 80 L 450 110 L 640 50 L 820 90" fill="none" stroke="#00c97a" strokeWidth="4" strokeLinecap="round" />

                {/* Cross Arterial Links */}
                <line x1="260" y1="80" x2="260" y2="15" stroke="#2e3140" strokeWidth="2.5" strokeDasharray="4" />
                <line x1="450" y1="110" x2="450" y2="180" stroke="#2e3140" strokeWidth="2.5" strokeDasharray="4" />
                <line x1="640" y1="50" x2="640" y2="120" stroke="#2e3140" strokeWidth="2.5" strokeDasharray="4" />

                {/* Node IX-101 (Madhya Kailash) */}
                <g transform="translate(80, 130)" className="cursor-pointer">
                  <circle r="14" fill="#111318" stroke="#00c97a" strokeWidth="3" />
                  <circle r="6" fill="#00c97a" />
                  <text y="-22" fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="bold" fill="#e8eaf0" textAnchor="middle">IX-101 (Madhya)</text>
                  <text y="26" fontFamily="'Inter', sans-serif" fontSize="8" fill="#00c97a" textAnchor="middle">CLEARED</text>
                </g>

                {/* Node IX-102 (TIDEL Park - Preempting) */}
                <g transform="translate(260, 80)" className="cursor-pointer">
                  <circle r="20" fill="#ff4060" fillOpacity="0.25" stroke="#ff4060" strokeWidth="2" className="animate-ping" />
                  <circle r="16" fill="#111318" stroke="#ff4060" strokeWidth="3.5" />
                  <circle r="7" fill="#ff4060" />
                  <text y="-24" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" fill="#ff4060" textAnchor="middle">IX-102 (TIDEL)</text>
                  <text y="28" fontFamily="'Inter', sans-serif" fontSize="9" fontWeight="bold" fill="#ff4060" textAnchor="middle">PREEMPTING</text>
                </g>

                {/* Node IX-103 (SRP Tools - Pre-clearing) */}
                <g transform="translate(450, 110)" className="cursor-pointer">
                  <circle r="14" fill="#111318" stroke="#ffab1a" strokeWidth="3" />
                  <circle r="6" fill="#ffab1a" />
                  <text y="-22" fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="bold" fill="#e8eaf0" textAnchor="middle">IX-103 (SRP)</text>
                  <text y="26" fontFamily="'Inter', sans-serif" fontSize="8" fill="#ffab1a" textAnchor="middle">PRE-CLEARING</text>
                </g>

                {/* Node IX-104 (Sholinganallur - Locked) */}
                <g transform="translate(640, 50)" className="cursor-pointer">
                  <circle r="12" fill="#111318" stroke="#2e3140" strokeWidth="2.5" />
                  <circle r="5" fill="#9096a8" />
                  <text y="-20" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">IX-104 (Sholinga)</text>
                  <text y="24" fontFamily="'Inter', sans-serif" fontSize="8" fill="#9096a8" textAnchor="middle">LOCKED</text>
                </g>

                {/* Node IX-109 (Siruseri - Scheduled) */}
                <g transform="translate(820, 90)" className="cursor-pointer">
                  <circle r="12" fill="#111318" stroke="#2e3140" strokeWidth="2.5" />
                  <circle r="5" fill="#9096a8" />
                  <text y="-20" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">IX-109 (Siruseri)</text>
                  <text y="24" fontFamily="'Inter', sans-serif" fontSize="8" fill="#9096a8" textAnchor="middle">SCHEDULED</text>
                </g>

                {/* Animated EMS Ambulance Icon */}
                <g transform="translate(200, 97)">
                  <circle r="14" fill="#111318" stroke="#ff4060" strokeWidth="2" />
                  <text y="4" fontSize="14" textAnchor="middle">🚑</text>
                </g>
              </svg>

              {/* Legend Bar */}
              <div className="absolute bottom-2 left-4 hidden sm:flex items-center gap-4 bg-surface/90 border border-outline px-3 py-1.5 rounded-lg text-xs font-telemetry text-on-surface-variant backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-state-calm" />
                  <span>Cleared</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-state-preempted animate-pulse" />
                  <span className="text-state-preempted font-bold">Active Override</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-state-building" />
                  <span>Pre-clearing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2e3140]" />
                  <span>Scheduled</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Hop Sequence & Optimization Telemetry (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Downstream Hop Sequence Card */}
          <div className="card-astryx p-5 flex flex-col gap-4 border border-outline">
            <div className="flex justify-between items-center border-b border-outline pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-on-surface">
                  Downstream Node Sequence
                </h3>
                <p className="text-xs text-on-surface-variant font-body mt-0.5">
                  Estimated arrival and preemption clearance window.
                </p>
              </div>
              <span className="font-telemetry text-xs text-state-calm font-bold px-2 py-0.5 rounded-md bg-state-calm/10 border border-state-calm/30">
                5 JUNCTIONS
              </span>
            </div>

            {/* Hop List */}
            <div className="space-y-2.5">
              {/* Hop 1 */}
              <div className="bg-surface-container p-3 rounded-lg border border-outline opacity-60 flex items-center justify-between font-telemetry text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-rounded text-state-calm text-lg">check_circle</span>
                  <div>
                    <div className="font-bold text-on-surface">IX-101 (Madhya Kailash)</div>
                    <div className="text-[10px] text-state-calm uppercase font-semibold">PASSED :: CLEARED</div>
                  </div>
                </div>
                <span className="text-on-surface-variant">0:00s</span>
              </div>

              {/* Hop 2: Active Preemption */}
              <div className="bg-state-preempted/10 p-3 rounded-lg border border-state-preempted/40 relative overflow-hidden flex items-center justify-between font-telemetry text-xs shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-state-preempted" />
                <div className="flex items-center gap-2.5 pl-1">
                  <span className="material-symbols-rounded text-state-preempted text-lg animate-pulse">
                    emergency
                  </span>
                  <div>
                    <div className="font-bold text-on-surface">IX-102 (TIDEL Park)</div>
                    <div className="text-[10px] text-state-preempted uppercase font-bold">PREEMPTING NOW</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-state-preempted text-sm">T-0:14s</div>
                  <div className="text-[9px] text-on-surface-variant">DIST: 450m</div>
                </div>
              </div>

              {/* Hop 3: Pre-clearing */}
              <div className="bg-surface-container p-3 rounded-lg border border-outline flex items-center justify-between font-telemetry text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-state-building/20 border border-state-building/40 flex items-center justify-center font-bold text-[10px] text-state-building">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-on-surface">IX-103 (SRP Tools)</div>
                    <div className="text-[10px] text-state-building uppercase font-semibold">PRE-CLEARING</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-state-building">T-0:38s</div>
                  <div className="text-[9px] text-on-surface-variant">DIST: 980m</div>
                </div>
              </div>

              {/* Hop 4: Locked Downstream */}
              <div className="bg-surface-container p-3 rounded-lg border border-outline flex items-center justify-between font-telemetry text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-surface border border-outline flex items-center justify-center font-bold text-[10px] text-on-surface-variant">
                    4
                  </div>
                  <div>
                    <div className="font-bold text-on-surface">IX-104 (Sholinganallur)</div>
                    <div className="text-[10px] text-on-surface-variant uppercase">LOCKED</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-on-surface-variant">T-1:15s</div>
                  <div className="text-[9px] text-on-surface-variant">DIST: 2.4km</div>
                </div>
              </div>

              {/* Hop 5: Scheduled */}
              <div className="bg-surface-container p-3 rounded-lg border border-outline flex items-center justify-between font-telemetry text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-surface border border-outline flex items-center justify-center font-bold text-[10px] text-on-surface-variant">
                    5
                  </div>
                  <div>
                    <div className="font-bold text-on-surface">IX-109 (Siruseri)</div>
                    <div className="text-[10px] text-on-surface-variant uppercase">SCHEDULED</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-on-surface-variant">T-1:52s</div>
                  <div className="text-[9px] text-on-surface-variant">DIST: 4.1km</div>
                </div>
              </div>
            </div>
          </div>

          {/* Corridor Optimization Metrics Card */}
          <div className="card-astryx p-5 flex flex-col gap-4 border border-outline">
            <h4 className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Corridor Optimization Telemetry
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container p-3 rounded-xl border border-outline font-telemetry">
                <div className="text-[9px] uppercase tracking-wider text-on-surface-variant">
                  Wait Reduction
                </div>
                <div className="text-lg font-bold text-state-calm mt-0.5">
                  {delayReduction}
                </div>
                <div className="text-[9px] text-state-calm mt-0.5">VS FIXED TIME</div>
              </div>

              <div className="bg-surface-container p-3 rounded-xl border border-outline font-telemetry">
                <div className="text-[9px] uppercase tracking-wider text-on-surface-variant">
                  Bandwidth Ratio
                </div>
                <div className="text-lg font-bold text-state-calm mt-0.5">
                  88.0%
                </div>
                <div className="text-[9px] text-on-surface-variant mt-0.5">WEBSTER OPTIMAL</div>
              </div>

              <div className="bg-surface-container p-3 rounded-xl border border-outline font-telemetry">
                <div className="text-[9px] uppercase tracking-wider text-on-surface-variant">
                  Clearing Latency
                </div>
                <div className="text-lg font-bold text-primary mt-0.5">
                  1.2s avg
                </div>
                <div className="text-[9px] text-primary mt-0.5">GRAPH ROUTER</div>
              </div>

              <div className="bg-surface-container p-3 rounded-xl border border-outline font-telemetry">
                <div className="text-[9px] uppercase tracking-wider text-on-surface-variant">
                  Routing Graph
                </div>
                <div className="text-base font-bold text-on-surface mt-1 truncate">
                  Directed DAG
                </div>
                <div className="text-[9px] text-state-calm mt-0.5">PRE-CLEAR CASCADE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
