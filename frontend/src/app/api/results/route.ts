import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
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

    const decLogFull = readJson("dec_log.json");
    const obsLogFull = readJson("obs_log.json");
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

    const data = {
      timestamp: new Date().toISOString(),
      endToEndSummary,
      hypothesisTest: readJson("hypothesis_test_output.json"),
      bottleneckImportances: readJson("bottleneck_importances.json"),
      poissonFit: readJson("poisson_fit_check.json"),
      heapBenchmark: readJson("heap_benchmark.json"),
      artifactsStatus,
      corridorPath: endToEndSummary?.corridor_path ?? ["IX-02", "IX-03", "IX-04"],
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
    };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to read backend results", details: error.message },
      { status: 500 }
    );
  }
}
