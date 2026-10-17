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
 * The weather ledger, drawn: a temperature band between each day's high and
 * low, rain bars on one scale, and the peak gust per day. The days the lead
 * decision names are banded in moss so the evidence visibly supports the call.
 * Every value is also present as text.
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
  const count = Math.max(days.length, 1);
  const totalRain = days.reduce((sum, day) => sum + day.rainMm, 0);
  const peakGust = Math.max(...days.map((day) => day.windGustKph), 0);
  const maxRain = Math.max(...days.map((day) => day.rainMm), 1);
  const gustThreshold = briefingRules.windCheck.threshold;
  const highlighted = new Set(highlightDates);
  const tempMin = Math.floor(
    Math.min(...days.map((day) => day.temperatureMinC)) - 1,
  );
  const tempMax = Math.ceil(
    Math.max(...days.map((day) => day.temperatureMaxC)) + 1,
  );
  const tempRange = Math.max(tempMax - tempMin, 1);
  const y = (value: number) => 100 - ((value - tempMin) / tempRange) * 100;
  const x = (index: number) => ((index + 0.5) / count) * 100;
  const highLine = days.map((day, i) => `${x(i)},${y(day.temperatureMaxC)}`);
  const lowLine = days.map((day, i) => `${x(i)},${y(day.temperatureMinC)}`);
  const areaPath =
    days.length > 1
      ? `M ${highLine.join(" L ")} L ${[...lowLine].reverse().join(" L ")} Z`
      : "";
  const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };
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
  const cell = (date: string, extra?: string) =>
    cn(
      "relative min-w-0",
      highlighted.has(date) && "bg-window/20 dark:bg-window/25",
      extra,
    );

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
        className="mt-4 overflow-hidden rounded-md border border-rule bg-sheet"
        role="img"
        aria-label={summary}
      >
        <div className="grid border-b border-rule" style={columns}>
          {days.map((day, index) => {
            const Icon = weatherIcon(day.weatherCode);
            const on = highlighted.has(day.date);
            return (
              <div
                key={day.date}
                className={cell(day.date, "px-1 pb-2 pt-2.5 text-center")}
              >
                {on ? (
                  <span className="absolute inset-x-0 top-0 h-[3px] bg-window" />
                ) : null}
                <p
                  data-testid="weekly-day-label"
                  className={cn(
                    "text-[11px] font-semibold leading-none",
                    on ? "text-primary" : "text-foreground",
                  )}
                >
                  {dayLabel(day.date, index)}
                </p>
                <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                  {dayNumber(day.date)}
                </p>
                <Icon
                  className={cn(
                    "mx-auto mt-1.5 h-4 w-4",
                    day.weatherCode >= 51 ? "text-rain" : "text-chart-3",
                  )}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>

        <div className="relative">
          <div className="grid" style={columns}>
            {days.map((day) => (
              <div key={day.date} className={cell(day.date, "h-[88px]")}>
                <span
                  className="absolute left-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sheet bg-primary"
                  style={{ top: `${y(day.temperatureMaxC)}%` }}
                  aria-hidden="true"
                />
                <span
                  className="absolute left-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/70"
                  style={{ top: `${y(day.temperatureMinC)}%` }}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {areaPath ? (
              <path d={areaPath} className="fill-primary/12" />
            ) : null}
            {days.length > 1 ? (
              <>
                <polyline
                  points={highLine.join(" ")}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="1.75"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
                <polyline
                  points={lowLine.join(" ")}
                  fill="none"
                  className="stroke-foreground/45"
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </>
            ) : null}
          </svg>
        </div>
        <div className="grid border-b border-rule" style={columns}>
          {days.map((day) => (
            <div key={day.date} className={cell(day.date, "pb-2 text-center")}>
              <p className="text-[13px] font-semibold leading-none">
                {formatDegrees(day.temperatureMaxC)}°
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  {formatDegrees(day.temperatureMinC)}°
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="grid" style={columns} data-testid="weekly-day-values">
          {days.map((day) => {
            const height =
              day.rainMm > 0 ? Math.max((day.rainMm / maxRain) * 100, 6) : 0;
            return (
              <div
                key={day.date}
                data-testid="weekly-day-value"
                className={cell(day.date, "px-1 pb-2 pt-3 text-center")}
              >
                <div
                  className="flex h-12 w-full items-end justify-center"
                  aria-hidden="true"
                >
                  <span
                    className="block w-[46%] max-w-6 rounded-t-sm bg-rain"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-semibold leading-none text-rain">
                  {day.rainMm.toFixed(1)}
                  <span className="sr-only"> mm</span>
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid border-t border-rule" style={columns}>
          {days.map((day) => {
            const gusty = day.windGustKph >= gustThreshold;
            return (
              <div
                key={day.date}
                className={cell(day.date, "py-2 text-center")}
              >
                <p
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] leading-none",
                    gusty
                      ? "font-semibold text-check"
                      : "text-muted-foreground",
                  )}
                >
                  <Wind className="h-3 w-3" aria-hidden="true" />
                  {day.windGustKph.toFixed(0)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="footnote mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {highlightDates.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-3 rounded-sm bg-window/60"
              aria-hidden="true"
            />
            {highlightLabel}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-primary"
            aria-hidden="true"
          />
          High
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-foreground/70"
            aria-hidden="true"
          />
          Low
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-rain" aria-hidden="true" />
          Rain, mm
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wind className="h-3 w-3" aria-hidden="true" />
          Gust, km/h · bold from {gustThreshold}
        </span>
      </p>
    </section>
  );
}
