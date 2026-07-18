import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeLpisCollection } from "../lib/sources/lpis.ts";

describe("LPIS normalization", () => {
  it("maps the current 2024 schema into stable parcel properties", () => {
    const snapshot = normalizeLpisCollection(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-7.5, 53.5],
                  [-7.4, 53.5],
                  [-7.4, 53.6],
                  [-7.5, 53.5],
                ],
              ],
            },
            properties: {
              PAR_LAB: "parcel-1",
              CROP: "GRASS",
              DIGITISED: 4.2,
              CLAIM_AREA: 4,
              REF_AREA: 4.1,
              COMM_IND: "N",
              ORGANICS: "Y",
              SOURCE_ONLY_FIELD: "must not reach the browser",
            },
          },
        ],
      },
      new Date("2026-07-18T08:00:00.000Z"),
    );

    const properties = snapshot.data?.features[0].properties;
    assert.equal(properties?.parcelId, "parcel-1");
    assert.equal(properties?.digitisedAreaHa, 4.2);
    assert.equal(properties?.organic, true);
    assert.equal(properties?.SOURCE_ONLY_FIELD, undefined);
    assert.match(snapshot.source.label, /2024/);
  });

  it("adds a completeness warning only when the feature cap is reached", () => {
    const collection = (count: number): GeoJSON.FeatureCollection => ({
      type: "FeatureCollection",
      features: Array.from({ length: count }, (_, index) => ({
        type: "Feature",
        id: index,
        geometry: { type: "Point", coordinates: [-8, 53] },
        properties: { PAR_LAB: `parcel-${index}` },
      })),
    });

    assert.doesNotMatch(
      normalizeLpisCollection(collection(499)).warning ?? "",
      /500-feature/,
    );
    assert.match(
      normalizeLpisCollection(collection(500)).warning ?? "",
      /500-feature/,
    );
    assert.match(
      normalizeLpisCollection(collection(501)).warning ?? "",
      /500-feature/,
    );
  });
});
