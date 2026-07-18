import { NextResponse } from "next/server";

import { assertIrishCoordinate, isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { sourceCacheControl } from "@/lib/server/source-cache-policy";
import {
  type FarmForecast,
  fetchOpenMeteoForecast,
  OPEN_METEO_SOURCE,
} from "@/lib/sources/open-meteo";

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
    assertIrishCoordinate({ latitude, longitude });
    return NextResponse.json(
      await fetchOpenMeteoForecast(latitude, longitude),
      {
        headers: { "Cache-Control": sourceCacheControl.forecast },
      },
    );
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<FarmForecast>({
        source: OPEN_METEO_SOURCE,
        scope: "farm",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "The forecast source is temporarily unavailable.",
        confidence: "estimate",
      }),
      { status: 502 },
    );
  }
}
