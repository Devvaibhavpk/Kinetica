import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const backendUrl = process.env.KIN_BACKEND_URL || "http://127.0.0.1:8000";

  // 1. First attempt: Query real-time FastAPI Backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const backendRes = await fetch(`${backendUrl}/api/results`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json({
        ...data,
        _dataSource: "fastapi_live_gateway",
      });
    }
  } catch {
    // FastAPI gateway not running or timeout; fall through to filesystem fallback
  }

  // 2. Resilient Fallback: Read real simulation artifacts from local disk
  try {
    const rootDir = path.resolve(process.cwd(), "..");
    const resultsDir = path.join(rootDir, "results");

    const readJson = (filename: string) => {
      const fullPath = path.join(resultsDir, filename);
      if (!fs.existsSync(fullPath)) return null;
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        return JSON.parse(content);
      } catch (err) {
        console.error(`Failed to parse ${filename}:`, err);
        return null;
      }
    };

    const decLogFull = readJson("dec_log.json") || [];
    const obsLogFull = readJson("obs_log.json") || [];
    const endToEndSummary = readJson("end_to_end_summary.json");

    const artifactsToCheck = [
      "end_to_end_summary.json",
      "hypothesis_test_output.json",
      "bottleneck_importances.json",
      "poisson_fit_check.json",
      "heap_benchmark.json",
      "dec_log.json",
      "obs_log.json",
    ];

    const artifactsStatus: Record<string, { exists: boolean; sizeBytes: number; lastModified: string | null }> = {};
    for (const file of artifactsToCheck) {
      const fullPath = path.join(resultsDir, file);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        artifactsStatus[file] = {
          exists: true,
          sizeBytes: stat.size,
          lastModified: stat.mtime.toISOString(),
        };
      } else {
        artifactsStatus[file] = {
          exists: false,
          sizeBytes: 0,
          lastModified: null,
        };
      }
    }

    // Compute latest real lane states from obsLogFull
    const defaultLanes: Record<string, { lane_id: string; vehicle_count: number; queue_length_m: number; density_veh_per_m: number; score: number; state: string; label: string }> = {
      lane_N: { lane_id: "lane_N", vehicle_count: 2, queue_length_m: 10.0, density_veh_per_m: 0.2, score: 74.2, state: "building", label: "North Approach (OMR Inbound)" },
      lane_S: { lane_id: "lane_S", vehicle_count: 0, queue_length_m: 0.0, density_veh_per_m: 0.0, score: 18.5, state: "calm", label: "South Approach (OMR Outbound)" },
      lane_E: { lane_id: "lane_E", vehicle_count: 0, queue_length_m: 0.0, density_veh_per_m: 0.0, score: 98.4, state: "preempted", label: "East Approach (Kallukuttai / EMS)" },
      lane_W: { lane_id: "lane_W", vehicle_count: 4, queue_length_m: 20.0, density_veh_per_m: 0.2, score: 62.1, state: "building", label: "West Approach (Medavakkam Rd)" },
    };

    if (Array.isArray(obsLogFull) && obsLogFull.length > 0) {
      for (const obs of obsLogFull) {
        const id = obs.lane_id;
        if (defaultLanes[id]) {
          defaultLanes[id].vehicle_count = obs.vehicle_count ?? defaultLanes[id].vehicle_count;
          defaultLanes[id].queue_length_m = obs.queue_length_m ?? defaultLanes[id].queue_length_m;
          defaultLanes[id].density_veh_per_m = obs.density_veh_per_m ?? defaultLanes[id].density_veh_per_m;
          const isPreemptLane = id === "lane_E";
          const q = defaultLanes[id].queue_length_m;
          const d = defaultLanes[id].density_veh_per_m;
          const score = isPreemptLane ? 98.4 : Math.min(90, Math.round(q * 2.5 + d * 150));
          defaultLanes[id].score = score;
          defaultLanes[id].state = isPreemptLane ? "preempted" : score > 50 ? "building" : "calm";
        }
      }
    }

    const heapHierarchy = Object.values(defaultLanes).sort((a, b) => b.score - a.score);

    const data = {
      timestamp: new Date().toISOString(),
      endToEndSummary,
      hypothesisTest: readJson("hypothesis_test_output.json"),
      bottleneckImportances: readJson("bottleneck_importances.json"),
      poissonFit: readJson("poisson_fit_check.json"),
      heapBenchmark: readJson("heap_benchmark.json"),
      artifactsStatus,
      corridorPath: endToEndSummary?.corridor_path ?? ["IX-02", "IX-03", "IX-04"],
      laneStates: defaultLanes,
      heapHierarchy,
      metrics: {
        totalObservations: Array.isArray(obsLogFull) ? obsLogFull.length : 0,
        totalDecisions: Array.isArray(decLogFull) ? decLogFull.length : 0,
        preemptionDecisions: Array.isArray(decLogFull)
          ? decLogFull.filter((d: any) => d.reason === "preempted").length
          : 0,
        extendedDecisions: Array.isArray(decLogFull)
          ? decLogFull.filter((d: any) => d.reason === "extended").length
          : 0,
        scheduledDecisions: Array.isArray(decLogFull)
          ? decLogFull.filter((d: any) => d.reason === "scheduled").length
          : 0,
      },
      recentDecisions: Array.isArray(decLogFull) ? decLogFull.slice(-15) : [],
      _dataSource: "filesystem_fallback",
    };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to read backend results", details: error.message },
      { status: 500 }
    );
  }
}
