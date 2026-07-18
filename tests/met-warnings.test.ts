import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeMetWarnings } from "../lib/sources/met-warnings.ts";

describe("Met Éireann warning contract", () => {
  it("keeps active warnings and drops expired notices", () => {
    const snapshot = normalizeMetWarnings(
      [
        {
          id: 1,
          level: "Yellow",
          headline: "Weather Advisory for Ireland",
          description: "Animal welfare and drought concerns.",
          issued: "2026-07-17T22:30:00Z",
          onset: "2026-07-17T22:30:00Z",
          expiry: "2026-07-20T23:00:00Z",
          regions: ["EI01"],
        },
        {
          id: 2,
          level: "Yellow",
          headline: "Expired warning",
          expiry: "2026-07-17T07:00:00Z",
        },
      ],
      new Date("2026-07-18T08:00:00Z"),
    );

    assert.equal(snapshot.data?.length, 1);
    assert.equal(snapshot.data?.[0].level, "Yellow");
    assert.equal(snapshot.scope, "national");
    assert.equal(snapshot.confidence, "authoritative");
  });

  it("sorts concurrent warnings by severity, active period, and stable id", () => {
    const snapshot = normalizeMetWarnings(
      [
        {
          id: "yellow",
          level: "Yellow",
          headline: "Yellow warning",
          onset: "2026-07-18T10:00:00Z",
          expiry: "2026-07-20T10:00:00Z",
        },
        {
          id: "orange-b",
          level: "Orange",
          headline: "Orange later",
          onset: "2026-07-18T12:00:00Z",
          expiry: "2026-07-20T10:00:00Z",
        },
        {
          id: "orange-a",
          level: "Orange",
          headline: "Orange earlier",
          onset: "2026-07-18T09:00:00Z",
          expiry: "2026-07-20T10:00:00Z",
        },
      ],
      new Date("2026-07-18T08:00:00Z"),
    );

    assert.deepEqual(
      snapshot.data?.map((warning) => warning.id),
      ["orange-a", "orange-b", "yellow"],
    );
  });
});
