import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadExportsPayload, parseExportCsv } from "../lib/data/exports.ts";

describe("DAFM export parsing", () => {
  it("parses the current wide CSV shape with quoted categories", () => {
    const csv = [
      ",CY_2024_value,CY_2024_Tonnes,CY_2025_value,CY_2025_Tonnes",
      '"Coffee, Tea, Cocoa & Spices",544270116,72503,623005882,63570',
    ].join("\n");

    assert.deepEqual(parseExportCsv(csv), [
      {
        category: "Coffee, Tea, Cocoa & Spices",
        year: 2024,
        amountEur: 544270116,
        quantityTonnes: 72503,
      },
      {
        category: "Coffee, Tea, Cocoa & Spices",
        year: 2025,
        amountEur: 623005882,
        quantityTonnes: 63570,
      },
    ]);
  });

  it("falls back to a bundled extract when upstream fetching fails", async () => {
    const fetcher = async () => {
      throw new Error("network timeout");
    };

    const payload = await loadExportsPayload(fetcher as typeof fetch);
    assert.equal(payload.source.status, "fallback");
    assert.ok(payload.rows.some((row) => row.category === "Dairy Produce"));
  });
});
