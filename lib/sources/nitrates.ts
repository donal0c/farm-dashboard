import { z } from "zod";

import { featureCollectionContract } from "../contracts/geojson.ts";
import type { SourceSnapshot } from "../contracts/source-snapshot.ts";

export const NITRATES_COLLECTIONS_URL =
  "https://geoapi.opendata.agriculture.gov.ie/nitrates/collections";

export const nitratesCatalogueSchema = z.object({
  collections: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().optional(),
    }),
  ),
});

export const nitratesFeatureCollectionSchema = featureCollectionContract.refine(
  (collection) =>
    collection.features.every((feature) => {
      const rate = feature.properties?.STK_RATE;
      return rate === undefined || typeof rate === "string";
    }),
  "Nitrates stocking-rate labels must be strings.",
);

export type NitratesCollection = { id: string; title: string };

export function selectNitratesCollection(
  payload: z.infer<typeof nitratesCatalogueSchema>,
): NitratesCollection {
  const collection = payload.collections.find((item) =>
    /nitrate|derogation/i.test(`${item.id} ${item.title ?? ""}`),
  );
  if (!collection) {
    throw new Error("No current DAFM nitrates collection was found.");
  }
  return {
    id: collection.id,
    title: collection.title ?? "DAFM nitrates map",
  };
}

export function normalizeNitratesSnapshot(
  data: GeoJSON.FeatureCollection,
  collection: NitratesCollection,
  fetchedAt = new Date(),
): SourceSnapshot<GeoJSON.FeatureCollection> {
  const fetchedIso = fetchedAt.toISOString();
  return {
    data,
    source: {
      id: `dafm-nitrates-${collection.id}`,
      label: collection.title,
      url: `${NITRATES_COLLECTIONS_URL}/${collection.id}`,
    },
    scope: "nearby",
    status: "live",
    observedAt: null,
    fetchedAt: fetchedIso,
    staleAfter: new Date(
      fetchedAt.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    warning:
      "This compact response reports labels from intersecting map features without redistributing their large geometries. Confirm current holding and field rules in official DAFM guidance.",
    confidence: "authoritative",
  };
}
