"use client";

import React, { useState, useEffect } from "react";

interface TopbarProps {
  moduleTitle: string;
  isSidebarExpanded?: boolean;
}

export default function Topbar({
  moduleTitle,
  isSidebarExpanded = false,
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
      <div className="flex items-center">
        <h1 className="font-display text-sm font-semibold tracking-wide text-on-surface">
          {moduleTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right flex flex-col justify-center">
          <span className="font-mono text-xs text-on-surface-variant font-medium">{time}</span>
        </div>
      </div>
    </header>
  );
}
