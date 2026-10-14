import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDeadlineIcs,
  deadlineIcsFileName,
} from "../lib/compliance/ics.ts";
import { complianceDates2026 } from "../lib/compliance/rules.ts";

describe("deadline calendar export", () => {
  it("writes an all-day event that carries the official source", () => {
    const item = complianceDates2026[0];
    const ics = buildDeadlineIcs(item, new Date("2026-10-14T20:00:00Z"));
    assert.match(ics, /BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /DTSTART;VALUE=DATE:20260904/);
    assert.match(ics, /DTEND;VALUE=DATE:20260905/);
    assert.match(ics, /DTSTAMP:20261014T200000Z/);
    assert.match(ics, /SUMMARY:TAMS 3 Tranche 13 closes/);
    assert.match(ics, /gov\.ie/);
    assert.ok(ics.split("\r\n").every((line) => line.length <= 75));
    assert.equal(
      deadlineIcsFileName(item),
      "agriview-tams-tranche-13-2026-09-04.ics",
    );
  });
});
