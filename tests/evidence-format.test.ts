import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatEuroMillions,
  formatPublishedReference,
  formatSourceState,
  humanizeWaterbodyName,
} from "../lib/evidence-format.ts";

describe("supporting evidence formatting", () => {
  it("uses compact billions without losing million-scale precision", () => {
    assert.equal(formatEuroMillions(14_020), "€14.0bn");
    assert.equal(formatEuroMillions(1_450), "€1.5bn");
    assert.equal(formatEuroMillions(842.4), "€842m");
    assert.equal(formatEuroMillions(14.04), "€14m");
  });

  it("keeps raw source identifiers secondary and traceable", () => {
    assert.equal(
      formatPublishedReference("IE_EA_G_01234567890123456789", "Code"),
      "Code …0123456789",
    );
    assert.equal(formatPublishedReference("IE_WB_17", "Code"), "Code IE_WB_17");
    assert.equal(formatPublishedReference("", "Code"), "Code not published");
  });

  it("replaces source placeholders with honest human descriptions", () => {
    assert.equal(
      humanizeWaterbodyName("", "River"),
      "River waterbody without a published name",
    );
    assert.equal(
      humanizeWaterbodyName("Unnamed groundwater body", "Groundwater"),
      "Groundwater body without a published name",
    );
    assert.equal(
      humanizeWaterbodyName("River Corrib", "River"),
      "River Corrib",
    );
  });

  it("presents machine source states as readable labels", () => {
    assert.equal(formatSourceState("live"), "Live");
    assert.equal(formatSourceState("cached"), "Cached");
    assert.equal(formatSourceState(undefined), "Checking");
  });
});
