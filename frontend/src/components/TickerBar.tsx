"use client";

import React from "react";

interface TickerBarProps {
  isSidebarExpanded?: boolean;
}

export default function TickerBar({ isSidebarExpanded = false }: TickerBarProps) {
  const mockTickerData = [
    { time: "14:02:41", id: "IX104", type: "PREEMPT", msg: "Ambulance Override - Route Locked", colorClass: "bg-state-preempted/10 text-state-preempted border-state-preempted/30" },
    { time: "14:02:38", id: "IX102", type: "EXT", msg: "+4.2s Q buildup (Density 0.8)", colorClass: "bg-state-building/10 text-state-building border-state-building/30" },
    { time: "14:02:15", id: "IX101", type: "SCHED", msg: "Ph 2 (30s rem) Nominal flow", colorClass: "bg-state-calm/10 text-state-calm border-state-calm/30" },
    { time: "14:01:55", id: "IX106", type: "SCHED", msg: "Grn wave lock initiated", colorClass: "bg-state-calm/10 text-state-calm border-state-calm/30" },
    { time: "14:01:42", id: "SYS_O", type: "WARN", msg: "High packet loss on Sector 2 link", colorClass: "bg-state-building/10 text-state-building border-state-building/30" },
    { time: "14:01:12", id: "IX104", type: "INFO", msg: "Camera feed 3 re-established", colorClass: "bg-surface-container-high text-on-surface-variant border-outline" },
    { time: "14:00:58", id: "IX105", type: "SCHED", msg: "Cycle transition complete", colorClass: "bg-state-calm/10 text-state-calm border-state-calm/30" },
    { time: "14:00:22", id: "IX102", type: "EXT", msg: "Platoon detected (Northbound)", colorClass: "bg-state-building/10 text-state-building border-state-building/30" },
    { time: "14:00:01", id: "SYS_C", type: "SYNC", msg: "NTP clock sync successful (Offset 0.2ms)", colorClass: "bg-surface-container-high text-on-surface-variant border-outline" },
    { time: "13:59:45", id: "IX103", type: "PREEMPT", msg: "Fire Engine transit clear", colorClass: "bg-state-preempted/10 text-state-preempted border-state-preempted/30" },
  ];

  return (
    <footer
      className={`fixed bottom-0 right-0 h-10 bg-surface border-t border-outline z-30 flex items-center px-3 overflow-hidden transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "left-[264px]" : "left-[64px]"
      }`}
    >
      <div className="flex items-center gap-2 pr-4 border-r border-outline shrink-0 bg-surface z-10 h-full relative">
        <span className="material-symbols-rounded text-on-surface-variant text-[14px]">terminal</span>
        <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Sys_Log</span>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#111318] to-transparent pointer-events-none translate-x-full"></div>
      </div>
      
      <div className="ticker-wrap flex-1 ml-4 h-full flex items-center">
        <div className="ticker-move flex items-center gap-6" style={{ animationDuration: "40s", width: "max-content" }}>
          {/* Double map for seamless loop effect */}
          {[...mockTickerData, ...mockTickerData].map((item, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-telemetry text-[10px] text-on-surface-variant">[{item.time}]</span>
                <span className="font-telemetry text-[10px] text-on-surface font-bold">{item.id}</span>
                <span className={`px-1.5 py-0.5 rounded border font-telemetry text-[9px] uppercase tracking-widest ${item.colorClass}`}>
                  {item.type}
                </span>
                <span className="font-telemetry text-[10px] text-on-surface-variant">{item.msg}</span>
              </div>
              <div className="w-px h-3 bg-white/[0.12] shrink-0"></div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
}
