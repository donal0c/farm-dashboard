"use client";

import { CloudRain, CloudSun, Sun } from "lucide-react";

import type { ForecastDay } from "@/lib/sources/open-meteo";

function formatDay(date: string, index: number) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function weatherIcon(code: number) {
  if (code <= 1) return Sun;
  if (code >= 51) return CloudRain;
  return CloudSun;
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
  const gridStyle = {
    gridTemplateColumns: `repeat(${days.length}, minmax(92px, 1fr))`,
  };

  return (
    <section
      className="mt-5 w-full max-w-full overflow-x-auto border-y border-border"
      aria-label={`${days.length}-day rain and temperature comparison`}
      style={{ contain: "layout paint" }}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to reach and scroll this overflow region.
      tabIndex={0}
    >
      <div style={{ minWidth: `${Math.max(days.length * 96, 560)}px` }}>
        <div className="grid border-b border-border" style={gridStyle}>
          {days.map((day, index) => {
            const Icon = weatherIcon(day.weatherCode);
            return (
              <div
                key={day.date}
                className="flex items-center justify-center gap-2 border-r border-border px-2 py-3 last:border-r-0"
              >
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
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

            return (
              <article
                key={day.date}
                data-forecast-day={day.date}
                className="min-w-0 border-r border-border px-2 py-4 last:border-r-0"
              >
                <div className="relative mx-auto h-32 w-12" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <span
                    data-temperature-range
                    className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-primary/45"
                    style={{
                      bottom: `${lowPosition}%`,
                      height: `${Math.max(highPosition - lowPosition, 3)}%`,
                    }}
                  />
                  <span
                    className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-sm"
                    style={{ bottom: `${highPosition}%` }}
                  />
                  <span
                    className="absolute left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground"
                    style={{ bottom: `${lowPosition}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-sm font-semibold">
                  {day.temperatureMaxC.toFixed(0)}°
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    / {day.temperatureMinC.toFixed(0)}°
                  </span>
                </p>

                <div
                  className="relative mx-auto mt-4 h-16 w-8 overflow-hidden rounded-t bg-info/10"
                  aria-hidden="true"
                >
                  <span
                    data-rain-bar
                    className="absolute inset-x-0 bottom-0 rounded-t bg-info/70"
                    style={{ height: `${rainHeight}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-sm font-semibold">
                  {day.rainMm.toFixed(1)} mm
                </p>
                <dl className="mt-3 grid gap-1 text-center text-xs text-muted-foreground">
                  <div>
                    <dt className="sr-only">Rain probability</dt>
                    <dd>{day.precipitationProbability.toFixed(0)}% chance</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Peak gust</dt>
                    <dd>{day.windGustKph.toFixed(0)} km/h gust</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border px-3 py-3 text-xs text-muted-foreground">
          <p>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            Daily high
          </p>
          <p>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-foreground" />
            Daily low
          </p>
          <p>
            <span className="mr-2 inline-block h-3 w-2 rounded-t bg-info/70" />
            Rain amount
          </p>
        </div>
      </div>
    </section>
  );
}
