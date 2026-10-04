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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Default to dark
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  // Clock
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

  const toggleTheme = (e: React.MouseEvent) => {
    const newTheme = theme === "dark" ? "light" : "dark";

    // View Transitions API (Supported in Chrome/Edge)
    if (!(document as any).startViewTransition) {
      // Fallback for Firefox/Safari if unsupported
      setTheme(newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    
    // Calculate the radius to the furthest corner of the screen
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (document as any).startViewTransition(() => {
      setTheme(newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 600,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)", // Smooth, premium ease
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <header
      className={`fixed top-0 right-0 z-40 h-[52px] bg-[var(--bg)]/95 backdrop-blur-md border-b border-outline flex items-center justify-between px-6 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "left-[264px]" : "left-[60px]"
      }`}
    >
      <div className="flex items-center">
        <h1 className="font-display text-sm font-semibold tracking-wide text-on-surface">
          {moduleTitle}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-surface-high transition-colors text-on-surface-variant hover:text-on-surface border border-outline shadow-sm relative overflow-hidden"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          <span 
            className="material-symbols-rounded text-[18px] transition-transform duration-500 ease-in-out" 
            style={{ transform: theme === "dark" ? 'rotate(0deg)' : 'rotate(360deg)' }}
          >
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <div className="text-right flex flex-col justify-center bg-surface-low px-3 py-1 rounded-full border border-outline shadow-inner">
          <span className="font-mono text-[11px] text-on-surface-variant font-medium uppercase tracking-widest">{time}</span>
        </div>
      </div>
    </header>
  );
}
