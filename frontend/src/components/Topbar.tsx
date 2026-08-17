"use client";

import React, { useState, useEffect } from "react";

interface TopbarProps {
  moduleTitle: string;
  isSidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
}

export default function Topbar({
  moduleTitle,
  isSidebarExpanded = false,
  onToggleSidebar,
}: TopbarProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false });
      const mm = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", minute: "2-digit", hour12: false });
      const ss = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", second: "2-digit", hour12: false });
      setTime(`${hh}:${mm}:${ss} IST`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 z-40 h-14 bg-surface/95 backdrop-blur-md border-b border-outline flex items-center justify-between px-6 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "left-[264px]" : "left-[64px]"
      }`}
    >
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer mr-1"
            title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            aria-label="Toggle Sidebar"
          >
            <span className="material-symbols-rounded text-[20px]">
              {isSidebarExpanded ? "menu_open" : "menu"}
            </span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-state-calm text-[18px]">public</span>
          <h1 className="font-display text-sm font-semibold tracking-wide uppercase">{moduleTitle}</h1>
        </div>
        <div className="h-4 w-px bg-white/[0.12]"></div>
        <div className="flex items-center gap-2">
          <div className="led-pip led-pip-calm"></div>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">System Optimal</span>
        </div>
      </div>

      {/* Global Telemetry Ribbon */}
      <div className="hidden md:flex items-center gap-6 font-telemetry text-[11px]">
        <div className="flex flex-col items-end">
          <span className="text-on-surface-variant text-[9px] uppercase tracking-wider mb-0.5">Network Load</span>
          <span className="text-state-building">84.2%</span>
        </div>
        <div className="h-6 w-px bg-white/[0.12]"></div>
        <div className="flex flex-col items-end">
          <span className="text-on-surface-variant text-[9px] uppercase tracking-wider mb-0.5">Active Nodes</span>
          <span className="text-on-surface">24 / 24</span>
        </div>
        <div className="h-6 w-px bg-white/[0.12]"></div>
        <div className="flex flex-col items-end">
          <span className="text-on-surface-variant text-[9px] uppercase tracking-wider mb-0.5">Latency</span>
          <span className="text-state-calm">1.2ms</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right flex flex-col justify-center">
          <span className="font-mono text-[10px] text-on-surface-variant">{time}</span>
        </div>
      </div>
    </header>
  );
}
