import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  loadHistoricalWeather,
  normalizeHistoricalDate,
  parseHistoricalCsv,
} from "../lib/data/met-historical.ts";

describe("Met historical weather parsing", () => {
  it("normalizes Met Eireann date strings", () => {
    assert.equal(normalizeHistoricalDate("1-jan-2024"), "2024-01-01");
    assert.equal(normalizeHistoricalDate("31-dec-2025"), "2025-12-31");
    assert.equal(normalizeHistoricalDate("bad-date"), null);
  });

  it("parses daily climate rows and filters by date range", () => {
    const row = [
      "01-jan-2024",
      "",
      "9.4",
      "",
      "2.1",
      "",
      "",
      "",
      "4.2",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "7.8",
      "",
      "",
      "",
      "12.5",
    ].join(",");
    const csv = ["station metadata", "date,ind,maxtp", row].join("\n");

    assert.deepEqual(parseHistoricalCsv(csv, "2024-01-01", "2024-12-31"), [
      {
        date: "2024-01-01",
        maxTemp: 9.4,
        minTemp: 2.1,
        rainfall: 4.2,
        soilTemp: 7.8,
        smd: 12.5,
      },
    ]);
  });

  it("returns an unavailable payload instead of throwing on timeout", async () => {
    const fetcher = async () => {
      throw new Error("timeout");
    };

    const payload = await loadHistoricalWeather(
      "3904",
      "2024-01-01",
      "2024-12-31",
      fetcher as typeof fetch,
    );
    assert.equal(payload.source.status, "unavailable");
    assert.deepEqual(payload.rows, []);
  });
});
