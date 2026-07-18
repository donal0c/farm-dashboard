import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  daysUntil,
  upcomingComplianceItems,
} from "../lib/compliance/calendar.ts";

describe("compliance calendar filtering", () => {
  it("keeps today's deadline and excludes expired dates", () => {
    const now = new Date("2026-07-18T12:00:00+01:00");
    assert.equal(daysUntil("2026-07-18", now), 1);
    const result = upcomingComplianceItems(
      [
        { id: "expired", date: "2026-07-17" },
        { id: "today", date: "2026-07-18" },
        { id: "future", date: "2026-07-20" },
      ],
      now,
    );
    assert.deepEqual(
      result.map((item) => item.id),
      ["today", "future"],
    );
  });

  it("uses a stable id tie-break for equal dates", () => {
    const result = upcomingComplianceItems(
      [
        { id: "b", date: "2026-07-20" },
        { id: "a", date: "2026-07-20" },
      ],
      new Date("2026-07-18T12:00:00+01:00"),
    );
    assert.deepEqual(
      result.map((item) => item.id),
      ["a", "b"],
    );
  });
});
