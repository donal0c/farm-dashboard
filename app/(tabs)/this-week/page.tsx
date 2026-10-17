"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Printer } from "lucide-react";
import { useMemo } from "react";

import { EvidencePanel } from "@/components/briefing/evidence-panel";
import { WeeklyEvidenceStrip } from "@/components/briefing/weekly-evidence-strip";
import { FarmContextBar, SourceDot } from "@/components/farm/farm-context-bar";
import { FarmSetup } from "@/components/farm/farm-setup";
import { PriorityMark } from "@/components/ui/priority-mark";
import { SourceNotice } from "@/components/ui/source-notice";
import { deriveWeeklyBrief } from "@/lib/briefing/derive-weekly-brief";
import type { BriefItem } from "@/lib/briefing/types";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import { sourceQueryStaleTime } from "@/lib/client/source-query-policy";
import { complianceDates2026 } from "@/lib/compliance/rules";
import { type MetWarning, metWarningsSchema } from "@/lib/sources/met-warnings";
import {
  type FarmForecast,
  farmForecastSchema,
} from "@/lib/sources/open-meteo";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

function EvidenceTrigger({
  item,
  label = "Open evidence and rule",
}: {
  item: BriefItem;
  label?: string;
}) {
  const setEvidenceId = useUiStore((state) => state.setEvidenceId);
  const evidenceId = useUiStore((state) => state.evidenceId);
  const evidenceOpen = evidenceId === item.evidenceId;

  return (
    <button
      id={`evidence-trigger-${item.evidenceId}`}
      type="button"
      onClick={() => setEvidenceId(evidenceOpen ? null : item.evidenceId)}
      aria-expanded={evidenceOpen}
      aria-controls={evidenceOpen ? "evidence-panel" : undefined}
      className={cn(
        "inline-flex min-h-10 max-w-full items-center gap-1.5 text-left text-sm font-semibold text-primary underline-offset-4 hover:underline",
        evidenceOpen && "underline",
      )}
    >
      <span className="min-w-0">{label}</span>
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  );
}

function LeadPriority({ item }: { item: BriefItem }) {
  return (
    <article className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-5">
      <PriorityMark kind={item.priority} size="lg" className="pt-1" />
      <div className="min-w-0">
        <h2 className="display display-lg max-w-[24ch] [overflow-wrap:anywhere]">
          {item.title}
        </h2>
        <p className="mt-4 max-w-[58ch] text-base leading-7 text-foreground/90">
          {item.summary}
        </p>
        <p className="mt-2 max-w-[60ch] text-sm leading-6 text-muted-foreground">
          {item.detail}
        </p>
        <div className="mt-4">
          <EvidenceTrigger item={item} />
        </div>
      </div>
    </article>
  );
}

function SupportingPriority({ item }: { item: BriefItem }) {
  return (
    <article className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 py-5 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-5">
      <PriorityMark kind={item.priority} size="md" />
      <div className="min-w-0">
        <h3 className="display display-sm max-w-[32ch] [overflow-wrap:anywhere]">
          {item.title}
        </h3>
        <p className="mt-2 max-w-[60ch] text-sm leading-6 text-foreground/85">
          {item.summary}
        </p>
        <div className="mt-2">
          <EvidenceTrigger item={item} label="Why this is here" />
        </div>
      </div>
    </article>
  );
}

function DecisionBoundary({ item }: { item: BriefItem }) {
  return (
    <aside
      aria-label="Decision boundary"
      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 rounded-md bg-muted/50 px-4 py-5 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-5 sm:px-5"
    >
      <PriorityMark kind="boundary" size="md" />
      <div className="min-w-0">
        <h3 className="display display-sm max-w-[30ch]">{item.title}</h3>
        <p className="mt-2 max-w-[60ch] text-sm leading-6 text-muted-foreground">
          {item.summary}
        </p>
        <div className="mt-2">
          <EvidenceTrigger item={item} label="Why this boundary" />
        </div>
      </div>
    </aside>
  );
}

function LoadingBrief() {
  return (
    <output
      className="block animate-pulse"
      aria-label="Loading weekly brief"
      aria-live="polite"
    >
      <div className="field bleed rounded-b-lg pb-16 pt-9 md:pb-20">
        <div className="h-3.5 w-56 rounded-sm bg-white/15" />
        <div className="mt-3 h-10 w-72 max-w-full rounded-sm bg-white/15" />
        <div className="mt-5 h-4 w-80 max-w-full rounded-sm bg-white/10" />
      </div>
      <div className="sheet relative z-10 -mt-10 grid min-h-[360px] gap-7 p-6 md:-mt-12 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-5">
          <div className="h-11 w-11 rounded-full bg-muted" />
          <div>
            <div className="h-3.5 w-40 rounded-sm bg-muted" />
            <div className="mt-4 h-12 w-5/6 rounded-sm bg-muted" />
            <div className="mt-3 h-10 w-3/4 rounded-sm bg-muted" />
            <div className="mt-5 h-4 w-full rounded-sm bg-muted" />
            <div className="mt-2 h-4 w-4/5 rounded-sm bg-muted" />
          </div>
        </div>
        <div className="border-t border-rule pt-5 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
          <div className="h-5 w-44 rounded-sm bg-muted" />
          <div className="mt-5 h-44 rounded-md bg-muted" />
        </div>
      </div>
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
      fetchValidatedSourceSnapshot<FarmForecast>(
        `/api/data/forecast?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}`,
        farmForecastSchema,
      ),
    enabled: Boolean(farmLocation),
    staleTime: sourceQueryStaleTime.forecast,
    retry: 1,
  });
  const warningsQuery = useQuery({
    queryKey: ["met-warnings"],
    queryFn: () =>
      fetchValidatedSourceSnapshot<MetWarning[]>(
        "/api/data/met/warnings",
        metWarningsSchema,
      ),
    staleTime: sourceQueryStaleTime.metWarnings,
    retry: 1,
  });

  const brief = useMemo(
    () =>
      forecastQuery.data
        ? deriveWeeklyBrief({
            forecast: forecastQuery.data,
            warnings: warningsQuery.data,
            deadlines: complianceDates2026,
            enterprise,
            focus: weekFocus,
            region: farmLocation?.county,
          })
        : null,
    [
      enterprise,
      farmLocation?.county,
      forecastQuery.data,
      warningsQuery.data,
      weekFocus,
    ],
  );

  const evidence =
    brief?.evidence.find((item) => item.id === evidenceId) ?? null;
  const days = forecastQuery.data?.data?.days ?? [];
  const forecastUnavailable =
    forecastQuery.isError || forecastQuery.data?.status === "unavailable";
  const warningsUnavailable =
    warningsQuery.isError || warningsQuery.data?.status === "unavailable";
  const warningsPartial = warningsQuery.data?.status === "partial";
  const forecastPartial = forecastQuery.data?.status === "partial";
  const forecastStale = forecastQuery.data?.status === "stale";
  const forecastEmpty = Boolean(forecastQuery.data?.data) && days.length === 0;
  const leadItem = brief?.items[0] ?? null;
  const boundaryItem =
    brief?.items.find((item) => item.evidenceId === "decision-boundary") ??
    null;
  const secondaryBoundary =
    boundaryItem && boundaryItem !== leadItem ? boundaryItem : null;
  const supportingItems =
    brief?.items.filter((item) => item !== leadItem && item !== boundaryItem) ??
    [];
  const highlightLabel =
    leadItem?.id === "weather-warning"
      ? "Warning period"
      : leadItem?.id === "ground-access"
        ? "Wettest day"
        : "Work window";
  const weekStart = days[0]
    ? new Date(`${days[0].date}T12:00:00Z`)
    : new Date();
  const hasNotices =
    forecastPartial || forecastStale || warningsUnavailable || warningsPartial;

  if (!hasHydrated) return <LoadingBrief />;
  if (!farmLocation) return <FarmSetup />;

  return (
    <div
      className={cn(
        "grid items-start gap-8",
        evidence && "xl:grid-cols-[minmax(0,1fr)_340px]",
      )}
    >
      <div className="min-w-0">
        <FarmContextBar
          location={farmLocation}
          weekStart={weekStart}
          sources={
            <>
              <SourceDot
                label="Forecast"
                status={forecastQuery.data?.status}
                isFetching={forecastQuery.isFetching}
                onField
              />
              <SourceDot
                label="Warnings"
                status={warningsQuery.data?.status}
                isFetching={warningsQuery.isFetching}
                onField
              />
            </>
          }
        />

        {forecastQuery.isLoading ? (
          <div className="pt-6">
            <LoadingBrief />
          </div>
        ) : forecastUnavailable || !forecastQuery.data?.data ? (
          <SourceNotice
            tone="unavailable"
            className="panel relative z-10 -mt-8 bg-sheet"
            title="No weekly advice is safer than invented advice."
            status="Forecast unavailable"
            detail="The forecast source did not return a usable current snapshot, so no priorities were derived. AgriView has not substituted sample values."
            retryLabel="Try the forecast again"
            onRetry={() => void forecastQuery.refetch()}
          />
        ) : forecastEmpty || !leadItem ? (
          <SourceNotice
            tone="partial"
            className="panel relative z-10 -mt-8 bg-sheet"
            title="No usable forecast days were returned."
            detail="The source responded, but it did not contain enough current data to build a weekly brief. No empty values have been treated as weather observations."
            onRetry={() => void forecastQuery.refetch()}
          />
        ) : (
          <>
            <div className="relative z-10 -mt-8 grid gap-3 empty:hidden [&>section]:border-solid [&>section]:bg-sheet [&>section]:shadow-sheet">
              {forecastPartial ? (
                <SourceNotice
                  tone="partial"
                  title="Partial forecast coverage"
                  detail={
                    forecastQuery.data.warning ??
                    "Incomplete days were excluded. The brief uses only complete forecast days; missing values were not converted to zero."
                  }
                  retryLabel="Check forecast again"
                  onRetry={() => void forecastQuery.refetch()}
                />
              ) : null}
              {forecastStale ? (
                <SourceNotice
                  tone="partial"
                  title="The forecast is past its freshness window."
                  status="Forecast stale"
                  detail="The last validated forecast is older than its source allows. The brief below is built from it; refresh before relying on it."
                  retryLabel="Refresh the forecast"
                  onRetry={() => void forecastQuery.refetch()}
                />
              ) : null}
              {warningsUnavailable ? (
                <SourceNotice
                  tone="unavailable"
                  title="Weather warnings could not be checked."
                  detail="Met Éireann did not return a usable current snapshot. Do not interpret a missing warning row as confirmation that no warning is active."
                  retryLabel="Check warnings again"
                  onRetry={() => void warningsQuery.refetch()}
                />
              ) : null}
              {warningsPartial ? (
                <SourceNotice
                  tone="partial"
                  title="Some warning records were excluded."
                  detail={
                    warningsQuery.data?.warning ??
                    "The valid warning records are shown, but the source response was incomplete. Confirm current notices with Met Éireann."
                  }
                  retryLabel="Check warnings again"
                  onRetry={() => void warningsQuery.refetch()}
                />
              ) : null}
            </div>

            <section
              className={cn(
                "sheet sheet-enter relative z-10 grid gap-7 px-5 py-6 sm:px-7 sm:py-8",
                hasNotices ? "mt-5" : "-mt-10 md:-mt-12",
                !evidence &&
                  "xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]",
              )}
              aria-label="Lead weekly priority and forecast evidence"
            >
              <LeadPriority item={leadItem} />
              <WeeklyEvidenceStrip
                days={days}
                highlightDates={leadItem.relevantDates}
                highlightLabel={highlightLabel}
                stacked={Boolean(evidence)}
              />
            </section>

            <section
              className={cn(
                "grid gap-8 pt-9",
                !evidence &&
                  "lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-start",
              )}
              aria-label="Supporting priorities and decision boundary"
            >
              <div>
                <div className="flex items-end justify-between gap-4 border-b border-rule pb-3">
                  <h2 className="display display-sm">Also this week</h2>
                  <p className="meta">
                    {supportingItems.length}{" "}
                    {supportingItems.length === 1 ? "item" : "items"}
                  </p>
                </div>
                {supportingItems.length ? (
                  <div className="divide-y divide-rule">
                    {supportingItems.map((item) => (
                      <SupportingPriority key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <p className="py-5 text-sm leading-6 text-muted-foreground">
                    No additional check was produced from the usable evidence.
                  </p>
                )}
              </div>
              {secondaryBoundary ? (
                <DecisionBoundary item={secondaryBoundary} />
              ) : null}
            </section>

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-rule py-5">
              <p className="footnote max-w-[70ch]">
                Screening support, not legal, agronomic or safety advice.
                Forecasts are estimates; field conditions differ. Rules are
                deterministic and versioned on the Methodology page.
              </p>
              <button
                type="button"
                data-print="hide"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-input bg-sheet px-3 text-[13px] font-semibold text-foreground hover:border-foreground/40"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print this brief
              </button>
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
