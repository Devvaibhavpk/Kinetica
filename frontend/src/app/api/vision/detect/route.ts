import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, imagePath, cameraId = "CAM-01" } = body;

    const backendUrl = process.env.KIN_BACKEND_URL || "http://127.0.0.1:8000";

    // 1. Attempt high-speed inference via FastAPI warm-memory backend
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const payload = {
        image: imageBase64 || null,
        image_path: imagePath || null,
        camera_id: cameraId,
        conf_threshold: 0.28,
        allow_all: false,
      };

      const fastApiRes = await fetch(`${backendUrl}/api/detect_frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (fastApiRes.ok) {
        const detectionData = await fastApiRes.json();
        return NextResponse.json({
          ...detectionData,
          _engine: "fastapi_yolo_warm",
        });
      }
    } catch {
      // FastAPI backend unreachable or timeout; fallback to cold-start CLI runner
    }

    // 2. Resilient Fallback: Execute local python CLI
    const rootDir = path.resolve(process.cwd(), "..");
    let inputArg = "";
    let tempFilePath: string | null = null;

    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      tempFilePath = path.join(process.cwd(), "public", `temp_infer_${Date.now()}.jpg`);
      fs.writeFileSync(tempFilePath, buffer);
      inputArg = tempFilePath;
    } else if (imagePath) {
      const candidates = [
        imagePath,
        path.join(rootDir, imagePath),
        path.join(process.cwd(), "public", imagePath.replace(/^\//, "")),
        path.join(rootDir, "frontend", "public", imagePath.replace(/^\//, "")),
      ];

      const found = candidates.find((c) => fs.existsSync(c));
      inputArg = found || path.join(rootDir, imagePath);
    } else {
      return NextResponse.json({ error: "Missing imageBase64 or imagePath" }, { status: 400 });
    }

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
      const pyProcess = spawn(pythonBin, ["-m", "vision.infer_json", inputArg, cameraId], {
        cwd: rootDir,
        shell: false,
        env: {
          ...process.env,
          PYTHONPATH: rootDir,
        },
      });

      let stdoutData = "";
      let stderrData = "";

      pyProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      pyProcess.on("close", (code) => {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch {
            // ignore
          }
        }

        if (code !== 0) {
          return resolve(
            NextResponse.json(
              { error: "Inference script failed", details: stderrData, code },
              { status: 500 }
            )
          );
        }

        try {
          const jsonResult = JSON.parse(stdoutData.trim());
          return resolve(NextResponse.json({ ...jsonResult, _engine: "cli_fallback" }));
        } catch {
          return resolve(
            NextResponse.json(
              { error: "Failed to parse inference output", raw: stdoutData, stderr: stderrData },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
