import { NextResponse } from "next/server";

import { boundingBox, isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { fetchValidated } from "@/lib/server/fetch-validated";
import {
  NITRATES_COLLECTIONS_URL,
  nitratesCatalogueSchema,
  nitratesFeatureCollectionSchema,
  normalizeNitratesSnapshot,
  selectNitratesCollection,
} from "@/lib/sources/nitrates";

let cachedCollection: { id: string; title: string } | null = null;

async function getCurrentCollection() {
  if (cachedCollection) return cachedCollection;

  const { data } = await fetchValidated(`${NITRATES_COLLECTIONS_URL}?f=json`, {
    sourceId: "dafm-nitrates-catalogue",
    schema: nitratesCatalogueSchema,
    timeoutMs: 8_000,
    maxAttempts: 2,
    init: { next: { revalidate: 24 * 60 * 60 } },
  });
  cachedCollection = selectNitratesCollection(data);
  return cachedCollection;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number.parseFloat(searchParams.get("lat") ?? "");
  const longitude = Number.parseFloat(searchParams.get("lng") ?? "");
  const radius = Number.parseFloat(searchParams.get("radius") ?? "0.2");

  if (!isIrishCoordinate({ latitude, longitude })) {
    return NextResponse.json(
      { error: "A valid latitude and longitude in Ireland are required." },
      { status: 400 },
    );
  }

  try {
    const bbox = boundingBox({ latitude, longitude }, radius);
    const collection = await getCurrentCollection();
    const url = new URL(`${NITRATES_COLLECTIONS_URL}/${collection.id}/items`);
    url.searchParams.set("f", "json");
    url.searchParams.set("bbox", bbox.join(","));
    url.searchParams.set("limit", "500");
    url.searchParams.set("skipGeometry", "true");
    url.searchParams.set("properties", "STK_RATE,SDO_GID");

    const { data } = await fetchValidated(url, {
      sourceId: `dafm-nitrates-${collection.id}`,
      schema: nitratesFeatureCollectionSchema,
      timeoutMs: 10_000,
      maxAttempts: 2,
      init: { next: { revalidate: 24 * 60 * 60 } },
    });
    return NextResponse.json(normalizeNitratesSnapshot(data, collection));
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<GeoJSON.FeatureCollection>({
        source: {
          id: "dafm-nitrates",
          label: "DAFM nitrates map",
          url: NITRATES_COLLECTIONS_URL,
        },
        scope: "nearby",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "DAFM nitrates data is temporarily unavailable.",
        confidence: "authoritative",
      }),
      { status: 502 },
    );
  }
}
