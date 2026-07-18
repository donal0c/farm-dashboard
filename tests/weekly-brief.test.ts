import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveWeeklyBrief } from "../lib/briefing/derive-weekly-brief.ts";
import { normalizeMetWarnings } from "../lib/sources/met-warnings.ts";
import { normalizeOpenMeteoForecast } from "../lib/sources/open-meteo.ts";

function forecast(rain: number[], gusts: number[]) {
  return normalizeOpenMeteoForecast(
    {
      latitude: 53.4,
      longitude: -7.8,
      timezone: "Europe/Dublin",
      daily: {
        time: rain.map((_, index) => `2026-07-${18 + index}`),
        weather_code: rain.map((amount) => (amount ? 61 : 1)),
        temperature_2m_max: rain.map(() => 18),
        temperature_2m_min: rain.map(() => 9),
        precipitation_sum: rain,
        precipitation_probability_max: rain.map((amount) => (amount ? 80 : 10)),
        wind_gusts_10m_max: gusts,
      },
    },
    new Date("2026-07-18T08:00:00.000Z"),
  );
}

describe("deterministic weekly briefing", () => {
  it("returns no priorities when the forecast has no usable days", () => {
    const brief = deriveWeeklyBrief({
      forecast: {
        data: {
          latitude: 53.4,
          longitude: -7.8,
          timezone: "Europe/Dublin",
          days: [],
        },
        source: {
          id: "forecast",
          label: "Forecast",
          url: "https://example.com",
        },
        scope: "farm",
        status: "live",
        observedAt: null,
        fetchedAt: "2026-07-18T08:00:00.000Z",
        staleAfter: "2026-07-18T08:45:00.000Z",
        warning: null,
        confidence: "estimate",
      },
      enterprise: "beef",
      focus: "grazing",
    });

    assert.deepEqual(brief.items, []);
    assert.deepEqual(brief.evidence, []);
  });

  it("does not invent a two-day window from a one-day forecast", () => {
    const brief = deriveWeeklyBrief({
      forecast: forecast([4], [25]),
      enterprise: "beef",
      focus: "grazing",
    });

    assert.deepEqual(
      brief.items.map((item) => item.id),
      ["forecast-coverage", "compliance-check"],
    );
    assert.match(brief.items[0].title, /Not enough forecast days/);
    assert.ok(brief.evidence.some((item) => item.id === "forecast-coverage"));
  });

  it("allows a work-window comparison with two usable days", () => {
    const brief = deriveWeeklyBrief({
      forecast: forecast([1, 2], [20, 25]),
      enterprise: "beef",
      focus: "grazing",
    });

    assert.equal(brief.items[0].id, "field-window");
    assert.deepEqual(brief.items[0].relevantDates, [
      "2026-07-18",
      "2026-07-19",
    ]);
  });

  it("raises access risk when seven-day rain crosses the rule threshold", () => {
    const brief = deriveWeeklyBrief({
      forecast: forecast([3, 4, 5, 8, 4, 2, 1], [20, 22, 24, 40, 30, 22, 18]),
      enterprise: "beef",
      focus: "grazing",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    assert.equal(brief.items[0].id, "ground-access");
    assert.equal(brief.items[0].priority, "act");
    assert.match(brief.items[0].summary, /27 mm/);
    assert.equal(brief.items.length, 3);
  });

  it("applies the rain threshold exactly at its versioned boundary", () => {
    for (const [total, expected] of [
      [24, "field-window"],
      [25, "ground-access"],
      [26, "ground-access"],
    ] as const) {
      const brief = deriveWeeklyBrief({
        forecast: forecast([total, 0], [20, 20]),
        enterprise: "beef",
        focus: "grazing",
      });
      assert.equal(brief.items[0].id, expected);
    }
  });

  it("reports the actual usable-day coverage for a partial wet forecast", () => {
    const brief = deriveWeeklyBrief({
      forecast: forecast([13, 12], [20, 20]),
      enterprise: "beef",
      focus: "grazing",
    });

    assert.equal(brief.items[0].id, "ground-access");
    assert.match(brief.items[0].summary, /across 2 usable days/);
    assert.doesNotMatch(brief.items[0].summary, /seven days/);
  });

  it("applies the gust attention threshold below, at, and above", () => {
    for (const [gust, strong] of [
      [44, false],
      [45, true],
      [46, true],
    ] as const) {
      const brief = deriveWeeklyBrief({
        forecast: forecast([0, 0], [20, gust]),
        enterprise: "beef",
        focus: "grazing",
      });
      const wind = brief.items.find((item) => item.id === "wind-check");
      assert.equal(wind?.title.includes("Strong gusts"), strong);
    }
  });

  it("uses a stable earliest-window tie-break", () => {
    const brief = deriveWeeklyBrief({
      forecast: forecast([0, 0, 0], [20, 20, 20]),
      enterprise: "beef",
      focus: "grazing",
    });
    assert.deepEqual(brief.items[0].relevantDates, [
      "2026-07-18",
      "2026-07-19",
    ]);
  });

  it("finds a dry window for tillage without claiming permission to spray", () => {
    const brief = deriveWeeklyBrief({
      forecast: forecast([4, 0, 0.2, 7, 3, 1, 2], [20, 18, 21, 30, 20, 19, 18]),
      enterprise: "tillage",
      focus: "spraying",
    });

    assert.equal(brief.items[0].id, "spray-window");
    assert.match(brief.items[0].detail, /screening signal only/);
    assert.ok(
      brief.evidence.some((item) => item.id === brief.items[0].evidenceId),
    );
  });

  it("keeps a Yellow warning behind an actionable field window", () => {
    const warnings = normalizeMetWarnings(
      [
        {
          id: 1,
          level: "Yellow",
          headline: "Weather Advisory for Ireland",
          description: "Animal welfare and drought concerns.",
          issued: "2026-07-17T22:30:00Z",
          onset: "2026-07-17T22:30:00Z",
          expiry: "2026-07-20T23:00:00Z",
        },
      ],
      new Date("2026-07-18T08:00:00Z"),
    );
    const brief = deriveWeeklyBrief({
      forecast: forecast([0, 0, 0.2, 0, 0, 0, 0], [20, 18, 21, 30, 20, 19, 18]),
      warnings,
      enterprise: "beef",
      focus: "grazing",
      now: new Date("2026-07-18T08:00:00Z"),
    });

    assert.equal(brief.items[0].id, "field-window");
    assert.equal(brief.items[1].id, "weather-warning");
    assert.equal(brief.items.length, 3);
    assert.equal(brief.items.at(-1)?.id, "compliance-check");
  });

  it("promotes an Orange warning ahead of a modelled work window", () => {
    const warnings = normalizeMetWarnings(
      [
        {
          id: 2,
          level: "Orange",
          headline: "Orange Wind Warning",
          description: "Dangerous travel and exposed-work conditions.",
          issued: "2026-07-17T22:30:00Z",
          onset: "2026-07-17T22:30:00Z",
          expiry: "2026-07-20T23:00:00Z",
        },
      ],
      new Date("2026-07-18T08:00:00Z"),
    );
    const brief = deriveWeeklyBrief({
      forecast: forecast([0, 0, 0.2, 0, 0, 0, 0], [20, 18, 21, 30, 20, 19, 18]),
      warnings,
      enterprise: "beef",
      focus: "grazing",
      now: new Date("2026-07-18T08:00:00Z"),
    });

    assert.equal(brief.items[0].id, "weather-warning");
    assert.equal(brief.items[0].priority, "act");
  });

  it("ranks warning applicability before severity and preserves concurrent evidence", () => {
    const warnings = normalizeMetWarnings(
      [
        {
          id: "cork-red",
          level: "Red",
          headline: "Red warning for Cork",
          onset: "2026-07-18T09:00:00Z",
          expiry: "2026-07-20T23:00:00Z",
          regions: ["EI04"],
        },
        {
          id: "galway-yellow",
          level: "Yellow",
          headline: "Yellow warning for Galway",
          onset: "2026-07-18T09:00:00Z",
          expiry: "2026-07-20T23:00:00Z",
          regions: ["EI10"],
        },
      ],
      new Date("2026-07-18T08:00:00Z"),
    );
    const brief = deriveWeeklyBrief({
      forecast: forecast([0, 0], [20, 20]),
      warnings,
      enterprise: "beef",
      focus: "grazing",
      region: "GALWAY",
    });
    const warningItem = brief.items.find(
      (item) => item.id === "weather-warning",
    );
    assert.equal(warningItem?.title, "Yellow warning for Galway");
    const evidence = brief.evidence.find((item) => item.id === "met-warning");
    assert.match(evidence?.explanation ?? "", /Red warning for Cork/);
  });

  it("does not treat a routing-area digit as a county warning match", () => {
    const warnings = normalizeMetWarnings(
      [
        {
          id: "galway-red",
          level: "Red",
          headline: "Red warning for Galway",
          onset: "2026-07-18T09:00:00Z",
          expiry: "2026-07-20T23:00:00Z",
          regions: ["EI10"],
        },
        {
          id: "cork-yellow",
          level: "Yellow",
          headline: "Yellow warning for Cork",
          onset: "2026-07-18T09:00:00Z",
          expiry: "2026-07-20T23:00:00Z",
          regions: ["EI04"],
        },
      ],
      new Date("2026-07-18T08:00:00Z"),
    );
    const brief = deriveWeeklyBrief({
      forecast: forecast([0, 0], [20, 20]),
      warnings,
      enterprise: "beef",
      focus: "grazing",
      region: "4",
    });

    assert.equal(
      brief.items.find((item) => item.id === "weather-warning")?.title,
      "Red warning for Galway",
    );
  });

  it("resolves every evidence id and keeps a decision boundary for usable briefs", () => {
    for (const input of [
      { forecast: forecast([0], [20]), focus: "grazing" as const },
      { forecast: forecast([0, 0], [20, 20]), focus: "grazing" as const },
      { forecast: forecast([13, 13], [50, 50]), focus: "spraying" as const },
    ]) {
      const brief = deriveWeeklyBrief({
        ...input,
        enterprise: "mixed",
      });
      const evidenceIds = new Set(brief.evidence.map((item) => item.id));
      assert.ok(brief.items.every((item) => evidenceIds.has(item.evidenceId)));
      assert.ok(
        brief.items.some((item) => item.evidenceId === "decision-boundary"),
      );
    }
  });

  it("keeps sales decisions separate from weather-derived field windows", () => {
    const brief = deriveWeeklyBrief({
      forecast: forecast([0, 0, 0.2, 0, 0, 0, 0], [20, 18, 21, 30, 20, 19, 18]),
      enterprise: "dairy",
      focus: "sales",
      now: new Date("2026-07-18T08:00:00Z"),
    });

    const boundary = brief.items.at(-1);
    assert.equal(boundary?.id, "compliance-check");
    assert.equal(boundary?.eyebrow, "Commercial boundary");
    assert.match(boundary?.title ?? "", /sale timing/i);
    assert.match(boundary?.detail ?? "", /Use Markets/);
  });
});
