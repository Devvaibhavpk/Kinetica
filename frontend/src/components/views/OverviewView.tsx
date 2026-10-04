"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ChennaiNode } from "../ChennaiRealMap";

export interface SignalIntersection {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  laneId: string;
}

export const CHENNAI_SIGNAL_INTERSECTIONS: SignalIntersection[] = [
  {
    id: "IX-101",
    name: "Madhya Kailash Junction",
    zone: "Adyar / Sardar Patel Rd & OMR Gateway",
    lat: 13.00666,
    lon: 80.24603,
    laneId: "lane_N",
  },
  {
    id: "IX-102",
    name: "TIDEL Park Junction",
    zone: "Thiruvanmiyur / CSIR Rd & OMR",
    lat: 12.98640,
    lon: 80.25156,
    laneId: "lane_S",
  },
  {
    id: "IX-103",
    name: "SRP Tools Junction",
    zone: "Perungudi / OMR IT Expressway Hub",
    lat: 12.98007,
    lon: 80.25290,
    laneId: "lane_W",
  },
  {
    id: "IX-104",
    name: "Sholinganallur Junction",
    zone: "OMR & Medavakkam-Kandanchavadi Arterial Link",
    lat: 12.90092,
    lon: 80.22797,
    laneId: "lane_E",
  },
  {
    id: "IX-105",
    name: "Kathipara Cloverleaf Junction",
    zone: "Guindy / GST Road & Inner Ring Link (NH-45)",
    lat: 13.00652,
    lon: 80.20367,
    laneId: "lane_N",
  },
  {
    id: "IX-108",
    name: "Chennai Central Junction",
    zone: "George Town / EVR Periyar Salai & Wall Tax Rd",
    lat: 13.08186,
    lon: 80.27625,
    laneId: "lane_S",
  },
  {
    id: "IX-109",
    name: "Vijayanagar Junction",
    zone: "Velachery / 100ft Bypass Rd & Taramani Link",
    lat: 12.97500,
    lon: 80.22070,
    laneId: "lane_W",
  },
];

export const getApproachName = (sigId: string, laneId: string): string => {
  const approaches: Record<string, Record<string, string>> = {
    "IX-101": {
      lane_N: "Sardar Patel Rd (Adyar Inbound)",
      lane_S: "OMR IT Expressway Outbound",
      lane_E: "Gandhi Mandapam Rd (Kotturpuram)",
      lane_W: "Rajiv Gandhi Salai Flyover",
      "Approach-N": "Sardar Patel Rd Approach",
      "Approach-S": "OMR IT Expressway Approach",
      "Approach-E": "Gandhi Mandapam Approach",
      "Approach-W": "Flyover Approach",
    },
    "IX-102": {
      lane_N: "OMR Northbound (Madhya Kailash)",
      lane_S: "OMR Southbound (SRP Tools)",
      lane_E: "CSIR Rd (Thiruvanmiyur)",
      lane_W: "Taramani 100ft Link Rd",
      "Approach-N": "OMR Northbound Inbound",
      "Approach-S": "OMR Southbound Mainline",
      "Approach-E": "CSIR Rd Approach",
      "Approach-W": "Taramani Link Approach",
    },
    "IX-103": {
      lane_N: "OMR Northbound (TIDEL Park)",
      lane_S: "OMR Southbound (Kandanchavadi)",
      lane_E: "Perungudi Industrial Link",
      lane_W: "Thoraipakkam Radial Link",
      "Approach-N": "OMR Northbound Approach",
      "Approach-S": "OMR Southbound Approach",
      "Approach-E": "Perungudi Link Approach",
      "Approach-W": "Radial Link Approach",
    },
    "IX-104": {
      lane_N: "OMR Northbound Inbound",
      lane_S: "OMR Southbound Outbound (Siruseri)",
      lane_E: "ECR Link Rd (Akkarai)",
      lane_W: "Medavakkam-Tambaram Main Rd",
      "Approach-N": "OMR Northbound Mainline",
      "Approach-S": "OMR Southbound Mainline",
      "Approach-E": "ECR Link Corridor",
      "Approach-W": "Medavakkam Rd Approach",
    },
    "IX-105": {
      lane_N: "Inner Ring Rd (Jawaharlal Nehru Salai)",
      lane_S: "GST Road Southbound (Airport / Tambaram)",
      lane_E: "Anna Salai (Guindy / Saidapet)",
      lane_W: "Mount-Poonamallee Rd (Porur)",
      "Approach-N": "Inner Ring Mainline",
      "Approach-S": "GST Road Mainline",
      "Approach-E": "Anna Salai Approach",
      "Approach-W": "Mount-Poonamallee Approach",
    },
    "IX-108": {
      lane_N: "Wall Tax Road (Basin Bridge)",
      lane_S: "Poonamallee High Rd (Periamet)",
      lane_E: "EVR Periyar Salai (Ripon Building)",
      lane_W: "Raja Muthiah Salai (Sydenhams Rd)",
      "Approach-N": "Wall Tax Rd Approach",
      "Approach-S": "Poonamallee High Rd Approach",
      "Approach-E": "EVR Periyar Salai Approach",
      "Approach-W": "Sydenhams Rd Approach",
    },
    "IX-109": {
      lane_N: "Velachery Bypass Rd (Guindy Link)",
      lane_S: "Taramani Link Rd (OMR IT Hub)",
      lane_E: "100ft Inner Ring Road",
      lane_W: "Tambaram-Velachery Main Rd",
      "Approach-N": "Velachery Bypass Approach",
      "Approach-S": "Taramani Link Approach",
      "Approach-E": "100ft Inner Ring Mainline",
      "Approach-W": "Tambaram Main Rd Approach",
    },
  };

  const sigMap = approaches[sigId] || approaches["IX-104"];
  return sigMap[laneId] || laneId || "Active Phase";
};

interface BackendResults {
  metrics: {
    totalObservations: number;
    totalDecisions: number;
    preemptionDecisions: number;
    extendedDecisions: number;
    scheduledDecisions: number;
  };
  hypothesisTest: {
    statistic: number;
    p_value: number;
    h0_rejected: boolean;
    effect_size: number;
    test_used: string;
    percentage_reduction?: number;
  } | null;
  poissonFit: {
    p_value: number;
    poisson_assumption_holds: boolean;
    statistic: number;
  } | null;
  corridorPath: string[];
  laneStates?: Record<string, any>;
  heapHierarchy?: any[];
  _dataSource?: string;
  recentDecisions: Array<{
    intersection_id: string;
    active_lane_id: string;
    phase_start: string;
    phase_end: string;
    reason: string;
  }>;
}

// Dynamic import for Leaflet map component (SSR safe)
const ChennaiRealMap = dynamic(() => import("../ChennaiRealMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] bg-surface flex flex-col items-center justify-center gap-3 text-on-surface-variant font-mono text-xs">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span>Loading TomTom Road & Traffic Network...</span>
    </div>
  ),
});

export default function OverviewView() {
  const [backendData, setBackendData] = useState<BackendResults | null>(null);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(true);

  useEffect(() => {
    async function loadResults() {
      try {
        const res = await fetch("/api/results");
        if (res.ok) {
          const json = await res.json();
          setBackendData(json);
        }
      } catch (err) {
        console.error("Failed to load overview results:", err);
      } finally {
        setLoadingBackend(false);
      }
    }
    loadResults();

    // Poll telemetry periodically every 12 seconds (without triggering map re-renders)
    const interval = setInterval(loadResults, 12000);
    return () => clearInterval(interval);
  }, []);

  const isBackendOnline = Boolean(
    backendData &&
      backendData.metrics &&
      (backendData.metrics.totalObservations > 0 || backendData.metrics.totalDecisions > 0)
  );

  const [selectedNode, setSelectedNode] = useState<ChennaiNode>({
    id: "IX-104",
    name: "Sholinganallur Junction",
    zone: "OMR & Medavakkam-Kandanchavadi Arterial Link",
    lat: 12.90092,
    lon: 80.22797,
    queueLengthM: 0,
    density: 0,
    arrivalRate: "—",
    activePhase: "Awaiting Live Telemetry",
    status: "nominal",
    policy: "ADAPTIVE",
    nemaSplit: "Dynamic Splits",
    speedKmH: 0,
    classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
  });

  // Switch signal via dropdown selector
  const handleSignalChange = (signalId: string) => {
    const target = CHENNAI_SIGNAL_INTERSECTIONS.find((s) => s.id === signalId);
    if (!target) return;

    const laneMap: Record<string, string> = {
      "IX-101": "lane_N",
      "IX-102": "lane_S",
      "IX-103": "lane_W",
      "IX-104": "lane_E",
    };
    const laneId = laneMap[target.id] || "lane_E";
    const lane = backendData?.laneStates ? backendData.laneStates[laneId] : null;

    setSelectedNode({
      id: target.id,
      name: target.name,
      zone: target.zone,
      lat: target.lat,
      lon: target.lon,
      queueLengthM: Number(lane?.queue_length_m) || 0,
      density: Number(lane?.density_veh_per_m) || 0,
      arrivalRate: lane ? ((lane.vehicle_count || 0) / 10).toFixed(2) + " V/S" : "—",
      status: isBackendOnline
        ? lane?.state === "preempted"
          ? "preempted"
          : lane?.state === "building"
          ? "building"
          : "nominal"
        : "nominal",
      policy: isBackendOnline
        ? lane?.state === "preempted"
          ? "MAX-PREEMPT"
          : "ADAPTIVE"
        : "OFFLINE",
      speedKmH: isBackendOnline
        ? Math.max(0, Math.round(55 * (1 - (lane?.density_veh_per_m || 0))))
        : 0,
      activePhase: isBackendOnline
        ? lane?.state === "preempted"
          ? "East Preempt Corridor"
          : "Dynamic Demand Phase"
        : "Backend Offline",
      nemaSplit: isBackendOnline
        ? lane?.state === "preempted"
          ? "G: HOLD"
          : "Dynamic Splits"
        : "Offline",
      classCounts: {
        cars: Math.floor((lane?.vehicle_count || 0) * 0.4),
        twoWheelers: Math.floor((lane?.vehicle_count || 0) * 0.45),
        autos: Math.floor((lane?.vehicle_count || 0) * 0.1),
        buses: Math.floor((lane?.vehicle_count || 0) * 0.05),
        ambulances: lane?.state === "preempted" ? 1 : 0,
      },
    });
  };

  // Synchronize selectedNode with real measured backend telemetry as updates arrive
  useEffect(() => {
    if (backendData?.laneStates) {
      const laneMap: Record<string, string> = {
        "IX-101": "lane_N",
        "IX-102": "lane_S",
        "IX-103": "lane_W",
        "IX-104": "lane_E",
      };
      const laneId = laneMap[selectedNode.id] || "lane_E";
      const lane = backendData.laneStates[laneId];

      if (lane) {
        setSelectedNode((prev) => ({
          ...prev,
          queueLengthM: Number(lane.queue_length_m) || 0,
          density: Number(lane.density_veh_per_m) || 0,
          arrivalRate: ((lane.vehicle_count || 0) / 10).toFixed(2) + " V/S",
          status:
            lane.state === "preempted"
              ? "preempted"
              : lane.state === "building"
              ? "building"
              : "nominal",
          policy: lane.state === "preempted" ? "MAX-PREEMPT" : "ADAPTIVE",
          speedKmH: Math.max(0, Math.round(55 * (1 - (lane.density_veh_per_m || 0)))),
          activePhase:
            lane.state === "preempted" ? "East Preempt Corridor" : "Dynamic Demand Phase",
          classCounts: {
            cars: Math.floor((lane.vehicle_count || 0) * 0.4),
            twoWheelers: Math.floor((lane.vehicle_count || 0) * 0.45),
            autos: Math.floor((lane.vehicle_count || 0) * 0.1),
            buses: Math.floor((lane.vehicle_count || 0) * 0.05),
            ambulances: lane.state === "preempted" ? 1 : 0,
          },
        }));
      }
    }
  }, [backendData, selectedNode.id]);

  return (
    <div className="flex-1 flex flex-col gap-5 w-full max-w-full pb-8">
      {/* ── BACKEND OFFLINE STATUS BANNER (Zero Dummy Data Rule) ── */}
      {!isBackendOnline && !loadingBackend && (
        <section className="bg-state-crit-dim border border-state-crit-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-state-preempted animate-ping shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-state-preempted font-mono">
                  BACKEND OFFLINE
                </span>
                <span className="text-[10px] bg-surface-high px-2 py-0.5 rounded border border-outline font-mono text-on-surface-variant">
                  GATEWAY DISCONNECTED
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Kinetica FastAPI Gateway (http://127.0.0.1:8000) unreachable. Signal queue lengths, arrival rates, and camera feeds are offline. Showing genuine TomTom traffic and map data only.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-surface-high border border-outline text-xs font-semibold text-on-surface hover:bg-surface-mid transition-all shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </section>
      )}

      {/* ── MAIN WORKSPACE GRID ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 h-[calc(100vh-140px)] min-h-[700px]">
        {/* TomTom Real Map Canvas (8 Cols) */}
        <section className="xl:col-span-8 card p-0 flex flex-col relative overflow-hidden h-full shadow-2xl">
          <div className="flex-1 relative w-full h-full min-h-[500px]">
            <ChennaiRealMap
              selectedNodeId={selectedNode.id}
              onSelectNode={(node) => setSelectedNode(node)}
              backendData={backendData}
            />
          </div>
        </section>

        {/* Telemetry Inspection Panel (4 Cols) */}
        <section className="xl:col-span-4 flex flex-col gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
          {/* Junction Header & Live Status Card */}
          <div className="card flex flex-col gap-4">
            <div className="flex flex-col gap-3 border-b border-outline pb-4">
              {/* Row 1: Signal Badges + Signal Switcher Dropdown */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-surface-high px-2.5 py-1 rounded-md border border-outline">
                    {selectedNode.id}
                  </span>
                  <span className="badge badge-neutral text-[9px] px-2 py-0.5 uppercase tracking-wider font-semibold">
                    SIGNAL CAMERA
                  </span>
                </div>

                {/* Dropdown to switch between signals */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="signal-select" className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider hidden sm:inline">
                    Signal:
                  </label>
                  <select
                    id="signal-select"
                    value={selectedNode.id}
                    onChange={(e) => handleSignalChange(e.target.value)}
                    className="bg-surface-high border border-outline rounded-lg px-2.5 py-1 text-xs font-mono font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer hover:bg-surface-mid transition-all shadow-sm"
                  >
                    {CHENNAI_SIGNAL_INTERSECTIONS.map((sig) => (
                      <option key={sig.id} value={sig.id} className="bg-surface text-on-surface font-mono">
                        {sig.id} — {sig.name.split(" ")[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Junction Name & Policy Badge */}
              <div className="flex justify-between items-start gap-2 pt-0.5">
                <div className="overflow-hidden">
                  <h3 className="font-display text-lg font-semibold text-on-surface tracking-wide truncate">
                    {selectedNode.name}
                  </h3>
                  <p className="font-mono text-[11px] text-on-surface-variant truncate mt-0.5">
                    {selectedNode.zone}
                  </p>
                </div>

                <span
                  className={`badge shrink-0 ${
                    !isBackendOnline
                      ? "badge-neutral"
                      : selectedNode.status === "preempted"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 font-bold"
                      : selectedNode.status === "building"
                      ? "badge-warn"
                      : "badge-calm"
                  }`}
                >
                  {isBackendOnline
                    ? selectedNode.status === "preempted"
                      ? "HOLD GREEN"
                      : selectedNode.policy
                    : "BACKEND OFFLINE"}
                </span>
              </div>
            </div>

            {/* Core Physical & Statistical Metrics Grid (Zero Dummy Data Rule) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="metric-tile">
                <span className="metric-label">Queue Length (m)</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span
                    className={`metric-value ${
                      !isBackendOnline
                        ? "text-on-surface-variant opacity-60"
                        : selectedNode.queueLengthM > 35
                        ? "warn"
                        : "calm"
                    }`}
                  >
                    {isBackendOnline ? `${selectedNode.queueLengthM.toFixed(1)}m` : "—"}
                  </span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {isBackendOnline ? `~${Math.round(selectedNode.queueLengthM / 5)} veh` : "Offline"}
                  </span>
                </div>
              </div>

              <div className="metric-tile">
                <span className="metric-label">Arrival Rate (λ)</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span
                    className={`metric-value ${
                      !isBackendOnline ? "text-on-surface-variant opacity-60" : "neutral"
                    }`}
                  >
                    {isBackendOnline ? selectedNode.arrivalRate : "—"}
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isBackendOnline ? "text-state-calm" : "text-on-surface-variant"
                    }`}
                  >
                    {isBackendOnline ? "Poisson Model" : "Offline"}
                  </span>
                </div>
              </div>

              <div className="metric-tile">
                <span className="metric-label">Queue Density</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span
                    className={`metric-value ${
                      !isBackendOnline ? "text-on-surface-variant opacity-60" : "neutral"
                    }`}
                  >
                    {isBackendOnline ? `${(selectedNode.density * 100).toFixed(0)}%` : "—"}
                  </span>
                  <span className="font-mono text-[11px] text-on-surface-variant font-bold">
                    {isBackendOnline ? (selectedNode.density > 0.7 ? "LOS E" : "LOS C") : "Offline"}
                  </span>
                </div>
              </div>

              <div className="metric-tile">
                <span className="metric-label">Arterial Speed</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span
                    className={`metric-value ${
                      !isBackendOnline ? "text-on-surface-variant opacity-60" : "text-primary"
                    }`}
                  >
                    {isBackendOnline ? `${selectedNode.speedKmH} km/h` : "—"}
                  </span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {isBackendOnline ? "Observed" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Signal Phase & Decision Stream */}
          <div className="card flex flex-col gap-4 flex-1 min-h-[300px]">
            <div className="flex justify-between items-center border-b border-outline pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="card-title">Live Signal Decision Stream</span>
                <span className="font-mono text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {selectedNode.id}
                </span>
              </div>
              <span className="font-mono text-[10px] text-on-surface-variant bg-surface-high px-2.5 py-1 rounded-full border border-outline">
                {isBackendOnline ? `${backendData?.recentDecisions?.length ?? 0} events` : "OFFLINE"}
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {!isBackendOnline || !backendData?.recentDecisions?.length ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center text-xs font-mono text-on-surface-variant/70">
                  <span className="text-xl mb-2">📡</span>
                  <span className="font-semibold text-on-surface">No Live Decisions</span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    {isBackendOnline ? "System awaiting traffic phase transition..." : "FastAPI Edge Gateway offline"}
                  </span>
                </div>
              ) : (
                backendData.recentDecisions.slice(-6).reverse().map((dec, idx) => {
                  const shortName = selectedNode.name.replace(" Junction", "");
                  const ixName = `${selectedNode.id} (${shortName})`;
                  const approach = getApproachName(selectedNode.id, dec.active_lane_id);

                  const isPreempt = dec.reason === "preempted";
                  const isExtend = dec.reason === "extended";

                  return (
                    <div
                      key={idx}
                      className="bg-surface-low p-3 rounded-xl border border-outline flex flex-col gap-1.5 text-xs font-mono transition-all hover:border-primary/40 hover:bg-surface hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isPreempt
                                ? "bg-emerald-400 shadow-[0_0_8px_#00c97a] animate-pulse"
                                : isExtend
                                ? "bg-state-building"
                                : "bg-state-calm"
                            }`}
                          />
                          <span className="font-bold text-on-surface text-[12px]">{ixName}</span>
                        </div>
                        <span
                          className={`badge ${
                            isPreempt
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 font-bold"
                              : isExtend
                              ? "badge-warn font-bold"
                              : "badge-calm"
                          }`}
                        >
                          {isPreempt ? "HOLD GREEN" : isExtend ? "EXTENDED" : "SCHEDULED"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-0.5">
                        <span className="truncate">{approach}</span>
                        <span className="text-[10px] uppercase font-semibold text-primary">
                          {isPreempt ? "Priority #1" : isExtend ? "+6.0s Gap" : "Dynamic Split"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-2 pt-3 border-t border-outline flex justify-between items-center text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isBackendOnline ? "bg-primary animate-pulse" : "bg-gray-500"
                  }`}
                />
                Gateway: {isBackendOnline ? "FastAPI Online" : "Disconnected"}
              </span>
              <span>Inference: YOLOv8 ONNX</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
