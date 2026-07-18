import { NextResponse } from "next/server";

import { boundingBox, isIrishCoordinate } from "@/lib/contracts/geo";
import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { fetchValidated } from "@/lib/server/fetch-validated";
import { sourceCacheControl } from "@/lib/server/source-cache-policy";
import {
  EPA_WFD_SOURCE,
  normalizeWfdSnapshot,
  type WfdStatusData,
  wfdFeatureCollectionSchema,
} from "@/lib/sources/epa-wfd";

function buildWfsUrl(
  layer: string,
  bbox: readonly number[],
  properties: string[],
) {
  const url = new URL(EPA_WFD_SOURCE.url);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "1.1.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeName", layer);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("bbox", `${bbox.join(",")},EPSG:4326`);
  url.searchParams.set("maxFeatures", "300");
  url.searchParams.set("propertyName", properties.join(","));
  return url;
}

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

  try {
    const [riverResult, groundResult] = await Promise.all([
      fetchValidated(
        buildWfsUrl("EPA:WFD_RWBStatus_20192024", bbox, [
          "European_Code",
          "Name",
          "Status",
          "Period_for_WFD_Status",
        ]),
        {
          sourceId: `${EPA_WFD_SOURCE.id}-rivers`,
          schema: wfdFeatureCollectionSchema,
          timeoutMs: 10_000,
          maxAttempts: 2,
          init: { next: { revalidate: 24 * 60 * 60 } },
        },
      ),
      fetchValidated(
        buildWfsUrl("EPA:WFD_GWBStatus_20192024", bbox, [
          "European_Code",
          "Name",
          "Overall_GW_Status",
          "Period_for_WFD_Status",
        ]),
        {
          sourceId: `${EPA_WFD_SOURCE.id}-groundwater`,
          schema: wfdFeatureCollectionSchema,
          timeoutMs: 10_000,
          maxAttempts: 2,
          init: { next: { revalidate: 24 * 60 * 60 } },
        },
      ),
    ]);
    return NextResponse.json(
      normalizeWfdSnapshot({
        rivers: riverResult.data,
        groundwater: groundResult.data,
      }),
      { headers: { "Cache-Control": sourceCacheControl.epaWfd } },
    );
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<WfdStatusData>({
        source: EPA_WFD_SOURCE,
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
