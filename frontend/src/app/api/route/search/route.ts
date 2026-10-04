import { NextRequest, NextResponse } from "next/server";

// Local verified Chennai Points of Interest & Hospitals with exact surveyed GPS coordinates
const CHENNAI_POIS = [
  { id: "HOSP-01", name: "Apollo Speciality Hospitals OMR", address: "Perungudi, Rajiv Gandhi Salai, Chennai", lat: 12.96325, lon: 80.24572, type: "hospital" },
  { id: "HOSP-02", name: "Gleneagles Global Health City", address: "Perumbakkam, Sholinganallur, Chennai", lat: 12.90550, lon: 80.20800, type: "hospital" },
  { id: "HOSP-03", name: "Fortis Malar Hospital", address: "Adyar, Gandhi Nagar, Chennai", lat: 13.01012, lon: 80.25891, type: "hospital" },
  { id: "HOSP-04", name: "MIOT International Hospital", address: "Manapakkam, Mount-Poonamallee Rd, Chennai", lat: 13.02068, lon: 80.18507, type: "hospital" },
  { id: "HOSP-05", name: "Chettinad Health City", address: "Padur, Rajiv Gandhi Salai (OMR), Chennai", lat: 12.82500, lon: 80.22200, type: "hospital" },
  { id: "HOSP-06", name: "VHS Multispeciality Hospital", address: "Taramani, Rajiv Gandhi Salai, Chennai", lat: 13.00212, lon: 80.24657, type: "hospital" },
  { id: "HOSP-07", name: "Kauvery Hospital", address: "Alwarpet, TTK Road, Chennai", lat: 13.04651, lon: 80.26041, type: "hospital" },
  { id: "HOSP-08", name: "Rajiv Gandhi Govt General Hospital", address: "EVR Periyar Salai, Chennai Central", lat: 13.08153, lon: 80.27751, type: "hospital" },
  { id: "IX-101", name: "Madhya Kailash Junction", address: "Adyar, Sardar Patel Road & Rajiv Gandhi Salai", lat: 13.00666, lon: 80.24603, type: "intersection" },
  { id: "IX-102", name: "TIDEL Park Junction", address: "Thiruvanmiyur / CSIR Road & OMR", lat: 12.98640, lon: 80.25156, type: "intersection" },
  { id: "IX-103", name: "SRP Tools Junction", address: "Perungudi, Rajiv Gandhi Salai", lat: 12.98007, lon: 80.25290, type: "intersection" },
  { id: "IX-104", name: "Sholinganallur Junction", address: "Perumbakkam Main Rd & Rajiv Gandhi Salai", lat: 12.90092, lon: 80.22797, type: "intersection" },
  { id: "IX-105", name: "Kathipara Cloverleaf", address: "Guindy, GST Road & Inner Ring Road", lat: 13.00652, lon: 80.20367, type: "intersection" },
  { id: "IX-108", name: "Chennai Central Station", address: "Poonamallee High Rd & Wall Tax Rd", lat: 13.08186, lon: 80.27625, type: "intersection" },
  { id: "IX-109", name: "Vijayanagar Velachery", address: "Taramani Link Rd & Velachery Rd", lat: 12.97500, lon: 80.22070, type: "intersection" },
  { id: "LOC-01", name: "Guindy Industrial Estate", address: "Guindy, Chennai", lat: 13.0112, lon: 80.2180, type: "place" },
  { id: "LOC-02", name: "Marina Beach", address: "Kamarajar Salai, Triplicane, Chennai", lat: 13.0500, lon: 80.2824, type: "place" },
  { id: "LOC-03", name: "Chennai International Airport (MAA)", address: "GST Road, Meenambakkam, Chennai", lat: 12.9941, lon: 80.1709, type: "place" },
  { id: "LOC-04", name: "Tambaram Sanatorium", address: "GST Road, Tambaram, Chennai", lat: 12.9246, lon: 80.1265, type: "place" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ results: CHENNAI_POIS.slice(0, 8) });
    }

    const lowerQ = q.toLowerCase();

    // 1. First search local database
    const localMatches = CHENNAI_POIS.filter(
      (p) => p.name.toLowerCase().includes(lowerQ) || p.address.toLowerCase().includes(lowerQ)
    );

    // 2. Query TomTom Search API with securely stored server-side API key
    const tomtomKey = process.env.TOMTOM_API_KEY;
    const tomtomResults: any[] = [];

    if (tomtomKey && q.length >= 2) {
      try {
        const queryWithCity = lowerQ.includes("chennai") ? q : `${q} Chennai`;
        const encoded = encodeURIComponent(queryWithCity);
        const url = `https://api.tomtom.com/search/2/search/${encoded}.json?key=${tomtomKey}&lat=12.96&lon=80.24&radius=45000&countrySet=IN&limit=6`;
        
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          for (const item of data.results || []) {
            const name = item.poi?.name || item.address?.freeformAddress || q;
            const address = item.address?.freeformAddress || "Chennai, Tamil Nadu";
            const pos = item.position;
            if (pos && typeof pos.lat === "number" && typeof pos.lon === "number") {
              const isHosp = (item.poi?.categories || []).some((c: string) => c.toLowerCase().includes("hospital") || c.toLowerCase().includes("health")) || name.toLowerCase().includes("hospital");
              tomtomResults.push({
                id: `TT-${item.id || Math.random().toString(36).substr(2, 6)}`,
                name,
                address,
                lat: pos.lat,
                lon: pos.lon,
                type: isHosp ? "hospital" : "place",
              });
            }
          }
        }
      } catch (ttErr) {
        console.warn("[TomTom Location Search Warning]:", ttErr);
      }
    }

    // Merge without duplicates based on name/coords
    const combined = [...localMatches];
    for (const tt of tomtomResults) {
      const exists = combined.some(
        (c) =>
          c.name.toLowerCase() === tt.name.toLowerCase() ||
          (Math.abs(c.lat - tt.lat) < 0.001 && Math.abs(c.lon - tt.lon) < 0.001)
      );
      if (!exists) {
        combined.push(tt);
      }
    }

    return NextResponse.json({ results: combined.slice(0, 10) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}
