"use client";

import {
  formatDegrees,
  weatherIcon,
} from "@/components/briefing/weekly-evidence-strip";
import { briefingRules } from "@/lib/briefing/rules";
import type { ForecastDay } from "@/lib/sources/open-meteo";
import { cn } from "@/lib/utils";

function formatDay(date: string, index: number) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

type ForecastComparisonProps = {
  days: ForecastDay[];
};

export function ForecastComparison({ days }: ForecastComparisonProps) {
  const rainMax = Math.max(...days.map((day) => day.rainMm), 1);
  const temperatureMin = Math.floor(
    Math.min(...days.map((day) => day.temperatureMinC)) - 2,
  );
  const temperatureMax = Math.ceil(
    Math.max(...days.map((day) => day.temperatureMaxC)) + 2,
  );
  const temperatureRange = Math.max(temperatureMax - temperatureMin, 1);
  const gustThreshold = briefingRules.windCheck.threshold;
  const gridStyle = {
    gridTemplateColumns: `repeat(${days.length}, minmax(96px, 1fr))`,
  };

  return (
    <section
      className="panel mt-5 w-full max-w-full overflow-x-auto"
      aria-label={`${days.length}-day rain and temperature comparison`}
      style={{ contain: "layout paint" }}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to reach and scroll this overflow region.
      tabIndex={0}
    >
      <div style={{ minWidth: `${Math.max(days.length * 100, 560)}px` }}>
        <div className="grid border-b border-rule" style={gridStyle}>
          {days.map((day, index) => {
            const Icon = weatherIcon(day.weatherCode);
            return (
              <div
                key={day.date}
                className="flex items-center justify-center gap-2 border-r border-rule px-2 py-3 last:border-r-0"
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    day.weatherCode >= 51 ? "text-chart-2" : "text-chart-3",
                  )}
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold text-foreground">
                  {formatDay(day.date, index)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid" style={gridStyle}>
          {days.map((day) => {
            const lowPosition =
              ((day.temperatureMinC - temperatureMin) / temperatureRange) * 100;
            const highPosition =
              ((day.temperatureMaxC - temperatureMin) / temperatureRange) * 100;
            const rainHeight =
              day.rainMm > 0 ? Math.max((day.rainMm / rainMax) * 100, 3) : 0;
            const gusty = day.windGustKph >= gustThreshold;

            return (
              <article
                key={day.date}
                data-forecast-day={day.date}
                className="min-w-0 border-r border-rule px-2 py-4 last:border-r-0"
              >
                <div className="relative mx-auto h-32 w-12" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-rule" />
                  <span
                    data-temperature-range
                    className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-primary/40"
                    style={{
                      bottom: `${lowPosition}%`,
                      height: `${Math.max(highPosition - lowPosition, 3)}%`,
                    }}
                  />
                  <span
                    className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-sheet bg-primary shadow-sm"
                    style={{ bottom: `${highPosition}%` }}
                  />
                  <span
                    className="absolute left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground"
                    style={{ bottom: `${lowPosition}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-sm font-semibold">
                  {formatDegrees(day.temperatureMaxC)}°
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    / {formatDegrees(day.temperatureMinC)}°
                  </span>
                </p>

                <div
                  className="relative mx-auto mt-4 h-16 w-8 overflow-hidden rounded-t bg-info/10"
                  aria-hidden="true"
                >
                  <span
                    data-rain-bar
                    className="absolute inset-x-0 bottom-0 rounded-t bg-info/75"
                    style={{ height: `${rainHeight}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-sm font-semibold text-info">
                  {day.rainMm.toFixed(1)} mm
                </p>
                <dl className="mt-3 grid gap-1 text-center text-xs text-muted-foreground">
                  <div>
                    <dt className="sr-only">Rain probability</dt>
                    <dd>{day.precipitationProbability.toFixed(0)}% chance</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Peak gust</dt>
                    <dd className={cn(gusty && "font-semibold text-check")}>
                      {day.windGustKph.toFixed(0)} km/h gust
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-rule px-3 py-3 text-xs text-muted-foreground">
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            Daily high
          </p>
          <p>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-foreground" />
            Daily low
          </p>
          <p>
            <span className="mr-2 inline-block h-3 w-2 rounded-t bg-info/75" />
            Rain amount
          </p>
          <p>Gusts in bold at {gustThreshold} km/h and above.</p>
        </div>
      </div>
    </section>
  );
}
