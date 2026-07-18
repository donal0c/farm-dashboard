import { NextResponse } from "next/server";

import { isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { type NearbyOpwReading, normalizeNearbyOpw } from "@/lib/sources/opw";

const source = {
  id: "opw-water-levels",
  label: "OPW waterlevel.ie",
  url: "https://waterlevel.ie/",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number.parseFloat(searchParams.get("lat") ?? "");
  const longitude = Number.parseFloat(searchParams.get("lng") ?? "");
  if (!isIrishCoordinate({ latitude, longitude })) {
    return NextResponse.json(
      { error: "A valid latitude and longitude in Ireland are required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch("https://waterlevel.ie/geojson/latest/", {
      next: { revalidate: 15 * 60 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`OPW water levels returned ${response.status}.`);
    }
    return NextResponse.json(
      normalizeNearbyOpw((await response.json()) as { features?: [] }, {
        latitude,
        longitude,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<NearbyOpwReading[]>({
        source,
        scope: "nearby",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "OPW water levels are temporarily unavailable.",
        confidence: "authoritative",
      }),
      { status: 502 },
    );
  }
}
