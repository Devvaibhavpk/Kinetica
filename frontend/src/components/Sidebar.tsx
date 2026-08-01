"use client";

import React from "react";
import Image from "next/image";

export type ModuleKey =
  | "overview"
  | "intersection"
  | "corridor"
  | "vision"
  | "analytics"
  | "health"
  | "emergency";

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
}

export default function Sidebar({ activeModule, onSelectModule }: SidebarProps) {
  const modules: { key: ModuleKey; icon: string; label: string }[] = [
    { key: "overview", icon: "dashboard", label: "Network Overview" },
    { key: "intersection", icon: "schema", label: "Intersection IX-104" },
    { key: "corridor", icon: "route", label: "Green Wave" },
    { key: "vision", icon: "videocam", label: "Vision Feed" },
    { key: "analytics", icon: "analytics", label: "Analytics" },
    { key: "health", icon: "monitor_heart", label: "System Health" },
  ];

  return (
    <nav className="kinetica-sidebar fixed top-0 left-0 w-[60px] h-[100vh] bg-surface border-r border-outline flex flex-col items-center py-2.5 gap-0.5 z-[200] overflow-visible">
      {/* Logo Area */}
      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center mb-3.5 shrink-0">
        <Image src="/logo.png" alt="Kinetica Logo" width={48} height={48} className="object-cover rounded-lg" />
      </div>

      {/* Nav Items */}
      {modules.map((m) => {
        const isActive = activeModule === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onSelectModule(m.key)}
            className={`w-11 h-11 rounded-md flex items-center justify-center cursor-pointer transition-colors duration-150 relative group decoration-transparent ${
              isActive
                ? "bg-state-calm/10 text-state-calm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
            title={m.label}
          >
            <span className="material-symbols-rounded text-[20px]">{m.icon}</span>
            <span className="nav-tooltip absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-surface-container-highest border border-outline rounded-md px-2.5 py-1 font-body text-[11px] font-medium text-on-surface whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[300]">
              {m.label}
            </span>
          </button>
        );
      })}

      <div className="w-7 h-px bg-outline my-1 shrink-0" />

      <button
        onClick={() => onSelectModule("emergency")}
        className={`w-11 h-11 rounded-md flex items-center justify-center cursor-pointer transition-colors duration-150 relative group decoration-transparent mt-auto mb-2 ${
          activeModule === "emergency"
            ? "bg-state-preempted/20 text-state-preempted border border-state-preempted/50"
            : "bg-state-preempted/10 text-state-preempted border border-state-preempted/30 hover:bg-state-preempted/20"
        }`}
        title="Emergency Override"
      >
        <span className="material-symbols-rounded text-[20px]" style={{ animation: "pulse-icon 1.8s ease infinite" }}>warning</span>
        <span className="nav-tooltip absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-surface-container-highest border border-outline rounded-md px-2.5 py-1 font-body text-[11px] font-medium text-state-preempted whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[300]">
          Emergency Override
        </span>
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-icon {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}} />
    </nav>
  );
}
