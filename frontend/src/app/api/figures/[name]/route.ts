import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const cleanName = name.replace(/\.\./g, "").replace(/\//g, "");
    const fileName = cleanName.endsWith(".png") ? cleanName : `${cleanName}.png`;

    const rootDir = path.resolve(process.cwd(), "..");
    const filePath = path.join(rootDir, "results", "figures", fileName);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Figure not found", { status: 404 });
    }

    const imageBuffer = fs.readFileSync(filePath);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    return new NextResponse("Error reading figure: " + error.message, { status: 500 });
  }
}
