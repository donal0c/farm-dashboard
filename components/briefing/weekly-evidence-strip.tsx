import { CloudRain, Wind } from "lucide-react";
import Link from "next/link";

import type { ForecastDay } from "@/lib/sources/open-meteo";
import { cn } from "@/lib/utils";

function dayLabel(date: string, index: number) {
  if (index === 0) return "Today";
  return new Intl.DateTimeFormat("en-IE", { weekday: "short" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function WeeklyEvidenceStrip({
  days,
  stacked = false,
}: {
  days: ForecastDay[];
  stacked?: boolean;
}) {
  const totalRain = days.reduce((sum, day) => sum + day.rainMm, 0);
  const peakGust = Math.max(...days.map((day) => day.windGustKph), 0);
  const maxRain = Math.max(...days.map((day) => day.rainMm), 1);
  const slotWidth = 64;
  const chartWidth = Math.max(days.length * slotWidth, slotWidth);
  const gustPoints = days
    .map((day, index) => {
      const x = index * slotWidth + slotWidth / 2;
      const y = 100 - (day.windGustKph / Math.max(peakGust, 1)) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const summary = `${days.length} usable forecast days. ${totalRain.toFixed(
    1,
  )} millimetres total rain. Peak modelled gust ${peakGust.toFixed(
    0,
  )} kilometres per hour.`;

  return (
    <section
      aria-labelledby="weekly-evidence-title"
      className={cn(
        "border-t border-border pt-5",
        !stacked && "xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Seven-day evidence
          </p>
          <h2
            id="weekly-evidence-title"
            className="font-editorial mt-1 text-2xl font-medium"
          >
            Rain and gusts at the pin
          </h2>
        </div>
        <Link
          href="/weather-water"
          className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-primary hover:underline"
        >
          Full conditions
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 border-y border-border">
        <div className="flex items-center gap-3 border-r border-border py-3 pr-3">
          <CloudRain className="h-4 w-4 text-info" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Total rain
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {totalRain.toFixed(1)} mm
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 py-3 pl-3">
          <Wind className="h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Peak gust
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {peakGust.toFixed(0)} km/h
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 min-w-0" role="img" aria-label={summary}>
        <div className="relative h-[92px] border-b border-border">
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => (
              <div key={day.date} className="relative min-w-0">
                <span
                  className="absolute bottom-0 left-1/2 w-6 max-w-[58%] -translate-x-1/2 rounded-t-sm border border-info/60 bg-info/18"
                  style={{
                    height: `${Math.max(
                      (day.rainMm / maxRain) * 100,
                      day.rainMm > 0 ? 4 : 1,
                    )}%`,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="absolute left-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card"
                  style={{
                    top: `${100 - (day.windGustKph / Math.max(peakGust, 1)) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
          <svg
            viewBox={`0 0 ${chartWidth} 100`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {days.length > 1 ? (
              <polyline
                points={gustPoints}
                fill="none"
                className="stroke-primary"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
          </svg>
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          {days.map((day, index) => (
            <p
              key={day.date}
              data-testid="weekly-day-label"
              className="min-w-0 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground"
            >
              {dayLabel(day.date, index)}
            </p>
          ))}
        </div>
      </div>

      <div
        className="mt-1 grid border-t border-border"
        data-testid="weekly-day-values"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        {days.map((day) => (
          <div
            key={day.date}
            data-testid="weekly-day-value"
            className="min-w-0 border-r border-border px-0.5 py-2 text-center last:border-r-0"
          >
            <p className="text-[10px] font-semibold text-foreground">
              {day.temperatureMaxC.toFixed(0)}°
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {day.rainMm.toFixed(1)} mm
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
