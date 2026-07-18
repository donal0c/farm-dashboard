import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  capCountyAggregateSchema,
  capRowsSchema,
} from "../lib/contracts/cap.ts";
import { geoJsonFeatureCollectionSchema } from "../lib/contracts/geojson.ts";
import { jsonStatDatasetSchema } from "../lib/cso/jsonstat.ts";
import {
  wfdFeatureCollectionSchema,
  wfdStatusDataSchema,
} from "../lib/sources/epa-wfd.ts";
import {
  geocodedFarmAreaSchema,
  nominatimResultsSchema,
} from "../lib/sources/geocode.ts";
import {
  metWarningsSchema,
  rawMetWarningsSchema,
} from "../lib/sources/met-warnings.ts";
import {
  nitratesCatalogueSchema,
  nitratesFeatureCollectionSchema,
} from "../lib/sources/nitrates.ts";
import {
  farmForecastSchema,
  openMeteoPayloadSchema,
} from "../lib/sources/open-meteo.ts";
import {
  nearbyOpwReadingsSchema,
  rawOpwPayloadSchema,
} from "../lib/sources/opw.ts";

const pointCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "feature-1",
      geometry: { type: "Point", coordinates: [-8, 53] },
      properties: { status: "Good" },
    },
  ],
};

describe("priority source schemas", () => {
  it("accepts known-good upstream fixtures for every priority source", () => {
    const forecast = {
      latitude: 53,
      longitude: -8,
      timezone: "Europe/Dublin",
      daily: {
        time: ["2026-07-18"],
        weather_code: [1],
        temperature_2m_max: [18],
        temperature_2m_min: [9],
        precipitation_sum: [1.2],
        precipitation_probability_max: [30],
        wind_gusts_10m_max: [24],
      },
    };
    assert.equal(openMeteoPayloadSchema.safeParse(forecast).success, true);
    assert.equal(
      farmForecastSchema.safeParse({
        timezone: "Europe/Dublin",
        latitude: 53,
        longitude: -8,
        days: [
          {
            date: "2026-07-18",
            weatherCode: 1,
            temperatureMaxC: 18,
            temperatureMinC: 9,
            rainMm: 1.2,
            precipitationProbability: 30,
            windGustKph: 24,
          },
        ],
      }).success,
      true,
    );

    assert.equal(
      rawMetWarningsSchema.safeParse([
        {
          id: "warning-1",
          level: "Yellow",
          headline: "Rain warning for Leinster",
          onset: "2026-07-18T12:00:00Z",
          expiry: "2026-07-18T18:00:00Z",
        },
      ]).success,
      true,
    );
    assert.equal(
      metWarningsSchema.safeParse([
        {
          id: "warning-1",
          level: "Yellow",
          headline: "Rain warning for Leinster",
          description: "",
          issuedAt: "2026-07-18T11:00:00.000Z",
          regions: ["Leinster"],
          startsAt: "2026-07-18T12:00:00.000Z",
          expiresAt: "2026-07-18T18:00:00.000Z",
        },
      ]).success,
      true,
    );

    assert.equal(
      geoJsonFeatureCollectionSchema.safeParse(pointCollection).success,
      true,
    );
    assert.equal(
      nitratesCatalogueSchema.safeParse({
        collections: [{ id: "nitrates", title: "Nitrates derogation" }],
      }).success,
      true,
    );
    assert.equal(
      nitratesFeatureCollectionSchema.safeParse(pointCollection).success,
      true,
    );
    assert.equal(
      rawOpwPayloadSchema.safeParse({
        features: [
          {
            properties: {
              station_ref: "41001",
              station_name: "Test station",
              sensor_ref: "0001",
              datetime: "2026-07-18T12:00:00Z",
              value: "1.23",
            },
            geometry: { type: "Point", coordinates: [-8, 53] },
          },
        ],
      }).success,
      true,
    );
    assert.equal(
      nearbyOpwReadingsSchema.safeParse([
        {
          stationRef: "41001",
          stationName: "Test station",
          sensorRef: "0001",
          parameter: "Water level",
          unit: "m",
          observedAt: "2026-07-18T12:00:00Z",
          value: 1.23,
          distanceKm: 2.4,
          latitude: 53,
          longitude: -8,
          csvFile: null,
        },
      ]).success,
      true,
    );

    assert.equal(
      capRowsSchema.safeParse([{ co: "Galway", y: "2024", z: 1000 }]).success,
      true,
    );
    assert.equal(
      capCountyAggregateSchema.safeParse({
        county: "Galway",
        beneficiaries: 2,
        totalPayment: 1000,
      }).success,
      true,
    );
    assert.equal(
      nominatimResultsSchema.safeParse([
        {
          lat: "53.27",
          lon: "-9.05",
          address: { county: "County Galway", region: "Connacht" },
        },
      ]).success,
      true,
    );
    assert.equal(
      geocodedFarmAreaSchema.safeParse({
        latitude: 53.27,
        longitude: -9.05,
        county: "GALWAY",
      }).success,
      true,
    );

    assert.equal(
      wfdFeatureCollectionSchema.safeParse(pointCollection).success,
      true,
    );
    assert.equal(
      wfdStatusDataSchema.safeParse({
        rivers: pointCollection,
        groundwater: pointCollection,
      }).success,
      true,
    );
    assert.equal(
      jsonStatDatasetSchema.safeParse({
        class: "dataset",
        id: ["TIME"],
        size: [2],
        dimension: {
          TIME: { category: { index: ["2025", "2026"] } },
        },
        value: [10, null],
      }).success,
      true,
    );
  });

  it("rejects missing and misaligned forecast arrays", () => {
    assert.equal(
      openMeteoPayloadSchema.safeParse({
        latitude: 53,
        longitude: -8,
        timezone: "Europe/Dublin",
        daily: { time: ["2026-07-18"] },
      }).success,
      false,
    );
    assert.equal(
      openMeteoPayloadSchema.safeParse({
        latitude: "53",
        longitude: -8,
        timezone: "Europe/Dublin",
        daily: {},
      }).success,
      false,
    );
  });

  it("rejects warning scalar and date drift", () => {
    assert.equal(
      rawMetWarningsSchema.safeParse([{ headline: 4, expiry: "not-a-date" }])
        .success,
      false,
    );
  });

  it("rejects invalid GeoJSON type and non-finite geometry", () => {
    assert.equal(
      geoJsonFeatureCollectionSchema.safeParse({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [null, -8] },
            properties: {},
          },
        ],
      }).success,
      false,
    );
    assert.equal(
      nitratesFeatureCollectionSchema.safeParse({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: null,
            properties: { STK_RATE: 220 },
          },
        ],
      }).success,
      false,
    );
  });

  it("validates catalogue, OPW, CAP, and geocode scalar types", () => {
    assert.equal(
      nitratesCatalogueSchema.safeParse({ collections: [{ id: 7 }] }).success,
      false,
    );
    assert.equal(
      rawOpwPayloadSchema.safeParse({
        features: [{ geometry: { coordinates: ["-8", 53] } }],
      }).success,
      false,
    );
    assert.equal(capRowsSchema.safeParse([{ co: 3, z: 10 }]).success, false);
    assert.equal(
      nominatimResultsSchema.safeParse([{ lat: 53, lon: "-8" }]).success,
      false,
    );
  });

  it("rejects JSON-stat shape and value-length drift", () => {
    assert.equal(
      jsonStatDatasetSchema.safeParse({
        class: "dataset",
        id: ["TIME"],
        size: [2],
        dimension: {
          TIME: { category: { index: ["2025", "2026"] } },
        },
        value: [1],
      }).success,
      false,
    );
  });
});
