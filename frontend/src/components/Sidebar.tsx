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
  | "emergency"
  | "settings";

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

interface NavModuleItem {
  key: ModuleKey;
  icon: string;
  label: string;
  category: "operations" | "system";
  tag: string;
  description: string;
}

export default function Sidebar({
  activeModule,
  onSelectModule,
  isExpanded,
  onToggleExpand,
}: SidebarProps) {
  const modules: NavModuleItem[] = [
    {
      key: "overview",
      icon: "dashboard",
      label: "Network Overview",
      category: "operations",
      tag: "LIVE",
      description: "Macro corridor status & aggregate KPIs",
    },
    {
      key: "intersection",
      icon: "traffic",
      label: "Intersection IX-104",
      category: "operations",
      tag: "ACTIVE",
      description: "4-Way queue inspector & dynamic phase timers",
    },
    {
      key: "vision",
      icon: "videocam",
      label: "Vision Edge Feed",
      category: "operations",
      tag: "YOLOv8",
      description: "Camera perception & homography spatial mapping",
    },
    {
      key: "corridor",
      icon: "route",
      label: "Green Wave Router",
      category: "operations",
      tag: "ROUTING",
      description: "Directed-graph multi-node corridor preemption",
    },
    {
      key: "emergency",
      icon: "emergency",
      label: "Emergency Override",
      category: "operations",
      tag: "OVERRIDE",
      description: "Ambulance & high-priority corridor preemption",
    },
    {
      key: "analytics",
      icon: "query_stats",
      label: "Predictive Analytics",
      category: "system",
      tag: "SC4",
      description: "Bottleneck forecasting & hypothesis tests",
    },
    {
      key: "health",
      icon: "speed",
      label: "System Health",
      category: "system",
      tag: "O(log N)",
      description: "Max-Heap benchmark & hardware telemetry",
    },
    {
      key: "settings",
      icon: "tune",
      label: "Control & Scenarios",
      category: "system",
      tag: "CFG",
      description: "Trigger synthetic runs & parameter config",
    },
  ];

  return (
    <nav
      className={`kinetica-sidebar fixed top-0 left-0 h-[100vh] bg-surface-low border-r border-outline flex flex-col z-[200] transition-all duration-300 ease-in-out select-none shadow-2xl ${
        isExpanded ? "w-[264px] px-3 py-3" : "w-[64px] px-1.5 py-2.5 items-center"
      }`}
    >
      {/* Top Header & Logo */}
      <div
        className={`flex items-center gap-3 mb-3 shrink-0 ${
          isExpanded ? "justify-between px-1" : "justify-center flex-col gap-2"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-mid border border-outline flex items-center justify-center shrink-0 shadow-sm">
            <Image
              src="/logo.png"
              alt="Kinetica Logo"
              width={40}
              height={40}
              className="object-cover rounded-md"
            />
          </div>

          {isExpanded && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <span className="font-mono text-xs font-bold tracking-wider text-on-surface uppercase truncate">
                KINETICA ITS
              </span>
              <span className="font-mono text-[9px] text-on-surface-variant truncate">
                Control Room v2.4
              </span>
            </div>
          )}
        </div>

        {/* Toggle Expand/Collapse Button */}
        <button
          onClick={onToggleExpand}
          className={`rounded-md flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-[#2c2f3a] transition-colors duration-150 cursor-pointer ${
            isExpanded ? "w-8 h-8" : "w-10 h-6 mt-0.5 text-xs bg-surface-mid border border-outline"
          }`}
          title={isExpanded ? "Collapse sidebar" : "Expand for more details"}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span className="material-symbols-rounded text-[18px]">
            {isExpanded ? "first_page" : "last_page"}
          </span>
        </button>
      </div>

      <div className="w-full h-px bg-[#2e3140] my-1 shrink-0" />

      {/* Main Nav Items List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1 py-1 custom-scrollbar">
        {/* Operational Section */}
        {isExpanded && (
          <div className="px-2 pt-2 pb-1">
            <span className="font-mono text-[9px] font-semibold tracking-widest text-on-surface-variant uppercase">
              Control Modules
            </span>
          </div>
        )}

        {modules.map((m) => {
          const isActive = activeModule === m.key;
          return (
            <button
              key={m.key}
              onClick={() => onSelectModule(m.key)}
              className={`rounded-lg flex items-center cursor-pointer transition-all duration-150 relative group ${
                isExpanded ? "w-full px-2.5 py-2 text-left gap-3" : "w-11 h-11 justify-center my-0.5"
              } ${
                isActive
                  ? "bg-state-calm/15 text-state-calm border border-state-calm-border shadow-[0_0_12px_rgba(0,201,122,0.15)]"
                  : "text-on-surface-variant hover:bg-surface-mid hover:text-on-surface border border-transparent"
              }`}
              title={!isExpanded ? m.label : undefined}
            >
              <span
                className={`material-symbols-rounded text-[20px] shrink-0 ${
                  isActive ? "text-state-calm" : "text-on-surface-variant group-hover:text-on-surface"
                }`}
              >
                {m.icon}
              </span>

              {isExpanded ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface"
                      }`}
                    >
                      {m.label}
                    </span>
                    <span
                      className={`font-mono text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-state-calm/20 text-state-calm border border-state-calm-border"
                          : "bg-[#2c2f3a] text-on-surface-variant"
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-on-surface-variant truncate mt-0.5 opacity-85">
                    {m.description}
                  </p>
                </div>
              ) : (
                /* Tooltip in collapsed mode */
                <span className="nav-tooltip absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-surface-mid border border-outline rounded-md px-3 py-1.5 font-sans text-xs font-medium text-on-surface whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[300] shadow-xl">
                  <div className="font-semibold">{m.label}</div>
                  <div className="font-mono text-[9px] text-on-surface-variant mt-0.5">{m.description}</div>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="w-full h-px bg-[#2e3140] my-1 shrink-0" />

      {/* Emergency Preemption Button */}
      <div className="shrink-0 my-1">
        {isExpanded && (
          <div className="px-2 pt-1 pb-1">
            <span className="font-mono text-[9px] font-semibold tracking-widest text-state-preempted uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-state-preempted animate-pulse"></span>
              Priority Override
            </span>
          </div>
        )}

        <button
          onClick={() => onSelectModule("emergency")}
          className={`rounded-lg flex items-center cursor-pointer transition-all duration-150 relative group ${
            isExpanded ? "w-full px-2.5 py-2.5 text-left gap-3" : "w-11 h-11 justify-center my-1"
          } ${
            activeModule === "emergency"
              ? "bg-state-preempted/20 text-state-preempted border border-[#ff4060]/60 shadow-[0_0_16px_rgba(255,64,96,0.25)]"
              : "bg-state-preempted/10 text-state-preempted border border-state-crit-border hover:bg-state-preempted/20"
          }`}
          title={!isExpanded ? "Emergency Override Controller" : undefined}
        >
          <span
            className="material-symbols-rounded text-[20px] shrink-0 text-state-preempted"
            style={{ animation: "pulse-icon 1.8s ease infinite" }}
          >
            warning
          </span>

          {isExpanded ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-state-preempted truncate uppercase tracking-tight">
                  Emergency Override
                </span>
                <span className="font-mono text-[8px] px-1 py-0.2 rounded bg-state-preempted/20 text-state-preempted font-bold border border-state-crit-border uppercase animate-pulse">
                  MAX-HEAP
                </span>
              </div>
              <p className="font-mono text-[10px] text-state-preempted/80 truncate mt-0.5">
                Instant priority & green wave preemption
              </p>
            </div>
          ) : (
            <span className="nav-tooltip absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-surface-mid border border-[#ff4060]/50 rounded-md px-3 py-1.5 font-sans text-xs font-medium text-state-preempted whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[300] shadow-xl">
              <div className="font-bold">Emergency Override</div>
              <div className="font-mono text-[9px] text-on-surface/80 mt-0.5">
                Max-Heap priority signal override
              </div>
            </span>
          )}
        </button>
      </div>

      {/* Expanded Footer / Status Card */}
      {isExpanded && (
        <div className="shrink-0 mt-2 p-2.5 rounded-lg card border border-outline transition-all duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">
              Telemetry Status
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-state-calm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-state-calm animate-ping"></span>
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-on-surface">
            <span className="text-on-surface-variant">Actuation Mode</span>
            <span className="text-primary">Poisson Dynamic</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-on-surface mt-0.5">
            <span className="text-on-surface-variant">Controller Tick</span>
            <span className="text-state-calm">4.2ms</span>
          </div>
        </div>
      )}

      {/* Collapse Action Footer Bar */}
      <div className="shrink-0 mt-2 pt-2 border-t border-outline/60 flex items-center justify-center">
        <button
          onClick={onToggleExpand}
          className={`flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-mid rounded-md transition-colors cursor-pointer ${
            isExpanded ? "w-full py-1.5 gap-2 px-2 text-xs font-mono" : "w-8 h-8"
          }`}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <span className="material-symbols-rounded text-[18px]">
            {isExpanded ? "chevron_left" : "chevron_right"}
          </span>
          {isExpanded && <span>Collapse Sidebar</span>}
        </button>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pulse-icon {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `,
        }}
      />
    </nav>
  );
}
