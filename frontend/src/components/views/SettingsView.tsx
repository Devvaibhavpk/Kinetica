"use client";

import React from "react";

export default function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-xl text-[#e4e6eb]">
          Scenario Controls & System Settings
        </h2>
        <p className="text-xs text-[#b0b3b8] mt-0.5">
          Synthetic Event Generator Presets • Master Pipeline Configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-astryx p-6 space-y-4">
          <h3 className="font-display font-semibold text-base text-[#e4e6eb]">
            Synthetic Scenario Presets
          </h3>
          <p className="text-xs text-[#b0b3b8] leading-relaxed">
            Select a synthetic event stream configuration from{" "}
            <code className="text-[#0866ff]">data/synthetic_generator.py</code> to run through the pipeline.
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded bg-[#18191a] border border-[#3e4042] flex items-center justify-between">
              <div>
                <div className="font-display font-medium text-sm text-[#e4e6eb]">
                  queue_buildup
                </div>
                <div className="text-xs text-[#b0b3b8] mt-0.5">
                  Simulates steady vehicle density accumulation on a red phase
                </div>
              </div>
              <button
                disabled
                className="px-3 py-1.5 rounded bg-[#23334c] text-[#0866ff] text-xs font-mono border border-[#0866ff]/40 opacity-70 cursor-not-allowed"
              >
                Configured
              </button>
            </div>

            <div className="p-4 rounded bg-[#18191a] border border-[#3e4042] flex items-center justify-between">
              <div>
                <div className="font-display font-medium text-sm text-[#e4e6eb]">
                  ambulance_corridor
                </div>
                <div className="text-xs text-[#b0b3b8] mt-0.5">
                  Simulates high-speed emergency preemption across Nodes A → D
                </div>
              </div>
              <button
                disabled
                className="px-3 py-1.5 rounded bg-[#e41e3f]/10 text-[#e41e3f] text-xs font-mono border border-[#e41e3f]/40 opacity-70 cursor-not-allowed"
              >
                Configured
              </button>
            </div>
          </div>
        </div>

        <div className="card-astryx p-6 space-y-4">
          <h3 className="font-display font-semibold text-base text-[#e4e6eb]">
            Model & Parameters Summary
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-[#3e4042]">
              <span className="text-[#b0b3b8]">Base Saturation Flow (s)</span>
              <span className="font-telemetry text-[#e4e6eb]">1900 veh/hr/lane</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3e4042]">
              <span className="text-[#b0b3b8]">Min / Max Green Extension</span>
              <span className="font-telemetry text-[#e4e6eb]">10s / 60s</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3e4042]">
              <span className="text-[#b0b3b8]">Max Starvation Delay (D_max)</span>
              <span className="font-telemetry text-[#e4e6eb]">120s</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#3e4042]">
              <span className="text-[#b0b3b8]">Default Datasets</span>
              <span className="font-telemetry text-[#00a86b]">5 Kaggle Sources Locked</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#b0b3b8]">UI Theme</span>
              <span className="font-telemetry text-[#0866ff]">Astryx Dark Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
