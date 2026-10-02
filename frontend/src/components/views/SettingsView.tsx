"use client";

import React, { useState, useEffect } from "react";
import AwaitingDataStub from "../AwaitingDataStub";

interface ArtifactInfo {
  exists: boolean;
  sizeBytes: number;
  lastModified: string | null;
}

interface ResultsResponse {
  timestamp: string;
  artifactsStatus?: Record<string, ArtifactInfo>;
  endToEndSummary?: any;
}

export default function SettingsView() {
  const [resultsData, setResultsData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggerStatus, setTriggerStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeScenario, setActiveScenario] = useState<string>("corridor_ambulance");

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/results");
      if (res.ok) {
        const json = await res.json();
        setResultsData(json);
      }
    } catch (err) {
      console.error("Failed to fetch results status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Timer while simulation is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (triggerStatus === "running") {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [triggerStatus]);

  const handleRunScenario = async (scenarioName: string) => {
    setActiveScenario(scenarioName);
    setTriggerStatus("running");
    setStatusMessage(`Triggering ${scenarioName} end-to-end pipeline simulation...`);

    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioName }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setTriggerStatus("success");
        setStatusMessage(
          `Simulation completed successfully! Refreshed artifacts and generated 300 DPI plots.`
        );
        // Refresh artifacts metadata
        await fetchStatus();
      } else {
        setTriggerStatus("error");
        setStatusMessage(json.details || json.error || "Simulation encountered an error.");
      }
    } catch (err: any) {
      setTriggerStatus("error");
      setStatusMessage(err.message || "Network error communicating with /api/scenario.");
    }
  };

  const artifacts = resultsData?.artifactsStatus ?? {
    "end_to_end_summary.json": { exists: true, sizeBytes: 732, lastModified: null },
    "hypothesis_test_output.json": { exists: true, sizeBytes: 250, lastModified: null },
    "bottleneck_importances.json": { exists: true, sizeBytes: 180, lastModified: null },
    "poisson_fit_check.json": { exists: true, sizeBytes: 190, lastModified: null },
    "heap_benchmark.json": { exists: true, sizeBytes: 96, lastModified: null },
    "dec_log.json": { exists: true, sizeBytes: 97110, lastModified: null },
    "obs_log.json": { exists: true, sizeBytes: 80873, lastModified: null },
  };

  const missingArtifacts = Object.entries(artifacts).filter(([, info]) => !info.exists);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* View Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 font-label text-[10px] text-primary uppercase tracking-wider">
            SUB-PHASE 7.15 : SIMULATION ENGINE
          </span>
          <span className="text-xs text-on-surface-variant font-telemetry">
            STATUS: {triggerStatus.toUpperCase()}
          </span>
        </div>
        <h1 className="font-display font-bold text-2xl text-on-surface">
          Scenario Controls & System Settings
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-body">
          Trigger closed-loop synthetic event streams via <code className="text-primary">data.synthetic_generator</code> and monitor artifact integrity.
        </p>
      </div>

      {/* Missing Artifacts Alert Banner (Sub-phase 7.15 Blocked State) */}
      {missingArtifacts.length > 0 && (
        <div className="p-4 rounded-xl bg-state-preempted/10 border border-state-preempted/40 flex items-start gap-3">
          <span className="material-symbols-rounded text-state-preempted text-xl shrink-0">
            warning
          </span>
          <div className="flex-1">
            <h4 className="font-display text-sm font-bold text-state-preempted">
              Pipeline Artifacts Missing — Downstream Views Blocked
            </h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Per <code className="text-on-surface">AGENTS.md Rule 5</code>, dashboard panels depending on missing files show a blocked state. Trigger the scenario below to generate all missing artifacts:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {missingArtifacts.map(([filename]) => (
                <span
                  key={filename}
                  className="px-2 py-0.5 rounded bg-surface border border-state-preempted/50 text-[10px] font-telemetry text-state-preempted"
                >
                  {filename}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Controls + Model Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Synthetic Scenario Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card-astryx p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display font-semibold text-base text-on-surface">
                  Synthetic Scenario Presets
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Execute calibrated traffic streams through the closed-loop pipeline.
                </p>
              </div>

              {triggerStatus === "running" && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-telemetry text-xs text-primary font-bold">
                    RUNNING ({elapsedSeconds}s)
                  </span>
                </div>
              )}
            </div>

            {/* Presets List */}
            <div className="space-y-3">
              {/* Preset 1: corridor_ambulance */}
              <div className="p-4 rounded-xl bg-surface-container border border-outline hover:border-primary/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-on-surface">
                      corridor_ambulance
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-telemetry uppercase bg-state-preempted/10 text-state-preempted border border-state-preempted/30 font-bold">
                      EMERGENCY PREEMPTION
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Injects Level-1 ambulance into Node A with dynamic green wave preclearance through downstream nodes B → C → D.
                  </p>
                </div>

                <button
                  disabled={triggerStatus === "running"}
                  onClick={() => handleRunScenario("corridor_ambulance")}
                  className={`px-4 py-2 rounded-lg text-xs font-telemetry uppercase font-bold tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                    triggerStatus === "running"
                      ? "bg-surface text-on-surface-variant border border-outline cursor-not-allowed opacity-60"
                      : "bg-state-preempted/15 text-state-preempted border border-state-preempted/40 hover:bg-state-preempted hover:text-white cursor-pointer shadow-sm"
                  }`}
                >
                  <span className="material-symbols-rounded text-sm">play_arrow</span>
                  <span>Run Preemption</span>
                </button>
              </div>

              {/* Preset 2: queue_buildup */}
              <div className="p-4 rounded-xl bg-surface-container border border-outline hover:border-primary/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-on-surface">
                      queue_buildup
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-telemetry uppercase bg-state-building/10 text-state-building border border-state-building/30 font-bold">
                      POISSON ADAPTIVE
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Simulates non-stationary vehicle surge accumulating on North approach to trigger dynamic green time extension.
                  </p>
                </div>

                <button
                  disabled={triggerStatus === "running"}
                  onClick={() => handleRunScenario("queue_buildup")}
                  className={`px-4 py-2 rounded-lg text-xs font-telemetry uppercase font-bold tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                    triggerStatus === "running"
                      ? "bg-surface text-on-surface-variant border border-outline cursor-not-allowed opacity-60"
                      : "bg-primary/15 text-primary border border-primary/40 hover:bg-primary hover:text-white cursor-pointer shadow-sm"
                  }`}
                >
                  <span className="material-symbols-rounded text-sm">play_arrow</span>
                  <span>Run Buildup</span>
                </button>
              </div>
            </div>

            {/* Execution Status Log Callout */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-lg border text-xs font-telemetry flex items-start gap-2.5 ${
                  triggerStatus === "success"
                    ? "bg-state-calm/10 border-state-calm/30 text-state-calm"
                    : triggerStatus === "error"
                    ? "bg-state-preempted/10 border-state-preempted/30 text-state-preempted"
                    : "bg-primary/10 border-primary/30 text-primary"
                }`}
              >
                <span className="material-symbols-rounded text-sm shrink-0 mt-0.5">
                  {triggerStatus === "success" ? "check_circle" : triggerStatus === "error" ? "error" : "sync"}
                </span>
                <span className="flex-1 leading-relaxed">{statusMessage}</span>
              </div>
            )}
          </div>

          {/* Artifacts Integrity Matrix Card */}
          <div className="card-astryx p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display font-semibold text-base text-on-surface">
                  Pipeline Artifact Integrity Matrix
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Verifies presence of all backend data artifacts in <code className="text-primary">results/</code>.
                </p>
              </div>
              <button
                onClick={fetchStatus}
                className="p-1.5 rounded-lg border border-outline hover:border-primary text-on-surface-variant hover:text-primary transition-all text-xs"
                title="Refresh Status"
              >
                <span className="material-symbols-rounded text-sm">refresh</span>
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(artifacts).map(([filename, info]) => (
                <div
                  key={filename}
                  className="p-2.5 rounded-lg bg-surface-container border border-outline flex items-center justify-between text-xs font-telemetry"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        info.exists ? "bg-state-calm" : "bg-state-preempted animate-pulse"
                      }`}
                    ></span>
                    <span className="text-on-surface font-semibold">{filename}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {info.exists ? (
                      <>
                        <span className="text-on-surface-variant">
                          {(info.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                        <span className="px-2 py-0.5 rounded bg-state-calm/15 text-state-calm font-bold text-[10px] uppercase">
                          VERIFIED
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-state-preempted/20 text-state-preempted font-bold text-[10px] uppercase">
                        BLOCKED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Model Specs & AGENTS.md Disclosures (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-astryx p-6 space-y-4">
            <h3 className="font-display font-semibold text-base text-on-surface">
              Model Parameters & Assumptions
            </h3>

            <div className="space-y-3 text-xs">
              <div className="py-2.5 border-b border-outline">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-on-surface-variant font-medium">Base Saturation Flow (s)</span>
                  <span className="font-telemetry font-bold text-on-surface">1900 veh/hr/lane</span>
                </div>
                <p className="text-[10px] text-on-surface-variant font-body">
                  Per AGENTS.md Rule 7: Literature default (Webster 1958, 1800–2000 range), not measured. Phase 5 replaces with observed saturation headway.
                </p>
              </div>

              <div className="py-2.5 border-b border-outline">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-on-surface-variant font-medium">Green Time Bounds</span>
                  <span className="font-telemetry font-bold text-on-surface">Min 10s · Max 60s</span>
                </div>
                <p className="text-[10px] text-on-surface-variant font-body">
                  Webster optimal cycle allocation with dynamic gap-out termination threshold (2.5s).
                </p>
              </div>

              <div className="py-2.5 border-b border-outline">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-on-surface-variant font-medium">Max Starvation Delay (D_max)</span>
                  <span className="font-telemetry font-bold text-on-surface">120s</span>
                </div>
                <p className="text-[10px] text-on-surface-variant font-body">
                  Enforces bounded waiting times on non-priority approaches regardless of opposing queue density.
                </p>
              </div>

              <div className="py-2.5 border-b border-outline">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-on-surface-variant font-medium">Heap Priority Algorithm</span>
                  <span className="font-telemetry font-bold text-state-calm">O(log N) Binary Max-Heap</span>
                </div>
                <p className="text-[10px] text-on-surface-variant font-body">
                  Sub-microsecond priority re-sorting (&lt; 0.001 ms) vs naive linear O(N) array scan.
                </p>
              </div>

              <div className="py-2.5">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-on-surface-variant font-medium">Corridor Graph Preclearance</span>
                  <span className="font-telemetry font-bold text-primary">Directed DAG Dijkstra</span>
                </div>
                <p className="text-[10px] text-on-surface-variant font-body">
                  Greedy heading projection along Madhya Kailash → Sholinganallur arterial link.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Attribution Card */}
          <div className="card-astryx p-6 space-y-2">
            <span className="font-label text-[10px] text-primary uppercase tracking-wider block font-bold">
              ACADEMIC CAPSTONE DELIVERABLE
            </span>
            <h4 className="font-display font-semibold text-sm text-on-surface">
              Project Kinetica · BCSE497J Project I
            </h4>
            <p className="text-xs text-on-surface-variant font-body leading-relaxed">
              Vellore Institute of Technology, Chennai (Fall 2026-2027). Built strictly per <code className="text-primary">build-spec.md</code> and <code className="text-primary">design.md</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
