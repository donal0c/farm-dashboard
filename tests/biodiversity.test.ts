import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  haversineKm,
  searchBiodiversityRecords,
} from "../lib/data/biodiversity.ts";

describe("biodiversity sample search", () => {
  it("sorts nearby records and labels the source as sample-backed", () => {
    const result = searchBiodiversityRecords(
      [
        {
          species: "Curlew",
          protected: true,
          lat: 53.51,
          lng: -7.51,
          source: "sample",
        },
        {
          species: "Snipe",
          protected: false,
          lat: 55,
          lng: -10,
          source: "sample",
        },
      ],
      53.5,
      -7.5,
      5,
    );

    assert.equal(result.totalRecords, 1);
    assert.equal(result.protectedCount, 1);
    assert.equal(result.topSpecies[0].species, "Curlew");
    assert.equal(result.source.status, "sample");
  });

  it("computes plausible Irish short distances", () => {
    assert.ok(haversineKm(53.5, -7.5, 53.51, -7.51) < 2);
  });
});
