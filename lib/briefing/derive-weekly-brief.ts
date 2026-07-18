import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";
import type { MetWarning } from "@/lib/sources/met-warnings";
import type { FarmForecast, ForecastDay } from "@/lib/sources/open-meteo";
import type { FarmEnterprise, FarmWeekFocus } from "@/lib/store/ui-store";
import type { BriefItem, WeeklyBrief } from "./types";

type BriefInput = {
  forecast: SourceSnapshot<FarmForecast>;
  warnings?: SourceSnapshot<MetWarning[]>;
  enterprise: FarmEnterprise;
  focus: FarmWeekFocus;
  now?: Date;
};

function wettestDay(days: ForecastDay[]) {
  return [...days].sort((a, b) => b.rainMm - a.rainMm)[0];
}

function windiestDay(days: ForecastDay[]) {
  return [...days].sort((a, b) => b.windGustKph - a.windGustKph)[0];
}

function driestWindow(days: ForecastDay[]) {
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

export function deriveWeeklyBrief({
  forecast,
  warnings,
  enterprise,
  focus,
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
  const activeWarning = warnings?.data?.[0];

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

  if (totalRain >= 25) {
    items.push({
      id: "ground-access",
      priority: "act",
      eyebrow: "Ground access",
      title: `Protect vulnerable ground before ${formatDay(wettest.date)}`,
      summary: `${totalRain.toFixed(0)} mm is forecast across seven days, with ${wettest.rainMm.toFixed(0)} mm on ${formatDay(wettest.date)}.`,
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

  items.push({
    id: "wind-check",
    priority: "check",
    eyebrow: focus === "spraying" ? "Spray check" : "Wind check",
    title:
      windiest.windGustKph >= 45
        ? `Strong gusts could constrain work on ${formatDay(windiest.date)}`
        : `Wind is not the main weekly constraint`,
    summary: `Peak modelled gusts reach ${windiest.windGustKph.toFixed(0)} km/h on ${formatDay(windiest.date)}.`,
    detail:
      "Forecast gusts are not field measurements. Check the latest local forecast and product rules immediately before weather-sensitive work.",
    evidenceId: "forecast-wind",
    relevantDates: [windiest.date],
  });

  items.push({
    id: "compliance-check",
    priority: "watch",
    eyebrow: "Before acting",
    title:
      focus === "nutrients" || focus === "compliance"
        ? "Confirm the rule and field context"
        : "Keep compliance as a separate check",
    summary:
      "Weather suitability does not establish that spreading, spraying, grazing, or drainage work is permitted.",
    detail:
      "AgriView separates forecast evidence from legal and field-specific decisions. Use dated official guidance for the applicable scheme and holding.",
    evidenceId: "decision-boundary",
    relevantDates: [],
  });

  const finalItem = items.at(-1);
  const finalItems =
    items.length > 3 && finalItem ? [items[0], items[1], finalItem] : items;

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
              explanation:
                "Active official warnings are placed ahead of model-derived work windows.",
            },
          ]
        : []),
      {
        id: "forecast-rain",
        label: "Seven-day rainfall",
        sourceLabel: forecast.source.label,
        sourceUrl: forecast.source.url,
        observedAt: forecast.observedAt,
        scope: forecast.scope,
        confidence: forecast.confidence,
        explanation:
          "The rule flags access risk when total modelled rain reaches 25 mm in seven days.",
      },
      {
        id: "forecast-window",
        label: "Driest two-day window",
        sourceLabel: forecast.source.label,
        sourceUrl: forecast.source.url,
        observedAt: forecast.observedAt,
        scope: forecast.scope,
        confidence: forecast.confidence,
        explanation:
          "The rule compares adjacent forecast days by combined rain, using gust speed as a tie-breaker.",
      },
      {
        id: "forecast-wind",
        label: "Peak forecast gust",
        sourceLabel: forecast.source.label,
        sourceUrl: forecast.source.url,
        observedAt: forecast.observedAt,
        scope: forecast.scope,
        confidence: forecast.confidence,
        explanation:
          "The rule reports the highest daily modelled gust and does not infer field-level suitability.",
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
