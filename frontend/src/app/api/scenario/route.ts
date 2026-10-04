import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.KIN_BACKEND_URL || "http://127.0.0.1:8000";

  // 1. Attempt triggering via FastAPI asynchronous backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for full pipeline

    let reqBody = {};
    try {
      reqBody = await req.json();
    } catch {
      // empty
    }

    const fastApiRes = await fetch(`${backendUrl}/api/scenario/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (fastApiRes.ok) {
      const data = await fastApiRes.json();
      return NextResponse.json({
        ...data,
        _triggerMode: "fastapi_async",
      });
    }
  } catch {
    // FastAPI unreachable or timed out; fall through to local script execution
  }

  // 2. Resilient Fallback: Execute local python runner
  try {
    const rootDir = path.resolve(process.cwd(), "..");

    const venvPythonPath = path.join(rootDir, ".venv", "bin", "python");
    const venvPythonWin = path.join(rootDir, ".venv", "Scripts", "python.exe");

    let pythonBin = "python";
    if (fs.existsSync(venvPythonWin)) {
      pythonBin = venvPythonWin;
    } else if (fs.existsSync(venvPythonPath)) {
      pythonBin = venvPythonPath;
    } else if (fs.existsSync("C:\\Python312\\python.exe")) {
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
              _triggerMode: "cli_fallback",
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
