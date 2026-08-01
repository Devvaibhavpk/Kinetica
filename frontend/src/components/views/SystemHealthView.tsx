"use client";

import React, { useState } from "react";

export default function SystemHealthView() {
  const [laneCount, setLaneCount] = useState(128);

  return (
    <main className="p-4 md:p-8 w-full min-h-screen">
      {/* Page Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/30 rounded-full font-label text-[10px] text-primary uppercase tracking-wider">
              HARDWARE & ENGINE TELEMETRY
            </span>
            <span className="text-xs text-on-surface-variant font-telemetry">NODE: KINETICA-CORE-01</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface tracking-tight">System Health & Benchmarks</h1>
          <p className="text-on-surface-variant text-sm font-body mt-1">Real-time SLA latency verification, CPU core allocation, algorithm complexity profiling, and live event logs.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 flex items-center gap-2.5 border border-primary/30">
            <span className="led-pip led-calm"></span>
            <span className="font-telemetry text-xs text-primary font-bold">ALL SYSTEMS CALM</span>
          </div>
        </div>
      </header>

      {/* Module Status Grid (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Vision Inference */}
        <div className="module-card glass-card p-3 flex flex-col justify-between border border-outline">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">MODULE 01</span>
              <h3 className="font-display text-base font-bold text-on-surface">Vision Inference</h3>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-state-calm/30 bg-state-calm/10 flex items-center gap-1.5">
              <span className="led-pip led-calm"></span>
              <span className="font-label text-[10px] text-state-calm uppercase font-bold">OPTIMAL</span>
            </div>
          </div>

          <div className="my-2">
            <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">LATENCY (99TH P-TILE)</div>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry text-2xl font-bold text-on-surface tabular-nums">12.4</span>
              <span className="font-label text-xs text-on-surface-variant uppercase">MS</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-outline flex justify-between items-center text-xs font-telemetry">
            <span className="text-on-surface-variant font-label uppercase">THROUGHPUT:</span>
            <span className="text-primary font-bold">60.0 FPS</span>
          </div>
        </div>

        {/* Card 2: Actuation Engine */}
        <div className="module-card glass-card p-3 flex flex-col justify-between border border-outline">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">MODULE 02</span>
              <h3 className="font-display text-base font-bold text-on-surface">Actuation Engine</h3>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-state-calm/30 bg-state-calm/10 flex items-center gap-1.5">
              <span className="led-pip led-calm"></span>
              <span className="font-label text-[10px] text-state-calm uppercase font-bold">HEALTHY</span>
            </div>
          </div>

          <div className="my-2">
            <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">DECISION LATENCY</div>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry text-2xl font-bold text-primary tabular-nums">3.8</span>
              <span className="font-label text-xs text-on-surface-variant uppercase">MS</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-outline flex justify-between items-center text-xs font-telemetry">
            <span className="text-on-surface-variant font-label uppercase">CYCLE LENGTH:</span>
            <span className="text-state-calm font-bold">90S (ADAPTIVE)</span>
          </div>
        </div>

        {/* Card 3: Preemption Router */}
        <div className="module-card glass-card p-3 flex flex-col justify-between border border-outline">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">MODULE 03</span>
              <h3 className="font-display text-base font-bold text-on-surface">Preemption Router</h3>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-state-building/30 bg-state-building/10 flex items-center gap-1.5">
              <span className="led-pip led-building"></span>
              <span className="font-label text-[10px] text-state-building uppercase font-bold">MONITORING</span>
            </div>
          </div>

          <div className="my-2">
            <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">ROUTER LATENCY</div>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry text-2xl font-bold text-secondary tabular-nums">4.1</span>
              <span className="font-label text-xs text-on-surface-variant uppercase">MS</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-outline flex justify-between items-center text-xs font-telemetry">
            <span className="text-on-surface-variant font-label uppercase">ACTIVE PREEMPT:</span>
            <span className="text-secondary font-bold">0 IN QUEUE</span>
          </div>
        </div>

        {/* Card 4: Analytics Pipeline */}
        <div className="module-card glass-card p-3 flex flex-col justify-between border border-outline">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">MODULE 04</span>
              <h3 className="font-display text-base font-bold text-on-surface">Analytics Pipeline</h3>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-state-calm/30 bg-state-calm/10 flex items-center gap-1.5">
              <span className="led-pip led-calm"></span>
              <span className="font-label text-[10px] text-state-calm uppercase font-bold">HEALTHY</span>
            </div>
          </div>

          <div className="my-2">
            <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">BATCH INTERVAL</div>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry text-2xl font-bold text-on-surface tabular-nums">48.2</span>
              <span className="font-label text-xs text-on-surface-variant uppercase">MS</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-outline flex justify-between items-center text-xs font-telemetry">
            <span className="text-on-surface-variant font-label uppercase">SAMPLE INGEST:</span>
            <span className="text-primary font-bold">14.2K / SEC</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Complexity Curve & CPU Allocations */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Hero Section: Algorithm Complexity Verification (Col 8) */}
        <div className="md:col-span-8 glass-card p-4 border border-outline flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-rounded text-primary">analytics</span>
                Algorithm Complexity & Execution Timing
              </h3>
              <p className="text-xs text-on-surface-variant font-body mt-0.5">
                <span className="font-telemetry font-bold text-primary">LanePriorityHeap O(log n)</span> execution timing curve vs naive linear array scan.
              </p>
            </div>

            <div className="px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full flex items-center gap-2">
              <span className="led-pip led-calm"></span>
              <span className="font-telemetry text-xs text-primary font-bold">O(LOG N) VERIFIED</span>
            </div>
          </div>

          {/* Live Curve SVG Plot */}
          <div className="relative w-full h-[230px] bg-surface-container-high rounded-[24px] p-4 border border-outline flex flex-col justify-end">
            {/* Y Axis Labels */}
            <div className="absolute left-3 top-4 bottom-8 flex flex-col justify-between text-[10px] text-on-surface-variant font-telemetry">
              <span>1.0 µs</span>
              <span>0.5 µs</span>
              <span>0.0 µs</span>
            </div>

            {/* SVG Curve */}
            <div className="ml-10 w-[calc(100%-2.5rem)] h-[170px] relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 180">
                <defs>
                  <linearGradient id="heapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#79b4a9" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#79b4a9" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="heapFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#79b4a9" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#79b4a9" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="45" x2="500" y2="45" stroke="#FFFFFF" strokeOpacity="0.04" strokeDasharray="2,2" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#FFFFFF" strokeOpacity="0.04" strokeDasharray="2,2" />
                <line x1="0" y1="135" x2="500" y2="135" stroke="#FFFFFF" strokeOpacity="0.04" strokeDasharray="2,2" />

                {/* O(n) Naive Scan (Vermilion dashed line) */}
                <path d="M 0,175 L 500,20" fill="none" stroke="#f05542" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />

                {/* O(log n) Heap Curve Fill & Stroke */}
                <path d="M 0,175 Q 100,160 250,130 T 500,95 L 500,180 L 0,180 Z" fill="url(#heapFillGrad)" />
                <path d="M 0,175 Q 100,160 250,130 T 500,95" fill="none" stroke="url(#heapGrad)" strokeWidth="2.5" />

                {/* Interactive Target Dot */}
                <circle cx="500" cy="95" r="4" fill="#79b4a9" />
              </svg>

              {/* Floating Tooltip */}
              <div className="absolute right-4 top-4 bg-surface-container-high/90 border border-primary/30 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
                <div className="font-label text-[9px] text-on-surface-variant uppercase tracking-wider">T(N) AT N = 128 LANES</div>
                <div className="font-telemetry text-xs font-bold text-primary">0.042 µs <span className="text-[10px] text-on-surface-variant">(1.24M ops/sec)</span></div>
              </div>
            </div>

            {/* X Axis Labels */}
            <div className="ml-10 w-[calc(100%-2.5rem)] flex justify-between text-[10px] text-on-surface-variant font-telemetry pt-2 border-t border-outline">
              <span>1 Lane</span>
              <span>16 Lanes</span>
              <span>32 Lanes</span>
              <span>64 Lanes</span>
              <span>128 Lanes</span>
            </div>
          </div>

          {/* Slider & Controls Footer */}
          <div className="mt-4 pt-3 border-t border-outline flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">SIMULATE LANE COUNT (N):</span>
              <input
                type="range"
                min="1"
                max="128"
                value={laneCount}
                onChange={(e) => setLaneCount(Number(e.target.value))}
                className="w-44 h-2 bg-surface-container-high rounded-[24px] appearance-none cursor-pointer accent-primary"
              />
              <span className="font-telemetry text-sm font-bold text-primary">{laneCount}</span>
            </div>

            <div className="text-xs font-telemetry text-on-surface-variant">
              Speedup vs Naive Array Scan: <strong className="text-state-calm">23.8x</strong>
            </div>
          </div>
        </div>

        {/* CPU & Memory Resources (Col 4) */}
        <div className="md:col-span-4 glass-card p-4 flex flex-col justify-between border border-outline">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-rounded text-primary">memory</span>
                CPU & Memory Allocation
              </h3>
              <span className="px-2 py-0.5 industrial-panel border border-outline tech-border rounded-[24px] font-telemetry text-[10px] text-on-surface-variant">
                AVX2 SIMD
              </span>
            </div>

            <p className="text-xs text-on-surface-variant font-body mb-4">Pinning allocations across Kinetica multi-core worker threads.</p>

            {/* CPU Core Bars */}
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-telemetry mb-1">
                  <span className="text-on-surface">Core 0 (Main Event Loop)</span>
                  <span className="text-primary font-bold">24.2%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                  <div className="h-full bg-primary rounded-full bar-transition" style={{ width: "24%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-telemetry mb-1">
                  <span className="text-on-surface">Core 1 (Vision Inference)</span>
                  <span className="text-secondary font-bold">68.5%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                  <div className="h-full bg-secondary rounded-full bar-transition" style={{ width: "68%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-telemetry mb-1">
                  <span className="text-on-surface">Core 2 (Heap Prioritizer)</span>
                  <span className="text-primary font-bold">18.1%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                  <div className="h-full bg-primary/80 rounded-full bar-transition" style={{ width: "18%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-telemetry mb-1">
                  <span className="text-on-surface">Core 3 (Actuation Worker)</span>
                  <span className="text-primary font-bold">12.4%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-[24px] overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full bar-transition" style={{ width: "12%" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Heap Footprint Footer */}
          <div className="mt-5 pt-3 border-t border-outline flex flex-col gap-1.5 font-telemetry text-xs">
            <div className="flex justify-between">
              <span className="font-label text-on-surface-variant uppercase">MEMORY HEAP:</span>
              <span className="text-on-surface font-bold">2.4 / 16.0 GB (15%)</span>
            </div>
            <div className="flex justify-between">
              <span className="font-label text-on-surface-variant uppercase">GC PAUSE OVERHEAD:</span>
              <span className="text-state-calm font-bold">&lt; 0.6ms (0.02%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Interactive Live Log Terminal */}
      <div className="glass-card p-4 md:p-4 border border-outline">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[24px] industrial-panel border border-outline tech-border flex items-center justify-center text-primary">
              <span className="material-symbols-rounded text-lg">terminal</span>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface">Live System Event Log Terminal</h3>
              <p className="text-xs text-on-surface-variant font-body">Real-time structured telemetry stream across all District 7 engine modules.</p>
            </div>
          </div>

          {/* Terminal Actions & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Log Level Filters */}
            <div className="flex bg-surface-container-high rounded-[24px] p-0.5 border border-outline text-xs font-label uppercase">
              <button className="px-3 py-1 rounded-full bg-primary text-on-primary font-bold">ALL</button>
              <button className="px-3 py-1 rounded-full text-on-surface-variant hover:text-on-surface">INFO</button>
              <button className="px-3 py-1 rounded-full text-on-surface-variant hover:text-on-surface">PERF</button>
              <button className="px-3 py-1 rounded-full text-on-surface-variant hover:text-on-surface">WARN</button>
            </div>

            <button className="px-3.5 py-1.5 bg-surface-container hover:industrial-panel border border-outline tech-border text-on-surface text-xs font-label uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5">
              <span className="material-symbols-rounded text-sm">pause</span>
              <span>Pause Stream</span>
            </button>

            <button className="px-3 py-1.5 bg-surface-container hover:industrial-panel border border-outline tech-border text-on-surface-variant hover:text-on-surface text-xs font-label uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5">
              <span className="material-symbols-rounded text-sm">delete_sweep</span>
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Terminal Box Container */}
        <div className="w-full bg-surface-dim rounded-[24px] border border-outline p-4 font-telemetry text-xs flex flex-col h-[280px]">
          {/* Terminal Header Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-outline text-[10px] text-on-surface-variant">
            <div className="flex items-center gap-2.5">
              <span className="led-pip led-calm"></span>
              <span className="font-label uppercase text-primary font-bold">STREAM ACTIVE — PORT 8443</span>
            </div>
            <div className="flex gap-2">
              <span className="font-label uppercase hidden sm:inline">LEVEL COLOR:</span>
              <span className="text-primary">INFO</span>
              <span className="text-state-calm">PERF</span>
              <span className="text-secondary">WARN</span>
              <span className="text-state-preempted">PREEMPT</span>
            </div>
          </div>

          {/* Log Output Scroll Container */}
          <div className="flex-1 overflow-y-auto terminal-scroll pt-3 space-y-2 text-[11px]">
            <div className="flex items-start gap-4 text-on-surface">
              <span className="text-on-surface-variant/50 shrink-0">[14:32:01.042]</span>
              <span className="text-primary font-bold shrink-0">[INFO]</span>
              <span className="text-on-surface-variant/70 shrink-0">[Actuation-Core0]</span>
              <span>Actuation Engine synchronized. Target cycle length: 90s. Phase 2 (NB/SB) active.</span>
            </div>

            <div className="flex items-start gap-4 text-on-surface">
              <span className="text-on-surface-variant/50 shrink-0">[14:32:01.115]</span>
              <span className="text-primary font-bold shrink-0">[INFO]</span>
              <span className="text-on-surface-variant/70 shrink-0">[Vision-Core1]</span>
              <span>Vision Inference model weights verified against SHA-256 checksum 0x7F4A...</span>
            </div>

            <div className="flex items-start gap-4 text-on-surface bg-primary/10 -mx-4 px-4 py-1 border-l-2 border-primary">
              <span className="text-on-surface-variant/50 shrink-0">[14:32:01.200]</span>
              <span className="text-state-calm font-bold shrink-0">[PERF]</span>
              <span className="text-on-surface-variant/70 shrink-0">[Heap-Core2]</span>
              <span className="text-state-calm font-bold">LanePriorityHeap re-sorted in 0.042 µs (n=128 lanes). Root priority: Lane IX-104-N.</span>
            </div>

            <div className="flex items-start gap-4 text-on-surface">
              <span className="text-on-surface-variant/50 shrink-0">[14:32:02.001]</span>
              <span className="text-on-surface-variant font-bold shrink-0">[DEBUG]</span>
              <span className="text-on-surface-variant/70 shrink-0">[System-GC]</span>
              <span className="text-on-surface-variant">Non-blocking GC sweep triggered. Reclaimed 14.2 MB. Pause duration: 0.18ms.</span>
            </div>

            <div className="flex items-start gap-4 text-on-surface bg-secondary/10 -mx-4 px-4 py-1 border-l-2 border-secondary">
              <span className="text-on-surface-variant/50 shrink-0">[14:32:02.450]</span>
              <span className="text-secondary font-bold shrink-0">[WARN]</span>
              <span className="text-on-surface-variant/70 shrink-0">[Preempt-Core3]</span>
              <span className="text-secondary">Preemption Router detecting slight network jitter on interface eth0 (latency 4.1ms).</span>
            </div>

            <div className="flex items-start gap-4 text-on-surface">
              <span className="text-on-surface-variant/50 shrink-0">[14:32:03.010]</span>
              <span className="text-primary font-bold shrink-0">[INFO]</span>
              <span className="text-on-surface-variant/70 shrink-0">[Vision-Core1]</span>
              <span>Vision Inference batch #4092 processed successfully (60.0 FPS). Zero dropped frames.</span>
            </div>
          </div>

          {/* Cursor line */}
          <div className="pt-2 border-t border-white/[0.05] flex items-center gap-2 text-primary font-bold text-xs">
            <span className="animate-pulse">&gt;</span>
            <span className="text-on-surface-variant font-normal text-[10px]">System event stream monitoring active...</span>
          </div>
        </div>
      </div>
    </main>
  );
}
