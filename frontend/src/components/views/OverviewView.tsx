"use client";

import React, { useState } from "react";
import AwaitingDataStub from "../AwaitingDataStub";

export default function OverviewView() {
  const [scenario, setScenario] = useState<'normal' | 'building' | 'preempted'>('preempted');
  
  const isNormal = scenario === 'normal';
  const isBuilding = scenario === 'building';
  const isPreempted = scenario === 'preempted';

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Scenario Selection Bar (Industrialized) */}
      <section className="industrial-panel rounded-[16px] p-2 flex items-center justify-between flex-wrap gap-3 tech-border">
        <div className="flex items-center gap-3 pl-2">
          {isPreempted ? (
            <>
              <span className="material-symbols-rounded text-state-preempted text-[16px] animate-pulse">crisis_alert</span>
              <span className="font-label text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">Active Directive:</span>
              <span className="font-telemetry text-[11px] text-state-preempted font-semibold px-2 py-1 bg-state-preempted/10 rounded-md border border-state-preempted/30 uppercase tracking-wider shadow-glow-preempted">Ambulance Preempt (ACT)</span>
            </>
          ) : isBuilding ? (
            <>
              <span className="material-symbols-rounded text-state-building text-[16px]">warning</span>
              <span className="font-label text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">Active Directive:</span>
              <span className="font-telemetry text-[11px] text-state-building font-semibold px-2 py-1 bg-state-building/10 rounded-md border border-state-building/30 uppercase tracking-wider shadow-glow-building">Queue Buildup</span>
            </>
          ) : (
            <>
              <span className="material-symbols-rounded text-state-calm text-[16px]">check_circle</span>
              <span className="font-label text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">Active Directive:</span>
              <span className="font-telemetry text-[11px] text-on-surface font-semibold px-2 py-1 bg-surface-container-high rounded-md border border-outline uppercase tracking-wider">Nominal Flow</span>
            </>
          )}
        </div>

        <div className="flex bg-surface-container-high border border-outline p-1 rounded-lg">
          <button 
            onClick={() => setScenario('normal')} 
            className={`px-4 py-1.5 rounded-md font-label text-[10px] uppercase tracking-widest transition-all ${
              isNormal 
                ? 'bg-white/10 text-on-surface border border-outline' 
                : 'text-on-surface-variant hover:bg-surface'
            }`}
          >
            Baseline
          </button>
          <button 
            onClick={() => setScenario('building')} 
            className={`px-4 py-1.5 rounded-md font-label text-[10px] uppercase tracking-widest transition-all ${
              isBuilding 
                ? 'bg-state-building/10 text-state-building border border-state-building/30' 
                : 'text-on-surface-variant hover:bg-surface'
            }`}
          >
            Congestion
          </button>
          <button 
            onClick={() => setScenario('preempted')} 
            className={`px-4 py-1.5 rounded-md font-label text-[10px] uppercase tracking-widest transition-all ${
              isPreempted 
                ? 'bg-state-preempted/10 text-state-preempted border border-state-preempted/50' 
                : 'text-on-surface-variant hover:bg-surface'
            }`}
          >
            Emergency
          </button>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-[500px]">
          
        {/* Map Node Canvas (8 Cols) */}
        <section className="xl:col-span-8 industrial-panel rounded-[24px] p-0 flex flex-col relative overflow-hidden tech-border">
          <div className="scanline"></div>
          
          {/* Map Header Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 pointer-events-none">
            <div className="glass-panel-elevated px-3 py-2 rounded-lg flex items-center gap-3">
              <span className="material-symbols-rounded text-on-surface text-[16px]">share</span>
              <div className="flex flex-col">
                <h2 className="font-display text-xs font-semibold text-on-surface tracking-wide uppercase">Topology Matrix</h2>
                <span className="font-telemetry text-[9px] text-on-surface-variant">MAP-GRID: 34.02x</span>
              </div>
            </div>
            
            {/* State Ramp Legend */}
            <div className="glass-panel-elevated px-3 py-2 rounded-lg flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="led-pip led-pip-calm w-1.5 h-1.5"></div>
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">Nominal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="led-pip led-pip-building w-1.5 h-1.5"></div>
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">Advisory</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="led-pip led-pip-preempted w-1.5 h-1.5"></div>
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">Critical</span>
              </div>
            </div>
          </div>

          {/* Visual Geographic Map Layer */}
          <div className="flex-1 relative w-full h-full bg-surface-dim overflow-hidden min-h-[400px] rounded-b-[24px] flex flex-col items-center justify-center p-6">
            <AwaitingDataStub 
              title="Geographic Node Topology" 
              phaseRequired="Map Integration Phase" 
              expectedFile="N/A" 
              description="Visual map rendering of intersection nodes. MapLibre or DeckGL will be integrated here."
            />
          </div>
        </section>

        {/* Network Telemetry & Node Inspection Panel (4 Cols) */}
        <section className="xl:col-span-4 flex flex-col gap-6">
            
          {/* Selected Node Telemetry Card */}
          <div className="industrial-panel rounded-[24px] p-5 flex flex-col gap-4 tech-border">
            <div className="flex justify-between items-start border-b border-outline pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-surface-container-high border border-outline flex items-center justify-center">
                  <span className="material-symbols-rounded text-on-surface-variant text-[16px]">radar</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-[9px] uppercase tracking-[0.08em] text-on-surface-variant">Active Inspector</span>
                  <h3 className="font-telemetry text-sm font-semibold text-on-surface mt-0.5">IX-104</h3>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded bg-surface border border-outline text-on-surface font-label text-[10px] uppercase tracking-[0.08em] hover:bg-surface-container-highest transition-all flex items-center gap-1">
                <span>Inspect</span>
                <span className="material-symbols-rounded text-[14px]">open_in_new</span>
              </button>
            </div>

            {/* Live Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-3 relative">
              <div className="bg-surface-dim p-3 rounded-lg border border-white/[0.05]">
                <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Policy</span>
                <span className={`font-telemetry text-[12px] uppercase font-bold ${isPreempted ? 'text-state-preempted' : isBuilding ? 'text-state-building' : 'text-state-calm'}`}>
                  {isPreempted ? 'MAX-PREEMPT' : isBuilding ? 'ADAPTIVE' : 'FIXED-TIME'}
                </span>
              </div>
              <div className="bg-surface-dim p-3 rounded-lg border border-white/[0.05]">
                <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Arr (λ)</span>
                <span className="font-telemetry text-[12px] text-on-surface tabular-nums">
                  {isNormal ? '0.84 V/S' : '1.42 V/S'}
                </span>
              </div>
              <div className="bg-surface-dim p-3 rounded-lg border border-white/[0.05]">
                <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Max Queue</span>
                <span className={`font-telemetry text-[12px] tabular-nums ${isNormal ? 'text-on-surface' : 'text-state-building'}`}>
                  {isNormal ? '12 M' : '34 M'}
                </span>
              </div>
              <div className="bg-surface-dim p-3 rounded-lg border border-white/[0.05] relative overflow-hidden">
                {isPreempted && <div className="absolute bottom-0 left-0 right-0 h-1 bg-state-preempted/20"></div>}
                <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Overrides</span>
                <span className={`font-telemetry text-[12px] tabular-nums font-bold ${isPreempted ? 'text-state-preempted' : 'text-on-surface-variant'}`}>
                  {isPreempted ? '3 ACT' : '0 ACT'}
                </span>
              </div>
            </div>

            {/* Active Priority Queue Strip */}
            {isPreempted && (
              <div className="bg-surface p-3 rounded-lg border border-state-preempted/30 flex flex-col gap-2 mt-2 shadow-glow-preempted">
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Top Heap Priority</span>
                  <span className="font-telemetry text-[10px] text-state-preempted bg-state-preempted/10 px-1.5 py-0.5 rounded border border-state-preempted/30">SCR: 98.4</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-8 h-8 rounded bg-state-preempted/10 border border-state-preempted flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded text-state-preempted text-[16px]">airport_shuttle</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-telemetry text-[11px] text-on-surface font-semibold">E-Thru (Northbound)</span>
                    <span className="font-telemetry text-[9px] text-state-preempted uppercase tracking-widest">AMBULANCE INBOUND</span>
                  </div>
                </div>
              </div>
            )}
            {isBuilding && (
              <div className="bg-surface p-3 rounded-lg border border-state-building/30 flex flex-col gap-2 mt-2 shadow-glow-building">
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Queue Alert</span>
                  <span className="font-telemetry text-[10px] text-state-building bg-state-building/10 px-1.5 py-0.5 rounded border border-state-building/30">VOL: HIGH</span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-8 h-8 rounded bg-state-building/10 border border-state-building flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded text-state-building text-[16px]">directions_car</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-telemetry text-[11px] text-on-surface font-semibold">Main St. Corridor</span>
                    <span className="font-telemetry text-[9px] text-state-building uppercase tracking-widest">CONGESTION DETECTED</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Micro Chart: Corridor Aggregate */}
          <div className="industrial-panel rounded-[24px] p-5 flex flex-col gap-4 flex-1">
            <div className="flex justify-between items-center">
              <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">Corridor Performance</span>
              <span className="material-symbols-rounded text-on-surface-variant text-[16px]">show_chart</span>
            </div>
            
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex justify-between font-telemetry text-[10px] mb-1.5">
                  <span className="text-on-surface-variant">Global Efficiency</span>
                  <span className="text-state-calm">94.2%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-dim rounded border border-white/[0.05] overflow-hidden">
                  <div className="h-full bg-state-calm shadow-glow-calm" style={{ width: '94.2%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-telemetry text-[10px] mb-1.5">
                  <span className="text-on-surface-variant">Green Extension Util</span>
                  <span className="text-state-building">78.5%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-dim rounded border border-white/[0.05] overflow-hidden">
                  <div className="h-full bg-state-building shadow-glow-building" style={{ width: '78.5%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-telemetry text-[10px] mb-1.5">
                  <span className="text-on-surface-variant">Avg Preempt Latency</span>
                  <span className="text-state-preempted">1.2 S</span>
                </div>
                <div className="w-full h-1.5 bg-surface-dim rounded border border-white/[0.05] overflow-hidden">
                  <div className="h-full bg-state-preempted shadow-glow-preempted" style={{ width: '15%' }}></div>
                </div>
              </div>
            </div>

            {/* SVG Sparkline */}
            <div className="mt-auto pt-4 border-t border-outline">
              <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant block mb-2">Throughput Trend (1H)</span>
              <svg className="w-full h-12" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d="M 0 30 L 0 20 L 10 22 L 20 15 L 30 18 L 40 10 L 50 12 L 60 5 L 70 8 L 80 2 L 90 4 L 100 0 L 100 30 Z" fill="rgba(158,208,202,0.1)"></path>
                <path d="M 0 20 L 10 22 L 20 15 L 30 18 L 40 10 L 50 12 L 60 5 L 70 8 L 80 2 L 90 4 L 100 0" fill="none" stroke="#00c97a" strokeWidth="1.5"></path>
              </svg>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
