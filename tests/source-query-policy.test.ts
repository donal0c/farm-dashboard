import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sourceQueryStaleTime } from "../lib/client/source-query-policy.ts";

describe("source query freshness policy", () => {
  it("refreshes fast operational sources at their upstream cache cadence", () => {
    assert.equal(sourceQueryStaleTime.metWarnings, 10 * 60 * 1_000);
    assert.equal(sourceQueryStaleTime.opw, 15 * 60 * 1_000);
    assert.equal(sourceQueryStaleTime.forecast, 30 * 60 * 1_000);
  });

  it("does not repeatedly refetch slow-changing spatial evidence", () => {
    const day = 24 * 60 * 60 * 1_000;
    assert.equal(sourceQueryStaleTime.lpis, day);
    assert.equal(sourceQueryStaleTime.nitrates, day);
    assert.equal(sourceQueryStaleTime.epaWfd, day);
    assert.equal(sourceQueryStaleTime.cap, day);
    assert.equal(sourceQueryStaleTime.cso, 6 * 60 * 60 * 1_000);
  });
});
