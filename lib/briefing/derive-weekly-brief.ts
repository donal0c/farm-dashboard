import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";
import type { MetWarning } from "@/lib/sources/met-warnings";
import type { FarmForecast, ForecastDay } from "@/lib/sources/open-meteo";
import type { FarmEnterprise, FarmWeekFocus } from "@/lib/store/ui-store";
import { warningRegionsIncludeCounty } from "../ireland/counties.ts";
import { briefingRules } from "./rules.ts";
import type { BriefItem, WeeklyBrief } from "./types";

type BriefInput = {
  forecast: SourceSnapshot<FarmForecast>;
  warnings?: SourceSnapshot<MetWarning[]>;
  enterprise: FarmEnterprise;
  focus: FarmWeekFocus;
  region?: string | null;
  now?: Date;
};

function wettestDay(days: ForecastDay[]) {
  return [...days].sort((a, b) => b.rainMm - a.rainMm)[0];
}

function windiestDay(days: ForecastDay[]) {
  return [...days].sort((a, b) => b.windGustKph - a.windGustKph)[0];
}

function driestWindow(days: ForecastDay[]) {
  if (days.length < 2) return null;
  const windows = days.slice(0, -1).map((day, index) => ({
    dates: [day.date, days[index + 1].date],
    rain: day.rainMm + days[index + 1].rainMm,
    gust: Math.max(day.windGustKph, days[index + 1].windGustKph),
  }));
  return windows.sort((a, b) => a.rain - b.rain || a.gust - b.gust)[0];
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-IE", { weekday: "long" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function warningSummary(description: string) {
  const firstSection = description
    .split(/Please check|Potential impacts/i)[0]
    .replace(/\s+/g, " ")
    .trim();
  if (!firstSection) {
    return "Read the current official warning before planning exposed or weather-sensitive work.";
  }
  return firstSection.length > 240
    ? `${firstSection.slice(0, 237).trim()}…`
    : firstSection;
}

function briefRank(item: BriefItem) {
  if (item.id === "weather-warning" && item.priority === "act") return 0;
  if (item.priority === "act") return 1;
  if (item.priority === "check") return 2;
  return 3;
}

const warningRank = { Red: 0, Orange: 1, Yellow: 2, Advisory: 3, Unknown: 4 };

function rankWarnings(warnings: MetWarning[], region?: string | null) {
  const applicability = (warning: MetWarning) => {
    if (warningRegionsIncludeCounty(warning.regions, region)) {
      return 0;
    }
    if (
      !warning.regions.length ||
      warning.regions.some((item) => /ireland|national|all/i.test(item))
    ) {
      return 1;
    }
    return 2;
  };
  return [...warnings].sort(
    (left, right) =>
      applicability(left) - applicability(right) ||
      warningRank[left.level] - warningRank[right.level] ||
      Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
      left.id.localeCompare(right.id),
  );
}

export function deriveWeeklyBrief({
  forecast,
  warnings,
  enterprise,
  focus,
  region,
  now = new Date(),
}: BriefInput): WeeklyBrief {
  const days = forecast.data?.days ?? [];
  if (!days.length) {
    return { generatedAt: now.toISOString(), items: [], evidence: [] };
  }

  const wettest = wettestDay(days);
  const windiest = windiestDay(days);
  const dry = driestWindow(days);
  const totalRain = days.reduce((sum, day) => sum + day.rainMm, 0);
  const items: BriefItem[] = [];
  const rankedWarnings = rankWarnings(warnings?.data ?? [], region);
  const activeWarning = rankedWarnings[0];

  if (activeWarning) {
    items.push({
      id: "weather-warning",
      priority:
        activeWarning.level === "Red" || activeWarning.level === "Orange"
          ? "act"
          : "check",
      eyebrow: `${activeWarning.level} weather notice`,
      title: activeWarning.headline,
      summary: `In force until ${new Intl.DateTimeFormat("en-IE", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(activeWarning.expiresAt))}.`,
      detail: warningSummary(activeWarning.description),
      evidenceId: "met-warning",
      relevantDates: [
        activeWarning.startsAt.slice(0, 10),
        activeWarning.expiresAt.slice(0, 10),
      ],
    });
  }

  if (!dry) {
    items.push({
      id: "forecast-coverage",
      priority: "check",
      eyebrow: "Forecast coverage",
      title: "Not enough forecast days for a work window",
      summary: `Only ${days.length} usable forecast ${days.length === 1 ? "day was" : "days were"} returned.`,
      detail:
        "AgriView needs at least two adjacent usable days before it can compare field-work windows. Check the full forecast and try again later.",
      evidenceId: "forecast-coverage",
      relevantDates: days.map((day) => day.date),
    });
  } else if (totalRain >= briefingRules.groundAccess.threshold) {
    items.push({
      id: "ground-access",
      priority: "act",
      eyebrow: "Ground access",
      title: `Protect vulnerable ground before ${formatDay(wettest.date)}`,
      summary: `${totalRain.toFixed(0)} mm is forecast across ${days.length} usable ${days.length === 1 ? "day" : "days"}, with ${wettest.rainMm.toFixed(0)} mm on ${formatDay(wettest.date)}.`,
      detail:
        "Walk the wettest blocks before moving heavy machinery or stock. Keep watercourse buffers and poaching risk in the decision.",
      evidenceId: "forecast-rain",
      relevantDates: [wettest.date],
    });
  } else if (focus === "spraying" || enterprise === "tillage") {
    items.push({
      id: "spray-window",
      priority: "act",
      eyebrow: "Likely work window",
      title: `Check the ${formatDay(dry.dates[0])}–${formatDay(dry.dates[1])} window`,
      summary: `${dry.rain.toFixed(1)} mm combined rain is forecast for the driest two-day window.`,
      detail:
        "This is a screening signal only. Confirm field wind, crop condition, label constraints, and local rainfall before spraying.",
      evidenceId: "forecast-window",
      relevantDates: dry.dates,
    });
  } else {
    items.push({
      id: "field-window",
      priority: "act",
      eyebrow: "Likely field window",
      title: `${formatDay(dry.dates[0])}–${formatDay(dry.dates[1])} looks least constrained`,
      summary: `${dry.rain.toFixed(1)} mm combined rain is forecast in the driest two-day window.`,
      detail:
        "Use the window to prioritise work that is already agronomically appropriate. Confirm actual ground conditions first.",
      evidenceId: "forecast-window",
      relevantDates: dry.dates,
    });
  }

  if (days.length >= 2) {
    items.push({
      id: "wind-check",
      priority: "check",
      eyebrow: focus === "spraying" ? "Spray check" : "Wind check",
      title:
        windiest.windGustKph >= briefingRules.windCheck.threshold
          ? `Strong gusts could constrain work on ${formatDay(windiest.date)}`
          : `Wind is not the main weekly constraint`,
      summary: `Peak modelled gusts reach ${windiest.windGustKph.toFixed(0)} km/h on ${formatDay(windiest.date)}.`,
      detail:
        "Forecast gusts are not field measurements. Check the latest local forecast and product rules immediately before weather-sensitive work.",
      evidenceId: "forecast-wind",
      relevantDates: [windiest.date],
    });
  }

  items.push({
    id: "compliance-check",
    priority: "watch",
    eyebrow: focus === "sales" ? "Commercial boundary" : "Before acting",
    title:
      focus === "sales"
        ? "Keep sale timing separate from field conditions"
        : focus === "nutrients" || focus === "compliance"
          ? "Confirm the rule and field context"
          : "Keep compliance as a separate check",
    summary:
      focus === "sales"
        ? "A dry weather window does not establish the right time or price to sell."
        : "Weather suitability does not establish that spreading, spraying, grazing, or drainage work is permitted.",
    detail:
      focus === "sales"
        ? "Use Markets for national, lagged commercial context, then confirm your own costs, specification, buyer terms, and live price before deciding."
        : "AgriView separates forecast evidence from legal and field-specific decisions. Use dated official guidance for the applicable scheme and holding.",
    evidenceId: "decision-boundary",
    relevantDates: [],
  });

  const rankedItems = [...items].sort(
    (left, right) => briefRank(left) - briefRank(right),
  );
  const finalItem = rankedItems.at(-1);
  const finalItems =
    rankedItems.length > 3 && finalItem
      ? [rankedItems[0], rankedItems[1], finalItem]
      : rankedItems;

  return {
    generatedAt: now.toISOString(),
    items: finalItems,
    evidence: [
      ...(activeWarning && warnings
        ? [
            {
              id: "met-warning",
              label: activeWarning.headline,
              sourceLabel: warnings.source.label,
              sourceUrl: warnings.source.url,
              observedAt: warnings.observedAt,
              scope: warnings.scope,
              confidence: warnings.confidence,
              explanation: [
                "Warnings are ordered by saved-region applicability, severity, active period, and stable id. Red or Orange is promoted to Act; Yellow remains a Check.",
                rankedWarnings.length > 1
                  ? `Also active: ${rankedWarnings
                      .slice(1)
                      .map((warning) => `${warning.level}: ${warning.headline}`)
                      .join("; ")}.`
                  : null,
              ]
                .filter(Boolean)
                .join(" "),
            },
          ]
        : []),
      ...(dry
        ? []
        : [
            {
              id: "forecast-coverage",
              label: "Forecast coverage",
              sourceLabel: forecast.source.label,
              sourceUrl: forecast.source.url,
              observedAt: forecast.observedAt,
              scope: forecast.scope,
              confidence: forecast.confidence,
              explanation:
                "AgriView requires at least two adjacent usable forecast days before comparing a work window.",
            },
          ]),
      {
        id: "forecast-rain",
        label: "Seven-day rainfall",
        sourceLabel: forecast.source.label,
        sourceUrl: forecast.source.url,
        observedAt: forecast.observedAt,
        scope: forecast.scope,
        confidence: forecast.confidence,
        explanation: `${briefingRules.groundAccess.rationale} Threshold: ${briefingRules.groundAccess.threshold} ${briefingRules.groundAccess.unit}. Version ${briefingRules.groundAccess.version}.`,
      },
      {
        id: "forecast-window",
        label: "Driest two-day window",
        sourceLabel: forecast.source.label,
        sourceUrl: forecast.source.url,
        observedAt: forecast.observedAt,
        scope: forecast.scope,
        confidence: forecast.confidence,
        explanation: `${briefingRules.workWindow.rationale} Version ${briefingRules.workWindow.version}.`,
      },
      {
        id: "forecast-wind",
        label: "Peak forecast gust",
        sourceLabel: forecast.source.label,
        sourceUrl: forecast.source.url,
        observedAt: forecast.observedAt,
        scope: forecast.scope,
        confidence: forecast.confidence,
        explanation: `${briefingRules.windCheck.rationale} Attention threshold: ${briefingRules.windCheck.threshold} ${briefingRules.windCheck.unit}. Version ${briefingRules.windCheck.version}.`,
      },
      {
        id: "decision-boundary",
        label: "Decision boundary",
        sourceLabel: "AgriView briefing rule",
        sourceUrl: "/methodology",
        observedAt: null,
        scope: "farm",
        confidence: "screening",
        explanation:
          "The briefing never treats forecast conditions as a legal or agronomic permission to act.",
      },
    ],
  };
}
