"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Map, LayerGroup, Marker, Polyline } from "leaflet";
import {
  EXACT_OMR_ROAD_GEOMETRY,
  EXACT_GST_ANNA_SALAI_GEOMETRY,
  EXACT_SARDAR_PATEL_GEOMETRY,
  EXACT_RADIAL_200FT_GEOMETRY,
  EXACT_VELACHERY_BYPASS_GEOMETRY,
  EXACT_SHOLINGANALLUR_CROSS_GEOMETRY,
} from "../data/chennaiRoads";

export interface ChennaiNode {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  queueLengthM: number;
  density: number; // 0 to 1
  arrivalRate: string;
  activePhase: string;
  status: "nominal" | "building" | "preempted";
  policy: "FIXED-TIME" | "ADAPTIVE" | "MAX-PREEMPT";
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
  scenario: "normal" | "building" | "preempted";
  selectedNodeId: string;
  onSelectNode: (node: ChennaiNode) => void;
}

export default function ChennaiRealMap({
  scenario,
  selectedNodeId,
  onSelectNode,
}: ChennaiRealMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const corridorsLayerRef = useRef<LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [mapType, setMapType] = useState<"dark" | "satellite">("dark");
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showRadialArteries, setShowRadialArteries] = useState<boolean>(true);
  const [showLiveVehicle, setShowLiveVehicle] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Chennai Intersections Data (Positioned directly on road junctions)
  const chennaiNodes: ChennaiNode[] = React.useMemo(() => {
    const isPreempt = scenario === "preempted";
    const isBuild = scenario === "building";

    return [
      {
        id: "IX-101",
        name: "Madhya Kailash Junction",
        zone: "Adyar / Sardar Patel Rd & OMR Gateway",
        lat: 13.00672,
        lon: 80.24354,
        queueLengthM: isBuild ? 28.4 : 11.5,
        density: isBuild ? 0.65 : 0.28,
        arrivalRate: isBuild ? "1.25 V/S" : "0.78 V/S",
        activePhase: "OMR Inbound Ph-2 Green (34s)",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        nemaSplit: "38s / 24s / 18s / 40s",
        speedKmH: 38,
        classCounts: { cars: 32, twoWheelers: 64, autos: 18, buses: 4, ambulances: isPreempt ? 1 : 0 },
        activePreemption: isPreempt
          ? { vehicle: "AMBULANCE", etaSeconds: 12, corridorName: "OMR Rajiv Gandhi Express Wave" }
          : undefined,
      },
      {
        id: "IX-102",
        name: "TIDEL Park Junction",
        zone: "Thiruvanmiyur / CSIR Rd & OMR",
        lat: 12.9892,
        lon: 80.2486,
        queueLengthM: isBuild ? 41.2 : 14.0,
        density: isBuild ? 0.82 : 0.35,
        arrivalRate: isBuild ? "1.58 V/S" : "0.86 V/S",
        activePhase: "North-South Ph-4 Green (Ext +6s)",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        nemaSplit: "45s / 25s / 20s / 30s",
        speedKmH: 32,
        classCounts: { cars: 48, twoWheelers: 95, autos: 24, buses: 6, ambulances: isPreempt ? 1 : 0 },
        activePreemption: isPreempt
          ? { vehicle: "AMBULANCE", etaSeconds: 28, corridorName: "OMR Rajiv Gandhi Express Wave" }
          : undefined,
      },
      {
        id: "IX-103",
        name: "SRP Tools Junction",
        zone: "Perungudi / OMR IT Expressway Hub",
        lat: 12.9734,
        lon: 80.2458,
        queueLengthM: isBuild ? 48.6 : 18.0,
        density: isBuild ? 0.88 : 0.42,
        arrivalRate: isBuild ? "1.72 V/S" : "0.92 V/S",
        activePhase: "Southbound Clearing (Green +8s)",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        nemaSplit: "50s / 30s / 20s / 20s",
        speedKmH: 26,
        classCounts: { cars: 55, twoWheelers: 110, autos: 30, buses: 8, ambulances: isPreempt ? 1 : 0 },
        activePreemption: isPreempt
          ? { vehicle: "AMBULANCE", etaSeconds: 44, corridorName: "OMR Rajiv Gandhi Express Wave" }
          : undefined,
      },
      {
        id: "IX-104",
        name: "Sholinganallur Junction",
        zone: "OMR & Medavakkam-Kandanchavadi Arterial Link",
        lat: 12.901,
        lon: 80.2279,
        queueLengthM: isPreempt ? 34.0 : isBuild ? 52.6 : 12.0,
        density: isPreempt ? 0.74 : isBuild ? 0.91 : 0.31,
        arrivalRate: isPreempt ? "1.42 V/S" : isBuild ? "1.90 V/S" : "0.84 V/S",
        activePhase: "E-Thru Preempted Green Wave",
        status: isPreempt ? "preempted" : isBuild ? "building" : "nominal",
        policy: isPreempt ? "MAX-PREEMPT" : isBuild ? "ADAPTIVE" : "FIXED-TIME",
        nemaSplit: "48s / 32s / 20s / 20s",
        speedKmH: isPreempt ? 52 : 22,
        classCounts: { cars: 62, twoWheelers: 140, autos: 35, buses: 7, ambulances: isPreempt ? 1 : 0 },
        activePreemption: isPreempt
          ? { vehicle: "AMBULANCE", etaSeconds: 65, corridorName: "OMR Rajiv Gandhi Express Wave" }
          : undefined,
      },
      {
        id: "IX-105",
        name: "Kathipara Cloverleaf Junction",
        zone: "Guindy / GST Road & Inner Ring Link (NH-45)",
        lat: 13.0076,
        lon: 80.2032,
        queueLengthM: isBuild ? 38.0 : 15.0,
        density: isBuild ? 0.7 : 0.32,
        arrivalRate: isBuild ? "1.34 V/S" : "0.80 V/S",
        activePhase: "GST Mainline Ph-1 Green",
        status: isBuild ? "building" : "nominal",
        policy: isBuild ? "ADAPTIVE" : "FIXED-TIME",
        nemaSplit: "55s / 25s / 20s / 20s",
        speedKmH: 44,
        classCounts: { cars: 70, twoWheelers: 120, autos: 28, buses: 12, ambulances: 0 },
      },
      {
        id: "IX-108",
        name: "Chennai Central Junction",
        zone: "George Town / EVR Periyar Salai & Wall Tax Rd",
        lat: 13.0827,
        lon: 80.2757,
        queueLengthM: isBuild ? 35.0 : 16.5,
        density: isBuild ? 0.72 : 0.38,
        arrivalRate: "1.10 V/S",
        activePhase: "Station Terminal Approach Ph-3",
        status: "nominal",
        policy: "FIXED-TIME",
        nemaSplit: "45s / 35s / 20s / 20s",
        speedKmH: 24,
        classCounts: { cars: 45, twoWheelers: 85, autos: 55, buses: 14, ambulances: 0 },
      },
      {
        id: "IX-109",
        name: "Vijayanagar Junction",
        zone: "Velachery / 100ft Bypass Rd & Taramani Link",
        lat: 12.9784,
        lon: 80.2185,
        queueLengthM: isBuild ? 33.2 : 11.8,
        density: isBuild ? 0.68 : 0.27,
        arrivalRate: "0.88 V/S",
        activePhase: "Velachery Bypass Westbound",
        status: isBuild ? "building" : "nominal",
        policy: isBuild ? "ADAPTIVE" : "FIXED-TIME",
        nemaSplit: "35s / 25s / 30s / 30s",
        speedKmH: 30,
        classCounts: { cars: 36, twoWheelers: 78, autos: 22, buses: 4, ambulances: 0 },
      },
    ];
  }, [scenario]);

  // Leaflet Map Initialization & 100% Road-Snapped Polyline Rendering
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const L = await import("leaflet");

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Center directly on OMR Rajiv Gandhi Salai corridor
        const map = L.map(mapContainerRef.current, {
          center: [12.9600, 80.2410],
          zoom: 12.6,
          zoomControl: false,
          attributionControl: false,
        });

        // Layer Groups
        corridorsLayerRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Update Map Tiles
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });

      // Helper to add clean dark canvas (No API key required, zero watermark)
      const addDarkTiles = (targetMap: Map) => {
        const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
        if (cartoKey) {
          L.tileLayer(
            `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
            { maxZoom: 19, subdomains: "abcd" }
          ).addTo(targetMap);
        } else {
          // ESRI World Dark Gray Canvas: crisp, dark, 100% free, no API key required
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            {
              maxZoom: 18,
              attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
            }
          ).addTo(targetMap);
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
            {
              maxZoom: 18,
              opacity: 0.85,
            }
          ).addTo(targetMap);
        }
      };

      if (mapType === "satellite") {
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 18 }
        ).addTo(map);
      } else {
        addDarkTiles(map);
      }

      // ── DRAW 100% ROAD-SNAPPED POLYLINES (628+ EXACT OSM WAYPOINTS) ──
      if (corridorsLayerRef.current) {
        corridorsLayerRef.current.clearLayers();

        const isPreempted = scenario === "preempted";

        if (showCorridors) {
          // 1. OMR (Rajiv Gandhi Salai / SH-49A) - 628 EXACT OSM WAYPOINTS
          const omrPolyline: Polyline = L.polyline(EXACT_OMR_ROAD_GEOMETRY, {
            color: isPreempted ? "#ff4060" : "#00c97a",
            weight: isPreempted ? 5 : 4,
            opacity: isPreempted ? 0.95 : 0.85,
            dashArray: isPreempted ? "8, 6" : undefined,
            lineCap: "round",
            lineJoin: "round",
          });

          omrPolyline.bindTooltip("OMR Rajiv Gandhi Salai (SH-49A) — Exact OSM Road Alignment", {
            sticky: true,
            className: "leaflet-custom-tooltip",
          });
          omrPolyline.addTo(corridorsLayerRef.current);
        }

        if (showRadialArteries) {
          // 2. Anna Salai & GST Road (NH-45) - 814 EXACT OSM WAYPOINTS
          const gstPolyline = L.polyline(EXACT_GST_ANNA_SALAI_GEOMETRY, {
            color: "#4d9fff",
            weight: 3.5,
            opacity: 0.75,
            lineCap: "round",
            lineJoin: "round",
          });
          gstPolyline.bindTooltip("Anna Salai (Mount Rd) & GST Highway (NH-45)", {
            sticky: true,
            className: "leaflet-custom-tooltip",
          });
          gstPolyline.addTo(corridorsLayerRef.current);

          // 3. Sardar Patel Road (Kathipara ↔ Madhya Kailash) - 186 EXACT OSM WAYPOINTS
          const spPolyline = L.polyline(EXACT_SARDAR_PATEL_GEOMETRY, {
            color: "#00c97a",
            weight: 3,
            opacity: 0.7,
            lineCap: "round",
            lineJoin: "round",
          });
          spPolyline.bindTooltip("Sardar Patel Road (Guindy ↔ IIT Madras ↔ Adyar)", {
            sticky: true,
            className: "leaflet-custom-tooltip",
          });
          spPolyline.addTo(corridorsLayerRef.current);

          // 4. 200ft Radial Road (Pallavaram ↔ Thoraipakkam) - 370 EXACT OSM WAYPOINTS
          const radialPolyline = L.polyline(EXACT_RADIAL_200FT_GEOMETRY, {
            color: "#ffab1a",
            weight: 3,
            opacity: 0.7,
            lineCap: "round",
            lineJoin: "round",
          });
          radialPolyline.bindTooltip("200ft Radial Expressway (Pallavaram ↔ Thoraipakkam)", {
            sticky: true,
            className: "leaflet-custom-tooltip",
          });
          radialPolyline.addTo(corridorsLayerRef.current);

          // 5. Velachery Bypass (Kathipara ↔ SRP Tools) - 335 EXACT OSM WAYPOINTS
          const velacheryPolyline = L.polyline(EXACT_VELACHERY_BYPASS_GEOMETRY, {
            color: "#9096a8",
            weight: 2.5,
            opacity: 0.65,
            dashArray: "4, 4",
          });
          velacheryPolyline.bindTooltip("Velachery 100ft Bypass & Taramani Link Rd", {
            sticky: true,
            className: "leaflet-custom-tooltip",
          });
          velacheryPolyline.addTo(corridorsLayerRef.current);

          // 6. Sholinganallur-Medavakkam Link - 236 EXACT OSM WAYPOINTS
          const sholingaCrossPolyline = L.polyline(EXACT_SHOLINGANALLUR_CROSS_GEOMETRY, {
            color: "#ffab1a",
            weight: 2.5,
            opacity: 0.65,
          });
          sholingaCrossPolyline.bindTooltip("Medavakkam - Sholinganallur - ECR Link Road", {
            sticky: true,
            className: "leaflet-custom-tooltip",
          });
          sholingaCrossPolyline.addTo(corridorsLayerRef.current);
        }
      }

      // ── DRAW INTERSECTION MARKERS EXACTLY ON ROAD NODES ──
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();

        chennaiNodes.forEach((node) => {
          const isSelected = node.id === selectedNodeId;
          const statusColor =
            node.status === "preempted"
              ? "#ff4060"
              : node.status === "building"
              ? "#ffab1a"
              : "#00c97a";

          const markerHtml = `
            <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
              ${
                node.status === "preempted"
                  ? `<div class="absolute -inset-2 rounded-full bg-red-500/30 animate-ping"></div>`
                  : ""
              }
              <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#111318] border ${
                isSelected ? "border-[#4d9fff] shadow-[0_0_14px_rgba(77,159,255,0.6)]" : "border-[#2e3140]"
              } text-[#e8eaf0] text-[10px] font-mono whitespace-nowrap">
                <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${statusColor};"></span>
                <span class="font-bold ${isSelected ? "text-[#4d9fff]" : "text-[#e8eaf0]"}">${node.id}</span>
                <span class="text-[9px] text-[#9096a8] border-l border-[#2e3140] pl-1 font-mono">${node.queueLengthM.toFixed(0)}m</span>
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            html: markerHtml,
            className: "custom-leaflet-marker",
            iconSize: [84, 26],
            iconAnchor: [42, 13],
          });

          const marker = L.marker([node.lat, node.lon], { icon: customIcon });

          marker.on("click", () => {
            onSelectNode(node);
          });

          marker.bindTooltip(
            `
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 4px; color: #e8eaf0; background: #111318;">
              <div style="font-weight: bold; color: ${statusColor};">${node.id} · ${node.name}</div>
              <div style="color: #9096a8; font-size: 9px; margin-top: 2px;">${node.zone}</div>
              <div style="margin-top: 4px; display: flex; gap: 8px; font-size: 10px;">
                <span>Queue: <b style="color: #e8eaf0;">${node.queueLengthM.toFixed(1)}m</b></span>
                <span>Arr: <b style="color: #4d9fff;">${node.arrivalRate}</b></span>
              </div>
            </div>
            `,
            {
              direction: "top",
              offset: [0, -12],
              className: "leaflet-node-popup",
            }
          );

          marker.addTo(markersLayerRef.current!);
        });
      }

      // ── ANIMATE EMERGENCY VEHICLE DIRECTLY ALONG EXACT OSM ROAD WAYPOINTS ──
      if (vehicleMarkerRef.current) {
        map.removeLayer(vehicleMarkerRef.current);
        vehicleMarkerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (scenario === "preempted" && showLiveVehicle && EXACT_OMR_ROAD_GEOMETRY.length > 1) {
        const vehicleHtml = `
          <div class="relative flex items-center justify-center cursor-pointer" style="transform: translate(-50%, -50%);">
            <div class="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping"></div>
            <div class="w-6 h-6 rounded-full bg-[#ff4060] border-2 border-white flex items-center justify-center text-[11px] shadow-lg">
              🚑
            </div>
          </div>
        `;

        const vehicleIcon = L.divIcon({
          html: vehicleHtml,
          className: "custom-vehicle-marker",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const vMarker = L.marker(EXACT_OMR_ROAD_GEOMETRY[0], { icon: vehicleIcon, zIndexOffset: 1000 });
        vMarker.bindTooltip("108 EMS Ambulance · Priority #1 (Corridor Speed: 52 km/h)", {
          sticky: true,
          className: "leaflet-custom-tooltip",
        });
        vMarker.addTo(map);
        vehicleMarkerRef.current = vMarker;

        let waypointIndex = 0;
        let progress = 0;
        const totalSegments = EXACT_OMR_ROAD_GEOMETRY.length - 1;

        const animateAmbulance = () => {
          progress += 0.05; // smooth step between micro-waypoints
          if (progress >= 1) {
            progress = 0;
            waypointIndex = (waypointIndex + 1) % totalSegments;
          }

          const p1 = EXACT_OMR_ROAD_GEOMETRY[waypointIndex];
          const p2 = EXACT_OMR_ROAD_GEOMETRY[waypointIndex + 1];

          // Linear interpolation along micro road segment
          const currentLat = p1[0] + (p2[0] - p1[0]) * progress;
          const currentLon = p1[1] + (p2[1] - p1[1]) * progress;

          vMarker.setLatLng([currentLat, currentLon]);

          animFrameRef.current = requestAnimationFrame(animateAmbulance);
        };

        animFrameRef.current = requestAnimationFrame(animateAmbulance);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    isClient,
    chennaiNodes,
    selectedNodeId,
    mapType,
    showCorridors,
    showRadialArteries,
    showLiveVehicle,
    scenario,
    onSelectNode,
  ]);

  const selectedNode = chennaiNodes.find((n) => n.id === selectedNodeId) || chennaiNodes[3];

  const flyToLocation = (lat: number, lon: number, zoomLevel: number = 14) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], zoomLevel, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-[#0c0e12] rounded-2xl overflow-hidden flex flex-col justify-between">
      {/* ── CLEAN DECLUTTERED TOP HUD CONTROLS ───────────────────────────── */}
      <div className="absolute top-3 left-3 z-[400] pointer-events-auto">
        <div className="bg-[#111318]/90 backdrop-blur-md border border-[#2e3140] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#00c97a] animate-pulse" />
          <span className="font-mono text-[11px] font-bold text-[#e8eaf0] tracking-wider uppercase">
            Chennai Arterial Link
          </span>
        </div>
      </div>

      {/* ── UNIFIED STREAMLINED CONTROL DECK (TOP RIGHT) ───────────────────────────── */}
      <div className="absolute top-3 right-3 z-[400] pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#111318]/90 backdrop-blur-md border border-[#2e3140] px-2 py-1.5 rounded-lg shadow-lg text-[10px] font-mono">
          {/* Quick Focus Section */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => flyToLocation(12.955, 80.241, 13.2)}
              className="px-2 py-1 rounded text-[#9096a8] hover:text-[#e8eaf0] hover:bg-[#1c1e24] transition-colors"
              title="Focus on OMR Corridor"
            >
              OMR
            </button>
            <button
              onClick={() => flyToLocation(13.0076, 80.2032, 14.5)}
              className="px-2 py-1 rounded text-[#9096a8] hover:text-[#e8eaf0] hover:bg-[#1c1e24] transition-colors"
              title="Focus on Kathipara Junction"
            >
              Kathipara
            </button>
            <button
              onClick={() => flyToLocation(12.975, 80.23, 12.4)}
              className="px-2 py-1 rounded text-[#9096a8] hover:text-[#e8eaf0] hover:bg-[#1c1e24] transition-colors"
              title="Reset to Full Overview"
            >
              Reset
            </button>
          </div>

          <div className="w-px h-3.5 bg-[#2e3140]" />

          {/* Overlay Layer Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCorridors((p) => !p)}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 ${
                showCorridors
                  ? "bg-[#00c97a]/15 text-[#00c97a] border border-[#00c97a]/30 font-bold"
                  : "text-[#9096a8] hover:text-[#e8eaf0]"
              }`}
              title="Toggle OMR Green Wave Spine"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showCorridors ? "bg-[#00c97a]" : "bg-[#555c70]"}`} />
              <span>OMR</span>
            </button>
            <button
              onClick={() => setShowRadialArteries((p) => !p)}
              className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 ${
                showRadialArteries
                  ? "bg-[#4d9fff]/15 text-[#4d9fff] border border-[#4d9fff]/30 font-bold"
                  : "text-[#9096a8] hover:text-[#e8eaf0]"
              }`}
              title="Toggle Arterial Radial Roads"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showRadialArteries ? "bg-[#4d9fff]" : "bg-[#555c70]"}`} />
              <span>Arteries</span>
            </button>
            {scenario === "preempted" && (
              <button
                onClick={() => setShowLiveVehicle((p) => !p)}
                className={`px-1.5 py-1 rounded transition-all flex items-center ${
                  showLiveVehicle
                    ? "bg-[#ff4060]/20 text-[#ff4060] border border-[#ff4060]/40 font-bold"
                    : "text-[#9096a8] hover:text-[#e8eaf0]"
                }`}
                title="Toggle Live Ambulance Transit"
              >
                <span>🚑</span>
              </button>
            )}
          </div>

          <div className="w-px h-3.5 bg-[#2e3140]" />

          {/* Basemap Switcher */}
          <div className="flex items-center bg-[#0c0e12] rounded p-0.5 border border-[#2e3140]/60">
            <button
              onClick={() => setMapType("dark")}
              className={`px-2 py-0.5 rounded transition-all ${
                mapType === "dark"
                  ? "bg-[#2c2f3a] text-[#e8eaf0] font-bold shadow-sm"
                  : "text-[#9096a8] hover:text-[#e8eaf0]"
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapType("satellite")}
              className={`px-2 py-0.5 rounded transition-all ${
                mapType === "satellite"
                  ? "bg-[#4d9fff]/20 text-[#4d9fff] font-bold shadow-sm"
                  : "text-[#9096a8] hover:text-[#e8eaf0]"
              }`}
            >
              Sat
            </button>
          </div>
        </div>
      </div>

      {/* ── LEAFLET CONTAINER ───────────────────────────── */}
      <div
        ref={mapContainerRef}
        className="w-full h-full flex-1 z-10"
        style={{ minHeight: "460px" }}
      />

      {/* ── BOTTOM HUD TELEMETRY STRIP ───────────────────────────── */}
      <div className="relative z-[400] bg-[#111318]/95 border-t border-[#2e3140] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#9096a8]">Selected Node:</span>
            <span className="font-bold text-[#e8eaf0] bg-[#1c1e24] px-2 py-0.5 rounded border border-[#2e3140]">
              {selectedNode.id} — {selectedNode.name}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[#9096a8]">
            <span>Roadway:</span>
            <span className="text-[#e8eaf0]">{selectedNode.zone}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#9096a8]">GPS Road Position:</span>
            <span className="text-[#4d9fff]">
              {selectedNode.lat.toFixed(5)}° N, {selectedNode.lon.toFixed(5)}° E
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#9096a8]">Approach Queue:</span>
            <span
              className={`font-bold ${
                selectedNode.queueLengthM > 35 ? "text-[#ffab1a]" : "text-[#00c97a]"
              }`}
            >
              {selectedNode.queueLengthM.toFixed(1)}m
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#9096a8]">Phasing Policy:</span>
            <span
              className={`font-bold uppercase ${
                selectedNode.status === "preempted"
                  ? "text-[#ff4060]"
                  : selectedNode.status === "building"
                  ? "text-[#ffab1a]"
                  : "text-[#00c97a]"
              }`}
            >
              {selectedNode.policy}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
