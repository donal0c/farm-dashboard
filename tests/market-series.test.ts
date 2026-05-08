import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectYears,
  latestValue,
  sumByPeriodLabel,
  sumByYear,
} from "../lib/data/market-series.ts";

describe("market series helpers", () => {
  const rows = [
    {
      value: 10,
      STATISTIC: "A",
      region: "IE",
      time: "2023",
      time_label: "2023",
    },
    {
      value: 15,
      STATISTIC: "A",
      region: "IE",
      time: "202401",
      time_label: "Jan 2024",
    },
    {
      value: 20,
      STATISTIC: "B",
      region: "IE",
      time: "202401",
      time_label: "Jan 2024",
    },
  ];

  it("collects years across annual and monthly period codes", () => {
    assert.deepEqual(collectYears(rows, "time"), [2023, 2024]);
  });

  it("filters and sums by year", () => {
    assert.deepEqual(sumByYear(rows, "time", { STATISTIC: "A" }, 2023, 2024), [
      { year: 2023, value: 10 },
      { year: 2024, value: 15 },
    ]);
  });

  it("sums by display period label for chart axes", () => {
    assert.deepEqual(
      sumByPeriodLabel(rows, "time", { STATISTIC: "A" }, 2024, 2024),
      [{ label: "Jan 2024", value: 15 }],
    );
  });

  it("returns zero for missing latest values", () => {
    assert.equal(latestValue([]), 0);
  });
});
