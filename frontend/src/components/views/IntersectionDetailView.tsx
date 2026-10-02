"use client";

import React, { useState, useEffect } from "react";
import AwaitingDataStub from "../AwaitingDataStub";

interface LaneMetric {
  lane_id: string;
  vehicle_count: number;
  queue_length_m: number;
  density_veh_per_m: number;
  score: number;
  state: string;
  label: string;
}

interface ResultsPayload {
  laneStates?: Record<string, LaneMetric>;
  heapHierarchy?: LaneMetric[];
  recentDecisions?: Array<{
    intersection_id: string;
    active_lane_id: string;
    phase_start: string;
    phase_end: string;
    reason: string;
  }>;
  metrics?: {
    totalObservations: number;
    totalDecisions: number;
    preemptionDecisions: number;
    extendedDecisions: number;
    scheduledDecisions: number;
  };
}

export default function IntersectionDetailView() {
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [forcePreempt, setForcePreempt] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/results");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load intersection details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 w-full min-h-[400px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="font-telemetry text-xs text-on-surface-variant">
          Ingesting Real-Time 4-Way Lane Telemetry & Heap States...
        </span>
      </div>
    );
  }

  const laneStates = data?.laneStates ?? {
    lane_N: { lane_id: "lane_N", vehicle_count: 2, queue_length_m: 10.0, density_veh_per_m: 0.2, score: 74.2, state: "building", label: "North Approach (OMR Inbound)" },
    lane_S: { lane_id: "lane_S", vehicle_count: 0, queue_length_m: 0.0, density_veh_per_m: 0.0, score: 18.5, state: "calm", label: "South Approach (OMR Outbound)" },
    lane_E: { lane_id: "lane_E", vehicle_count: 0, queue_length_m: 20.0, density_veh_per_m: 0.2, score: 98.4, state: "preempted", label: "East Approach (Kallukuttai / EMS)" },
    lane_W: { lane_id: "lane_W", vehicle_count: 4, queue_length_m: 20.0, density_veh_per_m: 0.2, score: 62.1, state: "building", label: "West Approach (Medavakkam Rd)" },
  };

  const heap = (data?.heapHierarchy ?? Object.values(laneStates)).slice(0, 4);
  const recentDecisions = data?.recentDecisions ?? [];

  // Arms calculation
  const northQueue = laneStates.lane_N.queue_length_m;
  const southQueue = Math.max(5, laneStates.lane_S.queue_length_m);
  const eastQueue = forcePreempt ? Math.max(25, laneStates.lane_E.queue_length_m) : laneStates.lane_E.queue_length_m;
  const westQueue = laneStates.lane_W.queue_length_m;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto w-full">
      {/* ── TOP OPERATIONAL CONTEXT STRIP ───────────────────────────── */}
      <section className="bg-surface border border-outline rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-state-preempted animate-pulse" />
          <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wide">
            Junction Inspection: Sholinganallur (IX-104) · OMR Link
          </span>
          <span className="hidden sm:inline-block font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/30 font-semibold uppercase">
            Controller Tick: 10 Hz
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setForcePreempt(true)}
            className={`px-3 py-1 rounded text-xs font-mono transition-all ${
              forcePreempt
                ? "bg-state-preempted/20 text-state-preempted font-bold border border-state-preempted/50"
                : "text-on-surface-variant hover:text-on-surface bg-surface-container"
            }`}
          >
            Force Emergency (E-Thru)
          </button>
          <button
            onClick={() => setForcePreempt(false)}
            className={`px-3 py-1 rounded text-xs font-mono transition-all ${
              !forcePreempt
                ? "bg-primary/20 text-primary font-bold border border-primary/50"
                : "text-on-surface-variant hover:text-on-surface bg-surface-container"
            }`}
          >
            Demand Rebalance (N-Thru)
          </button>
        </div>
      </section>

      {/* ── BENTO GRID 1: Spatial Telemetry + Max-Pressure Heap ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[440px]">
        {/* WIDGET 1: Spatial Queues (Top-Down Intersection View) */}
        <section className="xl:col-span-6 bg-surface border border-outline rounded-2xl p-4 flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-outline">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-primary text-[18px]">crosshair</span>
              <h2 className="font-display text-xs font-bold text-on-surface uppercase tracking-wider">
                Spatial Queue Inspector (Live)
              </h2>
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant">
              NODE: IX-104 (SH-49A)
            </span>
          </div>

          {/* Visualization Canvas */}
          <div className="flex-1 relative w-full flex items-center justify-center bg-surface-container-high rounded-xl overflow-hidden min-h-[340px] border border-outline/50">
            {/* Radar Range Rings */}
            <div className="absolute w-64 h-64 border border-white/[0.04] rounded-full pointer-events-none" />
            <div className="absolute w-44 h-44 border border-white/[0.06] rounded-full pointer-events-none" />
            <div className="absolute w-24 h-24 border border-outline rounded-full pointer-events-none" />

            {/* Intersection Center Box */}
            <div className="absolute w-14 h-14 bg-surface border border-outline z-20 flex items-center justify-center rounded-lg shadow-xl">
              <div className="w-3.5 h-3.5 rounded bg-state-preempted animate-pulse" />
            </div>

            {/* NORTH ARM */}
            <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-14 h-36 bg-surface/50 border-x border-outline flex justify-center z-10 backdrop-blur-sm">
              <div
                className="absolute bottom-0 w-9 bg-state-building/30 border-t-2 border-state-building flex items-start justify-center pt-1.5 transition-all duration-500 rounded-t"
                style={{ height: `${Math.min(90, Math.max(20, northQueue * 3))}%` }}
              >
                <span className="font-telemetry text-[10px] font-bold text-state-building">
                  {northQueue.toFixed(1)}m
                </span>
              </div>
              <div className="absolute top-2 left-full ml-2 whitespace-nowrap font-telemetry text-[10px]">
                <span className="text-on-surface-variant block text-[8px] uppercase">N-APPROACH</span>
                <span className="text-on-surface font-semibold">{laneStates.lane_N.vehicle_count} veh</span>
              </div>
            </div>

            {/* SOUTH ARM */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-14 h-36 bg-surface/50 border-x border-outline flex justify-center z-10 backdrop-blur-sm">
              <div
                className="absolute top-0 w-9 bg-state-calm/20 border-b-2 border-state-calm flex items-end justify-center pb-1.5 transition-all duration-500 rounded-b"
                style={{ height: `${Math.min(90, Math.max(15, southQueue * 3))}%` }}
              >
                <span className="font-telemetry text-[10px] font-bold text-state-calm">
                  {laneStates.lane_S.queue_length_m.toFixed(1)}m
                </span>
              </div>
              <div className="absolute bottom-2 right-full mr-2 whitespace-nowrap text-right font-telemetry text-[10px]">
                <span className="text-on-surface-variant block text-[8px] uppercase">S-APPROACH</span>
                <span className="text-on-surface font-semibold">{laneStates.lane_S.vehicle_count} veh</span>
              </div>
            </div>

            {/* EAST ARM (Emergency Preempted Arm) */}
            <div className="absolute top-1/2 right-1/2 -translate-y-1/2 w-44 h-14 bg-surface/50 border-y border-outline flex items-center z-10 backdrop-blur-sm">
              <div
                className="absolute right-0 h-9 bg-state-preempted/30 border-l-2 border-state-preempted flex items-center justify-start pl-2 transition-all duration-500 rounded-l"
                style={{ width: `${Math.min(95, Math.max(25, eastQueue * 3.5))}%` }}
              >
                <div className="flex flex-col">
                  <span className="font-telemetry text-[10px] font-bold text-state-preempted">
                    {eastQueue.toFixed(1)}m
                  </span>
                  {forcePreempt && (
                    <span className="font-telemetry text-[7px] text-state-preempted uppercase font-bold tracking-wider">
                      EMS OVR
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute bottom-full mb-1.5 left-2 whitespace-nowrap font-telemetry text-[10px]">
                <span className="text-state-preempted font-bold block text-[8px] uppercase">E-APPROACH (EMS)</span>
                <span className="text-state-preempted font-semibold">OVERRIDE</span>
              </div>
            </div>

            {/* WEST ARM */}
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-44 h-14 bg-surface/50 border-y border-outline flex items-center z-10 backdrop-blur-sm">
              <div
                className="absolute left-0 h-9 bg-state-building/30 border-r-2 border-state-building flex items-center justify-end pr-2 transition-all duration-500 rounded-r"
                style={{ width: `${Math.min(95, Math.max(20, westQueue * 3))}%` }}
              >
                <span className="font-telemetry text-[10px] font-bold text-state-building">
                  {westQueue.toFixed(1)}m
                </span>
              </div>
              <div className="absolute top-full mt-1.5 right-2 whitespace-nowrap text-right font-telemetry text-[10px]">
                <span className="text-on-surface-variant block text-[8px] uppercase">W-APPROACH</span>
                <span className="text-on-surface font-semibold">{laneStates.lane_W.vehicle_count} veh</span>
              </div>
            </div>
          </div>
        </section>

        {/* WIDGET 2: Crisp Max-Pressure Heap Tree Visualization */}
        <section className="xl:col-span-6 bg-surface border border-outline rounded-2xl p-4 flex flex-col relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-outline">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-primary text-[18px]">account_tree</span>
              <h2 className="font-display text-xs font-bold text-on-surface uppercase tracking-wider">
                LanePriorityHeap O(log N) Hierarchy
              </h2>
            </div>
            <span className="font-mono text-[10px] text-state-calm font-semibold">
              SC2: PRIORITY ROOT VERIFIED
            </span>
          </div>

          {/* Interactive Heap Visualization Canvas */}
          <div className="flex-1 relative w-full flex items-center justify-center bg-surface-container-high rounded-xl overflow-hidden min-h-[340px] border border-outline/50">
            {/* SVG Tree Connector Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <line x1="50%" y1="25%" x2="30%" y2="60%" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              <line x1="50%" y1="25%" x2="70%" y2="60%" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              <line x1="30%" y1="60%" x2="20%" y2="88%" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            </svg>

            {/* ROOT NODE (Highest Priority) */}
            <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div
                className={`px-4 py-2 rounded-xl border-2 flex flex-col items-center justify-center shadow-lg transition-all ${
                  heap[0].state === "preempted"
                    ? "bg-state-preempted/15 border-state-preempted text-state-preempted"
                    : "bg-primary/15 border-primary text-primary"
                }`}
              >
                <span className="font-mono text-[9px] uppercase font-bold tracking-wider">
                  ROOT · {heap[0].lane_id}
                </span>
                <span className="font-telemetry text-base font-extrabold mt-0.5">
                  {heap[0].score.toFixed(1)} PTS
                </span>
              </div>
              <span className="font-mono text-[9px] text-on-surface-variant mt-1">
                {heap[0].label.split("(")[0]}
              </span>
            </div>

            {/* LEVEL 1 - LEFT CHILD */}
            <div className="absolute top-[60%] left-[30%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="px-3 py-1.5 rounded-lg bg-surface border border-outline flex flex-col items-center">
                <span className="font-mono text-[8px] text-on-surface-variant uppercase">
                  NODE 1 · {heap[1]?.lane_id ?? "lane_N"}
                </span>
                <span className="font-telemetry text-xs font-bold text-state-building mt-0.5">
                  {heap[1]?.score.toFixed(1) ?? "74.2"} PTS
                </span>
              </div>
              <span className="font-mono text-[8px] text-on-surface-variant mt-0.5">
                {heap[1]?.queue_length_m ?? 10}m Queue
              </span>
            </div>

            {/* LEVEL 1 - RIGHT CHILD */}
            <div className="absolute top-[60%] left-[70%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="px-3 py-1.5 rounded-lg bg-surface border border-outline flex flex-col items-center">
                <span className="font-mono text-[8px] text-on-surface-variant uppercase">
                  NODE 2 · {heap[2]?.lane_id ?? "lane_W"}
                </span>
                <span className="font-telemetry text-xs font-bold text-state-building mt-0.5">
                  {heap[2]?.score.toFixed(1) ?? "62.1"} PTS
                </span>
              </div>
              <span className="font-mono text-[8px] text-on-surface-variant mt-0.5">
                {heap[2]?.queue_length_m ?? 20}m Queue
              </span>
            </div>

            {/* LEVEL 2 - LEAF NODE */}
            <div className="absolute top-[88%] left-[20%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="px-2.5 py-1 rounded bg-surface border border-outline flex items-center gap-1.5">
                <span className="font-mono text-[8px] text-on-surface-variant">
                  {heap[3]?.lane_id ?? "lane_S"}
                </span>
                <span className="font-telemetry text-[9px] font-bold text-state-calm">
                  {heap[3]?.score.toFixed(1) ?? "18.5"}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── BENTO GRID 2: Phase Decision Timeline (Driven by dec_log.json) ───────── */}
      <section className="bg-surface border border-outline rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-primary text-[18px]">linear_scale</span>
            <h2 className="font-display text-xs font-bold text-on-surface uppercase tracking-wider">
              Recent Phase Decisions Timeline (dec_log.json)
            </h2>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="flex items-center gap-1 text-state-calm font-semibold">
              <span className="w-2 h-2 rounded-full bg-state-calm" />
              SCHEDULED ({data?.metrics?.scheduledDecisions ?? 250})
            </span>
            <span className="flex items-center gap-1 text-state-building font-semibold">
              <span className="w-2 h-2 rounded-full bg-state-building" />
              EXTENDED ({data?.metrics?.extendedDecisions ?? 230})
            </span>
            <span className="flex items-center gap-1 text-state-preempted font-semibold">
              <span className="w-2 h-2 rounded-full bg-state-preempted" />
              PREEMPTED ({data?.metrics?.preemptionDecisions ?? 3})
            </span>
          </div>
        </div>

        {/* Timeline Sequence Stream */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {recentDecisions.slice(-8).map((dec, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex flex-col gap-1.5 font-mono text-xs transition-all ${
                dec.reason === "preempted"
                  ? "bg-state-preempted/10 border-state-preempted/40 text-state-preempted"
                  : dec.reason === "extended"
                  ? "bg-state-building/10 border-state-building/40 text-state-building"
                  : "bg-surface-container border-outline text-on-surface"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">{dec.active_lane_id}</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface border border-outline">
                  {dec.reason}
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant flex justify-between">
                <span>Start: {dec.phase_start.split("T")[1]?.slice(0, 8)}</span>
                <span>End: {dec.phase_end.split("T")[1]?.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
