"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CloudRain,
  CloudSun,
  Eye,
  RefreshCw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { EvidencePanel } from "@/components/briefing/evidence-panel";
import { FarmSetup } from "@/components/farm/farm-setup";
import { deriveWeeklyBrief } from "@/lib/briefing/derive-weekly-brief";
import type { BriefItem } from "@/lib/briefing/types";
import { fetchSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import { enterpriseLabels, weekFocusLabels } from "@/lib/farm-plan";
import type { MetWarning } from "@/lib/sources/met-warnings";
import type { FarmForecast, ForecastDay } from "@/lib/sources/open-meteo";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

function formatDay(date: string, format: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: format,
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function weatherIcon(code: number) {
  if (code <= 1) return Sun;
  if (code >= 51) return CloudRain;
  return CloudSun;
}

function weatherDescription(code: number) {
  if (code <= 1) return "Clear or mainly clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle or freezing drizzle";
  if (code <= 67) return "Rain or freezing rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unclassified weather conditions";
}

const priorityStyle = {
  act: {
    label: "Act",
    icon: ArrowRight,
    border: "border-l-destructive",
    text: "text-destructive",
  },
  check: {
    label: "Check",
    icon: CheckCircle2,
    border: "border-l-warning",
    text: "text-warning",
  },
  watch: {
    label: "Watch",
    icon: Eye,
    border: "border-l-info",
    text: "text-info",
  },
} as const;

function BriefRow({ item, lead = false }: { item: BriefItem; lead?: boolean }) {
  const setEvidenceId = useUiStore((state) => state.setEvidenceId);
  const evidenceId = useUiStore((state) => state.evidenceId);
  const style = priorityStyle[item.priority];
  const Icon = style.icon;
  const evidenceOpen = evidenceId === item.evidenceId;
  const triggerId = `evidence-trigger-${item.evidenceId}`;

  return (
    <article
      className={cn(
        "border-l-2 border-b border-border py-5 pl-5 pr-1 last:border-b-0",
        style.border,
        lead && "bg-card py-6 pr-5",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", style.text)} aria-hidden="true" />
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.14em]",
            style.text,
          )}
        >
          {style.label} · {item.eyebrow}
        </p>
      </div>
      <h2
        className={cn(
          "font-editorial mt-3 font-medium leading-tight tracking-[-0.015em]",
          lead ? "text-[2rem] sm:text-[2.35rem]" : "text-2xl",
        )}
      >
        {item.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-foreground/78">
        {item.summary}
      </p>
      {lead ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {item.detail}
        </p>
      ) : null}
      <button
        id={triggerId}
        type="button"
        onClick={() => setEvidenceId(item.evidenceId)}
        aria-expanded={evidenceOpen}
        aria-controls={evidenceOpen ? "evidence-panel" : undefined}
        className={cn(
          "mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline",
          evidenceOpen && "underline underline-offset-4",
        )}
      >
        See evidence and rule
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function LoadingBrief() {
  return (
    <output className="animate-pulse" aria-label="Loading weekly brief">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="mt-5 h-12 w-3/4 rounded bg-muted" />
      <div className="mt-3 h-5 w-full rounded bg-muted" />
      <div className="mt-12 h-52 rounded-md border border-border bg-card" />
    </output>
  );
}

export default function ThisWeekPage() {
  const enterprise = useUiStore((state) => state.enterprise);
  const weekFocus = useUiStore((state) => state.weekFocus);
  const farmLocation = useUiStore((state) => state.farmLocation);
  const hasHydrated = useUiStore((state) => state.hasHydrated);
  const evidenceId = useUiStore((state) => state.evidenceId);

  const forecastQuery = useQuery({
    queryKey: [
      "farm-forecast",
      farmLocation?.latitude,
      farmLocation?.longitude,
    ],
    queryFn: () =>
      fetchSourceSnapshot<FarmForecast>(
        `/api/data/forecast?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}`,
      ),
    enabled: Boolean(farmLocation),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
  const warningsQuery = useQuery({
    queryKey: ["met-warnings"],
    queryFn: () => fetchSourceSnapshot<MetWarning[]>("/api/data/met/warnings"),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const brief = useMemo(
    () =>
      forecastQuery.data
        ? deriveWeeklyBrief({
            forecast: forecastQuery.data,
            warnings: warningsQuery.data,
            enterprise,
            focus: weekFocus,
          })
        : null,
    [enterprise, forecastQuery.data, warningsQuery.data, weekFocus],
  );

  const evidence =
    brief?.evidence.find((item) => item.id === evidenceId) ?? null;
  const days = forecastQuery.data?.data?.days ?? [];
  const forecastUnavailable =
    forecastQuery.isError || forecastQuery.data?.status === "unavailable";
  const warningsUnavailable =
    warningsQuery.isError || warningsQuery.data?.status === "unavailable";
  const forecastEmpty = Boolean(forecastQuery.data?.data) && days.length === 0;

  if (!hasHydrated) {
    return <LoadingBrief />;
  }

  if (!farmLocation) {
    return <FarmSetup />;
  }

  return (
    <div
      className={cn(
        "grid items-start gap-8",
        evidence ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "max-w-[820px]",
      )}
    >
      <div className="min-w-0">
        <header className="border-b border-border pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {farmLocation.routingKey ?? farmLocation.label}
              </span>
              <span aria-hidden="true">/</span>
              <span>{enterpriseLabels[enterprise]}</span>
              <span aria-hidden="true">/</span>
              <span>{weekFocusLabels[weekFocus]} focus</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  forecastQuery.data?.status === "live" &&
                    warningsQuery.data?.status === "live"
                    ? "bg-success"
                    : "bg-warning",
                )}
                aria-hidden="true"
              />
              {forecastQuery.isFetching || warningsQuery.isFetching
                ? "Refreshing"
                : forecastQuery.data?.status === "live" &&
                    warningsQuery.data?.status === "live"
                  ? "Core sources current"
                  : "Source limited"}
            </div>
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Your farm · this week
          </p>
          <h1 className="font-editorial mt-2 text-[2.7rem] font-medium leading-[0.98] tracking-[-0.035em] sm:text-6xl">
            What deserves your attention
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            A deterministic brief from the forecast at your saved point. Check
            the evidence before making a field or compliance decision.
          </p>
        </header>

        {forecastQuery.isLoading ? (
          <div className="py-8">
            <LoadingBrief />
          </div>
        ) : forecastUnavailable || !forecastQuery.data?.data ? (
          <section className="my-8 border-l-2 border-destructive py-4 pl-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-destructive">
              Forecast unavailable
            </p>
            <h2 className="font-editorial mt-2 text-3xl font-medium">
              No weekly advice is safer than invented advice.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              The forecast source did not return a usable current snapshot.
              AgriView has not substituted sample values.
            </p>
            <button
              type="button"
              onClick={() => void forecastQuery.refetch()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </section>
        ) : forecastEmpty || !brief?.items.length ? (
          <section className="my-8 border-l-2 border-warning py-4 pl-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-warning">
              Forecast incomplete
            </p>
            <h2 className="font-editorial mt-2 text-3xl font-medium">
              No usable forecast days were returned.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              The source responded, but it did not contain enough current data
              to build a weekly brief. No empty values have been treated as
              weather observations.
            </p>
            <button
              type="button"
              onClick={() => void forecastQuery.refetch()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Check again
            </button>
          </section>
        ) : (
          <>
            {warningsUnavailable ? (
              <section
                aria-live="polite"
                className="mt-7 border-l-2 border-warning bg-warning/10 px-5 py-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-warning">
                  Warning source unavailable
                </p>
                <h2 className="font-editorial mt-2 text-2xl font-medium">
                  Weather warnings could not be checked.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Met Éireann did not return a usable current snapshot. Do not
                  interpret the missing warning row as confirmation that no
                  warning is active.
                </p>
                <button
                  type="button"
                  onClick={() => void warningsQuery.refetch()}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check warnings again
                </button>
              </section>
            ) : null}

            <section
              className="mt-7 border-y border-border"
              aria-label="Priorities"
            >
              {brief.items.map((item, index) => (
                <BriefRow key={item.id} item={item} lead={index === 0} />
              ))}
            </section>

            <section className="py-9">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Conditions
                  </p>
                  <h2 className="font-editorial mt-1 text-3xl font-medium">
                    Seven days at the pin
                  </h2>
                </div>
                <Link
                  href="/weather-water"
                  className="hidden min-h-11 items-center text-sm font-semibold text-primary sm:flex"
                >
                  Full conditions
                </Link>
              </div>
              <section
                className="mt-5 grid grid-cols-7 overflow-x-auto border-y border-border"
                aria-label="Seven-day forecast"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to reach and scroll this overflow region.
                tabIndex={0}
              >
                {days.map((day: ForecastDay, index: number) => {
                  const Icon = weatherIcon(day.weatherCode);
                  return (
                    <div
                      key={day.date}
                      className="min-w-[78px] border-r border-border px-2 py-4 text-center last:border-r-0"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {index === 0 ? "Today" : formatDay(day.date)}
                      </p>
                      <Icon
                        className="mx-auto mt-3 h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        {weatherDescription(day.weatherCode)}
                      </span>
                      <p className="mt-2 text-sm font-semibold">
                        {day.temperatureMaxC.toFixed(0)}°
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {day.rainMm.toFixed(1)} mm
                      </p>
                    </div>
                  );
                })}
              </section>
            </section>

            <footer className="flex items-start gap-3 border-t border-border py-6 text-sm leading-6 text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p>
                This brief is screening support, not legal, agronomic, or safety
                advice. Forecasts are estimates and your field conditions may
                differ.
              </p>
            </footer>
          </>
        )}
      </div>

      {evidence ? (
        <EvidencePanel
          evidence={evidence}
          returnFocusId={`evidence-trigger-${evidence.id}`}
        />
      ) : null}
    </div>
  );
}
