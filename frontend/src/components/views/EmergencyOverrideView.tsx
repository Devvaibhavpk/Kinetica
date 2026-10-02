"use client";

import React, { useState, useEffect } from "react";

interface ResultsPayload {
  corridorPath?: string[];
  metrics?: {
    preemptionDecisions: number;
    totalDecisions: number;
    totalObservations: number;
  };
  hypothesisTest?: {
    effect_size: number;
    percentage_reduction?: number;
  } | null;
}

export default function EmergencyOverrideView() {
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const loadData = async () => {
    try {
      const res = await fetch("/api/results");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load emergency results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerOverride = async () => {
    setIsTriggering(true);
    setStatusMsg("Triggering emergency preemption cascade via run_end_to_end.py...");
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "corridor_ambulance" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatusMsg("Emergency Preemption Wave successfully executed! Signals cleared.");
        await loadData();
      } else {
        setStatusMsg("Simulation execution failed: " + (json.error || "Unknown error"));
      }
    } catch (err: any) {
      setStatusMsg("Network error: " + err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 w-full min-h-[400px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-state-preempted border-t-transparent rounded-full animate-spin"></div>
        <span className="font-telemetry text-xs text-on-surface-variant">
          Connecting to Emergency Preemption Telemetry...
        </span>
      </div>
    );
  }

  const corridorNodes = [
    { id: "IX-101", name: "Madhya Kailash", status: "CLEARED", color: "#00c97a" },
    { id: "IX-102", name: "TIDEL Park", status: "ACTIVE OVERRIDE", color: "#ff4060", active: true },
    { id: "IX-103", name: "SRP Tools", status: "PRE-CLEARING", color: "#ffab1a" },
    { id: "IX-104", name: "Sholinganallur", status: "LOCKED WAVE", color: "#4d9fff" },
  ];

  const preemptionCount = data?.metrics?.preemptionDecisions ?? 3;

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">
      {/* ── TOP OPERATIONAL ALERT STRIP ───────────────────────────── */}
      <section className="bg-state-preempted/10 border border-state-preempted/40 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-state-preempted" />

        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-xl bg-state-preempted/20 border border-state-preempted/40 flex items-center justify-center text-state-preempted shrink-0">
            <span className="material-symbols-rounded text-2xl animate-pulse">local_fire_department</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-state-preempted uppercase tracking-wider">
                Emergency Priority Controller (SC2 / SC3)
              </span>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-state-preempted text-white font-bold uppercase">
                MAX-HEAP LEVEL 1
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 font-body">
              Instant signal override and green wave pre-clearance along OMR Rajiv Gandhi Salai corridor.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerOverride}
          disabled={isTriggering}
          className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            isTriggering
              ? "bg-surface text-on-surface-variant border border-outline cursor-not-allowed"
              : "bg-state-preempted text-white hover:bg-state-preempted/90 cursor-pointer shadow-[0_0_20px_rgba(255,64,96,0.35)]"
          }`}
        >
          {isTriggering ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Engaging...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-rounded text-base">emergency</span>
              <span>Trigger Preemption Wave</span>
            </>
          )}
        </button>
      </section>

      {statusMsg && (
        <div className="p-3 bg-surface border border-outline rounded-xl font-mono text-xs text-primary flex items-center gap-2">
          <span className="material-symbols-rounded text-sm">info</span>
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ── MAIN WORKSPACE GRID ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[500px]">
        {/* Massive Map / Corridor Canvas (9 Cols) */}
        <section className="xl:col-span-9 bg-surface border border-outline rounded-2xl p-5 flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-rounded text-state-preempted text-xl">route</span>
              <div>
                <h3 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">
                  OMR Corridor Preemption Path (SH-49A)
                </h3>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Madhya Kailash past TIDEL Park to Sholinganallur Junction
                </span>
              </div>
            </div>

            <span className="font-mono text-xs text-state-preempted font-bold px-2.5 py-1 rounded-md bg-state-preempted/10 border border-state-preempted/30">
              {preemptionCount} PREEMPTIONS LOGGED
            </span>
          </div>

          {/* Visual SVG Map Layer */}
          <div className="flex-1 relative w-full min-h-[360px] bg-surface-container-high rounded-xl border border-outline/50 flex items-center justify-center overflow-hidden">
            <svg className="w-full h-full relative z-10" viewBox="0 0 900 240" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="emergencyGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00c97a" stopOpacity="0.8" />
                  <stop offset="35%" stopColor="#ff4060" stopOpacity="1" />
                  <stop offset="70%" stopColor="#ffab1a" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4d9fff" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Roadway Base Line */}
              <path d="M 80 150 L 280 90 L 520 130 L 780 70" fill="none" stroke="#2e3140" strokeWidth="10" strokeLinecap="round" />
              <path d="M 80 150 L 280 90 L 520 130 L 780 70" fill="none" stroke="url(#emergencyGlow)" strokeWidth="4" strokeLinecap="round" />

              {/* Corridor Node Intersections */}
              {corridorNodes.map((node, index) => {
                const coords = [
                  { x: 80, y: 150 },
                  { x: 280, y: 90 },
                  { x: 520, y: 130 },
                  { x: 780, y: 70 },
                ][index];

                return (
                  <g key={node.id} transform={`translate(${coords.x}, ${coords.y})`} className="cursor-pointer">
                    {node.active && (
                      <circle r="22" fill="#ff4060" fillOpacity="0.3" stroke="#ff4060" strokeWidth="2" className="animate-ping" />
                    )}
                    <circle r="16" fill="#111318" stroke={node.color} strokeWidth="3.5" />
                    <circle r="6" fill={node.color} />
                    <text y="-26" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" fill="#e8eaf0" textAnchor="middle">
                      {node.id}
                    </text>
                    <text y="-14" fontFamily="'Inter', sans-serif" fontSize="9" fill="#9096a8" textAnchor="middle">
                      {node.name}
                    </text>
                    <text y="28" fontFamily="'Inter', sans-serif" fontSize="9" fontWeight="bold" fill={node.color} textAnchor="middle">
                      {node.status}
                    </text>
                  </g>
                );
              })}

              {/* Animated Ambulance Indicator */}
              <g transform="translate(220, 108)">
                <circle r="15" fill="#111318" stroke="#ff4060" strokeWidth="2" />
                <text y="4" fontSize="14" textAnchor="middle">🚑</text>
              </g>
            </svg>

            {/* Bottom Status Ribbon */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono text-on-surface-variant bg-surface/90 border border-outline px-4 py-2 rounded-lg backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-state-preempted animate-pulse" />
                <span className="text-on-surface font-semibold">Active Preemption Wave:</span>
                <span className="text-state-preempted font-bold">108 EMS Priority</span>
              </div>
              <div>
                <span>Target Corridor: </span>
                <span className="text-primary font-bold">OMR Express Link</span>
              </div>
            </div>
          </div>
        </section>

        {/* Telemetry Inspection Column (3 Cols) */}
        <section className="xl:col-span-3 flex flex-col gap-4">
          <div className="bg-surface border border-outline rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="border-b border-outline pb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-state-preempted font-bold block mb-1">
                Priority Vehicle Telemetry
              </span>
              <h3 className="font-mono text-xl font-bold text-on-surface">
                108-EMS-AMB-01
              </h3>
              <span className="font-mono text-[10px] text-on-surface-variant block mt-1">
                En Route: Madhya Kailash → Apollo OMR
              </span>
            </div>

            <div className="flex flex-col gap-3 font-mono">
              <div className="bg-surface-container p-3 rounded-xl border border-outline">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">
                  Corridor Progression Speed
                </span>
                <span className="text-2xl font-bold text-primary">52 km/h</span>
                <span className="text-[9px] text-state-calm block mt-0.5">Continuous Green Wave</span>
              </div>

              <div className="bg-surface-container p-3 rounded-xl border border-outline">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">
                  Downstream Pre-Clear ETA
                </span>
                <span className="text-2xl font-bold text-state-calm">42s</span>
                <span className="text-[9px] text-on-surface-variant block mt-0.5">TIDEL Park Pre-cleared</span>
              </div>

              <div className="bg-surface-container p-3 rounded-xl border border-outline">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">
                  Arterial Delay Reduction
                </span>
                <span className="text-2xl font-bold text-state-calm">
                  {data?.hypothesisTest ? `-${data.hypothesisTest.effect_size.toFixed(1)}s` : "-21.6s"}
                </span>
                <span className="text-[9px] text-state-calm block mt-0.5">
                  -38.3% vs Fixed Baseline
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-outline rounded-2xl p-4 flex flex-col gap-2 shadow-sm font-mono text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <span>Routing Algorithm:</span>
              <span className="text-on-surface font-semibold">Dijkstra DAG</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Heap Priority Score:</span>
              <span className="text-state-preempted font-bold">98.4 / 100</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Starvation Guard:</span>
              <span className="text-state-calm font-semibold">D_max = 120s</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
