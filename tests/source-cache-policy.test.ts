import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sourceCacheControl } from "../lib/server/source-cache-policy.ts";

describe("source response cache policy", () => {
  it("uses short shared-cache windows for operational conditions", () => {
    assert.equal(
      sourceCacheControl.metWarnings,
      "public, s-maxage=600, stale-while-revalidate=300",
    );
    assert.equal(
      sourceCacheControl.opw,
      "public, s-maxage=900, stale-while-revalidate=300",
    );
    assert.equal(
      sourceCacheControl.forecast,
      "public, s-maxage=1800, stale-while-revalidate=900",
    );
  });

  it("uses longer windows for slow-changing published evidence", () => {
    assert.equal(
      sourceCacheControl.lpis,
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    assert.equal(sourceCacheControl.nitrates, sourceCacheControl.lpis);
    assert.equal(sourceCacheControl.epaWfd, sourceCacheControl.lpis);
    assert.equal(sourceCacheControl.geocode, sourceCacheControl.lpis);
    assert.equal(sourceCacheControl.cap, sourceCacheControl.lpis);
    assert.equal(
      sourceCacheControl.cso,
      "public, s-maxage=21600, stale-while-revalidate=86400",
    );
  });
});
