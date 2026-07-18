import { NextResponse } from "next/server";

import { boundingBox, isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { fetchValidated } from "@/lib/server/fetch-validated";
import {
  LPIS_SOURCE,
  lpisPayloadSchema,
  normalizeLpisCollection,
} from "@/lib/sources/lpis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number.parseFloat(searchParams.get("lat") ?? "");
  const longitude = Number.parseFloat(searchParams.get("lng") ?? "");
  const radius = Number.parseFloat(searchParams.get("radius") ?? "0.1");

  if (!isIrishCoordinate({ latitude, longitude })) {
    return NextResponse.json(
      { error: "A valid latitude and longitude in Ireland are required." },
      { status: 400 },
    );
  }

  let bbox: readonly number[];
  try {
    bbox = boundingBox({ latitude, longitude }, radius);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid radius." },
      { status: 400 },
    );
  }

  const url = new URL(`${LPIS_SOURCE.url}/items`);
  url.searchParams.set("f", "json");
  url.searchParams.set("bbox", bbox.join(","));
  url.searchParams.set("limit", "500");

  try {
    const { data } = await fetchValidated(url, {
      sourceId: LPIS_SOURCE.id,
      schema: lpisPayloadSchema,
      timeoutMs: 10_000,
      maxAttempts: 2,
      init: { cache: "no-store" },
    });
    return NextResponse.json(normalizeLpisCollection(data), {
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<GeoJSON.FeatureCollection>({
        source: LPIS_SOURCE,
        scope: "nearby",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "DAFM LPIS is temporarily unavailable.",
        confidence: "authoritative",
      }),
      { status: 502 },
    );
  }
}
