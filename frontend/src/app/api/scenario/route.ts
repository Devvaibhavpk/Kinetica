import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const rootDir = path.resolve(process.cwd(), "..");

    let pythonBin = "python";
    if (fs.existsSync("C:\\Python312\\python.exe")) {
      pythonBin = "C:\\Python312\\python.exe";
    }

    return new Promise<NextResponse>((resolve) => {
      const child = spawn(pythonBin, ["run_end_to_end.py"], {
        cwd: rootDir,
        shell: false,
        env: {
          ...process.env,
          PYTHONPATH: rootDir,
        },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          const summaryPath = path.join(rootDir, "results", "end_to_end_summary.json");
          let summary = null;
          if (fs.existsSync(summaryPath)) {
            try {
              summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
            } catch {
              // ignore
            }
          }
          resolve(
            NextResponse.json({
              success: true,
              message: "End-to-end simulation completed successfully",
              stdout,
              summary,
            })
          );
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "Simulation execution failed",
                details: stderr || stdout,
                code,
              },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error triggering scenario", details: err.message },
      { status: 500 }
    );
  }
}
