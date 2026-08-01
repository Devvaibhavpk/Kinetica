"use client";

import React from "react";

interface AwaitingDataStubProps {
  title: string;
  phaseRequired: string;
  expectedFile: string;
  description: string;
}

export default function AwaitingDataStub({
  title,
  phaseRequired,
  expectedFile,
  description,
}: AwaitingDataStubProps) {
  return (
    <div className="card-astryx p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
      <div className="w-12 h-12 rounded-full bg-[#23334c] border border-[#0866ff] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(8,102,255,0.25)]">
        <svg
          className="w-6 h-6 text-[#0866ff] animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="font-display font-semibold text-lg text-[#e4e6eb] mb-1">
        {title}
      </h3>

      <div className="flex items-center space-x-2 my-2">
        <span className="px-2.5 py-1 rounded-full bg-[#f5a623]/10 border border-[#f5a623] text-[#f5a623] text-xs font-mono font-medium">
          Awaiting {phaseRequired} Output
        </span>
      </div>

      <p className="text-sm text-[#b0b3b8] max-w-md mt-2 mb-4 leading-relaxed">
        {description}
      </p>

      <div className="px-3 py-1.5 rounded bg-[#18191a] border border-[#3e4042] text-xs font-telemetry text-[#8a8d91]">
        Expected Artifact: <code className="text-[#0866ff]">{expectedFile}</code>
      </div>
    </div>
  );
}
