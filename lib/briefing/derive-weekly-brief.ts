import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";
import type { MetWarning } from "@/lib/sources/met-warnings";
import type { FarmForecast, ForecastDay } from "@/lib/sources/open-meteo";
import type { FarmEnterprise, FarmWeekFocus } from "@/lib/store/ui-store";
import { upcomingComplianceItems } from "../compliance/calendar.ts";
import type { ComplianceDate } from "../compliance/rules.ts";
import {
  normalizeIrishCounty,
  warningRegionsIncludeCounty,
} from "../ireland/counties.ts";
import { briefingRules } from "./rules.ts";
import type { BriefEvidence, BriefItem, WeeklyBrief } from "./types";

type BriefInput = {
  forecast: SourceSnapshot<FarmForecast>;
  warnings?: SourceSnapshot<MetWarning[]>;
  /** Verified deadline watchlist; local data with an official source each. */
  deadlines?: readonly ComplianceDate[];
  enterprise: FarmEnterprise;
  focus: FarmWeekFocus;
  region?: string | null;
  now?: Date;
};

/** The brief shows one lead priority and at most this many supporting items. */
export const SUPPORTING_ITEM_LIMIT = 2;
/** Deadlines further out than this stay on the Calendar page only. */
export const DEADLINE_HORIZON_DAYS = 45;

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

function titleCaseCounty(county: string) {
  return county
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function briefRank(item: BriefItem, focus: FarmWeekFocus) {
  if (item.id === "weather-warning" && item.priority === "act") return 0;
  if (focus === "sales" && item.id === "compliance-check") return 1;
  if (focus === "compliance" && item.id.startsWith("deadline-")) return 2;
  if (item.id === "compliance-check") return 6;
  if (item.priority === "act") return 3;
  if (item.priority === "check") return 4;
  return 5;
}

const warningRank = { Red: 0, Orange: 1, Yellow: 2, Advisory: 3, Unknown: 4 };

type WarningApplicability = "covers-farm" | "national" | "elsewhere";

function warningApplicability(
  warning: MetWarning,
  region?: string | null,
): WarningApplicability {
  if (warningRegionsIncludeCounty(warning.regions, region)) {
    return "covers-farm";
  }
  if (
    !warning.regions.length ||
    warning.regions.some((item) => /ireland|national|all/i.test(item))
  ) {
    return "national";
  }
  // Without a saved county we cannot say a regional warning is elsewhere.
  return normalizeIrishCounty(region) ? "elsewhere" : "national";
}

const applicabilityRank: Record<WarningApplicability, number> = {
  "covers-farm": 0,
  national: 1,
  elsewhere: 2,
};

function rankWarnings(warnings: MetWarning[], region?: string | null) {
  return [...warnings].sort(
    (left, right) =>
      applicabilityRank[warningApplicability(left, region)] -
        applicabilityRank[warningApplicability(right, region)] ||
      warningRank[left.level] - warningRank[right.level] ||
      Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
      left.id.localeCompare(right.id),
  );
}

function formatInForce(expiresAt: string) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(expiresAt));
}

export function deriveWeeklyBrief({
  forecast,
  warnings,
  deadlines = [],
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
  const evidence: BriefEvidence[] = [];
  const rankedWarnings = rankWarnings(warnings?.data ?? [], region);
  const activeWarning = rankedWarnings[0];
  const county = normalizeIrishCounty(region);
  const countyLabel = county ? titleCaseCounty(county) : null;

  if (activeWarning) {
    const applicability = warningApplicability(activeWarning, region);
    const hazard = activeWarning.type
      ? `${activeWarning.level} ${activeWarning.type.toLowerCase()} warning`
      : `${activeWarning.level} weather warning`;
    const severe =
      activeWarning.level === "Red" || activeWarning.level === "Orange";
    const priority =
      applicability === "elsewhere" ? "watch" : severe ? "act" : "check";
    const eyebrow =
      applicability === "covers-farm" && countyLabel
        ? `${hazard} · covers ${countyLabel}`
        : applicability === "elsewhere" && countyLabel
          ? `${hazard} · ${countyLabel} not listed`
          : hazard;
    const inForce = `In force until ${formatInForce(activeWarning.expiresAt)}.`;
    items.push({
      id: "weather-warning",
      priority,
      eyebrow,
      title: activeWarning.headline,
      summary:
        applicability === "covers-farm" && countyLabel
          ? `Met Éireann lists ${countyLabel}. ${inForce}`
          : applicability === "elsewhere" && countyLabel
            ? `The listed counties do not include ${countyLabel}. ${inForce}`
            : inForce,
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
    const gusty = windiest.windGustKph >= briefingRules.windCheck.threshold;
    items.push({
      id: "wind-check",
      priority: gusty ? "check" : "watch",
      eyebrow: focus === "spraying" ? "Spray check" : "Wind",
      title: gusty
        ? `Strong gusts could constrain work on ${formatDay(windiest.date)}`
        : "Wind is not the main weekly constraint",
      summary: `Peak modelled gusts reach ${windiest.windGustKph.toFixed(0)} km/h on ${formatDay(windiest.date)}.`,
      detail:
        "Forecast gusts are not field measurements. Check the latest local forecast and product rules immediately before weather-sensitive work.",
      evidenceId: "forecast-wind",
      relevantDates: [windiest.date],
    });
  }

  const nextDeadline = upcomingComplianceItems(deadlines, now).find(
    (item) => item.days <= DEADLINE_HORIZON_DAYS,
  );
  if (nextDeadline) {
    const evidenceId = `deadline-${nextDeadline.id}`;
    items.push({
      id: evidenceId,
      priority: focus === "compliance" ? "check" : "watch",
      eyebrow: "Verified deadline",
      title:
        nextDeadline.days === 0
          ? `${nextDeadline.title} today`
          : `${nextDeadline.title} in ${nextDeadline.days} ${nextDeadline.days === 1 ? "day" : "days"}`,
      summary: `Applies to: ${nextDeadline.applicability}`,
      detail: nextDeadline.action,
      evidenceId,
      relevantDates: [nextDeadline.date],
    });
    evidence.push({
      id: evidenceId,
      label: nextDeadline.title,
      sourceLabel: nextDeadline.source.label,
      sourceUrl: nextDeadline.source.url,
      observedAt: `${nextDeadline.verifiedAt}T12:00:00Z`,
      observedLabel: "Verified" as const,
      scope: "national",
      confidence: "authoritative",
      explanation: `A hand-verified DAFM date published ${nextDeadline.source.publishedAt} and checked against the official page on ${nextDeadline.verifiedAt}. It appears here because it falls within ${DEADLINE_HORIZON_DAYS} days. Scheme correspondence and current terms remain authoritative.`,
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
    (left, right) => briefRank(left, focus) - briefRank(right, focus),
  );
  const lead = rankedItems[0];
  const boundary = rankedItems.find(
    (item) => item.id === "compliance-check" && item !== lead,
  );
  const supporting = rankedItems
    .filter((item) => item !== lead && item !== boundary)
    .slice(0, SUPPORTING_ITEM_LIMIT);
  const finalItems = [lead, ...supporting, ...(boundary ? [boundary] : [])];

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
              observedLabel: "Issued" as const,
              scope: warnings.scope,
              confidence: warnings.confidence,
              explanation: [
                "Warnings are ordered by saved-county applicability, severity, active period, and stable id. Red or Orange is promoted to Act; Yellow remains a Check; a regional warning that does not list the saved county is only a Watch.",
                activeWarning.certainty
                  ? `Met Éireann certainty: ${activeWarning.certainty}.`
                  : null,
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
              observedLabel: "Checked" as const,
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
        observedLabel: "Checked" as const,
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
        observedLabel: "Checked" as const,
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
        observedLabel: "Checked" as const,
        scope: forecast.scope,
        confidence: forecast.confidence,
        explanation: `${briefingRules.windCheck.rationale} Attention threshold: ${briefingRules.windCheck.threshold} ${briefingRules.windCheck.unit}. Version ${briefingRules.windCheck.version}.`,
      },
      ...evidence,
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
