"use client";

import React, { useState } from "react";

export default function VisionMonitorView() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [showOverlay, setShowOverlay] = useState(false);

  // Helper for bounding box visibility
  const getDisplay = (boxClass: string) => {
    if (activeFilter === "all") return undefined;
    return activeFilter === boxClass ? undefined : "none";
  };

  return (
    <div className="flex flex-col xl:grid gap-4 h-full text-[#e8eaf0]" style={{ gridTemplateColumns: "1fr 320px" }}>
      <style>{`
        .bbox-tag {
          position: absolute;
          top: -24px;
          left: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }
        .cam-overlay {
          background: linear-gradient(to bottom, rgba(13,15,19,0.85) 0%, rgba(13,15,19,0.3) 40%, transparent 100%);
        }
        .filter-pill { padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
        .filter-pill.active-calm { background: rgba(0,201,122,0.15); color: #00c97a; border-color: rgba(0,201,122,0.4); }
        .filter-pill.active-crit { background: rgba(255,64,96,0.15); color: #ff4060; border-color: rgba(255,64,96,0.4); }
        .filter-pill.active-primary { background: rgba(77,159,255,0.15); color: #4d9fff; border-color: rgba(77,159,255,0.4); }
        .filter-pill.active-warn { background: rgba(255,171,26,0.15); color: #ffab1a; border-color: rgba(255,171,26,0.4); }
        .filter-pill.inactive { background: transparent; color: #9096a8; }
        .filter-pill.inactive:hover { background: #2c2f3a; color: #e8eaf0; }
        
        .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace; border: 1px solid transparent; display: inline-block; }
        .badge-calm { background: rgba(0,201,122,0.15); color: #00c97a; border-color: rgba(0,201,122,0.4); }
        .badge-neutral { background: rgba(144,150,168,0.15); color: #9096a8; border-color: rgba(144,150,168,0.4); }
        .badge-crit { background: rgba(255,64,96,0.15); color: #ff4060; border-color: rgba(255,64,96,0.4); }
        .badge-warn { background: rgba(255,171,26,0.15); color: #ffab1a; border-color: rgba(255,171,26,0.4); }

        .metric-tile { background: #161820; border: 1px solid #2e3140; border-radius: 8px; padding: 10px; }
        .progress-track { width: 100%; height: 4px; background: #2e3140; border-radius: 9999px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 9999px; }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(0, 201, 122, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(0, 201, 122, 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(0, 201, 122, 0); }
        }
        @keyframes pulse-ring-crit {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(255, 64, 96, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(255, 64, 96, 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(255, 64, 96, 0); }
        }
        @keyframes pulse-ring-warn {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(255, 171, 26, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(255, 171, 26, 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(255, 171, 26, 0); }
        }
      `}</style>

      {/* FILTER BAR */}
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: '"Albert Sans", sans-serif', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>AI Vision Feed &amp; Object Detection</h2>
          <p style={{ fontSize: '12px', color: '#9096a8', margin: '2px 0 0' }}>Live YOLOv8 inference · District 7 intersections · 4-cam array</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1c1e24', border: '1px solid #2e3140', borderRadius: '9999px', padding: '4px 6px' }}>
          {/* Overlay Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '10px', borderRight: '1px solid #2e3140' }}>
            <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9096a8', marginLeft: '6px' }}>Overlay</span>
            <div 
              onClick={() => setShowOverlay(!showOverlay)} 
              style={{ width: '36px', height: '20px', background: showOverlay ? '#00c97a' : '#2c2f3a', borderRadius: '9999px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: showOverlay ? '19px' : '3px', transition: 'left 0.2s' }}></div>
            </div>
          </div>
          
          <button className={`filter-pill ${activeFilter === 'all' ? 'active-calm' : 'inactive'}`} onClick={() => setActiveFilter('all')}>All</button>
          <button className={`filter-pill ${activeFilter === 'ambulance' ? 'active-crit' : 'inactive'}`} onClick={() => setActiveFilter('ambulance')}>🚑 Ambulance</button>
          <button className={`filter-pill ${activeFilter === 'police' ? 'active-primary' : 'inactive'}`} onClick={() => setActiveFilter('police')}>🚔 Police</button>
          <button className={`filter-pill ${activeFilter === 'school_van' ? 'active-warn' : 'inactive'}`} onClick={() => setActiveFilter('school_van')}>🚌 School Van</button>
          <button className={`filter-pill ${activeFilter === 'two-wheeler' ? 'active-calm' : 'inactive'}`} onClick={() => setActiveFilter('two-wheeler')}>🛵 2-Wheeler</button>
        </div>
      </div>

      {/* CAMERA GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* CAM-01 NORTH */}
        <div className="bg-[#1c1e24] border border-[#2e3140] rounded-[14px] p-0 overflow-hidden relative h-[300px]">
          <div className="cam-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4060', animation: 'pulse-ring-crit 1.5s ease infinite', display: 'inline-block' }}></span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700 }}>CAM-01 · NORTH · MAIN ST</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-calm">30 FPS</span>
              <span className="badge badge-neutral">8 MS</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '100%', backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBR4YaC1rwAdRVTfJJPDE6cuRTlSXj4e4MFrETbRpG0HXgYWXnOZ8SaIBYxEX_H0Lbq5K1WUVbds-Vf0ib-3LkDjZB-f5GRR2gEAgd5iBpD4gh1PY9-pleNwMsVb1nntDiOXGYd9u18ZjhACHJnIDMEIqX7o5M9sMbR4B5GkRkUV3QrA578Rvz-PmbR4c6Ntgs34WFrUu17h6vtZPbIbtfDWkeeH6qUqZRxj1wQCzXdIyMk6vG_4x_fDA')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            <div style={{ display: getDisplay('ambulance'), position: 'absolute', top: '28%', left: '18%', width: '22%', height: '20%', border: '2px solid #ff4060', background: 'rgba(255,64,96,0.12)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#ff4060', color: '#fff' }}>🚑 ambulance 0.98</div>
            </div>
            <div style={{ display: getDisplay('two-wheeler'), position: 'absolute', top: '62%', left: '48%', width: '12%', height: '18%', border: '2px solid #00c97a', background: 'rgba(0,201,122,0.12)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#00c97a', color: '#fff' }}>🛵 0.88</div>
            </div>
            <div style={{ display: activeFilter !== 'all' ? 'none' : undefined, position: 'absolute', top: '44%', left: '68%', width: '22%', height: '22%', border: '2px solid #9096a8', background: 'rgba(44,47,58,0.5)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#2c2f3a', color: '#e8eaf0', border: '1px solid #2e3140' }}>standard 0.94</div>
            </div>

            {showOverlay && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points="10,95 40,25 60,25 90,95" fill="rgba(0,201,122,0.06)" stroke="#00c97a" strokeWidth="0.6" strokeDasharray="2,2"/>
              </svg>
            )}

            <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '6px' }}>
              <span className="badge badge-crit">EMS PREEMPTION</span>
              <span className="badge badge-neutral">LANE 1-2 CLEAR</span>
            </div>
          </div>
        </div>

        {/* CAM-02 EAST */}
        <div className="bg-[#1c1e24] border border-[#2e3140] rounded-[14px] p-0 overflow-hidden relative h-[300px]">
          <div className="cam-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00c97a', display: 'inline-block' }}></span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700 }}>CAM-02 · EAST · 7TH AVE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-calm">30 FPS</span>
              <span className="badge badge-neutral">11 MS</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '100%', backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBJDlS4PL07UxmZlrJd_2YgT0q6LsxE_GqjsNV6bhdDuIqaLTWavgJeJTJptUoBXfjU29Hs2MjfEs82TuMhGud7bahfffkGcnGRbOvtVBGsMQYcHQzlt_WVhFQzHsAvAyNowtxCbMVE6dtUJyvRdegMtBv_Y0du_mbiM_gGosywMbyhjWqPxCt_JTe3tSa9C56TvLmzhRUzBidf53DFD5G6nBHkmVSy7HSHkGCIvI9pak9J2Exn4CuHBA')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            <div style={{ display: getDisplay('police'), position: 'absolute', top: '22%', left: '55%', width: '18%', height: '20%', border: '2px solid #4d9fff', background: 'rgba(77,159,255,0.12)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#4d9fff', color: '#fff' }}>🚔 police 0.96</div>
            </div>
            <div style={{ display: getDisplay('school_van'), position: 'absolute', top: '42%', left: '25%', width: '26%', height: '28%', border: '2px solid #ffab1a', background: 'rgba(255,171,26,0.12)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#ffab1a', color: '#111318' }}>🚌 school_van 0.95</div>
            </div>

            {showOverlay && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points="5,95 45,15 55,15 95,95" fill="rgba(0,201,122,0.06)" stroke="#00c97a" strokeWidth="0.6" strokeDasharray="2,2"/>
              </svg>
            )}

            <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
              <span className="badge" style={{ background: 'rgba(77,159,255,0.15)', color: '#4d9fff', borderColor: 'rgba(77,159,255,0.4)' }}>PATROL UNIT PASSING</span>
            </div>
          </div>
        </div>

        {/* CAM-03 SOUTH */}
        <div className="bg-[#1c1e24] border border-[#2e3140] rounded-[14px] p-0 overflow-hidden relative h-[300px]">
          <div className="cam-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00c97a', display: 'inline-block' }}></span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700 }}>CAM-03 · SOUTH · OVERPASS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-calm">25 FPS</span>
              <span className="badge badge-neutral">14 MS</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '100%', backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAhVMYifTcU3r-GoZi5JSVwCqek0920Tmoqwj-8jJk1xurcD_GiiQHds0eK3Y9FZuXcvehhhdRR_3mMSXxBhq2PE1Tf6imhmgwPI3kYh0oWUOjGeI3vlbYNDXADSyitn_nY6AItTLIwL-qadOqYUYVryV13tosO_BeP0wd-LkF3saop1ccrnRwCID3MR0VcetqMUSwudJw2Aq9zpqTHGzf34v8wEK9-s91lbSKey7EY4a4LbUw4vww04g')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            <div style={{ display: getDisplay('two-wheeler'), position: 'absolute', top: '48%', left: '38%', width: '12%', height: '24%', border: '2px solid #00c97a', background: 'rgba(0,201,122,0.12)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#00c97a', color: '#fff' }}>🛵 0.89</div>
            </div>
            <div style={{ display: activeFilter !== 'all' ? 'none' : undefined, position: 'absolute', top: '52%', left: '56%', width: '15%', height: '20%', border: '2px solid #9096a8', background: 'rgba(44,47,58,0.5)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#2c2f3a', color: '#e8eaf0', border: '1px solid #2e3140' }}>standard 0.92</div>
            </div>

            {showOverlay && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <rect x="20" y="40" width="60" height="40" fill="none" stroke="#00c97a" strokeWidth="0.5" strokeDasharray="1,2"/>
              </svg>
            )}

            <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
              <span className="badge badge-calm">PEDESTRIAN CORRIDOR CLEAR</span>
            </div>
          </div>
        </div>

        {/* CAM-04 WEST (Degraded) */}
        <div className="bg-[#1c1e24] border border-[#2e3140] rounded-[14px] p-0 overflow-hidden relative h-[300px]">
          <div className="cam-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffab1a', animation: 'pulse-ring-warn 1.5s ease infinite', display: 'inline-block' }}></span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700 }}>CAM-04 · WEST · THERMAL ⚠</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-warn">14 FPS</span>
              <span className="badge badge-warn">42 MS</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '100%', backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCQhfLF-ooQ1z6ZhfZ1G20Eyxf6V-xiAaTJVSs4LHgPe_Cw88BIiYV-b11EGYoHjquxbhBRVxfql8dGMTYpWmVc9FkLb-rQpMSSWQQObvaYcQRd8XiRmvfeqQa50rmoeeldn5tz5GLEriq0g9mai2BBEg94EbOT6iyP7EjfC7fGChzWdNqzqT7MuI7Q1eCdBO7dMyR-OPvCc_Doal4lPR53TsTi6WQX4Kc_M1UCFFCuOQ1nZvYfVHcvfQ')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            <div style={{ display: activeFilter !== 'all' ? 'none' : undefined, position: 'absolute', top: '35%', left: '30%', width: '35%', height: '35%', border: '2px solid #ffab1a', background: 'rgba(255,171,26,0.12)', borderRadius: '6px' }}>
              <div className="bbox-tag" style={{ background: '#ffab1a', color: '#111318' }}>standard 0.85</div>
            </div>

            {/* Degraded overlay */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(13,15,19,0.85)', backdropFilter: 'blur(4px)', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,171,26,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: '#ffab1a', fontSize: '18px' }}>warning</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 600, color: '#ffab1a' }}>FEED DEGRADED · HIGH LATENCY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Analytics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Model Health */}
        <div className="bg-[#1c1e24] border border-[#2e3140] rounded-[14px] p-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontFamily: '"Albert Sans", sans-serif', fontSize: '14px', fontWeight: 600, color: '#e8eaf0' }}>YOLOv8 Model Health</span>
            <span className="badge badge-calm">8.4 MS</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div className="metric-tile" style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', color: '#9096a8', textTransform: 'uppercase', fontWeight: 500, marginBottom: '4px' }}>mAP@50</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '18px', color: '#00c97a' }}>0.924</span>
            </div>
            <div className="metric-tile" style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', color: '#9096a8', textTransform: 'uppercase', fontWeight: 500, marginBottom: '4px' }}>Precision</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '18px', color: '#e8eaf0' }}>0.891</span>
            </div>
            <div className="metric-tile" style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', color: '#9096a8', textTransform: 'uppercase', fontWeight: 500, marginBottom: '4px' }}>Recall</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '18px', color: '#e8eaf0' }}>0.905</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0,201,122,0.08)', border: '1px solid rgba(0,201,122,0.25)', borderRadius: '8px' }}>
            <span style={{ width: '6px', height: '6px', background: '#00c97a', borderRadius: '50%', animation: 'pulse-ring 2s ease infinite' }}></span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', color: '#9096a8' }}>YOLOv8 Edge Engine Active</span>
          </div>
        </div>

        {/* Vehicle Class Confidence */}
        <div className="bg-[#1c1e24] border border-[#2e3140] rounded-[14px] p-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontFamily: '"Albert Sans", sans-serif', fontSize: '14px', fontWeight: 600, color: '#e8eaf0' }}>Vehicle Class Confidence</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Ambulance */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ff4060' }}>🚑 Ambulance</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 700, color: '#ff4060' }}>0.98</span>
              </div>
              <div className="progress-track"><div className="progress-fill crit" style={{ width: '98%' }}></div></div>
            </div>
            {/* Police */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#4d9fff' }}>🚔 Police</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 700, color: '#4d9fff' }}>0.96</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: '96%', background: '#4d9fff' }}></div></div>
            </div>
            {/* School Van */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffab1a' }}>🚌 School Van</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 700, color: '#ffab1a' }}>0.95</span>
              </div>
              <div className="progress-track"><div className="progress-fill warn" style={{ width: '95%' }}></div></div>
            </div>
            {/* Standard */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', color: '#9096a8' }}>Standard (Car/SUV)</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#9096a8' }}>0.91</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: '91%', background: '#9096a8' }}></div></div>
            </div>
            {/* Two-Wheeler */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#00c97a' }}>🛵 Two-Wheeler</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 700, color: '#00c97a' }}>0.88</span>
              </div>
              <div className="progress-track"><div className="progress-fill calm" style={{ width: '88%' }}></div></div>
            </div>
          </div>
        </div>

        {/* Confusion Matrix */}
        <div className="bg-[#1c1e24] border border-[#2e3140] rounded-[14px] p-4 flex-1">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontFamily: '"Albert Sans", sans-serif', fontSize: '14px', fontWeight: 600, color: '#e8eaf0' }}>Confusion Matrix</span>
            <span style={{ fontSize: '10px', color: '#9096a8', fontWeight: 500 }}>Normalized</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', textAlign: 'center' }}>
              <thead>
                <tr>
                  <td></td>
                  <td style={{ color: '#9096a8', fontWeight: 700, padding: '3px' }}>Sedan</td>
                  <td style={{ color: '#9096a8', fontWeight: 700, padding: '3px' }}>SUV</td>
                  <td style={{ color: '#9096a8', fontWeight: 700, padding: '3px' }}>Van</td>
                  <td style={{ color: '#9096a8', fontWeight: 700, padding: '3px' }}>2Whl</td>
                  <td style={{ color: '#9096a8', fontWeight: 700, padding: '3px' }}>Amb</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: '#9096a8', fontWeight: 700, textAlign: 'right', paddingRight: '6px' }}>Sedan</td>
                  <td style={{ background: 'rgba(0,201,122,0.85)', color: '#fff', fontWeight: 700, borderRadius: '5px', padding: '4px' }}>850</td>
                  <td style={{ background: 'rgba(0,201,122,0.2)', color: '#00c97a', borderRadius: '5px', padding: '4px' }}>45</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>2</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>12</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                </tr>
                <tr>
                  <td style={{ color: '#9096a8', fontWeight: 700, textAlign: 'right', paddingRight: '6px' }}>SUV</td>
                  <td style={{ background: 'rgba(0,201,122,0.25)', color: '#00c97a', borderRadius: '5px', padding: '4px' }}>52</td>
                  <td style={{ background: 'rgba(0,201,122,0.85)', color: '#fff', fontWeight: 700, borderRadius: '5px', padding: '4px' }}>610</td>
                  <td style={{ background: 'rgba(0,201,122,0.15)', color: '#00c97a', borderRadius: '5px', padding: '4px' }}>18</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>5</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                </tr>
                <tr>
                  <td style={{ color: '#9096a8', fontWeight: 700, textAlign: 'right', paddingRight: '6px' }}>Van</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>5</td>
                  <td style={{ background: 'rgba(0,201,122,0.15)', color: '#00c97a', borderRadius: '5px', padding: '4px' }}>22</td>
                  <td style={{ background: 'rgba(0,201,122,0.85)', color: '#fff', fontWeight: 700, borderRadius: '5px', padding: '4px' }}>145</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>1</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                </tr>
                <tr>
                  <td style={{ color: '#9096a8', fontWeight: 700, textAlign: 'right', paddingRight: '6px' }}>2Whl</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>15</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>3</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                  <td style={{ background: 'rgba(0,201,122,0.85)', color: '#fff', fontWeight: 700, borderRadius: '5px', padding: '4px' }}>210</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                </tr>
                <tr>
                  <td style={{ color: '#9096a8', fontWeight: 700, textAlign: 'right', paddingRight: '6px' }}>Amb</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>1</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                  <td style={{ background: '#2c2f3a', color: '#9096a8', borderRadius: '5px', padding: '4px' }}>0</td>
                  <td style={{ background: 'rgba(255,64,96,0.85)', color: '#fff', fontWeight: 700, borderRadius: '5px', padding: '4px' }}>98</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
