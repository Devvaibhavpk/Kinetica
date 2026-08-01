"use client";

import React, { useState } from "react";

export default function CorridorView() {
  const [targetSpeed, setTargetSpeed] = useState(50);
  const [offsets, setOffsets] = useState({ a: 0, b: 18, c: 36, d: 52, e: 70 });

  const handleOffsetChange = (node: keyof typeof offsets, val: string) => {
    setOffsets((prev) => ({ ...prev, [node]: parseInt(val, 10) }));
  };

  const resetOffsets = () => {
    setOffsets({ a: 0, b: 18, c: 36, d: 52, e: 70 });
  };

  const offA = offsets.a * 2;
  const offE = offsets.e * 2;
  const band1Points = `${60 + offA},270 ${140 + offA},270 ${380 + offE},40 ${300 + offE},40`;

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
      }}
      className="w-full h-full xl:grid-cols-[1fr_340px] grid-cols-1 xl:grid-rows-[auto_1fr] overflow-y-auto pb-8 text-[#e8eaf0] font-sans"
    >
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(255, 64, 96, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 64, 96, 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(255, 64, 96, 0); }
        }
      `}</style>

      {/* ── TOP HERO PANEL (full width) ───────────────────────────── */}
      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          background: "#1c1e24",
          border: "1px solid #2e3140",
          borderRadius: "12px",
          padding: "20px",
          position: "relative",
          overflow: "hidden",
        }}
        className="flex-col lg:flex-row items-start lg:items-center"
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            background: "#ff4060",
          }}
        ></div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "999px",
                background: "rgba(255, 64, 96, 0.1)",
                border: "1px solid rgba(255, 64, 96, 0.3)",
                color: "#ff4060",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#fff",
                  animation: "pulse-ring 1.5s infinite",
                }}
              ></span>
              ACTIVE PREEMPTION CASCADE
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "#9096a8",
              }}
            >
              CORRIDOR-07 :: MAIN ST PH-A
            </span>
          </div>
          <h2
            style={{
              fontFamily: "'Albert Sans', sans-serif",
              fontSize: "24px",
              fontWeight: 600,
              margin: 0,
              color: "#e8eaf0",
            }}
          >
            Emergency Priority: EMS-914 (Ambulance Unit)
          </h2>
          <p style={{ fontSize: "13px", color: "#9096a8", margin: 0 }}>
            Multi-intersection preclearance engaged across 5 downstream nodes. Dynamic green wave lock active.
          </p>
        </div>

        {/* Quick stats within Hero */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            background: "#111318",
            padding: "12px 20px",
            borderRadius: "12px",
            border: "1px solid #2e3140",
            flexShrink: 0,
          }}
          className="w-full lg:w-auto overflow-x-auto"
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#9096a8",
              }}
            >
              Lead Clearance Time
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "20px",
                fontWeight: 700,
                color: "#00c97a",
              }}
            >
              4.2s
            </span>
          </div>
          <div style={{ width: "1px", height: "24px", background: "#2e3140" }}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#9096a8",
              }}
            >
              Progression Speed
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "20px",
                fontWeight: 700,
                color: "#e8eaf0",
              }}
            >
              54 km/h
            </span>
          </div>
          <div style={{ width: "1px", height: "24px", background: "#2e3140" }}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#9096a8",
              }}
            >
              Bandwidth Efficiency
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "20px",
                fontWeight: 700,
                color: "#00c97a",
              }}
            >
              88%
            </span>
          </div>
        </div>
      </div>

      {/* ── LEFT COLUMN: Interactive Diagrams ────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Card 1: Interactive Time-Space Diagram */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "#1c1e24",
            border: "1px solid #2e3140",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "1px solid #2e3140",
              paddingBottom: "16px",
            }}
            className="flex-col sm:flex-row gap-4 sm:gap-0"
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-rounded" style={{ color: "#00c97a" }}>
                  timeline
                </span>
                <h3
                  style={{
                    fontFamily: "'Albert Sans', sans-serif",
                    fontSize: "18px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Time-Space Diagram &amp; Progression Bands
                </h3>
              </div>
              <p style={{ fontSize: "12px", color: "#9096a8", margin: "4px 0 0" }}>
                Visualizing distance across intersections (Y-Axis) over continuous time cycles (X-Axis).
              </p>
            </div>
            {/* Speed Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#9096a8",
                }}
              >
                Target Speed:
              </span>
              <div
                style={{
                  display: "flex",
                  background: "#161820",
                  border: "1px solid #2e3140",
                  padding: "4px",
                  borderRadius: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                }}
              >
                {[40, 50, 60].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setTargetSpeed(spd)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: targetSpeed === spd ? "rgba(0,201,122,0.15)" : "transparent",
                      color: targetSpeed === spd ? "#00c97a" : "#9096a8",
                      fontWeight: targetSpeed === spd ? 700 : "normal",
                      border: targetSpeed === spd ? "1px solid rgba(0,201,122,0.3)" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TSD Canvas Render (SVG) */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "340px",
              background: "#0d0f13",
              borderRadius: "8px",
              border: "1px solid #2e3140",
              padding: "16px",
              overflow: "hidden",
            }}
          >
            <svg
              style={{ width: "100%", height: "100%" }}
              viewBox="0 0 800 300"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="greenWaveBand" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00c97a" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00c97a" stopOpacity="0.45" />
                </linearGradient>
                <linearGradient id="emsPathGrad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff4060" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ffab1a" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Grid */}
              <line x1="60" y1="40" x2="780" y2="40" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
              <line x1="60" y1="100" x2="780" y2="100" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
              <line x1="60" y1="160" x2="780" y2="160" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
              <line x1="60" y1="220" x2="780" y2="220" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />
              <line x1="60" y1="270" x2="780" y2="270" stroke="#fff" strokeOpacity="0.05" strokeDasharray="4" />

              <line x1="60" y1="20" x2="60" y2="280" stroke="#fff" strokeOpacity="0.08" />
              <line x1="240" y1="20" x2="240" y2="280" stroke="#fff" strokeOpacity="0.05" strokeDasharray="2" />
              <line x1="420" y1="20" x2="420" y2="280" stroke="#fff" strokeOpacity="0.05" strokeDasharray="2" />
              <line x1="600" y1="20" x2="600" y2="280" stroke="#fff" strokeOpacity="0.05" strokeDasharray="2" />
              <line x1="780" y1="20" x2="780" y2="280" stroke="#fff" strokeOpacity="0.08" />

              <text x="60" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">0s</text>
              <text x="240" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">30s</text>
              <text x="420" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">60s</text>
              <text x="600" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">90s</text>
              <text x="780" y="295" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#9096a8" textAnchor="middle">120s</text>

              {/* Node Distance Labels */}
              <text x="50" y="44" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#e8eaf0" textAnchor="end">INT-E (15th)</text>
              <text x="50" y="104" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#e8eaf0" textAnchor="end">INT-D (12th)</text>
              <text x="50" y="164" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#e8eaf0" textAnchor="end">INT-C (9th)</text>
              <text x="50" y="224" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#ff4060" fontWeight="bold" textAnchor="end">INT-B (7th)</text>
              <text x="50" y="274" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#00c97a" textAnchor="end">INT-A (5th)</text>

              {/* Dynamic Green Wave Bands */}
              <polygon points={band1Points} fill="url(#greenWaveBand)" stroke="#00c97a" strokeWidth="1.5" strokeOpacity="0.8" style={{ transition: "all 0.3s" }} />
              <polygon points="420,270 500,270 740,40 660,40" fill="url(#greenWaveBand)" stroke="#00c97a" strokeWidth="1.5" strokeOpacity="0.5" />

              {/* Red Phases */}
              <line x1="140" y1="270" x2="260" y2="270" stroke="#ff4060" strokeWidth="5" strokeOpacity="0.6" />
              <line x1="200" y1="220" x2="310" y2="220" stroke="#ff4060" strokeWidth="5" strokeOpacity="0.6" />
              <line x1="260" y1="160" x2="370" y2="160" stroke="#ff4060" strokeWidth="5" strokeOpacity="0.6" />
              <line x1="310" y1="100" x2="430" y2="100" stroke="#ff4060" strokeWidth="5" strokeOpacity="0.6" />

              {/* Preempted Emergency Window */}
              <rect x="180" y="210" width="80" height="20" rx="6" fill="#ff4060" fillOpacity="0.2" stroke="#ff4060" strokeWidth="1.5" />
              <text x="220" y="224" fontFamily="'Inter', sans-serif" fontSize="9" fill="#ff4060" fontWeight="bold" textAnchor="middle">EMS PRE-CLEAR</text>

              {/* Trajectories */}
              <path d="M 80,270 L 155,220 L 215,160 L 275,100 L 335,40" stroke="#00c97a" strokeWidth="2" fill="none" />
              <path d="M 110,270 L 185,220 L 245,160 L 305,100 L 365,40" stroke="#00c97a" strokeWidth="2" fill="none" strokeDasharray="3 3" />
              
              {/* EMS Trajectory */}
              <path d="M 130,270 L 190,220 L 240,160 L 290,100 L 340,40" stroke="url(#emsPathGrad)" strokeWidth="4" fill="none" />
              <circle cx="190" cy="220" r="6" fill="#ff4060" stroke="#ffffff" strokeWidth="2">
                <animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </svg>

            {/* Legend Overlay */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                right: "16px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: "rgba(28,30,36,0.9)",
                padding: "6px 12px",
                borderRadius: "12px",
                border: "1px solid #2e3140",
                fontSize: "11px",
                color: "#9096a8",
              }}
              className="flex-wrap"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "8px",
                    borderRadius: "4px",
                    background: "rgba(0,201,122,0.4)",
                    border: "1px solid #00c97a",
                    display: "inline-block",
                  }}
                ></span>
                <span>Green Band</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "2px", background: "#ff4060", display: "inline-block" }}></span>
                <span style={{ color: "#ff4060", fontWeight: 600 }}>EMS-914 Path</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "2px", background: "#00c97a", display: "inline-block" }}></span>
                <span>Platoon Trajectory</span>
              </div>
            </div>
          </div>

          {/* Offset Control Sliders Bar */}
          <div
            style={{
              background: "#161820",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #2e3140",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#e8eaf0", display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-rounded" style={{ color: "#00c97a", fontSize: "18px" }}>
                  tune
                </span>
                Live Signal Phase Offset Tuning (Seconds)
              </span>
              <button
                onClick={resetOffsets}
                style={{
                  fontSize: "11px",
                  color: "#00c97a",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Reset MAXBAND Defaults
              </button>
            </div>

            <div style={{ display: "grid", gap: "12px" }} className="grid-cols-2 md:grid-cols-5">
              {[
                { key: "a", label: "INT-A", color: "#00c97a", max: 40, outline: "#2e3140" },
                { key: "b", label: "INT-B", color: "#ff4060", max: 40, outline: "rgba(255,64,96,0.3)" },
                { key: "c", label: "INT-C", color: "#00c97a", max: 60, outline: "#2e3140" },
                { key: "d", label: "INT-D", color: "#00c97a", max: 80, outline: "#2e3140" },
                { key: "e", label: "INT-E", color: "#00c97a", max: 100, outline: "#2e3140" },
              ].map((node) => (
                <div
                  key={node.key}
                  style={{
                    background: "#1c1e24",
                    padding: "10px",
                    borderRadius: "8px",
                    border: `1px solid ${node.outline}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                    <span style={{ color: node.key === "b" ? "#ff4060" : "#9096a8", fontWeight: node.key === "b" ? 700 : "normal" }}>
                      {node.label}
                    </span>
                    <span style={{ color: node.color, fontWeight: 700 }}>
                      {offsets[node.key as keyof typeof offsets]}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={node.max}
                    value={offsets[node.key as keyof typeof offsets]}
                    onChange={(e) => handleOffsetChange(node.key as keyof typeof offsets, e.target.value)}
                    style={{ width: "100%", accentColor: node.color }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Corridor Cascade Schematic Map */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "#1c1e24",
            border: "1px solid #2e3140",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #2e3140",
              paddingBottom: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-rounded" style={{ color: "#00c97a" }}>
                  route
                </span>
                <h3
                  style={{
                    fontFamily: "'Albert Sans', sans-serif",
                    fontSize: "18px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Intersection Cascade &amp; Vehicle Tracking
                </h3>
              </div>
              <p style={{ fontSize: "12px", color: "#9096a8", margin: "4px 0 0" }}>
                Real-time preclearance cascade across nodes INT-A through INT-E.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#1c1e24",
                padding: "6px 12px",
                borderRadius: "12px",
                border: "1px solid #2e3140",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#00c97a",
                  animation: "pulse-ring 1.5s infinite",
                }}
              ></span>
              <span
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#00c97a",
                  fontWeight: 600,
                }}
              >
                Corridor Lock Active
              </span>
            </div>
          </div>

          {/* Schematic SVG Route Canvas */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "260px",
              background: "#0d0f13",
              borderRadius: "8px",
              border: "1px solid #2e3140",
              padding: "16px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Background Grid Pattern */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.1,
                backgroundImage: "radial-gradient(#404e6b 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            ></div>

            <svg
              style={{ width: "100%", height: "100%", position: "relative", zIndex: 10 }}
              viewBox="0 0 900 220"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Main Corridor Highway Line */}
              <path d="M 80 140 L 260 90 L 450 120 L 640 60 L 820 100" fill="none" stroke="#1c1e24" strokeWidth="8" strokeLinecap="round" />
              <path d="M 80 140 L 260 90 L 450 120 L 640 60 L 820 100" fill="none" stroke="#00c97a" strokeWidth="4" strokeLinecap="round" />

              {/* Cross Road Connectors */}
              <line x1="260" y1="90" x2="260" y2="20" stroke="#1c1e24" strokeWidth="3" strokeDasharray="4" />
              <line x1="450" y1="120" x2="450" y2="190" stroke="#1c1e24" strokeWidth="3" strokeDasharray="4" />
              <line x1="640" y1="60" x2="640" y2="130" stroke="#1c1e24" strokeWidth="3" strokeDasharray="4" />

              {/* Node A (Cleared) */}
              <g transform="translate(80, 140)" style={{ cursor: "pointer" }} onClick={() => console.log('Selected Node A')}>
                <circle r="16" fill="#0d0f13" stroke="#00c97a" strokeWidth="3" />
                <circle r="8" fill="#00c97a" />
                <text y="-26" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" fill="#e8eaf0" textAnchor="middle">INT-A</text>
                <text y="32" fontFamily="'Inter', sans-serif" fontSize="9" fill="#00c97a" textAnchor="middle">CLEARED</text>
              </g>

              {/* Node B (Active Preemption) */}
              <g transform="translate(260, 90)" style={{ cursor: "pointer" }} onClick={() => console.log('Selected Node B')}>
                <circle r="22" fill="#ff4060" fillOpacity="0.25" stroke="#ff4060" strokeWidth="2" className="animate-ping" style={{ animationDuration: '2s' }} />
                <circle r="18" fill="#0d0f13" stroke="#ff4060" strokeWidth="4" />
                <circle r="9" fill="#ff4060" />
                <text y="-28" fontFamily="'JetBrains Mono', monospace" fontSize="12" fontWeight="bold" fill="#ff4060" textAnchor="middle">INT-B (7th)</text>
                <text y="34" fontFamily="'Inter', sans-serif" fontSize="10" fontWeight="bold" fill="#ff4060" textAnchor="middle">PREEMPTING</text>
              </g>

              {/* Node C (Pre-clearing) */}
              <g transform="translate(450, 120)" style={{ cursor: "pointer" }} onClick={() => console.log('Selected Node C')}>
                <circle r="16" fill="#0d0f13" stroke="#ffab1a" strokeWidth="3" />
                <circle r="8" fill="#ffab1a" />
                <text y="-26" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="bold" fill="#e8eaf0" textAnchor="middle">INT-C</text>
                <text y="32" fontFamily="'Inter', sans-serif" fontSize="9" fill="#ffab1a" textAnchor="middle">PRE-CLEARING</text>
              </g>

              {/* Node D (Pending) */}
              <g transform="translate(640, 60)" style={{ cursor: "pointer" }} onClick={() => console.log('Selected Node D')}>
                <circle r="14" fill="#0d0f13" stroke="#2e3140" strokeWidth="3" />
                <circle r="6" fill="#9096a8" />
                <text y="-24" fontFamily="'JetBrains Mono', monospace" fontSize="11" fill="#9096a8" textAnchor="middle">INT-D</text>
                <text y="28" fontFamily="'Inter', sans-serif" fontSize="9" fill="#9096a8" textAnchor="middle">SCHEDULED</text>
              </g>

              {/* Node E (Pending) */}
              <g transform="translate(820, 100)" style={{ cursor: "pointer" }} onClick={() => console.log('Selected Node E')}>
                <circle r="14" fill="#0d0f13" stroke="#2e3140" strokeWidth="3" />
                <circle r="6" fill="#9096a8" />
                <text y="-24" fontFamily="'JetBrains Mono', monospace" fontSize="11" fill="#9096a8" textAnchor="middle">INT-E</text>
                <text y="28" fontFamily="'Inter', sans-serif" fontSize="9" fill="#9096a8" textAnchor="middle">SCHEDULED</text>
              </g>

              {/* Animated EMS Ambulance Marker */}
              <g transform="translate(200, 107)">
                <circle r="16" fill="#111318" stroke="#ff4060" strokeWidth="2.5" />
                <text fontFamily="'Material Symbols Rounded'" fontSize="20" fill="#ff4060" textAnchor="middle" dominantBaseline="central">ambulance</text>
                <animateTransform attributeName="transform" type="translate" values="120,130; 240,95; 200,107" dur="8s" repeatCount="indefinite" />
              </g>
            </svg>

            {/* Interactive Floating Legend */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                left: "16px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: "rgba(28,30,36,0.9)",
                padding: "8px 16px",
                borderRadius: "12px",
                border: "1px solid #2e3140",
                fontSize: "12px",
                color: "#9096a8",
              }}
              className="hidden sm:flex"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#00c97a" }}></span>
                <span>Cleared</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff4060", animation: "pulse-ring 1.5s infinite" }}></span>
                <span style={{ color: "#ff4060", fontWeight: 600 }}>Active Override</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffab1a" }}></span>
                <span>Pre-clearing</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2e3140" }}></span>
                <span>Scheduled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Intersection Hop Telemetry ───────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Hop Arrival Breakdown Card */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "#1c1e24",
            border: "1px solid #2e3140",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #2e3140",
              paddingBottom: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Albert Sans', sans-serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                Downstream Hops
              </h3>
              <p style={{ fontSize: "12px", color: "#9096a8", margin: "4px 0 0" }}>
                Estimated time of arrival &amp; queue status
              </p>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                color: "#00c97a",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "12px",
                background: "rgba(0,201,122,0.15)",
                border: "1px solid rgba(0,201,122,0.3)",
              }}
            >
              5 NODES
            </span>
          </div>

          {/* Hop List Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Hop 1: Passed */}
            <div
              style={{
                background: "#161820",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #2e3140",
                opacity: 0.6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="material-symbols-rounded" style={{ color: "#00c97a", fontSize: "24px" }}>check_circle</span>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#e8eaf0" }}>INT-A (5th &amp; Main)</div>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#00c97a", marginTop: "2px" }}>PASSED :: CLEARED</div>
                </div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", color: "#2e3140" }}>--:--</div>
            </div>

            {/* Hop 2: Active Preemption */}
            <div
              style={{
                background: "rgba(255,64,96,0.1)",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid rgba(255,64,96,0.4)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "#ff4060" }}></div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingLeft: "8px" }}>
                <span className="material-symbols-rounded" style={{ color: "#ff4060", fontSize: "24px", animation: "pulse-ring 1.5s infinite" }}>emergency</span>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#e8eaf0" }}>INT-B (7th &amp; Main)</div>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#ff4060", fontWeight: 600, marginTop: "2px" }}>PREEMPTING NOW</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 700, color: "#ff4060" }}>T-0:14s</div>
                <div style={{ fontSize: "10px", color: "#9096a8" }}>DIST: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#e8eaf0" }}>450m</span></div>
              </div>
            </div>

            {/* Hop 3: Pre-clearing */}
            <div
              style={{
                background: "#1c1e24",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #2e3140",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,171,26,0.2)", border: "1px solid rgba(255,171,26,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#ffab1a" }}>3</div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#e8eaf0" }}>INT-C (9th &amp; Main)</div>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#ffab1a", marginTop: "2px" }}>PRE-CLEARING</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 700, color: "#ffab1a" }}>T-0:38s</div>
                <div style={{ fontSize: "10px", color: "#9096a8" }}>DIST: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#e8eaf0" }}>980m</span></div>
              </div>
            </div>

            {/* Hop 4: Pending */}
            <div
              style={{
                background: "#161820",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #2e3140",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1c1e24", border: "1px solid #2e3140", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#9096a8" }}>4</div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#e8eaf0" }}>INT-D (12th &amp; Main)</div>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#2e3140", marginTop: "2px" }}>SCHEDULED</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", color: "#9096a8" }}>T-1:15s</div>
              </div>
            </div>

            {/* Hop 5: Pending */}
            <div
              style={{
                background: "#161820",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #2e3140",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1c1e24", border: "1px solid #2e3140", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#9096a8" }}>5</div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#e8eaf0" }}>INT-E (15th &amp; Main)</div>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#2e3140", marginTop: "2px" }}>SCHEDULED</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", color: "#9096a8" }}>T-1:52s</div>
              </div>
            </div>
          </div>
        </div>

        {/* Corridor Optimization Metrics */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "#1c1e24",
            border: "1px solid #2e3140",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h4 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9096a8", fontWeight: 600, margin: 0 }}>
            Corridor Optimization Telemetry
          </h4>
          
          {/* MOCK DATA: Pending backend integration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: "#0d0f13", padding: "14px", borderRadius: "12px", border: "1px solid #2e3140" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9096a8" }}>Platoon Ratio (q_p/q)</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: "#00c97a", marginTop: "4px" }}>0.89</div>
              <div style={{ fontSize: "9px", color: "#9096a8", marginTop: "2px" }}>HIGH COHESION</div>
            </div>
            <div style={{ background: "#0d0f13", padding: "14px", borderRadius: "12px", border: "1px solid #2e3140" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9096a8" }}>Delay Reduction</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: "#00c97a", marginTop: "4px" }}>-34.2%</div>
              <div style={{ fontSize: "9px", color: "#00c97a", marginTop: "2px" }}>VS FIXED TIME</div>
            </div>
            <div style={{ background: "#0d0f13", padding: "14px", borderRadius: "12px", border: "1px solid #2e3140" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9096a8" }}>Fuel Savings Est.</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, color: "#e8eaf0", marginTop: "4px" }}>18.4 <span style={{ fontSize: "12px", fontWeight: 400 }}>L/HR</span></div>
              <div style={{ fontSize: "9px", color: "#9096a8", marginTop: "2px" }}>CORRIDOR TOTAL</div>
            </div>
            <div style={{ background: "#0d0f13", padding: "14px", borderRadius: "12px", border: "1px solid #2e3140" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9096a8" }}>MAXBAND Status</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 700, color: "#00c97a", marginTop: "8px" }}>LOCKED</div>
              <div style={{ fontSize: "9px", color: "#00c97a", marginTop: "2px" }}>OPTIMAL SLOPING</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
