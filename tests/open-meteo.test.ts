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
          daily: {
            time: [],
            weather_code: [],
            temperature_2m_max: [],
            temperature_2m_min: [],
            precipitation_sum: [],
            precipitation_probability_max: [],
            wind_gusts_10m_max: [],
          },
        }),
      /no daily forecast rows/,
    );
  });

  it("excludes incomplete rows and labels the snapshot partial", () => {
    const snapshot = normalizeOpenMeteoForecast({
      latitude: 53.4,
      longitude: -7.8,
      timezone: "Europe/Dublin",
      daily: {
        time: ["2026-07-18", "2026-07-19"],
        weather_code: [1, 61],
        temperature_2m_max: [19, 17],
        temperature_2m_min: [10, 9],
        precipitation_sum: [null, 8.2],
        precipitation_probability_max: [20, 80],
        wind_gusts_10m_max: [24, 42],
      },
    });

    assert.equal(snapshot.status, "partial");
    assert.equal(snapshot.data?.days.length, 1);
    assert.equal(snapshot.data?.days[0].rainMm, 8.2);
    assert.match(
      snapshot.warning ?? "",
      /excluded rather than converted to zero/,
    );
  });

  it("treats misaligned source arrays as partial coverage, never zero", () => {
    const snapshot = normalizeOpenMeteoForecast({
      latitude: 53.4,
      longitude: -7.8,
      timezone: "Europe/Dublin",
      daily: {
        time: ["2026-07-18", "2026-07-19"],
        weather_code: [1, 61],
        temperature_2m_max: [19, 17],
        temperature_2m_min: [10, 9],
        precipitation_sum: [0.4],
        precipitation_probability_max: [20, 80],
        wind_gusts_10m_max: [24, 42],
      },
    });

    assert.equal(snapshot.status, "partial");
    assert.deepEqual(
      snapshot.data?.days.map((day) => day.date),
      ["2026-07-18"],
    );
    assert.equal(snapshot.data?.days[0].rainMm, 0.4);
    assert.match(
      snapshot.warning ?? "",
      /excluded rather than converted to zero/,
    );
  });

  it("rejects a forecast when every row is incomplete", () => {
    assert.throws(
      () =>
        normalizeOpenMeteoForecast({
          latitude: 53.4,
          longitude: -7.8,
          timezone: "Europe/Dublin",
          daily: {
            time: ["2026-07-18"],
            weather_code: [1],
            temperature_2m_max: [19],
            temperature_2m_min: [10],
            precipitation_sum: [null],
            precipitation_probability_max: [20],
            wind_gusts_10m_max: [24],
          },
        }),
      /no complete daily forecast rows/,
    );
  });
});
