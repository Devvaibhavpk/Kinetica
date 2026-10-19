"use client";

import React from "react";
import Image from "next/image";

export type ModuleKey =
  | "overview"
  | "intersection"
  | "vision"
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
}

const MODULES: NavModuleItem[] = [
  {
    key: "overview",
    icon: "dashboard",
    label: "Network Overview",
  },
  {
    key: "intersection",
    icon: "traffic",
    label: "Intersection Telemetry",
  },
  {
    key: "vision",
    icon: "videocam",
    label: "Vision Perception Feed",
  },
  {
    key: "settings",
    icon: "tune",
    label: "System Settings",
  },
];

export default function Sidebar({
  activeModule,
  onSelectModule,
  isExpanded,
  onToggleExpand,
}: SidebarProps) {
  return (
    <nav
      className={`kinetica-sidebar fixed top-0 left-0 h-screen flex flex-col z-[200] transition-all duration-300 ease-in-out select-none
        /* Apple Liquid Glass Vibrancy & Refraction */
        bg-white/75 dark:bg-zinc-950/75
        backdrop-blur-3xl saturate-150
        border-r border-slate-200/80 dark:border-white/[0.08]
        shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_40px_rgba(0,0,0,0.06)]
        dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.5)]
        ${isExpanded ? "w-[264px] p-3.5" : "w-[64px] py-3.5 px-2 items-center"}
      `}
    >
      {/* ── HEADER / BRAND ── */}
      <div
        className={`flex items-center shrink-0 mb-3.5 ${
          isExpanded ? "justify-between px-1" : "justify-center flex-col gap-3"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Squircle Glass App Icon Container */}
          <div className="w-9 h-9 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-slate-100 dark:from-white/10 dark:to-white/[0.03] border border-slate-200/80 dark:border-white/[0.14] flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-black/40">
            <Image
              src="/logo.png"
              alt="Kinetica Logo"
              width={36}
              height={36}
              className="object-cover rounded-xl"
            />
          </div>

          {isExpanded && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                Kinetica
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                Adaptive ITS
              </span>
            </div>
          )}
        </div>

        {/* Header Collapse Toggle Button (Apple style icon button) */}
        {isExpanded && (
          <button
            onClick={onToggleExpand}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-900/5 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-all duration-150 cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <span className="material-symbols-rounded text-[18px]">
              first_page
            </span>
          </button>
        )}
      </div>

      {/* Hairline Glass Divider */}
      <div className="w-full h-px bg-slate-200/70 dark:bg-white/[0.06] mb-3 shrink-0" />

      {/* ── NAVIGATION LIST ── */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {MODULES.map((m) => {
          const isActive = activeModule === m.key;
          return (
            <button
              key={m.key}
              onClick={() => onSelectModule(m.key)}
              className={`group relative rounded-xl flex items-center cursor-pointer transition-all duration-150 ${
                isExpanded
                  ? "w-full h-10 px-3 gap-3 text-left"
                  : "w-10 h-10 justify-center mx-auto"
              } ${
                isActive
                  ? "bg-slate-900/[0.06] dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.03] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.03]"
              }`}
              title={!isExpanded ? m.label : undefined}
            >
              <span
                className={`material-symbols-rounded text-[20px] shrink-0 transition-colors ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 group-hover:text-slate-700 dark:text-zinc-500 dark:group-hover:text-zinc-200"
                }`}
              >
                {m.icon}
              </span>

              {isExpanded ? (
                <span
                  className={`text-[13px] tracking-tight truncate flex-1 transition-colors ${
                    isActive
                      ? "font-semibold text-slate-900 dark:text-white"
                      : "font-medium text-slate-600 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-white"
                  }`}
                >
                  {m.label}
                </span>
              ) : (
                /* Sleek Liquid Glass Tooltip in Collapsed Mode */
                <span className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 backdrop-blur-2xl text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-2xl z-[300]">
                  {m.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CLEAN MINIMAL FOOTER ── */}
      <div className="shrink-0 pt-3 border-t border-slate-200/70 dark:border-white/[0.06] flex flex-col gap-2">
        {/* Fluid Collapse / Expand Toggle Button */}
        <button
          onClick={onToggleExpand}
          className={`flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-all duration-150 cursor-pointer ${
            isExpanded
              ? "w-full h-9 px-3 gap-2.5 text-xs font-medium text-left justify-start"
              : "w-11 h-9 mx-auto"
          }`}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <span className="material-symbols-rounded text-[18px]">
            {isExpanded ? "first_page" : "last_page"}
          </span>
          {isExpanded && <span>Collapse Sidebar</span>}
        </button>

        {isExpanded && (
          <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-mono text-slate-400 dark:text-zinc-500">
            <span>Kinetica ITS</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
