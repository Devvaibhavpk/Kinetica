"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Map, LayerGroup, Marker, Polyline, TileLayer } from "leaflet";

export interface HospitalLocation {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  traumaLevel: string;
  emergencyContact: string;
  nearestIntersection: string;
}

export const CHENNAI_HOSPITALS: HospitalLocation[] = [
  {
    id: "HOSP-01",
    name: "Apollo Speciality Hospitals OMR",
    zone: "Perungudi / OMR IT Corridor",
    lat: 12.96325,
    lon: 80.24572,
    traumaLevel: "Level-1 Emergency Trauma Center",
    emergencyContact: "1066 / +91-44-2496-1111",
    nearestIntersection: "IX-103",
  },
  {
    id: "HOSP-02",
    name: "Gleneagles Global Health City",
    zone: "Perumbakkam / Sholinganallur Hub",
    lat: 12.90550,
    lon: 80.20800,
    traumaLevel: "Multi-Organ Transplant & Trauma Center",
    emergencyContact: "105711 / +91-44-4477-7777",
    nearestIntersection: "IX-104",
  },
  {
    id: "HOSP-03",
    name: "Fortis Malar Hospital",
    zone: "Adyar / Gandhi Nagar Gateway",
    lat: 13.01012,
    lon: 80.25891,
    traumaLevel: "Cardiac & Acute Trauma Center",
    emergencyContact: "+91-44-4289-2222",
    nearestIntersection: "IX-101",
  },
  {
    id: "HOSP-04",
    name: "MIOT International Hospital",
    zone: "Manapakkam / Kathipara Hub",
    lat: 13.02068,
    lon: 80.18507,
    traumaLevel: "Advanced Orthopedic & Trauma Care",
    emergencyContact: "+91-44-4200-2288",
    nearestIntersection: "IX-105",
  },
  {
    id: "HOSP-05",
    name: "Chettinad Health City",
    zone: "Padur / OMR Expressway South",
    lat: 12.82500,
    lon: 80.22200,
    traumaLevel: "Super Speciality & Emergency Hub",
    emergencyContact: "+91-44-4741-1000",
    nearestIntersection: "IX-104",
  },
  {
    id: "HOSP-06",
    name: "VHS Multispeciality Hospital",
    zone: "Taramani / Rajiv Gandhi Salai",
    lat: 13.00212,
    lon: 80.24657,
    traumaLevel: "Tertiary Trauma & Stroke Center",
    emergencyContact: "+91-44-2254-1972",
    nearestIntersection: "IX-102",
  },
  {
    id: "HOSP-07",
    name: "Kauvery Hospital",
    zone: "Alwarpet / TTK Road",
    lat: 13.04651,
    lon: 80.26041,
    traumaLevel: "Critical Care & Emergency Ward",
    emergencyContact: "+91-44-4000-6000",
    nearestIntersection: "IX-101",
  },
  {
    id: "HOSP-08",
    name: "Rajiv Gandhi Govt General Hospital",
    zone: "Chennai Central / Park Town",
    lat: 13.08153,
    lon: 80.27751,
    traumaLevel: "State Level-1 Apex Trauma Institute",
    emergencyContact: "108 / +91-44-2530-5000",
    nearestIntersection: "IX-108",
  },
];

export interface ChennaiNode {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  queueLengthM: number;
  density: number;
  arrivalRate: string;
  activePhase: string;
  status: "nominal" | "building" | "preempted" | "offline";
  policy: "FIXED-TIME" | "ADAPTIVE" | "MAX-PREEMPT" | "OFFLINE";
  nemaSplit: string;
  speedKmH: number;
  classCounts: {
    cars: number;
    twoWheelers: number;
    autos: number;
    buses: number;
    ambulances: number;
  };
  activePreemption?: {
    vehicle: "AMBULANCE" | "POLICE" | "FIRE";
    etaSeconds: number;
    corridorName: string;
  };
}

interface ChennaiRealMapProps {
  selectedNodeId: string;
  onSelectNode: (node: ChennaiNode) => void;
  backendData?: any;
}

export default function ChennaiRealMap({
  selectedNodeId,
  onSelectNode,
  backendData,
}: ChennaiRealMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const trafficFlowLayerRef = useRef<TileLayer | null>(null);

  // Google Maps Style Ambulance Navigation State
  // Google Maps Style Ambulance Navigation State
  const [originQuery, setOriginQuery] = useState<string>("Madhya Kailash (OMR Gateway)");
  const [originCoord, setOriginCoord] = useState<{ lat: number; lon: number; name: string }>({
    lat: 13.00666,
    lon: 80.24603,
    name: "Madhya Kailash (OMR Gateway)",
  });
  const [destQuery, setDestQuery] = useState<string>("Apollo Speciality Hospitals OMR");
  const [destCoord, setDestCoord] = useState<{ lat: number; lon: number; name: string; type?: string }>({
    lat: 12.96325,
    lon: 80.24572,
    name: "Apollo Speciality Hospitals OMR",
    type: "hospital",
  });

  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<"origin" | "dest" | null>(null);

  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [mapType, setMapType] = useState<"tomtom" | "satellite">("tomtom");
  const [showLiveTraffic, setShowLiveTraffic] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const isBackendOnline = Boolean(
    backendData &&
      backendData.metrics &&
      (backendData.metrics.totalObservations > 0 || backendData.metrics.totalDecisions > 0)
  );

  // Exact Surveyed Chennai Signal Intersection Coordinates
  const chennaiNodes: ChennaiNode[] = React.useMemo(() => {
    const baseNodes: ChennaiNode[] = [
      {
        id: "IX-101",
        name: "Madhya Kailash Junction",
        zone: "Adyar / Sardar Patel Rd & OMR Gateway",
        lat: 13.00666,
        lon: 80.24603,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "OMR Main Phase Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-102",
        name: "TIDEL Park Junction",
        zone: "Thiruvanmiyur / CSIR Rd & OMR",
        lat: 12.98640,
        lon: 80.25156,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "CSIR Cross Phase Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-103",
        name: "SRP Tools Junction",
        zone: "Perungudi / OMR IT Expressway Hub",
        lat: 12.98007,
        lon: 80.25290,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Southbound Corridor Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-104",
        name: "Sholinganallur Junction",
        zone: "OMR & Medavakkam-Kandanchavadi Arterial Link",
        lat: 12.90092,
        lon: 80.22797,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Medavakkam Cross Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-105",
        name: "Kathipara Cloverleaf Junction",
        zone: "Guindy / GST Road & Inner Ring Link (NH-45)",
        lat: 13.00652,
        lon: 80.20367,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "GST Mainline Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-108",
        name: "Chennai Central Junction",
        zone: "George Town / EVR Periyar Salai & Wall Tax Rd",
        lat: 13.08186,
        lon: 80.27625,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Terminal Approach Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
      {
        id: "IX-109",
        name: "Vijayanagar Junction",
        zone: "Velachery / 100ft Bypass Rd & Taramani Link",
        lat: 12.97500,
        lon: 80.22070,
        queueLengthM: 0,
        density: 0,
        arrivalRate: "—",
        activePhase: isBackendOnline ? "Velachery Bypass Active" : "Backend Offline",
        status: isBackendOnline ? "nominal" : "offline",
        policy: isBackendOnline ? "ADAPTIVE" : "OFFLINE",
        nemaSplit: isBackendOnline ? "Dynamic" : "Offline",
        speedKmH: 0,
        classCounts: { cars: 0, twoWheelers: 0, autos: 0, buses: 0, ambulances: 0 },
      },
    ];

    if (backendData && backendData.laneStates) {
      const mapping: Record<string, string> = {
        lane_N: "IX-101",
        lane_S: "IX-102",
        lane_E: "IX-103",
        lane_W: "IX-104",
      };

      for (const [laneId, laneData] of Object.entries(backendData.laneStates)) {
        const nodeId = mapping[laneId];
        const targetNode = baseNodes.find((n) => n.id === nodeId);
        if (targetNode) {
          const typedLane = laneData as any;
          targetNode.queueLengthM = Number(typedLane.queue_length_m) || 0;
          targetNode.density = Number(typedLane.density_veh_per_m) || 0;
          targetNode.status =
            typedLane.state === "preempted"
              ? "preempted"
              : typedLane.state === "building"
              ? "building"
              : "nominal";
          targetNode.arrivalRate = ((typedLane.vehicle_count || 0) / 10).toFixed(2) + " V/S";

          const count = typedLane.vehicle_count || 0;
          targetNode.classCounts = {
            cars: Math.floor(count * 0.4),
            twoWheelers: Math.floor(count * 0.45),
            autos: Math.floor(count * 0.1),
            buses: Math.floor(count * 0.05),
            ambulances: typedLane.state === "preempted" ? 1 : 0,
          };

          targetNode.speedKmH = Math.max(0, Math.round(55 * (1 - targetNode.density)));
        }
      }

      if (backendData.recentDecisions && Array.isArray(backendData.recentDecisions)) {
        const decisionsByIx = backendData.recentDecisions.reduce((acc: any, dec: any) => {
          const id = dec.intersection_id || mapping[dec.active_lane_id] || "IX-101";
          acc[id] = dec;
          return acc;
        }, {});

        for (const [nodeId, dec] of Object.entries(decisionsByIx)) {
          const targetNode = baseNodes.find((n) => n.id === nodeId);
          if (targetNode) {
            const d = dec as any;
            targetNode.policy = d.reason === "preempted" ? "MAX-PREEMPT" : "ADAPTIVE";
            targetNode.activePhase = d.active_lane_id
              ? `Live Active: ${d.active_lane_id}`
              : "Phase Active";
            targetNode.nemaSplit = d.reason === "preempted" ? "G: HOLD (Preempt)" : "G: Dynamic";
          }
        }
      }
    }

    return baseNodes;
  }, [backendData, isBackendOnline]);

  const baseTileLayerRef = useRef<TileLayer | null>(null);

  // 1. Leaflet Map Instance & Layer Setup — Runs ONLY ONCE on mount
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;
    let isMounted = true;

    const initMap = async () => {
      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        const map = L.map(mapContainerRef.current, {
          center: [12.9750, 80.2350],
          zoom: 12.5,
          zoomControl: false,
          attributionControl: false,
        });

        // Initialize base tile layer (TomTom default)
        const baseLayer = L.tileLayer("/api/tile/tomtom?type=basic&z={z}&x={x}&y={y}", {
          maxZoom: 19,
          subdomains: "abcd",
        }).addTo(map);
        baseTileLayerRef.current = baseLayer;

        // Initialize real-time TomTom traffic flow layer
        const trafficLayer = L.tileLayer("/api/tile/tomtom?type=flow&z={z}&x={x}&y={y}", {
          maxZoom: 19,
          opacity: 0.9,
        }).addTo(map);
        trafficFlowLayerRef.current = trafficLayer;

        // Overlay layer groups
        markersLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;

        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 150);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient]);

  // 2. Basemap & Traffic Toggle Effect — Runs ONLY when user explicitly toggles map controls (Zero reload on telemetry)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseTileLayerRef.current) return;

    if (mapType === "satellite") {
      baseTileLayerRef.current.setUrl(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      );
    } else {
      baseTileLayerRef.current.setUrl("/api/tile/tomtom?type=basic&z={z}&x={x}&y={y}");
    }

    if (trafficFlowLayerRef.current) {
      if (showLiveTraffic) {
        if (!map.hasLayer(trafficFlowLayerRef.current)) {
          trafficFlowLayerRef.current.addTo(map);
        }
      } else {
        if (map.hasLayer(trafficFlowLayerRef.current)) {
          map.removeLayer(trafficFlowLayerRef.current);
        }
      }
    }
  }, [mapType, showLiveTraffic]);

  // 3. Signal Marker Overlay Update Effect — Updates marker badges without touching map tiles or triggering API requests
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const renderMarkers = async () => {
      const L = (window as any).L || (await import("leaflet"));

      chennaiNodes.forEach((node) => {
        const isSelected = node.id === selectedNodeId;
        const isRouteSignal = Boolean(routeResult?.intersectionsOnRoute?.some((ix: any) => ix.id === node.id));
        const isPreempted = node.status === "preempted" || isRouteSignal;
        const statusColor =
          isPreempted
            ? "#00c97a"
            : node.status === "building"
            ? "#ffab1a"
            : node.status === "offline"
            ? "#64748b"
            : "#00c97a";

        const markerHtml = `
          <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
            ${
              isPreempted
                ? '<div class="absolute -inset-2.5 rounded-full bg-emerald-500/30 animate-pulse"></div>'
                : ""
            }
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--surface-low)]/95 backdrop-blur-md border ${
              isSelected
                ? "border-[#4d9fff] shadow-[0_0_14px_rgba(77,159,255,0.6)]"
                : isPreempted
                ? "border-emerald-500/50 shadow-[0_0_10px_rgba(0,201,122,0.3)]"
                : "border-[var(--border)]"
            } text-[var(--text-primary)] text-[10px] font-mono whitespace-nowrap shadow-md">
              <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${statusColor}; box-shadow: ${isPreempted ? '0 0 8px #00c97a' : 'none'};"></span>
              <span class="font-bold">${node.id}</span>
              ${
                isPreempted
                  ? '<span class="text-[#00c97a] font-bold text-[9px] bg-emerald-500/10 px-1 rounded">HOLD GREEN</span>'
                  : `<span class="text-[var(--text-secondary)] text-[9px] hidden group-hover:inline">${node.name.split(" ")[0]}</span>`
              }
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: "custom-leaflet-marker",
          iconSize: [60, 24],
          iconAnchor: [30, 12],
        });

        const marker = L.marker([node.lat, node.lon], { icon: customIcon });

        marker.on("click", () => {
          onSelectNode(node);
        });

        marker.bindTooltip(
          `
            <div style="padding: 4px; font-family: monospace; font-size: 11px;">
              <b style="color: #4d9fff;">${node.id} — ${node.name}</b><br/>
              <span style="color: var(--text-secondary);">${node.zone}</span><br/>
              <hr style="margin: 4px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);"/>
              <span>Queue: <b style="color: ${
                node.queueLengthM > 35 ? "#ffab1a" : "#00c97a"
              };">${isBackendOnline ? `${node.queueLengthM.toFixed(1)}m` : "Offline"}</b></span><br/>
              <span>Status: <b style="color: ${statusColor};">${isPreempted ? "HOLD GREEN" : node.status.toUpperCase()}</b> (${isPreempted ? "PREEMPTION WAVE" : node.policy})</span>
            </div>
          `,
          {
            direction: "top",
            offset: [0, -12],
            className: "leaflet-node-popup",
          }
        );

        marker.addTo(markersGroup);
      });
    };

    renderMarkers();
  }, [chennaiNodes, selectedNodeId, isBackendOnline, onSelectNode, routeResult]);


  const selectedNode = chennaiNodes.find((n) => n.id === selectedNodeId) || chennaiNodes[3];

  const searchLocations = async (query: string, field: "origin" | "dest") => {
    if (!query.trim()) {
      if (field === "origin") setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/route/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (field === "origin") setOriginSuggestions(data.results || []);
        else setDestSuggestions(data.results || []);
      }
    } catch (e) {
      console.warn("Search error:", e);
    }
  };

  const dispatchAmbulanceRoute = async (targetDest?: {
    lat: number;
    lon: number;
    name: string;
    type?: string;
  }) => {
    setIsRouting(true);
    setRouteError(null);
    const dest = targetDest || destCoord;

    try {
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { lat: originCoord.lat, lon: originCoord.lon, id: "ORIGIN", name: originCoord.name },
          end: { lat: dest.lat, lon: dest.lon, id: "DEST", name: dest.name },
          isEmergency: true,
          hospital:
            dest.type === "hospital" || dest.name.toLowerCase().includes("hospital")
              ? { name: dest.name, lat: dest.lat, lon: dest.lon }
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to calculate optimal route");
      }

      setRouteResult(data);

      if (routeLayerRef.current && mapInstanceRef.current) {
        const L = (window as any).L || (await import("leaflet"));
        routeLayerRef.current.clearLayers();

        // High-visibility glowing crimson emergency preemption corridor
        const polyline = L.polyline(data.coordinates, {
          color: "#ff4060",
          weight: 6,
          opacity: 0.95,
          dashArray: "10, 8",
          lineCap: "round",
          lineJoin: "round",
        });

        polyline.bindTooltip(
          `🚑 AMBULANCE PREEMPTION WAVE: ${dest.name} · ETA: ${data.summary.totalEtaMinutes} (-${data.summary.timeSavedMinutes} saved via Signal Preemption)`,
          { sticky: true, className: "leaflet-custom-tooltip" }
        );
        polyline.addTo(routeLayerRef.current);

        // Origin marker (Ambulance 🚑)
        const ambulanceIcon = L.divIcon({
          html: '<div class="relative flex items-center justify-center cursor-pointer" style="transform: translate(-50%, -50%);"><div class="absolute -inset-2.5 rounded-full bg-red-500/40 animate-ping"></div><div class="w-8 h-8 rounded-full bg-state-preempted border-2 border-white flex items-center justify-center text-sm shadow-2xl">🚑</div></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Destination marker (Hospital 🏥 or Location 📍)
        const isHosp = dest.type === "hospital" || dest.name.toLowerCase().includes("hospital");
        const destIcon = L.divIcon({
          html: `<div class="relative flex items-center justify-center cursor-pointer" style="transform: translate(-50%, -50%);"><div class="absolute -inset-2 rounded-full ${
            isHosp ? "bg-red-600/30" : "bg-primary/30"
          } animate-pulse"></div><div class="w-8 h-8 rounded-xl ${
            isHosp ? "bg-red-600" : "bg-primary"
          } border-2 border-white flex items-center justify-center text-sm shadow-2xl text-white font-bold">${
            isHosp ? "🏥" : "📍"
          }</div></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker([originCoord.lat, originCoord.lon], { icon: ambulanceIcon })
          .bindTooltip(`<b>Ambulance Dispatch Point</b><br/>${originCoord.name}`, { direction: "top" })
          .addTo(routeLayerRef.current);

        L.marker([dest.lat, dest.lon], { icon: destIcon })
          .bindTooltip(
            `<div style="padding: 4px; font-family: var(--font-body); font-size: 11px;"><b style="color: ${
              isHosp ? "#ff4060" : "var(--primary)"
            };">${dest.name}</b><br/><span style="color: #00c97a; font-weight: bold; font-size: 9px;">CORRIDOR CLEARED · HOLD GREEN</span></div>`,
            { direction: "top" }
          )
          .addTo(routeLayerRef.current);

        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [60, 60] });
      }
    } catch (err: any) {
      setRouteError(err.message || "Failed to dispatch ambulance route");
    } finally {
      setIsRouting(false);
    }
  };

  const clearRoute = () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    setRouteResult(null);
    setRouteError(null);
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-[var(--bg)] rounded-2xl overflow-hidden flex flex-col justify-between">
      {/* ── TOP CONTROLS: GOOGLE MAPS STYLE SEARCH & TOMTOM TRAFFIC TOGGLES ── */}
      <div className="absolute top-4 left-4 right-4 z-[400] pointer-events-auto flex items-start justify-between gap-3">
        {/* Google Maps Style Navigation Deck */}
        <div className="w-full max-w-[420px] bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-xs text-[var(--text-primary)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-state-preempted animate-ping" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] font-mono">
                Ambulance Emergency Dispatch
              </h3>
            </div>
            {routeResult ? (
              <span className="badge badge-crit text-[9px] uppercase font-bold">Corridor Cleared</span>
            ) : (
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">TomTom Routing</span>
            )}
          </div>

          {/* Search Field 1: Origin */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--primary)] transition-all">
              <span className="text-sm">🚨</span>
              <input
                type="text"
                value={originQuery}
                onFocus={() => setActiveSearchField("origin")}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  searchLocations(e.target.value, "origin");
                }}
                placeholder="Search pickup location (e.g. Madhya Kailash, Guindy)..."
                className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/60 font-medium"
              />
              {originQuery && (
                <button
                  onClick={() => {
                    setOriginQuery("");
                    setOriginSuggestions([]);
                  }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Origin Autocomplete Suggestions Dropdown */}
            {activeSearchField === "origin" && originSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-[var(--border)]">
                {originSuggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setOriginQuery(item.name);
                      setOriginCoord({ lat: item.lat, lon: item.lon, name: item.name });
                      setActiveSearchField(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--surface-high)] flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="text-sm shrink-0 mt-0.5">
                      {item.type === "hospital" ? "🏥" : item.type === "intersection" ? "🚦" : "📍"}
                    </span>
                    <div className="overflow-hidden">
                      <b className="text-xs text-[var(--text-primary)] block truncate">{item.name}</b>
                      <span className="text-[10px] text-[var(--text-secondary)] truncate block">
                        {item.address}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Field 2: Destination Hospital or Place */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-state-preempted transition-all">
              <span className="text-sm">🏥</span>
              <input
                type="text"
                value={destQuery}
                onFocus={() => setActiveSearchField("dest")}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  searchLocations(e.target.value, "dest");
                }}
                placeholder="Search any hospital or destination in Chennai..."
                className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/60 font-medium"
              />
              {destQuery && (
                <button
                  onClick={() => {
                    setDestQuery("");
                    setDestSuggestions([]);
                  }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Destination Autocomplete Suggestions Dropdown */}
            {activeSearchField === "dest" && destSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-[var(--border)]">
                {destSuggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDestQuery(item.name);
                      setDestCoord({ lat: item.lat, lon: item.lon, name: item.name, type: item.type });
                      setActiveSearchField(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--surface-high)] flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="text-sm shrink-0 mt-0.5">
                      {item.type === "hospital" ? "🏥" : item.type === "intersection" ? "🚦" : "📍"}
                    </span>
                    <div className="overflow-hidden">
                      <b className="text-xs text-[var(--text-primary)] block truncate">{item.name}</b>
                      <span className="text-[10px] text-[var(--text-secondary)] truncate block">
                        {item.address}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hospital Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
            {CHENNAI_HOSPITALS.slice(0, 5).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setDestQuery(h.name);
                  setDestCoord({ lat: h.lat, lon: h.lon, name: h.name, type: "hospital" });
                  dispatchAmbulanceRoute({ lat: h.lat, lon: h.lon, name: h.name, type: "hospital" });
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide shrink-0 transition-all border cursor-pointer ${
                  destCoord.name.includes(h.name.split(" ")[0])
                    ? "bg-state-preempted text-white border-state-preempted shadow-sm"
                    : "bg-[var(--surface-high)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                🏥 {h.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => dispatchAmbulanceRoute()}
              disabled={isRouting}
              className="flex-1 rounded-xl py-2.5 bg-state-preempted hover:bg-state-preempted/90 text-white font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow-crit cursor-pointer"
            >
              {isRouting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Clearing Signals & Routing...</span>
                </>
              ) : (
                <span>🚨 Dispatch Ambulance & Clear Route</span>
              )}
            </button>
            {routeResult && (
              <button
                onClick={clearRoute}
                className="px-3 py-2.5 bg-[var(--surface-high)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Error Message */}
          {routeError && (
            <div className="p-2.5 rounded-xl bg-state-crit-dim border border-state-crit-border text-state-preempted text-xs">
              {routeError}
            </div>
          )}

          {/* Live Preemption Telemetry Card */}
          {routeResult && (
            <div className="bg-[var(--surface-low)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2 mt-0.5">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[var(--border)] font-bold">
                <span className="text-state-preempted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-state-preempted animate-ping" />
                  Corridor Cleared: {routeResult.summary.distanceKm}
                </span>
                <span className="text-sm font-bold text-[var(--primary)]">
                  {routeResult.summary.totalEtaMinutes}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--text-secondary)] pt-0.5">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
                    Distance
                  </span>
                  <b className="text-xs text-[var(--text-primary)]">{routeResult.summary.distanceKm}</b>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
                    Time Saved
                  </span>
                  <b className="text-xs text-state-calm">-{routeResult.summary.timeSavedMinutes}</b>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
                    Corridor
                  </span>
                  <b className="text-xs text-state-calm">GREEN WAVE</b>
                </div>
              </div>

              {routeResult.intersectionsOnRoute?.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-[var(--border)] flex flex-col gap-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                  {routeResult.intersectionsOnRoute.map((ix: any) => (
                    <div
                      key={ix.id}
                      className="flex items-center justify-between bg-[var(--surface-high)]/60 px-2 py-1.5 rounded text-[11px]"
                    >
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[170px]">
                        {ix.name}
                      </span>
                      <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded font-mono shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#00c97a]" />
                        HOLD GREEN
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Layers & TomTom Traffic Toggles (Top Right) */}
        <div className="p-1.5 flex items-center gap-2 shadow-lg backdrop-blur-md rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 shrink-0">
          {/* Live Traffic Toggle */}
          <button
            onClick={() => setShowLiveTraffic(!showLiveTraffic)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              showLiveTraffic
                ? "bg-state-calm/15 text-state-calm border border-state-calm/30 shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${showLiveTraffic ? "bg-state-calm animate-pulse" : "bg-gray-400"}`}
            />
            <span>TomTom Traffic</span>
          </button>

          <div className="w-[1px] h-4 bg-[var(--border)]" />

          {/* Basemap Switcher */}
          <button
            onClick={() => setMapType("tomtom")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer ${
              mapType === "tomtom"
                ? "bg-[var(--surface-high)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            TomTom
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer ${
              mapType === "satellite"
                ? "bg-[var(--primary)] text-white shadow-sm font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* ── LEAFLET CONTAINER ── */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-10" style={{ minHeight: "480px" }} />

      {/* ── BOTTOM HUD TELEMETRY STRIP ── */}
      <div className="relative z-[400] bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              Intersection:
            </span>
            <span className="font-bold text-[var(--text-primary)] bg-[var(--surface-high)] px-2.5 py-0.5 rounded border border-[var(--border)]">
              {selectedNode.id} — {selectedNode.name}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Zone:</span>
            <span className="text-[var(--text-primary)] font-medium">{selectedNode.zone}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              GPS:
            </span>
            <span className="text-[var(--primary)] font-semibold tabular-nums">
              {selectedNode.lat.toFixed(5)}° N, {selectedNode.lon.toFixed(5)}° E
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              Queue:
            </span>
            <span
              className={`font-bold tabular-nums ${
                !isBackendOnline
                  ? "text-[var(--text-secondary)]"
                  : selectedNode.queueLengthM > 35
                  ? "text-[var(--warn)]"
                  : "text-[var(--calm)]"
              }`}
            >
              {isBackendOnline ? `${selectedNode.queueLengthM.toFixed(1)}m` : "Offline"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold">
              Policy:
            </span>
            <span
              className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded border ${
                !isBackendOnline
                  ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  : selectedNode.status === "preempted"
                  ? "bg-state-preempted/10 text-state-preempted border-state-crit-border"
                  : selectedNode.status === "building"
                  ? "bg-state-warn/10 text-state-warn border-state-warn-border"
                  : "bg-state-calm/10 text-state-calm border-state-calm-border"
              }`}
            >
              {isBackendOnline ? selectedNode.policy : "BACKEND OFFLINE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
