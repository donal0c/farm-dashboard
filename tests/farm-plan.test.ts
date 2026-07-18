import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  complianceActionForEnterprise,
  enterpriseMarketSignal,
  weatherActionForEnterprise,
} from "../lib/farm-plan.ts";

describe("farm-specific planning copy", () => {
  it("prioritizes dairy market signals differently from tillage", () => {
    assert.match(enterpriseMarketSignal("dairy"), /milk index/);
    assert.match(enterpriseMarketSignal("tillage"), /cereal exports/);
  });

  it("turns weather signals into enterprise and focus-specific actions", () => {
    assert.match(
      weatherActionForEnterprise("tillage", "spraying", {
        rainMm: 4,
        windKts: 14,
        soilTemp: 8,
      }),
      /Delay spraying/,
    );
    assert.match(
      weatherActionForEnterprise("dairy", "grazing", {
        rainMm: 4,
        windKts: 5,
        soilTemp: 7,
      }),
      /grass growth/,
    );
  });

  it("makes compliance advice stricter for compliance-focused weeks", () => {
    assert.match(
      complianceActionForEnterprise("mixed", "compliance", {
        goodHighShare: 75,
      }),
      /nitrate zone/,
    );
  });
});
