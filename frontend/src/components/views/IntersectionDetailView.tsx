"use client";

import React, { useState } from "react";

export default function IntersectionDetailView() {
  const [viewState, setViewState] = useState<'preempt' | 'rebalance'>('preempt');
  const isPreempt = viewState === 'preempt';

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto w-full">
      <style dangerouslySetInnerHTML={{ __html: `
        .scanline {
            width: 100%;
            height: 2px;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
            position: absolute;
            animation: scan 4s linear infinite;
            z-index: 10;
            pointer-events: none;
        }
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .blueprint-grid-sub {
            background-image: 
                linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px);
            background-size: 6px 6px;
        }
        .tech-border {
            position: relative;
        }
        .tech-border::before, .tech-border::after {
            content: '';
            position: absolute;
            width: 8px;
            height: 8px;
            border: 1px solid rgba(255,255,255,0.3);
            pointer-events: none;
        }
        .tech-border::before {
            top: -1px; left: -1px;
            border-right: none; border-bottom: none;
        }
        .tech-border::after {
            bottom: -1px; right: -1px;
            border-left: none; border-top: none;
        }
      `}} />

      {/* Bento Grid 1: Spatial Telemetry + Max-Pressure Heap Tree Visualization */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[440px]">

        {/* WIDGET 1: Spatial Telemetry (Top-Down Intersection View) */}
        <section className="xl:col-span-6 industrial-panel border border-outline rounded-[24px] p-0 flex flex-col relative overflow-hidden tech-border">
            <div className="scanline"></div>
            
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 pointer-events-none">
                <div className="glass-panel-elevated px-3 py-2 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-rounded text-on-surface text-[16px]">crosshair</span>
                    <div className="flex flex-col">
                        <h2 className="font-display text-xs font-semibold text-on-surface tracking-wide uppercase">Spatial Queues</h2>
                        <span className="font-telemetry text-[9px] text-on-surface-variant">NODE: IX-104 (10 HZ)</span>
                    </div>
                </div>
            </div>

            {/* Visualization Canvas */}
            <div className="flex-1 relative w-full flex items-center justify-center bg-surface-dim blueprint-grid-sub overflow-hidden min-h-[300px]">
                
                {/* Radar Circles */}
                <div className="absolute w-64 h-64 border border-white/[0.03] rounded-full pointer-events-none"></div>
                <div className="absolute w-48 h-48 border border-white/[0.05] rounded-full pointer-events-none"></div>
                <div className="absolute w-32 h-32 border border-outline rounded-full pointer-events-none"></div>

                {/* Intersection Center Box */}
                <div className="absolute w-16 h-16 bg-surface border border-white/[0.15] z-20 flex items-center justify-center">
                    {/* Reticle Corners */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/[0.3]"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/[0.3]"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/[0.3]"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/[0.3]"></div>
                    <div className="w-3 h-3 rounded bg-state-preempted shadow-glow-preempted pulse-preempted animate-pulse"></div>
                </div>

                {/* NORTH ARM */}
                <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-16 h-40 bg-surface-container/50 border-x border-outline flex justify-center z-10 backdrop-blur-sm">
                    <div 
                        id="bar-north" 
                        className="absolute bottom-0 w-10 bg-state-building/20 border-t-2 border-state-building flex items-start justify-center pt-2 transition-all duration-500"
                        style={{ height: isPreempt ? '60%' : '85%' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-state-building/30 pointer-events-none"></div>
                        <span className="font-telemetry text-[10px] font-semibold text-state-building shadow-glow-building">
                            {isPreempt ? "24.0M" : "38.5M"}
                        </span>
                    </div>
                    <div className="absolute top-2 left-full ml-3 whitespace-nowrap">
                        <span className="font-telemetry text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">N-DEN</span>
                        <span className="font-telemetry text-[11px] text-on-surface">0.82</span>
                    </div>
                </div>

                {/* SOUTH ARM */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-16 h-40 bg-surface-container/50 border-x border-outline flex justify-center z-10 backdrop-blur-sm">
                    <div className="absolute top-0 w-10 h-[25%] bg-state-calm/10 border-b-2 border-state-calm flex items-end justify-center pb-2 transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-state-calm/20 pointer-events-none"></div>
                        <span className="font-telemetry text-[10px] font-semibold text-state-calm shadow-glow-calm">8.0M</span>
                    </div>
                    <div className="absolute bottom-2 right-full mr-3 whitespace-nowrap text-right">
                        <span className="font-telemetry text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">S-DEN</span>
                        <span className="font-telemetry text-[11px] text-on-surface">0.31</span>
                    </div>
                </div>

                {/* EAST ARM (Emergency Preempted Arm) */}
                <div className="absolute top-1/2 right-1/2 -translate-y-1/2 w-48 h-16 bg-surface-container/50 border-y border-outline flex items-center z-10 backdrop-blur-sm">
                    <div 
                        id="bar-east" 
                        className="absolute right-0 h-10 bg-state-preempted/20 border-l-2 border-state-preempted flex items-center justify-start pl-2 transition-all duration-500 shadow-glow-preempted"
                        style={{ width: isPreempt ? '85%' : '40%' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-state-preempted/30 pointer-events-none"></div>
                        <div className="flex flex-col z-10">
                            <span className="font-telemetry text-[11px] font-bold text-state-preempted">
                                {isPreempt ? "34.0M" : "16.0M"}
                            </span>
                            {isPreempt && (
                                <span className="font-telemetry text-[8px] text-state-preempted uppercase tracking-widest">AMB_OVR</span>
                            )}
                        </div>
                    </div>
                    <div className="absolute bottom-full mb-3 left-2 whitespace-nowrap">
                        <span className="font-telemetry text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">E-DEN</span>
                        <span className="font-telemetry text-[11px] text-state-preempted font-bold">1.44</span>
                    </div>
                </div>

                {/* WEST ARM */}
                <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-48 h-16 bg-surface-container/50 border-y border-outline flex items-center z-10 backdrop-blur-sm">
                    <div className="absolute left-0 h-10 w-[15%] bg-state-calm/10 border-r-2 border-state-calm flex items-center justify-end pr-2 transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-state-calm/20 pointer-events-none"></div>
                        <span className="font-telemetry text-[10px] font-semibold text-state-calm shadow-glow-calm">2.0M</span>
                    </div>
                    <div className="absolute top-full mt-3 right-2 whitespace-nowrap text-right">
                        <span className="font-telemetry text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">W-DEN</span>
                        <span className="font-telemetry text-[11px] text-on-surface">0.12</span>
                    </div>
                </div>
            </div>
        </section>

        {/* WIDGET 2: Crisp Interactive Max-Pressure Heap Tree */}
        <section className="xl:col-span-6 industrial-panel border border-outline rounded-[24px] p-0 flex flex-col relative overflow-hidden tech-border">
            {/* Header Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 pointer-events-none">
                <div className="glass-panel-elevated px-3 py-2 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-rounded text-on-surface text-[16px]">account_tree</span>
                    <div className="flex flex-col">
                        <h2 className="font-display text-xs font-semibold text-on-surface tracking-wide uppercase">Max-Pressure Heap</h2>
                        <span className="font-telemetry text-[9px] text-on-surface-variant">DYNAMIC REORDER: ON</span>
                    </div>
                </div>

                {/* Heap Action Buttons */}
                <div className="glass-panel-elevated p-1 rounded-lg flex gap-2 pointer-events-auto border border-outline">
                    <button 
                        onClick={() => setViewState('preempt')} 
                        className="px-3 py-1.5 rounded bg-state-preempted/10 text-state-preempted border border-state-preempted/50 font-telemetry font-bold text-[9px] uppercase tracking-widest hover:bg-surface-container-high transition-all"
                    >
                        Force E-Thru
                    </button>
                    <button 
                        onClick={() => setViewState('rebalance')} 
                        className="px-3 py-1.5 rounded bg-surface border border-outline text-on-surface font-telemetry text-[9px] uppercase tracking-widest hover:bg-surface-container-high transition-all"
                    >
                        Bubble N-Thru
                    </button>
                </div>
            </div>

            {/* Interactive Heap Visualization Canvas */}
            <div className="flex-1 relative w-full flex items-center justify-center bg-surface-dim blueprint-grid-sub overflow-hidden min-h-[300px]">
                
                {/* SVG Edge Connector Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <line 
                        x1="50%" y1="25%" x2="30%" y2="55%" 
                        stroke={isPreempt ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)"}
                        strokeWidth="3" 
                        strokeDasharray={isPreempt ? "4 4" : "none"}
                        className="transition-all duration-500"
                    />
                    <line x1="50%" y1="25%" x2="70%" y2="55%" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
                    
                    <line x1="30%" y1="55%" x2="20%" y2="85%" stroke="rgba(255,255,255,0.05)" strokeWidth="2"/>
                    <line x1="30%" y1="55%" x2="40%" y2="85%" stroke="rgba(255,255,255,0.05)" strokeWidth="2"/>
                    <line x1="70%" y1="55%" x2="60%" y2="85%" stroke="rgba(255,255,255,0.05)" strokeWidth="2"/>
                    <line x1="70%" y1="55%" x2="80%" y2="85%" stroke="rgba(255,255,255,0.05)" strokeWidth="2"/>
                </svg>

                {/* HEAP NODE 0 (ROOT) */}
                <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center transition-all duration-500">
                    <div className={`w-16 h-16 rounded border-2 flex flex-col items-center justify-center cursor-pointer relative transition-all duration-500 ${
                        isPreempt 
                        ? "bg-state-preempted/10 border-state-preempted text-state-preempted shadow-glow-preempted"
                        : "bg-state-building/10 border-state-building text-state-building shadow-glow-building"
                    }`}>
                        <div className={`absolute inset-0 border scale-125 rounded pointer-events-none animate-pulse ${
                            isPreempt ? "border-state-preempted/20" : "border-state-building/20"
                        }`}></div>
                        <span className="font-telemetry text-[12px] font-bold">
                            {isPreempt ? "E-THRU" : "N-THRU"}
                        </span>
                    </div>
                    <div className={`mt-3 glass-panel-elevated border px-2 py-1 rounded flex items-center gap-2 transition-all duration-500 ${
                        isPreempt ? "border-state-preempted/50" : "border-state-building/50"
                    }`}>
                        <span className="font-telemetry text-[9px] text-on-surface-variant uppercase">SCR:</span>
                        <span className={`font-telemetry text-[11px] font-bold ${
                            isPreempt ? "text-state-preempted" : "text-state-building"
                        }`}>
                            {isPreempt ? "98.42" : "88.60"}
                        </span>
                    </div>
                </div>

                {/* HEAP LEVEL 1 - LEFT NODE */}
                <div className="absolute top-[55%] left-[30%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center transition-all duration-500">
                    <div className={`w-14 h-14 rounded bg-surface-container border flex flex-col items-center justify-center cursor-pointer relative transition-all duration-500 ${
                        isPreempt ? "border-state-building text-on-surface" : "border-outline text-on-surface-variant"
                    }`}>
                        <span className="font-telemetry text-[11px] font-bold">
                            {isPreempt ? "N-THRU" : "E-THRU"}
                        </span>
                    </div>
                    <div className="mt-2 glass-panel-elevated border border-outline px-2 py-1 rounded flex items-center gap-2">
                        <span className={`font-telemetry text-[10px] font-semibold transition-all duration-500 ${
                            isPreempt ? "text-state-building" : "text-on-surface-variant"
                        }`}>
                            {isPreempt ? "74.21" : "64.02"}
                        </span>
                    </div>
                </div>

                {/* HEAP LEVEL 1 - RIGHT NODE */}
                <div className="absolute top-[55%] left-[70%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center transition-all duration-500">
                    <div className="w-14 h-14 rounded bg-surface-container border border-state-calm flex flex-col items-center justify-center text-on-surface cursor-pointer">
                        <span className="font-telemetry text-[11px] font-bold">S-THRU</span>
                    </div>
                    <div className="mt-2 glass-panel-elevated border border-outline px-2 py-1 rounded flex items-center gap-2">
                        <span className="font-telemetry text-[10px] font-semibold text-state-calm">62.15</span>
                    </div>
                </div>

                {/* HEAP LEVEL 2 - NODES (Static visualization) */}
                <div className="absolute top-[85%] left-[20%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center opacity-70">
                    <div className="w-10 h-10 rounded bg-surface border border-outline flex items-center justify-center text-on-surface-variant">
                        <span className="font-telemetry text-[9px]">W-L</span>
                    </div>
                </div>
                <div className="absolute top-[85%] left-[40%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center opacity-70">
                    <div className="w-10 h-10 rounded bg-surface border border-outline flex items-center justify-center text-on-surface-variant">
                        <span className="font-telemetry text-[9px]">E-L</span>
                    </div>
                </div>
                <div className="absolute top-[85%] left-[60%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center opacity-70">
                    <div className="w-10 h-10 rounded bg-surface border border-outline flex items-center justify-center text-on-surface-variant">
                        <span className="font-telemetry text-[9px]">N-L</span>
                    </div>
                </div>
                <div className="absolute top-[85%] left-[80%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center opacity-70">
                    <div className="w-10 h-10 rounded bg-surface border border-outline flex items-center justify-center text-on-surface-variant">
                        <span className="font-telemetry text-[9px]">S-L</span>
                    </div>
                </div>
            </div>
        </section>
      </div>

      {/* Bento Grid 2: Phase Decisions Timeline (Gantt-style) */}
      <section className="industrial-panel border border-outline rounded-[24px] p-6 flex flex-col tech-border">
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                  <span className="material-symbols-rounded text-on-surface-variant text-[18px]">linear_scale</span>
                  <h2 className="font-display text-sm font-semibold text-on-surface uppercase tracking-wider">Phase Decision Timeline (60s)</h2>
              </div>
              
              <div className="flex items-center gap-4 bg-surface-container-high px-3 py-1.5 rounded border border-white/[0.05]">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-state-calm shadow-glow-calm"></div>
                      <span className="font-telemetry text-[9px] uppercase tracking-widest text-on-surface-variant">Sched</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-state-building shadow-glow-building"></div>
                      <span className="font-telemetry text-[9px] uppercase tracking-widest text-on-surface-variant">Ext</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-state-preempted shadow-glow-preempted"></div>
                      <span className="font-telemetry text-[9px] uppercase tracking-widest text-on-surface-variant">Preempt</span>
                  </div>
              </div>
          </div>

          {/* Timeline Container */}
          <div className="flex flex-col gap-3 font-telemetry text-[11px]">
              {/* Timeline Axis */}
              <div className="flex pl-16 text-[9px] text-on-surface-variant border-b border-outline pb-2 relative">
                  <span className="absolute left-16">-60S</span>
                  <span className="absolute left-1/2 -translate-x-1/2">-30S</span>
                  <span className="absolute right-0 text-on-surface font-bold animate-pulse">NOW</span>
              </div>

              {/* Row 1: N-Thru Approach */}
              <div className="flex items-center gap-4 mt-2">
                  <div className="w-12 text-right text-on-surface-variant font-bold">N-THRU</div>
                  <div className="flex-1 h-5 bg-surface-dim rounded flex border border-white/[0.05] overflow-hidden">
                      <div className="w-[10%]"></div>
                      <div className="w-[20%] bg-state-calm/70 border-r border-surface"></div>
                      <div className="w-[15%] bg-state-building relative">
                          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-30"></div>
                      </div>
                      <div className="w-[40%]"></div>
                      <div className="w-[15%] bg-state-building shadow-glow-building"></div>
                  </div>
              </div>

              {/* Row 2: S-Thru Approach */}
              <div className="flex items-center gap-4">
                  <div className="w-12 text-right text-on-surface-variant font-bold">S-THRU</div>
                  <div className="flex-1 h-5 bg-surface-dim rounded flex border border-white/[0.05] overflow-hidden">
                      <div className="w-[10%]"></div>
                      <div className="w-[20%] bg-state-calm/70 border-r border-surface"></div>
                      <div className="w-[55%]"></div>
                      <div className="w-[15%] bg-state-calm/40"></div>
                  </div>
              </div>

              {/* Row 3: E-Thru Approach */}
              <div className="flex items-center gap-4">
                  <div className="w-12 text-right text-state-preempted font-bold shadow-glow-preempted">E-THRU</div>
                  <div className="flex-1 h-5 bg-surface-dim rounded flex border border-state-preempted/30 overflow-hidden relative">
                      <div className="w-[35%]"></div>
                      <div className="w-[30%] bg-state-preempted shadow-glow-preempted flex items-center justify-center">
                          <span className="font-telemetry text-[8px] text-[#0a0a0a] font-bold tracking-widest">OVR</span>
                      </div>
                      <div className="w-[35%] bg-state-preempted/10"></div>
                      {/* Current time indicator pulse */}
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-white animate-pulse"></div>
                  </div>
              </div>

              {/* Row 4: W-Thru Approach */}
              <div className="flex items-center gap-4">
                  <div className="w-12 text-right text-on-surface-variant font-bold">W-THRU</div>
                  <div className="flex-1 h-5 bg-surface-dim rounded flex border border-white/[0.05] overflow-hidden">
                      <div className="w-[35%]"></div>
                      <div className="w-[5%] bg-state-calm/30"></div>
                      <div className="w-[60%]"></div>
                  </div>
              </div>
          </div>
      </section>
    </div>
  );
}
