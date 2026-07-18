"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CircleAlert,
  Droplets,
  ExternalLink,
  Gauge,
  MapPin,
  ShieldAlert,
  Wind,
} from "lucide-react";
import Link from "next/link";

import { ForecastComparison } from "@/components/conditions/forecast-comparison";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import { sourceQueryStaleTime } from "@/lib/client/source-query-policy";
import { type MetWarning, metWarningsSchema } from "@/lib/sources/met-warnings";
import {
  type FarmForecast,
  farmForecastSchema,
} from "@/lib/sources/open-meteo";
import {
  type NearbyOpwReading,
  nearbyOpwReadingsSchema,
} from "@/lib/sources/opw";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
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
    queryFn: () =>
      fetchValidatedSourceSnapshot<FarmForecast>(
        `/api/data/forecast?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}`,
        farmForecastSchema,
      ),
    enabled: Boolean(farmLocation),
    staleTime: sourceQueryStaleTime.forecast,
  });
  const warningsQuery = useQuery({
    queryKey: ["met-warnings"],
    queryFn: () =>
      fetchValidatedSourceSnapshot<MetWarning[]>(
        "/api/data/met/warnings",
        metWarningsSchema,
      ),
    staleTime: sourceQueryStaleTime.metWarnings,
  });
  const opwQuery = useQuery({
    queryKey: ["opw-nearby", farmLocation?.latitude, farmLocation?.longitude],
    queryFn: () =>
      fetchValidatedSourceSnapshot<NearbyOpwReading[]>(
        `/api/data/opw/nearby?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}`,
        nearbyOpwReadingsSchema,
      ),
    enabled: Boolean(farmLocation),
    staleTime: sourceQueryStaleTime.opw,
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
  const forecastUnavailable =
    forecastQuery.isError || forecastQuery.data?.status === "unavailable";
  const forecastPartial = forecastQuery.data?.status === "partial";
  const warningsUnavailable =
    warningsQuery.isError || warningsQuery.data?.status === "unavailable";
  const warningsPartial = warningsQuery.data?.status === "partial";
  const opwUnavailable =
    opwQuery.isError || opwQuery.data?.status === "unavailable";
  const rainScopeLabel =
    forecastPartial && days.length
      ? `Rain, ${days.length} validated days`
      : "Seven-day rain";

  return (
    <div className="min-w-0 overflow-x-clip">
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Conditions · {farmLocation.routingKey ?? farmLocation.label}
        </p>
        <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.035em] sm:text-6xl">
          A working weather window
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          Compare rain, temperature, wind and official notices before planning
          field work. Forecasts are model estimates; nearby OPW sensors are raw
          observations at their own locations, not measurements of your fields.
        </p>
      </header>

      <section className="grid gap-4 border-b border-border py-5 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <Droplets className="h-5 w-5 text-info" />
          <div>
            <p className="text-xs text-muted-foreground">{rainScopeLabel}</p>
            <p className="font-semibold">
              {forecastQuery.isLoading
                ? "Loading"
                : days.length
                  ? `${totalRain.toFixed(1)} mm`
                  : "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Wind className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Peak modelled gust</p>
            <p className="font-semibold">
              {forecastQuery.isLoading
                ? "Loading"
                : days.length
                  ? `${peakGust.toFixed(0)} km/h`
                  : "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-warning" />
          <div>
            <p className="text-xs text-muted-foreground">Active notices</p>
            <p className="font-semibold">
              {warningsQuery.isLoading
                ? "Loading"
                : warningsUnavailable
                  ? "Unavailable"
                  : warnings.length}
            </p>
          </div>
        </div>
      </section>

      {warningsQuery.isLoading ? (
        <section className="border-b border-border py-5">
          <output
            className="block animate-pulse"
            aria-label="Loading official weather notices"
          >
            <span className="block h-5 w-44 rounded bg-muted" />
            <span className="mt-3 block h-12 rounded bg-muted" />
          </output>
        </section>
      ) : warnings.length ? (
        <section className="border-b border-border py-7">
          {warningsPartial ? (
            <div className="mb-5 flex gap-2 border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Partial warning feed:{" "}
                {warningsQuery.data?.warning ??
                  "Some source records were excluded."}
              </p>
            </div>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">
            Official notice
          </p>
          {warnings.map((warning) => (
            <article
              key={warning.id}
              className="mt-4 border-l-2 border-warning bg-warning/10 px-5 py-4"
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
              <h2 className="font-editorial mt-2 text-2xl font-medium">
                {warning.headline}
              </h2>
              <p className="mt-3 line-clamp-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {warning.description}
              </p>
            </article>
          ))}
        </section>
      ) : (
        <section className="flex items-start gap-3 border-b border-border py-5 text-sm">
          <ShieldAlert
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              warningsUnavailable ? "text-destructive" : "text-primary"
            }`}
          />
          <div>
            <p className="font-semibold">
              {warningsUnavailable
                ? "Official warning feed unavailable"
                : warningsPartial
                  ? "Official warning feed partially available"
                  : "No active notices returned"}
            </p>
            <p className="mt-1 leading-6 text-muted-foreground">
              {warningsUnavailable
                ? "AgriView cannot confirm warning status. Check Met Éireann directly before weather-sensitive work."
                : warningsPartial
                  ? `${warningsQuery.data?.warning ?? "Some source records were excluded."} No active notice is shown from the validated records that remain. Check Met Éireann directly.`
                  : "The national Met Éireann feed returned no active warning records at its latest check."}
            </p>
          </div>
        </section>
      )}

      <section className="border-b border-border py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Model estimate at the farm pin
        </p>
        <h2 className="font-editorial mt-1 text-3xl font-medium">
          Rain and temperature window
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Use the shared daily scale to compare workable periods. High and low
          temperatures share one range; rain bars share one rainfall scale.
        </p>
        {forecastQuery.isLoading ? (
          <output
            className="mt-5 block animate-pulse border-y border-border py-5"
            aria-label="Loading rain and temperature forecast"
          >
            <span className="block h-8 rounded bg-muted" />
            <span className="mt-3 block h-[330px] rounded bg-muted" />
          </output>
        ) : days.length ? (
          <>
            {forecastPartial ? (
              <div className="mt-5 flex gap-2 border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p>
                  Partial forecast:{" "}
                  {forecastQuery.data?.warning ??
                    "Some source rows were excluded."}{" "}
                  The chart shows only the {days.length} validated days
                  returned.
                </p>
              </div>
            ) : null}
            <ForecastComparison days={days} />
          </>
        ) : (
          <p className="mt-5 border-l-2 border-destructive py-2 pl-4 text-sm text-muted-foreground">
            {forecastUnavailable
              ? "The forecast source is unavailable. No values have been substituted."
              : "The source returned no validated forecast days. No values have been substituted."}
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Open-Meteo model estimate at {farmLocation.latitude.toFixed(4)},{" "}
          {farmLocation.longitude.toFixed(4)}. Latest AgriView check:{" "}
          {forecastQuery.data?.fetchedAt
            ? formatTime(forecastQuery.data.fetchedAt)
            : "not available"}
          . Confirm field conditions and the latest local forecast immediately
          before weather-sensitive work.
        </p>
      </section>

      <section className="py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Latest raw observations
            </p>
            <h2 className="font-editorial mt-1 text-3xl font-medium">
              Nearby OPW water readings
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
        <div className="mt-4 flex max-w-3xl items-start gap-2 text-sm leading-6 text-muted-foreground">
          <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-info" />
          <p>
            AgriView currently retrieves each sensor’s latest validated
            observation only. It does not infer a trend, normal range, warning
            threshold, or flood risk from a single reading.
          </p>
        </div>
        <div className="mt-5 border-y border-border">
          {opwQuery.isLoading ? (
            <output
              className="block animate-pulse py-5"
              aria-label="Loading nearby OPW sensor readings"
            >
              <span className="block h-14 rounded bg-muted" />
              <span className="mt-2 block h-14 rounded bg-muted" />
            </output>
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
                  <p className="text-xs text-muted-foreground">
                    Latest observation
                  </p>
                  <p className="text-xs font-semibold">
                    {formatTime(reading.observedAt)}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="py-6 text-sm">
              <p
                className={
                  opwUnavailable
                    ? "font-semibold text-destructive"
                    : "font-semibold"
                }
              >
                {opwUnavailable
                  ? "Current OPW readings are temporarily unavailable."
                  : "No validated current OPW readings were returned nearby."}
              </p>
              <p className="mt-1 leading-6 text-muted-foreground">
                {opwUnavailable
                  ? "The request failed; AgriView has not presented that as an empty sensor result."
                  : "This is a valid empty response for the search around your farm pin."}
              </p>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Observations are ordered by distance to the saved pin, not by risk.
          Open the official station record and local guidance before
          interpreting a water level.
        </p>
      </section>
    </div>
  );
}
