"use client";

import React, { useState } from "react";

export default function EmergencyOverrideView() {
  const [activeOverride, setActiveOverride] = useState<boolean>(true);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .blueprint-grid-emergency {
            background-image: 
                linear-gradient(rgba(240,85,66,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(240,85,66,0.05) 1px, transparent 1px);
            background-size: 24px 24px;
            background-color: #0d0403; /* Very dark red/black */
        }

        .scanline-emergency {
            width: 100%;
            height: 4px;
            background: linear-gradient(to right, transparent, rgba(240,85,66,0.5), transparent);
            position: absolute;
            animation: scan-fast 2s linear infinite;
            z-index: 10;
            pointer-events: none;
        }
        @keyframes scan-fast {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }

        .emergency-strobe {
            animation: strobe 1.5s ease-in-out infinite alternate;
        }
        @keyframes strobe {
            0% { box-shadow: inset 0 0 0 1px rgba(240,85,66,0.1), 0 0 20px rgba(240,85,66,0); }
            100% { box-shadow: inset 0 0 0 2px rgba(240,85,66,0.8), 0 0 40px rgba(240,85,66,0.3); }
        }

        .flow-line-emergency {
            stroke-dasharray: 12 8;
            animation: dashFlowEmergency 0.4s linear infinite;
        }
        @keyframes dashFlowEmergency {
            from { stroke-dashoffset: 20; }
            to { stroke-dashoffset: 0; }
        }
      `}} />
      
      {/* Main Dashboard Canvas Area */}
      <div className="flex-1 flex flex-col gap-6 blueprint-grid-emergency rounded-[24px] border border-state-preempted/20 p-6 min-h-[600px] overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 h-full">
          
          {/* Massive Map View */}
          <section className="xl:col-span-9 bg-[#0d0403] rounded-[24px] p-0 flex flex-col relative overflow-hidden tech-border emergency-strobe">
            <div className="scanline-emergency"></div>
            
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
              <div className="bg-state-preempted/10 border border-state-preempted/30 backdrop-blur-md px-4 py-3 rounded-lg flex items-center gap-4 shadow-[0_0_20px_rgba(240,85,66,0.2)]">
                <span className="material-symbols-rounded text-state-preempted text-[24px] animate-pulse">local_fire_department</span>
                <div className="flex flex-col">
                  <h2 className="font-telemetry text-sm font-bold text-state-preempted tracking-widest uppercase">SECTOR 4 EVACUATION ROUTE</h2>
                  <span className="font-telemetry text-[10px] text-white">ALL SIGNALS LOCKED IN PHASE 2</span>
                </div>
              </div>
            </div>

            {/* Visual SVG Map Layer */}
            <div className="flex-1 relative w-full h-full min-h-[500px]">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                
                {/* E-Route Pathing */}
                <path d="M 10% 50% L 30% 50% L 50% 50% L 70% 50% L 90% 50%" fill="none" stroke="rgba(240,85,66,0.15)" strokeWidth="12"></path>
                <path className="flow-line-emergency" d="M 10% 50% L 30% 50% L 50% 50% L 70% 50% L 90% 50%" fill="none" stroke="#f05542" strokeWidth="4" filter="url(#glow-red)"></path>
              </svg>

              {/* Intersection Nodes (Mock Data) */}
              <div className="absolute top-[50%] left-[10%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-16 h-16 rounded bg-state-preempted/20 border-2 border-state-preempted flex items-center justify-center relative pulse-preempted">
                  <span className="font-telemetry text-[14px] text-white font-bold shadow-glow-preempted">IX101</span>
                </div>
              </div>
              <div className="absolute top-[50%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-16 h-16 rounded bg-state-preempted/20 border-2 border-state-preempted flex items-center justify-center relative pulse-preempted">
                  <span className="font-telemetry text-[14px] text-white font-bold shadow-glow-preempted">IX102</span>
                </div>
              </div>
              <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-16 h-16 rounded bg-state-preempted/20 border-2 border-state-preempted flex items-center justify-center relative pulse-preempted">
                  <span className="font-telemetry text-[14px] text-white font-bold shadow-glow-preempted">IX104</span>
                </div>
              </div>
              <div className="absolute top-[50%] left-[70%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-16 h-16 rounded bg-state-preempted/20 border-2 border-state-preempted flex items-center justify-center relative pulse-preempted">
                  <span className="font-telemetry text-[14px] text-white font-bold shadow-glow-preempted">IX106</span>
                </div>
              </div>
            </div>
          </section>

          {/* Emergency Telemetry Panel */}
          <section className="xl:col-span-3 flex flex-col gap-6">
            <div className="bg-[#0d0403] rounded-[24px] p-6 flex flex-col gap-4 tech-border emergency-strobe flex-1 border border-state-preempted/30">
              <div className="border-b border-state-preempted/30 pb-4">
                <span className="font-telemetry text-[11px] uppercase tracking-widest text-state-preempted block mb-1 animate-pulse">Priority Agent</span>
                {/* Mock Data */}
                <h3 className="font-telemetry text-2xl font-bold text-white tracking-widest shadow-glow-preempted">AMBULANCE-01</h3>
                <span className="font-telemetry text-[11px] uppercase tracking-widest text-white/70 block mt-2">En Route to Metro General</span>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                <div className="bg-state-preempted/5 p-4 rounded border border-state-preempted/20 relative overflow-hidden group cursor-help transition-all hover:bg-state-preempted/10">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-state-preempted"></div>
                  <span className="font-telemetry text-[10px] text-state-preempted uppercase tracking-widest block mb-2">ETA to Target</span>
                  {/* Mock Data */}
                  <span className="font-telemetry text-3xl text-white font-bold tabular-nums">04m 12s</span>
                </div>
                
                <div className="bg-state-preempted/5 p-4 rounded border border-state-preempted/20 relative overflow-hidden group cursor-help transition-all hover:bg-state-preempted/10">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-state-preempted"></div>
                  <span className="font-telemetry text-[10px] text-state-preempted uppercase tracking-widest block mb-2">Velocity</span>
                  {/* Mock Data */}
                  <span className="font-telemetry text-3xl text-white font-bold tabular-nums">68 MPH</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
