import { z } from "zod";

import { featureCollectionContract } from "../contracts/geojson.ts";
import type { SourceSnapshot } from "../contracts/source-snapshot.ts";

export type WfdStatusData = {
  rivers: GeoJSON.FeatureCollection;
  groundwater: GeoJSON.FeatureCollection;
};

export const EPA_WFD_SOURCE = {
  id: "epa-wfd-status-2019-2024",
  label: "EPA WFD status 2019–2024",
  url: "https://gis.epa.ie/geoserver/wfs",
};

export const wfdFeatureCollectionSchema = featureCollectionContract;
export const wfdStatusDataSchema = z.object({
  rivers: featureCollectionContract,
  groundwater: featureCollectionContract,
});

export function normalizeWfdSnapshot(
  data: WfdStatusData,
  fetchedAt = new Date(),
): SourceSnapshot<WfdStatusData> {
  const fetchedIso = fetchedAt.toISOString();
  return {
    data,
    source: EPA_WFD_SOURCE,
    scope: "nearby",
    status: "live",
    observedAt: null,
    fetchedAt: fetchedIso,
    staleAfter: new Date(
      fetchedAt.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    warning:
      "WFD classifications describe mapped waterbodies in the search area, not the compliance status of the farm.",
    confidence: "authoritative",
  };
}
