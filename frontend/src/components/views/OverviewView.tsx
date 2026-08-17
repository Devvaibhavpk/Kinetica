"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { ChennaiNode } from "../ChennaiRealMap";

// Dynamic import for Leaflet map component (SSR safe)
const ChennaiRealMap = dynamic(() => import("../ChennaiRealMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] bg-[#0c0e12] flex flex-col items-center justify-center gap-3 text-on-surface-variant font-mono text-xs">
      <div className="w-6 h-6 border-2 border-[#4d9fff] border-t-transparent rounded-full animate-spin"></div>
      <span>Loading Chennai Geospatial Map (CartoDB Tiles)...</span>
    </div>
  ),
});

export default function OverviewView() {
  const [scenario, setScenario] = useState<"normal" | "building" | "preempted">("preempted");
  const [selectedNode, setSelectedNode] = useState<ChennaiNode>({
    id: "IX-104",
    name: "Sholinganallur Junction",
    zone: "OMR & Medavakkam-Kandanchavadi Arterial Link",
    lat: 12.901,
    lon: 80.2279,
    queueLengthM: 34.0,
    density: 0.74,
    arrivalRate: "1.42 V/S",
    activePhase: "E-Thru Preempted Green Wave",
    status: "preempted",
    policy: "MAX-PREEMPT",
    nemaSplit: "48s / 32s / 20s / 20s",
    speedKmH: 52,
    classCounts: { cars: 62, twoWheelers: 140, autos: 35, buses: 7, ambulances: 1 },
    activePreemption: {
      vehicle: "AMBULANCE",
      etaSeconds: 65,
      corridorName: "OMR Rajiv Gandhi Express Wave",
    },
  });

  const isNormal = scenario === "normal";
  const isBuilding = scenario === "building";
  const isPreempted = scenario === "preempted";

  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* ── TOP OPERATIONAL DIRECTIVE STRIP ───────────────────────────── */}
      <section className="bg-[#161820] border border-[#2e3140] rounded-xl p-3 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-3 pl-1">
          {isPreempted ? (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff4060] animate-pulse"></span>
              <span className="font-mono text-xs font-bold text-[#ff4060] tracking-wide uppercase">
                ACTIVE CORRIDOR DIRECTIVE: EMERGENCY PREEMPTION (OMR RAJIV GANDHI EXPRESS)
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] bg-[#ff4060]/10 text-[#ff4060] px-2 py-0.5 rounded border border-[#ff4060]/30 font-semibold uppercase">
                Max-Heap Score: 98.4 · ETA: 42s
              </span>
            </div>
          ) : isBuilding ? (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffab1a] animate-pulse"></span>
              <span className="font-mono text-xs font-bold text-[#ffab1a] tracking-wide uppercase">
                ACTIVE DIRECTIVE: PEAK QUEUE DISSIPATION (POISSON DEMAND-RESPONSIVE)
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] bg-[#ffab1a]/10 text-[#ffab1a] px-2 py-0.5 rounded border border-[#ffab1a]/30 font-semibold uppercase">
                Green Ext: +8.4s · Dynamic Gap-Out
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00c97a]"></span>
              <span className="font-mono text-xs font-bold text-[#e8eaf0] tracking-wide uppercase">
                ACTIVE DIRECTIVE: NOMINAL BASELINE CYCLE (FIXED-SPLIT NEMA PHASING)
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] bg-[#2c2f3a] text-[#9096a8] px-2 py-0.5 rounded border border-[#2e3140] font-semibold uppercase">
                Cycle: 120s · Equal Split
              </span>
            </div>
          )}
        </div>

        {/* Scenario Switcher Controls */}
        <div className="flex items-center bg-[#111318] border border-[#2e3140] p-1 rounded-lg">
          <button
            onClick={() => setScenario("normal")}
            className={`px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              isNormal
                ? "bg-[#2c2f3a] text-[#e8eaf0] font-bold border border-[#4d9fff]/30 shadow-sm"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            Baseline
          </button>
          <button
            onClick={() => setScenario("building")}
            className={`px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              isBuilding
                ? "bg-[#ffab1a]/20 text-[#ffab1a] font-bold border border-[#ffab1a]/40 shadow-sm"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            Congestion
          </button>
          <button
            onClick={() => setScenario("preempted")}
            className={`px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              isPreempted
                ? "bg-[#ff4060]/20 text-[#ff4060] font-bold border border-[#ff4060]/40 shadow-sm"
                : "text-[#9096a8] hover:text-[#e8eaf0]"
            }`}
          >
            Emergency
          </button>
        </div>
      </section>

      {/* ── MAIN WORKSPACE GRID ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-[520px]">
        {/* Map Canvas (8 Cols) */}
        <section className="xl:col-span-8 bg-[#161820] border border-[#2e3140] rounded-2xl flex flex-col relative overflow-hidden shadow-lg">
          <div className="flex-1 relative w-full h-full bg-[#0c0e12] min-h-[460px] flex flex-col">
            <ChennaiRealMap
              scenario={scenario}
              selectedNodeId={selectedNode.id}
              onSelectNode={(node) => setSelectedNode(node)}
            />
          </div>
        </section>

        {/* Telemetry Inspection Panel (4 Cols) */}
        <section className="xl:col-span-4 flex flex-col gap-4">
          {/* Junction Header & Live Status Card */}
          <div className="bg-[#161820] border border-[#2e3140] rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
            <div className="flex justify-between items-start border-b border-[#2e3140] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#4d9fff]">
                    {selectedNode.id}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#2c2f3a] text-[#9096a8]">
                    CMA JCT
                  </span>
                </div>
                <h3 className="font-sans text-sm font-semibold text-[#e8eaf0] mt-0.5">
                  {selectedNode.name}
                </h3>
                <p className="font-mono text-[10px] text-[#9096a8] truncate mt-0.5">
                  {selectedNode.zone}
                </p>
              </div>

              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  selectedNode.status === "preempted"
                    ? "bg-[#ff4060]/20 text-[#ff4060] border border-[#ff4060]/40"
                    : selectedNode.status === "building"
                    ? "bg-[#ffab1a]/20 text-[#ffab1a] border border-[#ffab1a]/40"
                    : "bg-[#00c97a]/20 text-[#00c97a] border border-[#00c97a]/40"
                }`}
              >
                {selectedNode.policy}
              </span>
            </div>

            {/* Core Physical & Statistical Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#111318] p-2.5 rounded-lg border border-[#2e3140]">
                <span className="font-mono text-[9px] text-[#9096a8] uppercase block mb-0.5">
                  Queue Length (m)
                </span>
                <div className="flex items-baseline justify-between">
                  <span
                    className={`font-mono text-base font-bold ${
                      selectedNode.queueLengthM > 35 ? "text-[#ffab1a]" : "text-[#e8eaf0]"
                    }`}
                  >
                    {selectedNode.queueLengthM.toFixed(1)}m
                  </span>
                  <span className="font-mono text-[10px] text-[#9096a8]">
                    ~{Math.round(selectedNode.queueLengthM / 5)} veh
                  </span>
                </div>
              </div>

              <div className="bg-[#111318] p-2.5 rounded-lg border border-[#2e3140]">
                <span className="font-mono text-[9px] text-[#9096a8] uppercase block mb-0.5">
                  Arrival Rate (λ)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-base font-bold text-[#e8eaf0]">
                    {selectedNode.arrivalRate}
                  </span>
                  <span className="font-mono text-[10px] text-[#00c97a]">Poisson OK</span>
                </div>
              </div>

              <div className="bg-[#111318] p-2.5 rounded-lg border border-[#2e3140]">
                <span className="font-mono text-[9px] text-[#9096a8] uppercase block mb-0.5">
                  Queue Density
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-sm font-bold text-[#e8eaf0]">
                    {(selectedNode.density * 100).toFixed(0)}%
                  </span>
                  <span className="font-mono text-[10px] text-[#9096a8]">
                    {selectedNode.density > 0.7 ? "LOS E" : "LOS C"}
                  </span>
                </div>
              </div>

              <div className="bg-[#111318] p-2.5 rounded-lg border border-[#2e3140]">
                <span className="font-mono text-[9px] text-[#9096a8] uppercase block mb-0.5">
                  Arterial Speed
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-sm font-bold text-[#4d9fff]">
                    {selectedNode.speedKmH} km/h
                  </span>
                  <span className="font-mono text-[10px] text-[#9096a8]">Est. Flow</span>
                </div>
              </div>
            </div>

            {/* Vehicle Mix Breakdown (YOLOv8 Edge Telemetry) */}
            <div className="bg-[#111318] p-2.5 rounded-lg border border-[#2e3140]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[9px] text-[#9096a8] uppercase">
                  YOLOv8 Classification Mix
                </span>
                <span className="font-mono text-[9px] text-[#4d9fff]">Live Feed</span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                <div className="bg-[#1c1e24] py-1 rounded">
                  <span className="block text-[#9096a8] text-[8px]">CARS</span>
                  <span className="font-bold text-[#e8eaf0]">{selectedNode.classCounts.cars}</span>
                </div>
                <div className="bg-[#1c1e24] py-1 rounded">
                  <span className="block text-[#9096a8] text-[8px]">2-WHEEL</span>
                  <span className="font-bold text-[#e8eaf0]">{selectedNode.classCounts.twoWheelers}</span>
                </div>
                <div className="bg-[#1c1e24] py-1 rounded">
                  <span className="block text-[#9096a8] text-[8px]">AUTOS</span>
                  <span className="font-bold text-[#e8eaf0]">{selectedNode.classCounts.autos}</span>
                </div>
                <div className="bg-[#1c1e24] py-1 rounded">
                  <span className="block text-[#9096a8] text-[8px]">BUSES</span>
                  <span className="font-bold text-[#e8eaf0]">{selectedNode.classCounts.buses}</span>
                </div>
                <div className="bg-[#1c1e24] py-1 rounded border border-[#ff4060]/30">
                  <span className="block text-[#ff4060] text-[8px]">EMERG</span>
                  <span className="font-bold text-[#ff4060]">{selectedNode.classCounts.ambulances}</span>
                </div>
              </div>
            </div>

            {/* Active Preemption Alert Banner (If Applicable) */}
            {selectedNode.activePreemption && (
              <div className="bg-[#ff4060]/10 border border-[#ff4060]/40 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-rounded text-[#ff4060] text-[20px]">
                    airport_shuttle
                  </span>
                  <div>
                    <span className="font-mono text-[10px] font-bold text-[#ff4060] block uppercase">
                      Ambulance Inbound · Priority #1
                    </span>
                    <span className="font-mono text-[9px] text-[#e8eaf0]/80">
                      Pre-clearing downstream green wave
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#ff4060] bg-[#ff4060]/20 px-2 py-1 rounded border border-[#ff4060]/40">
                  {selectedNode.activePreemption.etaSeconds}s
                </span>
              </div>
            )}
          </div>

          {/* Network-wide Statistical Performance Metrics */}
          <div className="bg-[#161820] border border-[#2e3140] rounded-2xl p-4 flex flex-col gap-3 shadow-sm flex-1">
            <div className="flex justify-between items-center border-b border-[#2e3140] pb-2">
              <span className="font-mono text-xs font-semibold text-[#e8eaf0] uppercase">
                Corridor Validation Telemetry
              </span>
              <span className="font-mono text-[10px] text-[#00c97a]">p &lt; 0.001</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between font-mono text-[10px] mb-1">
                  <span className="text-[#9096a8]">Arterial Delay Reduction (vs Baseline)</span>
                  <span className="text-[#00c97a] font-bold">-31.4%</span>
                </div>
                <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                  <div className="h-full bg-[#00c97a]" style={{ width: "68.6%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-mono text-[10px] mb-1">
                  <span className="text-[#9096a8]">Poisson Model Goodness-of-Fit (χ²)</span>
                  <span className="text-[#4d9fff] font-bold">p = 0.489 (Valid)</span>
                </div>
                <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                  <div className="h-full bg-[#4d9fff]" style={{ width: "88%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-mono text-[10px] mb-1">
                  <span className="text-[#9096a8]">Preemption Corridor Response Time</span>
                  <span className="text-[#ff4060] font-bold">1.2s avg</span>
                </div>
                <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden border border-[#2e3140]">
                  <div className="h-full bg-[#ff4060]" style={{ width: "12%" }}></div>
                </div>
              </div>
            </div>

            {/* Quick Summary Note */}
            <div className="mt-auto pt-3 border-t border-[#2e3140] text-[10px] font-mono text-[#9096a8] flex items-center justify-between">
              <span>Sensor: YOLOv8 Nano Edge</span>
              <span>Rate: 30 FPS / 4.2ms</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
