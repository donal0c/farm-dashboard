import { CloudRain, CloudSun, Snowflake, Sun, Wind } from "lucide-react";
import Link from "next/link";

import { briefingRules } from "@/lib/briefing/rules";
import type { ForecastDay } from "@/lib/sources/open-meteo";
import { cn } from "@/lib/utils";

function dayLabel(date: string, index: number) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat("en-IE", { weekday: "short" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function dayNumber(date: string) {
  return new Intl.DateTimeFormat("en-IE", { day: "numeric" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

/** Whole degrees without a negative zero. */
export function formatDegrees(value: number) {
  return String(Math.round(value) || 0);
}

export function weatherIcon(code: number) {
  if (code <= 1) return Sun;
  if (code >= 71 && code <= 77) return Snowflake;
  if (code >= 51) return CloudRain;
  return CloudSun;
}

/**
 * Weather ledger: one column per usable forecast day with rain, gust and
 * temperature readable as text. Columns named by the lead decision are
 * highlighted so the evidence visibly supports the call.
 */
export function WeeklyEvidenceStrip({
  days,
  highlightDates = [],
  highlightLabel = "Window",
  stacked = false,
}: {
  days: ForecastDay[];
  highlightDates?: string[];
  highlightLabel?: string;
  stacked?: boolean;
}) {
  const totalRain = days.reduce((sum, day) => sum + day.rainMm, 0);
  const peakGust = Math.max(...days.map((day) => day.windGustKph), 0);
  const maxRain = Math.max(...days.map((day) => day.rainMm), 1);
  const gustThreshold = briefingRules.windCheck.threshold;
  const highlighted = new Set(highlightDates);
  const summary = `${days.length} usable forecast days. ${totalRain.toFixed(
    1,
  )} millimetres total rain. Peak modelled gust ${peakGust.toFixed(
    0,
  )} kilometres per hour.${
    highlightDates.length
      ? ` ${highlightLabel}: ${highlightDates
          .map((date) =>
            dayLabel(
              date,
              days.findIndex((day) => day.date === date),
            ),
          )
          .join(" and ")}.`
      : ""
  }`;

  return (
    <section
      aria-labelledby="weekly-evidence-title"
      className={cn(
        "border-t border-rule pt-5",
        !stacked && "xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2
            id="weekly-evidence-title"
            className="display display-sm text-[1.25rem]"
          >
            Rain and gusts at the pin
          </h2>
          <p className="meta mt-1">
            <span className="whitespace-nowrap font-semibold text-foreground">
              {totalRain.toFixed(1)} mm
            </span>{" "}
            over {days.length} {days.length === 1 ? "day" : "days"} ·{" "}
            <span className="whitespace-nowrap">
              peak gust{" "}
              <span className="font-semibold text-foreground">
                {peakGust.toFixed(0)} km/h
              </span>
            </span>
          </p>
        </div>
        <Link
          href="/weather-water"
          className="inline-flex min-h-10 items-center text-[13px] font-semibold text-primary hover:underline"
        >
          Full conditions
        </Link>
      </div>

      <div
        className="mt-4 grid gap-px overflow-hidden rounded-md border border-rule bg-rule"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
        }}
        role="img"
        aria-label={summary}
        data-testid="weekly-day-values"
      >
        {days.map((day, index) => {
          const Icon = weatherIcon(day.weatherCode);
          const isHighlighted = highlighted.has(day.date);
          const gusty = day.windGustKph >= gustThreshold;
          const rainHeight =
            day.rainMm > 0 ? Math.max((day.rainMm / maxRain) * 100, 6) : 0;
          return (
            <div
              key={day.date}
              data-testid="weekly-day-value"
              className={cn(
                "relative flex min-w-0 flex-col items-center px-1 pb-2.5 pt-2.5 text-center",
                isHighlighted ? "bg-accent/70 dark:bg-accent/60" : "bg-sheet",
              )}
            >
              {isHighlighted ? (
                <span className="absolute inset-x-1 top-0 h-0.5 rounded-b bg-primary" />
              ) : null}
              <p
                data-testid="weekly-day-label"
                className={cn(
                  "text-[11px] font-semibold leading-none",
                  isHighlighted ? "text-primary" : "text-muted-foreground",
                )}
              >
                {dayLabel(day.date, index)}
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                {dayNumber(day.date)}
              </p>
              <Icon
                className={cn(
                  "mt-2 h-4 w-4",
                  day.weatherCode >= 51 ? "text-chart-2" : "text-chart-3",
                )}
                aria-hidden="true"
              />
              <p className="mt-1.5 text-[13px] font-semibold leading-none">
                {formatDegrees(day.temperatureMaxC)}°
              </p>
              <p className="mt-1 text-[11px] leading-none text-muted-foreground">
                {formatDegrees(day.temperatureMinC)}°
              </p>
              <div
                className="mt-2.5 flex h-12 w-full items-end justify-center"
                aria-hidden="true"
              >
                <span
                  className="block w-[42%] max-w-5 rounded-t-sm bg-info/75"
                  style={{ height: `${rainHeight}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-none text-info">
                {day.rainMm.toFixed(1)}
                <span className="sr-only"> mm</span>
              </p>
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-0.5 text-[11px] leading-none",
                  gusty ? "font-semibold text-check" : "text-muted-foreground",
                )}
              >
                <Wind className="h-3 w-3" aria-hidden="true" />
                {day.windGustKph.toFixed(0)}
              </p>
            </div>
          );
        })}
      </div>
      <p className="meta mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {highlightDates.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm bg-primary"
              aria-hidden="true"
            />
            {highlightLabel} the brief refers to
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-info/75" aria-hidden="true" />
          Rain, mm
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wind className="h-3 w-3" aria-hidden="true" />
          Gust, km/h; bold at {gustThreshold}+
        </span>
      </p>
    </section>
  );
}
