import { NextResponse } from "next/server";

import { boundingBox, isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";

const COLLECTIONS_URL =
  "https://geoapi.opendata.agriculture.gov.ie/nitrates/collections";
let cachedCollection: { id: string; title: string } | null = null;

async function getCurrentCollection() {
  if (cachedCollection) return cachedCollection;

  const response = await fetch(`${COLLECTIONS_URL}?f=json`, {
    next: { revalidate: 24 * 60 * 60 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`DAFM nitrates catalogue returned ${response.status}.`);
  }
  const payload = (await response.json()) as {
    collections?: Array<{ id: string; title?: string }>;
  };
  const collection = payload.collections?.find((item) =>
    /nitrate|derogation/i.test(`${item.id} ${item.title ?? ""}`),
  );
  if (!collection) {
    throw new Error("No current DAFM nitrates collection was found.");
  }
  cachedCollection = {
    id: collection.id,
    title: collection.title ?? "DAFM nitrates map",
  };
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
    const url = new URL(`${COLLECTIONS_URL}/${collection.id}/items`);
    url.searchParams.set("f", "json");
    url.searchParams.set("bbox", bbox.join(","));
    url.searchParams.set("limit", "500");

    const response = await fetch(url, {
      next: { revalidate: 24 * 60 * 60 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`DAFM nitrates map returned ${response.status}.`);
    }
    const data = (await response.json()) as GeoJSON.FeatureCollection;
    const fetchedAt = new Date();
    return NextResponse.json({
      data,
      source: {
        id: `dafm-nitrates-${collection.id}`,
        label: collection.title,
        url: `${COLLECTIONS_URL}/${collection.id}`,
      },
      scope: "nearby",
      status: "live",
      observedAt: null,
      fetchedAt: fetchedAt.toISOString(),
      staleAfter: new Date(
        fetchedAt.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString(),
      warning:
        "This is a national screening layer. Confirm the current holding and field rules in official DAFM guidance.",
      confidence: "authoritative",
    });
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<GeoJSON.FeatureCollection>({
        source: {
          id: "dafm-nitrates",
          label: "DAFM nitrates map",
          url: COLLECTIONS_URL,
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
