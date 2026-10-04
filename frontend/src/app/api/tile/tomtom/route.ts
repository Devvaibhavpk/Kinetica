import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const z = searchParams.get("z");
    const x = searchParams.get("x");
    const y = searchParams.get("y");
    const type = searchParams.get("type") || "basic"; // "basic" or "flow"

    if (!z || !x || !y) {
      return new NextResponse("Missing tile coordinates (z, x, y)", { status: 400 });
    }

    const apiKey = process.env.TOMTOM_API_KEY;
    if (!apiKey) {
      return new NextResponse("TomTom API key not configured on server", { status: 500 });
    }

    let tomtomUrl: string;
    if (type === "flow") {
      // TomTom Real-time Traffic Flow tile
      tomtomUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png?key=${apiKey}`;
    } else {
      // TomTom Base Map tile
      tomtomUrl = `https://api.tomtom.com/map/1/tile/basic/main/${z}/${x}/${y}.png?key=${apiKey}`;
    }

    const res = await fetch(tomtomUrl, {
      headers: { "User-Agent": "Kinetica-Traffic-Server/1.0" },
      next: { revalidate: type === "flow" ? 15 : 86400 }, // Cache traffic flow for 15s, base tiles for 24h
    });

    if (!res.ok) {
      return new NextResponse(`TomTom upstream error: ${res.statusText}`, { status: res.status });
    }

    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": type === "flow" ? "public, max-age=15" : "public, max-age=86400, immutable",
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || "Tile fetch failure", { status: 500 });
  }
}
