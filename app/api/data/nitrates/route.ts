import { NextResponse } from "next/server";

let cachedCollectionId: string | null = null;

async function getCollectionId() {
  if (cachedCollectionId) {
    return cachedCollectionId;
  }

  const response = await fetch(
    "https://geoapi.opendata.agriculture.gov.ie/nitrates/collections?f=json",
    {
      next: { revalidate: 60 * 60 },
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    collections?: Array<{ id: string }>;
  };

  cachedCollectionId = payload.collections?.[0]?.id ?? null;
  return cachedCollectionId;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "");
  const radius = Number.parseFloat(searchParams.get("radius") ?? "0.2");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 },
    );
  }

  const collectionId = await getCollectionId();
  if (!collectionId) {
    return NextResponse.json(
      { error: "nitrates collection unavailable" },
      { status: 502 },
    );
  }

  const minLng = lng - radius;
  const minLat = lat - radius;
  const maxLng = lng + radius;
  const maxLat = lat + radius;

  const url = new URL(
    `https://geoapi.opendata.agriculture.gov.ie/nitrates/collections/${collectionId}/items`,
  );
  url.searchParams.set("f", "json");
  url.searchParams.set("bbox", `${minLng},${minLat},${maxLng},${maxLat}`);
  url.searchParams.set("limit", "500");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json(
      { error: "nitrates fetch failed" },
      { status: 502 },
    );
  }

  const featureCollection = await response.json();
  return NextResponse.json(featureCollection);
}
