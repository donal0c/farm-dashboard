import { NextResponse } from "next/server";

import { boundingBox, isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { LPIS_COLLECTION, normalizeLpisCollection } from "@/lib/sources/lpis";

const source = {
  id: "dafm-lpis-2024",
  label: "DAFM LPIS 2024",
  url: `https://geoapi.opendata.agriculture.gov.ie/shps/collections/${LPIS_COLLECTION}`,
};

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

  const url = new URL(`${source.url}/items`);
  url.searchParams.set("f", "json");
  url.searchParams.set("bbox", bbox.join(","));
  url.searchParams.set("limit", "500");

  try {
    const response = await fetch(url, {
      next: { revalidate: 24 * 60 * 60 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`DAFM LPIS returned ${response.status}.`);
    }
    return NextResponse.json(
      normalizeLpisCollection(
        (await response.json()) as GeoJSON.FeatureCollection,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<GeoJSON.FeatureCollection>({
        source,
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
