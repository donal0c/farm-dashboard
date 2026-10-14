"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Gauge } from "lucide-react";

import { ForecastComparison } from "@/components/conditions/forecast-comparison";
import { NeedsFarm, PageSkeleton } from "@/components/ui/needs-farm";
import { Fact, PageIntro, SectionHeading } from "@/components/ui/page-intro";
import { PriorityMark } from "@/components/ui/priority-mark";
import { SourceNotice } from "@/components/ui/source-notice";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import { sourceQueryStaleTime } from "@/lib/client/source-query-policy";
import {
  normalizeIrishCounty,
  warningRegionsIncludeCounty,
} from "@/lib/ireland/counties";
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

const STALE_READING_HOURS = 6;

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function readingAge(observedAt: string, now: number) {
  const ageMs = now - Date.parse(observedAt);
  const hours = ageMs / 3_600_000;
  const formatter = new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" });
  const label =
    hours < 1
      ? formatter.format(-Math.max(1, Math.round(ageMs / 60_000)), "minute")
      : hours < 48
        ? formatter.format(-Math.round(hours), "hour")
        : formatter.format(-Math.round(hours / 24), "day");
  return { label, stale: hours > STALE_READING_HOURS };
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function WarningCard({
  warning,
  county,
}: {
  warning: MetWarning;
  county: string | null;
}) {
  const covers = warningRegionsIncludeCounty(warning.regions, county);
  const regional =
    warning.regions.length > 0 &&
    !warning.regions.some((item) => /ireland|national|all/i.test(item));
  const kind = covers
    ? warning.level === "Red" || warning.level === "Orange"
      ? "act"
      : "check"
    : regional && county
      ? "watch"
      : "check";
  const countyLabel = county ? titleCase(county) : null;
  return (
    <article className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 py-5 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-5">
      <PriorityMark kind={kind} />
      <div className="min-w-0">
        <h3 className="display display-sm max-w-[36ch]">{warning.headline}</h3>
        <p className="meta mt-2">
          In force until {formatTime(warning.expiresAt)}
          {warning.certainty ? ` · ${warning.certainty.toLowerCase()}` : ""}
          {countyLabel
            ? covers
              ? ` · lists ${countyLabel}`
              : regional
                ? ` · ${countyLabel} not listed`
                : ""
            : ""}
        </p>
        <p className="mt-2 max-w-[66ch] text-sm leading-6 text-muted-foreground">
          {warning.description}
        </p>
        <a
          href="https://www.met.ie/warnings-today.html"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          Read it on Met Éireann
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </article>
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

  if (!hasHydrated) return <PageSkeleton label="Loading conditions" />;
  if (!farmLocation) {
    return (
      <NeedsFarm
        title="Conditions need a farm pin"
        detail="Save a manual point first so forecast and water readings keep their geographic meaning."
      />
    );
  }

  const days = forecastQuery.data?.data?.days ?? [];
  const warnings = warningsQuery.data?.data ?? [];
  const readings = opwQuery.data?.data ?? [];
  const county = normalizeIrishCounty(farmLocation.county);
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
  const now = Date.now();
  const coveringCount = warnings.filter((warning) =>
    warningRegionsIncludeCounty(warning.regions, county),
  ).length;

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageIntro
        title="A working weather window"
        lede="Compare rain, temperature, wind and official notices before planning field work. Forecasts are model estimates; nearby OPW sensors are raw observations at their own locations, not measurements of your fields."
      />

      <dl className="grid gap-4 border-b border-rule py-5 sm:grid-cols-3">
        <Fact label={rainScopeLabel}>
          {forecastQuery.isLoading
            ? "Loading"
            : days.length
              ? `${totalRain.toFixed(1)} mm`
              : "Unavailable"}
        </Fact>
        <Fact label="Peak modelled gust">
          {forecastQuery.isLoading
            ? "Loading"
            : days.length
              ? `${peakGust.toFixed(0)} km/h`
              : "Unavailable"}
        </Fact>
        <Fact label="Active notices">
          {warningsQuery.isLoading
            ? "Loading"
            : warningsUnavailable
              ? "Unavailable"
              : county
                ? `${warnings.length} · ${coveringCount} ${coveringCount === 1 ? "lists" : "list"} ${titleCase(county)}`
                : warnings.length}
        </Fact>
      </dl>

      <section
        className="border-b border-rule py-7"
        aria-label="Official notices"
      >
        <SectionHeading
          title="Official notices"
          lede="Met Éireann warnings in force now, ordered as published. Red or Orange is an Act, Yellow a Check, and a warning that does not list your county only a Watch."
          aside={
            <a
              href="https://www.met.ie/warnings-today.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Met Éireann
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          }
        />
        <div className="mt-3 divide-y divide-rule">
          {warningsQuery.isLoading ? (
            <output
              className="block animate-pulse"
              aria-label="Loading official weather notices"
            >
              <span className="block h-5 w-44 rounded-sm bg-muted" />
              <span className="mt-3 block h-24 rounded-md bg-muted" />
            </output>
          ) : (
            <>
              {warningsPartial ? (
                <SourceNotice
                  tone="partial"
                  title={
                    warnings.length
                      ? "Partial warning feed"
                      : "Official warning feed partially available"
                  }
                  detail={`${warningsQuery.data?.warning ?? "Some source records were excluded."} ${warnings.length ? "" : "No active notice is shown from the validated records that remain."} Check Met Éireann directly.`}
                  onRetry={() => void warningsQuery.refetch()}
                />
              ) : null}
              {warningsUnavailable ? (
                <SourceNotice
                  tone="unavailable"
                  title="Official warning feed unavailable"
                  detail="AgriView cannot confirm warning status. Check Met Éireann directly before weather-sensitive work."
                  onRetry={() => void warningsQuery.refetch()}
                />
              ) : null}
              {warnings.map((warning) => (
                <WarningCard
                  key={warning.id}
                  warning={warning}
                  county={county}
                />
              ))}
              {!warnings.length && !warningsUnavailable && !warningsPartial ? (
                <SourceNotice
                  tone="empty"
                  title="No active notices returned"
                  detail="The national Met Éireann feed returned no active warning records at its latest check."
                />
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="border-b border-rule py-8">
        <SectionHeading
          title="Rain and temperature window"
          lede="Model estimate at the farm pin on one shared daily scale. High and low temperatures share one range; rain bars share one rainfall scale."
        />
        {forecastQuery.isLoading ? (
          <output
            className="mt-5 block animate-pulse"
            aria-label="Loading rain and temperature forecast"
          >
            <span className="block h-[330px] rounded-md bg-muted" />
          </output>
        ) : days.length ? (
          <>
            {forecastPartial ? (
              <SourceNotice
                tone="partial"
                className="mt-5"
                title="Partial forecast: incomplete days were excluded."
                detail={`${forecastQuery.data?.warning ?? "Some source rows were excluded."} The chart shows only the ${days.length} validated days returned.`}
                onRetry={() => void forecastQuery.refetch()}
              />
            ) : null}
            <ForecastComparison days={days} />
          </>
        ) : (
          <SourceNotice
            tone={forecastUnavailable ? "unavailable" : "empty"}
            className="mt-5"
            title={
              forecastUnavailable
                ? "The forecast source is unavailable."
                : "The source returned no validated forecast days."
            }
            detail="No values have been substituted."
            onRetry={() => void forecastQuery.refetch()}
          />
        )}
        <p className="meta mt-4 max-w-[80ch] text-xs">
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
        <SectionHeading
          title="Nearby OPW water readings"
          lede="Each sensor’s latest validated observation only. AgriView does not infer a trend, normal range, warning threshold, or flood risk from a single reading."
          aside={
            <a
              href="https://waterlevel.ie/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              waterlevel.ie
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          }
        />
        <div className="mt-5 divide-y divide-rule border-y border-rule">
          {opwQuery.isLoading ? (
            <output
              className="block animate-pulse py-5"
              aria-label="Loading nearby OPW sensor readings"
            >
              <span className="block h-14 rounded-md bg-muted" />
              <span className="mt-2 block h-14 rounded-md bg-muted" />
            </output>
          ) : readings.length ? (
            readings.slice(0, 6).map((reading, index) => {
              const age = readingAge(reading.observedAt, now);
              return (
                <article
                  key={`${reading.stationRef}-${reading.sensorRef}`}
                  className="grid min-h-16 items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_120px_190px]"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      index === 0
                        ? "bg-info/15 text-info"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    <Gauge className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {reading.stationName}
                    </p>
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
                      <span
                        className={cn(
                          "ml-1.5 font-normal",
                          age.stale ? "text-check" : "text-muted-foreground",
                        )}
                      >
                        · {age.label}
                        {age.stale ? ", stale" : ""}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="py-5">
              <SourceNotice
                tone={opwUnavailable ? "unavailable" : "empty"}
                title={
                  opwUnavailable
                    ? "Current OPW readings are temporarily unavailable."
                    : "No validated current OPW readings were returned nearby."
                }
                detail={
                  opwUnavailable
                    ? "The request failed; AgriView has not presented that as an empty sensor result."
                    : "This is a valid empty response for the search around your farm pin."
                }
                onRetry={
                  opwUnavailable ? () => void opwQuery.refetch() : undefined
                }
              />
            </div>
          )}
        </div>
        <p className="meta mt-4 max-w-[80ch] text-xs">
          Observations are ordered by distance to the saved pin, not by risk. A
          reading older than {STALE_READING_HOURS} hours is marked stale. Open
          the official station record and local guidance before interpreting a
          water level.
        </p>
      </section>
    </div>
  );
}
