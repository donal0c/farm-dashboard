import { NextResponse } from "next/server";

const LPIS_COLLECTION = "anonymous-lpis-and-n-p-for-2020_parcels";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "");
  const radius = Number.parseFloat(searchParams.get("radius") ?? "0.1");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  }

  const minLng = lng - radius;
  const minLat = lat - radius;
  const maxLng = lng + radius;
  const maxLat = lat + radius;

  const url = new URL(
    `https://geoapi.opendata.agriculture.gov.ie/shps/collections/${LPIS_COLLECTION}/items`,
  );
  url.searchParams.set("f", "json");
  url.searchParams.set("bbox", `${minLng},${minLat},${maxLng},${maxLat}`);
  url.searchParams.set("limit", "500");

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json({ error: "LPIS fetch failed" }, { status: 502 });
  }

  const featureCollection = await response.json();
  return NextResponse.json(featureCollection);
}
