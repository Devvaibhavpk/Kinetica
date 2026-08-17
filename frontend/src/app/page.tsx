"use client";

import React, { useState } from "react";
import Sidebar, { ModuleKey } from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TickerBar from "../components/TickerBar";

import OverviewView from "../components/views/OverviewView";
import IntersectionDetailView from "../components/views/IntersectionDetailView";
import VisionMonitorView from "../components/views/VisionMonitorView";
import CorridorView from "../components/views/CorridorView";
import AnalyticsView from "../components/views/AnalyticsView";
import SystemHealthView from "../components/views/SystemHealthView";
import EmergencyOverrideView from "../components/views/EmergencyOverrideView";

export default function Home() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  const getModuleTitle = (key: ModuleKey) => {
    switch (key) {
      case "overview":
        return "SECTOR 4 : NETWORK OVERVIEW";
      case "intersection":
        return "INTERSECTION IX-104 : DEEP INSPECTOR";
      case "corridor":
        return "GREEN WAVE : ARTERIAL CORRIDOR ROUTER";
      case "vision":
        return "VISION FEED : EDGE YOLO PERCEPTION";
      case "analytics":
        return "ANALYTICS : REGRESSION & HYPOTHESIS TEST";
      case "health":
        return "SYSTEM HEALTH : O(LOG N) HEAP BENCHMARK";
      case "emergency":
        return "EMERGENCY OVERRIDE : HIGH PRIORITY CONTROLLER";
      default:
        return "KINETICA CONTROL ROOM";
    }
  };

  const renderActiveView = () => {
    switch (activeModule) {
      case "overview":
        return <OverviewView />;
      case "intersection":
        return <IntersectionDetailView />;
      case "corridor":
        return <CorridorView />;
      case "vision":
        return <VisionMonitorView />;
      case "analytics":
        return <AnalyticsView />;
      case "health":
        return <SystemHealthView />;
      case "emergency":
        return <EmergencyOverrideView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <>
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        isExpanded={isSidebarExpanded}
        onToggleExpand={toggleSidebar}
      />

      <main
        className={`flex-1 flex flex-col relative h-full transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? "ml-[264px]" : "ml-[64px]"
        }`}
      >
        <Topbar
          moduleTitle={getModuleTitle(activeModule)}
          isSidebarExpanded={isSidebarExpanded}
          onToggleSidebar={toggleSidebar}
        />

        <div className="mt-14 p-6 overflow-y-auto flex-1 flex flex-col gap-6 pb-16">
          {renderActiveView()}
        </div>

        <TickerBar isSidebarExpanded={isSidebarExpanded} />
      </main>
    </>
  );
}
