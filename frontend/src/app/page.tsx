"use client";

import React, { useState } from "react";
import Sidebar, { ModuleKey } from "../components/Sidebar";
import Topbar from "../components/Topbar";

import OverviewView from "../components/views/OverviewView";
import IntersectionDetailView from "../components/views/IntersectionDetailView";
import VisionMonitorView from "../components/views/VisionMonitorView";
import CorridorView from "../components/views/CorridorView";
import AnalyticsView from "../components/views/AnalyticsView";
import SystemHealthView from "../components/views/SystemHealthView";
import EmergencyOverrideView from "../components/views/EmergencyOverrideView";
import SettingsView from "../components/views/SettingsView";

export default function Home() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  const getModuleTitle = (key: ModuleKey) => {
    switch (key) {
      case "overview":
        return "Network Overview";
      case "intersection":
        return "Intersection Telemetry & Queues";
      case "corridor":
        return "Green Wave Corridor Routing";
      case "vision":
        return "Vision Perception Feed";
      case "analytics":
        return "Predictive Analytics & Validation";
      case "health":
        return "System Health & SLA Telemetry";
      case "emergency":
        return "Emergency Priority Override";
      case "settings":
        return "Simulation Controls & Settings";
      default:
        return "Kinetica Control Room";
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
      case "settings":
        return <SettingsView />;
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
        />

        <div className="mt-14 p-6 overflow-y-auto flex-1 flex flex-col gap-6 pb-6">
          {renderActiveView()}
        </div>
      </main>
    </>
  );
}
