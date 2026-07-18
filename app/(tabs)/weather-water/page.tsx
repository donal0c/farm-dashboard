"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CloudRain,
  CloudSun,
  Droplets,
  ExternalLink,
  Gauge,
  MapPin,
  ShieldAlert,
  Sun,
  Wind,
} from "lucide-react";
import Link from "next/link";

import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";
import type { MetWarning } from "@/lib/sources/met-warnings";
import type { FarmForecast, ForecastDay } from "@/lib/sources/open-meteo";
import type { NearbyOpwReading } from "@/lib/sources/opw";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function weatherIcon(code: number) {
  if (code <= 1) return Sun;
  if (code >= 51) return CloudRain;
  return CloudSun;
}

function ConditionsPlaceholder() {
  return (
    <output className="block animate-pulse" aria-label="Loading conditions">
      <span className="block h-12 w-2/3 rounded bg-muted" />
      <span className="mt-8 block h-60 rounded bg-muted" />
    </output>
  );
}

export default function WeatherWaterPage() {
  const farmLocation = useUiStore((state) => state.farmLocation);
  const hasHydrated = useUiStore((state) => state.hasHydrated);

  const forecastQuery = useQuery({
    queryKey: [
      "farm-forecast",
      farmLocation?.latitude,
      farmLocation?.longitude,
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/forecast?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}`,
      );
      return (await response.json()) as SourceSnapshot<FarmForecast>;
    },
    enabled: Boolean(farmLocation),
  });
  const warningsQuery = useQuery({
    queryKey: ["met-warnings"],
    queryFn: async () =>
      (await fetch("/api/data/met/warnings").then((response) =>
        response.json(),
      )) as SourceSnapshot<MetWarning[]>,
  });
  const opwQuery = useQuery({
    queryKey: ["opw-nearby", farmLocation?.latitude, farmLocation?.longitude],
    queryFn: async () =>
      (await fetch(
        `/api/data/opw/nearby?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}`,
      ).then((response) => response.json())) as SourceSnapshot<
        NearbyOpwReading[]
      >,
    enabled: Boolean(farmLocation),
  });

  if (!hasHydrated) return <ConditionsPlaceholder />;
  if (!farmLocation) {
    return (
      <div className="max-w-2xl border-t border-border pt-8">
        <MapPin className="h-7 w-7 text-primary" />
        <h1 className="font-editorial mt-5 text-5xl font-medium">
          Conditions need a farm pin
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Save a manual point first so forecast and water readings keep their
          geographic meaning.
        </p>
        <Link
          href="/this-week"
          className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-primary"
        >
          Set up the farm
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const days = forecastQuery.data?.data?.days ?? [];
  const warnings = warningsQuery.data?.data ?? [];
  const readings = opwQuery.data?.data ?? [];
  const totalRain = days.reduce((sum, day) => sum + day.rainMm, 0);
  const peakGust = Math.max(...days.map((day) => day.windGustKph), 0);

  return (
    <div>
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Conditions · {farmLocation.routingKey ?? farmLocation.label}
        </p>
        <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.035em] sm:text-6xl">
          Weather at the pin
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          A seven-day model forecast, current official warnings, and nearby OPW
          sensor readings. Forecasts estimate conditions; sensors report their
          own locations, not your fields.
        </p>
      </header>

      <section className="grid gap-4 border-b border-border py-5 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <Droplets className="h-5 w-5 text-info" />
          <div>
            <p className="text-xs text-muted-foreground">Seven-day rain</p>
            <p className="font-semibold">
              {days.length ? `${totalRain.toFixed(1)} mm` : "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Wind className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Peak modelled gust</p>
            <p className="font-semibold">
              {days.length ? `${peakGust.toFixed(0)} km/h` : "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-warning" />
          <div>
            <p className="text-xs text-muted-foreground">Active notices</p>
            <p className="font-semibold">
              {warningsQuery.isLoading ? "Loading" : warnings.length}
            </p>
          </div>
        </div>
      </section>

      {warnings.length ? (
        <section className="border-b border-border py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">
            Official notice
          </p>
          {warnings.map((warning) => (
            <article
              key={warning.id}
              className="mt-4 border-l-2 border-warning bg-warning/10 px-5 py-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-warning">
                  {warning.level} · expires {formatTime(warning.expiresAt)}
                </p>
                <a
                  href="https://www.met.ie/warnings-today.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                >
                  Met Éireann
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <h2 className="font-editorial mt-2 text-3xl font-medium">
                {warning.headline}
              </h2>
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {warning.description}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="border-b border-border py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Point forecast
        </p>
        <h2 className="font-editorial mt-1 text-3xl font-medium">
          Seven-day outlook
        </h2>
        {forecastQuery.isLoading ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Loading the current forecast…
          </p>
        ) : days.length ? (
          <section
            className="mt-5 overflow-x-auto border-y border-border"
            aria-label="Seven-day forecast details"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to reach and scroll this overflow region.
            tabIndex={0}
          >
            <div className="grid min-w-[760px] grid-cols-7">
              {days.map((day: ForecastDay, index: number) => {
                const Icon = weatherIcon(day.weatherCode);
                return (
                  <article
                    key={day.date}
                    className="border-r border-border px-3 py-5 last:border-r-0"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {index === 0 ? "Today" : formatDay(day.date)}
                    </p>
                    <Icon className="mt-4 h-6 w-6 text-primary" />
                    <p className="font-editorial mt-3 text-3xl font-medium">
                      {day.temperatureMaxC.toFixed(0)}°
                    </p>
                    <p className="text-xs text-muted-foreground">
                      low {day.temperatureMinC.toFixed(0)}°
                    </p>
                    <dl className="mt-4 grid gap-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Rain</dt>
                        <dd className="font-semibold">
                          {day.rainMm.toFixed(1)} mm
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Chance</dt>
                        <dd className="font-semibold">
                          {day.precipitationProbability.toFixed(0)}%
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Gust</dt>
                        <dd className="font-semibold">
                          {day.windGustKph.toFixed(0)} km/h
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="mt-5 border-l-2 border-destructive py-2 pl-4 text-sm text-muted-foreground">
            The forecast source is unavailable. No values have been substituted.
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Open-Meteo model estimate at {farmLocation.latitude.toFixed(4)},{" "}
          {farmLocation.longitude.toFixed(4)}. Confirm field conditions and the
          latest local forecast immediately before weather-sensitive work.
        </p>
      </section>

      <section className="py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Nearby water sensors
            </p>
            <h2 className="font-editorial mt-1 text-3xl font-medium">
              OPW readings
            </h2>
          </div>
          <a
            href="https://waterlevel.ie/"
            target="_blank"
            rel="noreferrer"
            className="hidden min-h-11 items-center gap-2 text-sm font-semibold text-primary sm:flex"
          >
            waterlevel.ie
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-5 border-y border-border">
          {opwQuery.isLoading ? (
            <p className="py-6 text-sm text-muted-foreground">
              Finding nearby current sensors…
            </p>
          ) : readings.length ? (
            readings.slice(0, 6).map((reading, index) => (
              <article
                key={`${reading.stationRef}-${reading.sensorRef}`}
                className="grid min-h-16 items-center gap-3 border-b border-border py-3 last:border-b-0 sm:grid-cols-[32px_minmax(0,1fr)_110px_150px]"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    index === 0
                      ? "bg-info/15 text-info"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Gauge className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{reading.stationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {reading.distanceKm.toFixed(1)} km from farm pin
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {reading.parameter}
                  </p>
                  <p className="font-semibold">
                    {reading.value.toFixed(3)} {reading.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Observed</p>
                  <p className="text-xs font-semibold">
                    {formatTime(reading.observedAt)}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              Current OPW readings are unavailable.
            </p>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Water levels are shown without an inferred safe, warning, or flood
          threshold. Open the official station record and local guidance before
          interpreting risk.
        </p>
      </section>
    </div>
  );
}
