"use client";

import React from "react";

export type ViewType =
  | "overview"
  | "intersection"
  | "vision"
  | "corridor"
  | "analytics"
  | "health"
  | "settings";

interface NavigationProps {
  activeView: ViewType;
  onSelectView: (view: ViewType) => void;
}

export default function Navigation({ activeView, onSelectView }: NavigationProps) {
  const navItems: { id: ViewType; label: string; badge?: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "intersection", label: "Intersection Detail" },
    { id: "vision", label: "Vision Feed Monitor", badge: "Phase 2" },
    { id: "corridor", label: "Green Wave Corridor" },
    { id: "analytics", label: "Analytics & Validation" },
    { id: "health", label: "System Health" },
    { id: "settings", label: "Scenario Controls" },
  ];

  return (
    <nav className="w-full bg-[#18191a] border-b border-[#3e4042] px-6 overflow-x-auto">
      <div className="flex space-x-1 min-w-max">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`px-4 py-3 text-sm font-medium transition-all duration-150 relative flex items-center space-x-2 ${
                isActive
                  ? "text-[#0866ff] border-b-2 border-[#0866ff] bg-[#242526]"
                  : "text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#242526]/50"
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#0866ff]/20 text-[#0866ff] border border-[#0866ff]/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
