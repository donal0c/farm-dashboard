export const BRIEFING_RULESET_VERSION = "2026-07-18.1";

export const briefingRules = {
  groundAccess: {
    id: "ground-access-rain",
    version: BRIEFING_RULESET_VERSION,
    inputs: ["daily precipitation_sum"],
    unit: "mm over available forecast days",
    threshold: 25,
    comparison: "greater than or equal",
    rationale:
      "A conservative product heuristic that promotes a ground-access check during a materially wet forecast.",
    provenance: "conservative-product-heuristic",
    degradedBehavior:
      "Do not run when complete daily rain values are unavailable.",
  },
  windCheck: {
    id: "peak-gust-check",
    version: BRIEFING_RULESET_VERSION,
    inputs: ["daily wind_gusts_10m_max"],
    unit: "km/h",
    threshold: 45,
    comparison: "greater than or equal",
    rationale:
      "A presentation heuristic that calls attention to the windiest modelled day; it is not a spray or safety limit.",
    provenance: "presentation-policy",
    degradedBehavior:
      "Do not run unless at least two complete forecast days are available.",
  },
  workWindow: {
    id: "driest-adjacent-days",
    version: BRIEFING_RULESET_VERSION,
    inputs: ["daily precipitation_sum", "daily wind_gusts_10m_max"],
    unit: "mm, with km/h tie-break",
    threshold: 2,
    comparison: "at least two adjacent complete days",
    rationale:
      "A conservative comparison heuristic for ordering already-permitted work, never permission to act.",
    provenance: "conservative-product-heuristic",
    degradedBehavior:
      "Show insufficient coverage instead of inventing a window.",
  },
} as const;

export type BriefingRule = (typeof briefingRules)[keyof typeof briefingRules];
