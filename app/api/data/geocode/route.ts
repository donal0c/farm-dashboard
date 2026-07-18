import { NextResponse } from "next/server";

import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { routingAreaSearchQuery } from "@/lib/ireland/counties";
import { fetchValidated } from "@/lib/server/fetch-validated";
import {
  GEOCODE_SOURCE,
  nominatimResultsSchema,
  normalizeGeocodeResult,
} from "@/lib/sources/geocode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${routingAreaSearchQuery(q)}, Ireland`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ie");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", "-10.95,55.65,-5.34,51.22");

  try {
    const { data } = await fetchValidated(url, {
      sourceId: GEOCODE_SOURCE.id,
      schema: nominatimResultsSchema,
      timeoutMs: 8_000,
      maxAttempts: 2,
      init: {
        headers: { "User-Agent": "farm-dashboard/0.1" },
        next: { revalidate: 24 * 60 * 60 },
      },
    });
    return NextResponse.json(normalizeGeocodeResult(data, q));
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot({
        source: GEOCODE_SOURCE,
        scope: "regional",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "Routing-area geocoding is temporarily unavailable.",
        confidence: "screening",
      }),
      { status: 502 },
    );
  }
}
