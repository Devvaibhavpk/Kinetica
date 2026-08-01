"use client";

import React, { useState, useEffect } from "react";

export default function Header() {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-[#0a0a0a] border-b border-[#3e4042] px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-[#0866ff] flex items-center justify-center font-bold text-white font-display text-xl shadow-[0_0_12px_rgba(8,102,255,0.4)]">
          K
        </div>
        <div>
          <h1 className="font-display font-semibold text-xl text-[#e4e6eb] tracking-tight leading-none">
            KINETICA <span className="text-[#0866ff] text-xs uppercase tracking-widest font-normal ml-2">Control Room</span>
          </h1>
          <p className="text-xs text-[#b0b3b8] mt-1">
            Closed-Loop Cyber-Physical Traffic Controller • VIT Chennai
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full state-calm-badge text-xs font-telemetry font-medium">
          <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-ping" />
          <span>SYSTEM ONLINE</span>
        </div>

        <div className="px-3 py-1.5 rounded-md bg-[#242526] border border-[#3e4042] text-xs font-telemetry text-[#b0b3b8]">
          {timeStr || "LOADING TIME..."}
        </div>

        <div className="px-2.5 py-1 rounded bg-[#23334c] border border-[#0866ff] text-[11px] font-mono text-[#e7f3ff]">
          Phase 2 UI Skeleton
        </div>
      </div>
    </header>
  );
}
