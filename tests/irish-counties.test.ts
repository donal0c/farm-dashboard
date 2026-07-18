import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countyFromGeocode,
  normalizeIrishCounty,
  routingAreaSearchQuery,
  warningRegionsIncludeCounty,
} from "../lib/ireland/counties.ts";
import { normalizeGeocodeResult } from "../lib/sources/geocode.ts";

describe("Irish county normalization", () => {
  it("normalizes authoritative geocoder counties and routing-area fallbacks", () => {
    assert.equal(countyFromGeocode("County Galway", "ATHENRY"), "GALWAY");
    assert.equal(countyFromGeocode(undefined, "DUBLIN 4"), "DUBLIN");
    assert.equal(countyFromGeocode(undefined, "CORK - CROOKSTOWN"), "CORK");
    assert.equal(countyFromGeocode(undefined, "OLDTOWN"), null);
    assert.equal(normalizeIrishCounty("4"), null);
  });

  it("puts county-prefixed routing descriptions in geocoder order", () => {
    assert.equal(
      routingAreaSearchQuery("CORK - CROOKSTOWN"),
      "CROOKSTOWN, CORK",
    );
    assert.equal(routingAreaSearchQuery("DUBLIN 4"), "DUBLIN 4");
  });

  it("maps counties to Met Éireann FIPS warning regions exactly", () => {
    assert.equal(warningRegionsIncludeCounty(["EI10"], "GALWAY"), true);
    assert.equal(warningRegionsIncludeCounty(["EI04"], "GALWAY"), false);
    assert.equal(warningRegionsIncludeCounty(["EI04"], "4"), false);
    assert.equal(warningRegionsIncludeCounty(["County Cork"], "CORK"), true);
  });

  it("carries a validated county through the geocode snapshot", () => {
    const snapshot = normalizeGeocodeResult(
      [
        {
          lat: "53.2744",
          lon: "-9.0491",
          address: { county: "County Galway", region: "Connacht" },
        },
      ],
      "GALWAY",
      new Date("2026-07-18T08:00:00Z"),
    );

    assert.equal(snapshot.data?.county, "GALWAY");
    assert.equal(snapshot.data?.latitude, 53.2744);
  });
});
