import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeNearbyOpw } from "../lib/sources/opw.ts";

describe("OPW nearby readings", () => {
  it("validates, sorts, and scopes raw sensor readings", () => {
    const snapshot = normalizeNearbyOpw(
      {
        features: [
          {
            properties: {
              station_ref: "100",
              station_name: "Far station",
              sensor_ref: "0001",
              datetime: "2026-07-18T08:00:00Z",
              value: "1.23",
            },
            geometry: { type: "Point", coordinates: [-8, 53] },
          },
          {
            properties: {
              station_ref: "200",
              station_name: "Near station",
              sensor_ref: "0001",
              datetime: "2026-07-18T08:05:00Z",
              value: "0.45",
            },
            geometry: { type: "Point", coordinates: [-9.04, 53.28] },
          },
          {
            properties: {
              station_ref: "invalid",
              datetime: "not-a-date",
              value: "bad",
            },
            geometry: { type: "Point", coordinates: [-9.04, 53.28] },
          },
        ],
      },
      { latitude: 53.2744, longitude: -9.0491 },
      new Date("2026-07-18T08:10:00Z"),
    );

    assert.deepEqual(
      snapshot.data?.map((reading) => reading.stationRef),
      ["200", "100"],
    );
    assert.equal(snapshot.data?.[0]?.parameter, "Water level");
    assert.equal(snapshot.data?.[0]?.unit, "m");
    assert.equal(snapshot.scope, "nearby");
    assert.match(snapshot.warning ?? "", /does not infer flood thresholds/);
  });

  it("drops non-level sensors and stations outside the republication range", () => {
    const snapshot = normalizeNearbyOpw(
      {
        features: [
          {
            properties: {
              station_ref: "200",
              station_name: "Temperature sensor",
              sensor_ref: "0003",
              datetime: "2026-07-18T08:00:00Z",
              value: "18.2",
            },
            geometry: { type: "Point", coordinates: [-9.04, 53.28] },
          },
          {
            properties: {
              station_ref: "41001",
              station_name: "Restricted station",
              sensor_ref: "0001",
              datetime: "2026-07-18T08:00:00Z",
              value: "1.2",
            },
            geometry: { type: "Point", coordinates: [-9.05, 53.29] },
          },
        ],
      },
      { latitude: 53.2744, longitude: -9.0491 },
    );

    assert.deepEqual(snapshot.data, []);
  });
});
