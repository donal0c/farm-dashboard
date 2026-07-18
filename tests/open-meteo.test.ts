import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeOpenMeteoForecast } from "../lib/sources/open-meteo.ts";

describe("Open-Meteo forecast contract", () => {
  it("preserves units, source scope, and freshness", () => {
    const fetchedAt = new Date("2026-07-18T08:00:00.000Z");
    const snapshot = normalizeOpenMeteoForecast(
      {
        latitude: 53.4,
        longitude: -7.8,
        timezone: "Europe/Dublin",
        daily: {
          time: ["2026-07-18", "2026-07-19"],
          weather_code: [1, 61],
          temperature_2m_max: [19, 17],
          temperature_2m_min: [10, 9],
          precipitation_sum: [0.4, 8.2],
          precipitation_probability_max: [20, 80],
          wind_gusts_10m_max: [24, 42],
        },
      },
      fetchedAt,
    );

    assert.equal(snapshot.status, "live");
    assert.equal(snapshot.scope, "farm");
    assert.equal(snapshot.confidence, "estimate");
    assert.equal(snapshot.data?.days[1].rainMm, 8.2);
    assert.equal(snapshot.staleAfter, "2026-07-18T08:45:00.000Z");
  });

  it("rejects an empty forecast instead of treating it as zero", () => {
    assert.throws(
      () =>
        normalizeOpenMeteoForecast({
          latitude: 53.4,
          longitude: -7.8,
          timezone: "Europe/Dublin",
          daily: { time: [] },
        }),
      /no daily forecast rows/,
    );
  });
});
