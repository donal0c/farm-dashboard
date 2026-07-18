import { NextResponse } from "next/server";

import { boundingBox, isIrishCoordinate } from "@/lib/contracts/geo";
import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";

type WfdStatusData = {
  rivers: GeoJSON.FeatureCollection;
  groundwater: GeoJSON.FeatureCollection;
};

const source = {
  id: "epa-wfd-status-2019-2024",
  label: "EPA WFD status 2019–2024",
  url: "https://gis.epa.ie/geoserver/wfs",
};

function buildWfsUrl(layer: string, bbox: readonly number[]) {
  const url = new URL(source.url);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "1.1.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeName", layer);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("bbox", `${bbox.join(",")},EPSG:4326`);
  url.searchParams.set("maxFeatures", "300");
  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number.parseFloat(searchParams.get("lat") ?? "");
  const longitude = Number.parseFloat(searchParams.get("lng") ?? "");
  const radius = Number.parseFloat(searchParams.get("radius") ?? "1");

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

  try {
    const [riverResponse, groundResponse] = await Promise.all([
      fetch(buildWfsUrl("EPA:WFD_RWBStatus_20192024", bbox), {
        next: { revalidate: 24 * 60 * 60 },
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(buildWfsUrl("EPA:WFD_GWBStatus_20192024", bbox), {
        next: { revalidate: 24 * 60 * 60 },
        signal: AbortSignal.timeout(10_000),
      }),
    ]);
    if (!riverResponse.ok || !groundResponse.ok) {
      throw new Error(
        `EPA WFD returned ${riverResponse.status}/${groundResponse.status}.`,
      );
    }
    const [rivers, groundwater] = (await Promise.all([
      riverResponse.json(),
      groundResponse.json(),
    ])) as [GeoJSON.FeatureCollection, GeoJSON.FeatureCollection];
    const fetchedAt = new Date();
    const snapshot: SourceSnapshot<WfdStatusData> = {
      data: { rivers, groundwater },
      source,
      scope: "nearby",
      status: "live",
      observedAt: null,
      fetchedAt: fetchedAt.toISOString(),
      staleAfter: new Date(
        fetchedAt.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString(),
      warning:
        "WFD classifications describe mapped waterbodies in the search area, not the compliance status of the farm.",
      confidence: "authoritative",
    };
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<WfdStatusData>({
        source,
        scope: "nearby",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "EPA WFD is temporarily unavailable.",
        confidence: "authoritative",
      }),
      { status: 502 },
    );
  }
}
