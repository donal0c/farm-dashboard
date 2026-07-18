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
