import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${q}, Ireland`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "farm-dashboard/0.1",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "geocode failed" }, { status: 502 });
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string }>;

  if (!data.length) {
    return NextResponse.json({ error: "no location found" }, { status: 404 });
  }

  return NextResponse.json({
    latitude: Number.parseFloat(data[0].lat),
    longitude: Number.parseFloat(data[0].lon),
  });
}
