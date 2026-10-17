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

describe("Met Éireann warning normalization details", () => {
  it("reads the published lower-case level and hazard type", () => {
    const snapshot = normalizeMetWarnings(
      [
        {
          id: 3,
          level: "yellow",
          type: "Rain",
          certainty: "Observed",
          headline: "Status Yellow - Rain warning for Galway",
          expiry: "2026-10-15T06:00:00+01:00",
          regions: ["EI10"],
        },
        {
          id: 4,
          level: "ORANGE",
          headline: "Orange something",
          expiry: "2026-10-15T06:00:00+01:00",
        },
      ],
      new Date("2026-10-14T20:00:00Z"),
    );
    assert.equal(snapshot.data?.[0].level, "Orange");
    assert.equal(snapshot.data?.[1].level, "Yellow");
    assert.equal(snapshot.data?.[1].type, "Rain");
    assert.equal(snapshot.data?.[1].certainty, "Observed");
  });

  it("converts the published HTML description into sentences", () => {
    const snapshot = normalizeMetWarnings(
      [
        {
          id: 3,
          level: "yellow",
          headline: "Status Yellow - Rain warning",
          description:
            "<p>Spells of heavy rain.</p><p>Be aware of potential impacts:</p><ul><li>Difficult travelling conditions</li><li>Localised flooding possible</li><li>Poor visibility</li></ul>",
          expiry: "2026-10-15T06:00:00+01:00",
        },
      ],
      new Date("2026-10-14T20:00:00Z"),
    );
    assert.equal(
      snapshot.data?.[0].description,
      "Spells of heavy rain. Be aware of potential impacts: Difficult travelling conditions; Localised flooding possible; Poor visibility.",
    );
  });

  it("decodes entities in plain descriptions without inventing markup", () => {
    const snapshot = normalizeMetWarnings(
      [
        {
          id: 3,
          level: "yellow",
          headline: "Status Yellow",
          description: "Gusts of 90 km/h &amp; heavy showers.",
          expiry: "2026-10-15T06:00:00+01:00",
        },
      ],
      new Date("2026-10-14T20:00:00Z"),
    );
    assert.equal(
      snapshot.data?.[0].description,
      "Gusts of 90 km/h & heavy showers.",
    );
  });
});

describe("Met Éireann land versus marine warnings", () => {
  it("drops sea-area notices and keeps county and national ones", () => {
    const snapshot = normalizeMetWarnings(
      [
        {
          id: "marine",
          level: "yellow",
          type: "small-craft",
          headline: "Small Craft warning from Mizen Head to Erris Head",
          expiry: "2026-10-16T09:00:00+01:00",
          regions: ["EI805", "EI816"],
        },
        {
          id: "galway",
          level: "yellow",
          type: "Rain",
          headline: "Status Yellow - Rain warning for Galway",
          expiry: "2026-10-16T09:00:00+01:00",
          regions: ["EI10"],
        },
        {
          id: "national",
          level: "yellow",
          headline: "Weather Advisory for Ireland",
          expiry: "2026-10-16T09:00:00+01:00",
          regions: [],
        },
      ],
      new Date("2026-10-15T08:00:00Z"),
    );
    assert.deepEqual(
      snapshot.data?.map((warning) => warning.id),
      ["galway", "national"],
    );
    assert.match(snapshot.warning ?? "", /Marine/);
  });

  it("reports an empty land feed as live with no warnings", () => {
    const snapshot = normalizeMetWarnings(
      [
        {
          id: "marine",
          level: "yellow",
          headline: "Small Craft warning",
          expiry: "2026-10-16T09:00:00+01:00",
          regions: ["EI807"],
        },
      ],
      new Date("2026-10-15T08:00:00Z"),
    );
    assert.equal(snapshot.status, "live");
    assert.deepEqual(snapshot.data, []);
    assert.match(snapshot.warning ?? "", /No land warning/);
  });
});
