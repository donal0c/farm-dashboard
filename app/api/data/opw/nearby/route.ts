import { NextResponse } from "next/server";

import { isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { fetchValidated } from "@/lib/server/fetch-validated";
import { sourceCacheControl } from "@/lib/server/source-cache-policy";
import {
  type NearbyOpwReading,
  normalizeNearbyOpw,
  OPW_SOURCE,
  rawOpwPayloadSchema,
} from "@/lib/sources/opw";

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
    const { data } = await fetchValidated(
      "https://waterlevel.ie/geojson/latest/",
      {
        sourceId: OPW_SOURCE.id,
        schema: rawOpwPayloadSchema,
        timeoutMs: 10_000,
        maxAttempts: 2,
        init: { next: { revalidate: 15 * 60 } },
      },
    );
    return NextResponse.json(
      normalizeNearbyOpw(data, {
        latitude,
        longitude,
      }),
      { headers: { "Cache-Control": sourceCacheControl.opw } },
    );
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<NearbyOpwReading[]>({
        source: OPW_SOURCE,
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
