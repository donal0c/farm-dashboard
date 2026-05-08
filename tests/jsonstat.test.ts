import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeJsonStat, parseYear } from "../lib/cso/jsonstat.ts";

describe("JSON-stat decoding", () => {
  it("expands array and object category indexes in row order", () => {
    const rows = decodeJsonStat({
      id: ["time", "region"],
      size: [2, 2],
      dimension: {
        time: {
          category: {
            index: ["2023", "2024"],
            label: { "2023": "2023", "2024": "2024" },
          },
        },
        region: {
          category: {
            index: { IE: 0, WEST: 1 },
            label: { IE: "State", WEST: "West" },
          },
        },
      },
      value: [10, null, 30, 40],
    });

    assert.deepEqual(rows, [
      {
        value: 10,
        time: "2023",
        time_label: "2023",
        region: "IE",
        region_label: "State",
      },
      {
        value: 30,
        time: "2024",
        time_label: "2024",
        region: "IE",
        region_label: "State",
      },
      {
        value: 40,
        time: "2024",
        time_label: "2024",
        region: "WEST",
        region_label: "West",
      },
    ]);
  });

  it("normalizes annual, monthly, and quarterly period codes to years", () => {
    assert.equal(parseYear("2024"), 2024);
    assert.equal(parseYear("202401"), 2024);
    assert.equal(parseYear("20241"), 2024);
    assert.ok(Number.isNaN(parseYear("latest")));
  });
});
