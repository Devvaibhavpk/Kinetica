import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, imagePath, cameraId = "synthetic_cam" } = body;

    const rootDir = path.resolve(process.cwd(), "..");
    let inputArg = "";
    let tempFilePath: string | null = null;

    if (imageBase64) {
      // Save base64 to a temporary scratch file
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

    let pythonBin = "python3";
    if (fs.existsSync(venvPythonPath)) {
      pythonBin = venvPythonPath;
    } else if (fs.existsSync(venvPythonWin)) {
      pythonBin = venvPythonWin;
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
        // Clean up temp file if created
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
          return resolve(NextResponse.json(jsonResult));
        } catch (e) {
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
