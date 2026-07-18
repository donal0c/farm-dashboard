"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useMemo } from "react";

import { EvidencePanel } from "@/components/briefing/evidence-panel";
import { WeeklyEvidenceStrip } from "@/components/briefing/weekly-evidence-strip";
import { FarmSetup } from "@/components/farm/farm-setup";
import { deriveWeeklyBrief } from "@/lib/briefing/derive-weekly-brief";
import type { BriefItem } from "@/lib/briefing/types";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import type { SourceStatus } from "@/lib/contracts/source-snapshot";
import { enterpriseLabels, weekFocusLabels } from "@/lib/farm-plan";
import { type MetWarning, metWarningsSchema } from "@/lib/sources/met-warnings";
import {
  type FarmForecast,
  farmForecastSchema,
} from "@/lib/sources/open-meteo";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

const priorityStyle = {
  act: {
    label: "Act",
    icon: ArrowRight,
    rule: "border-l-destructive",
    text: "text-destructive",
    tint: "bg-destructive/[0.035]",
  },
  check: {
    label: "Check",
    icon: CheckCircle2,
    rule: "border-l-warning",
    text: "text-warning",
    tint: "bg-warning/[0.045]",
  },
  watch: {
    label: "Watch",
    icon: Eye,
    rule: "border-l-info",
    text: "text-info",
    tint: "bg-info/[0.035]",
  },
} as const;

function statusText(status?: SourceStatus, isFetching?: boolean) {
  if (isFetching && !status) return "Loading";
  if (isFetching) return "Refreshing";
  if (!status) return "Not checked";
  return {
    live: "Current",
    cached: "Cached",
    partial: "Partial",
    stale: "Stale",
    unavailable: "Unavailable",
  }[status];
}

function SourceState({
  label,
  status,
  isFetching,
  className,
}: {
  label: string;
  status?: SourceStatus;
  isFetching?: boolean;
  className?: string;
}) {
  const limited =
    status === "partial" ||
    status === "stale" ||
    status === "unavailable" ||
    !status;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 py-2.5",
        className,
      )}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "flex items-center gap-2 text-xs font-semibold",
          limited ? "text-warning" : "text-success",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            limited ? "bg-warning" : "bg-success",
          )}
          aria-hidden="true"
        />
        {statusText(status, isFetching)}
      </dd>
    </div>
  );
}

function EvidenceTrigger({
  item,
  compact = false,
}: {
  item: BriefItem;
  compact?: boolean;
}) {
  const setEvidenceId = useUiStore((state) => state.setEvidenceId);
  const evidenceId = useUiStore((state) => state.evidenceId);
  const evidenceOpen = evidenceId === item.evidenceId;
  const triggerId = `evidence-trigger-${item.evidenceId}`;

  return (
    <button
      id={triggerId}
      type="button"
      onClick={() => setEvidenceId(evidenceOpen ? null : item.evidenceId)}
      aria-expanded={evidenceOpen}
      aria-controls={evidenceOpen ? "evidence-panel" : undefined}
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-2 text-left font-semibold text-primary hover:underline hover:underline-offset-4",
        compact ? "text-xs" : "text-sm",
        evidenceOpen && "underline underline-offset-4",
      )}
    >
      <span className="min-w-0">
        {compact ? "Why this boundary" : "Open evidence and rule"}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  );
}

function PriorityArticle({
  item,
  lead = false,
}: {
  item: BriefItem;
  lead?: boolean;
}) {
  const style = priorityStyle[item.priority];
  const Icon = style.icon;

  return (
    <article
      className={cn(
        "border-l-2",
        style.rule,
        lead
          ? cn("px-5 py-6 sm:px-7 sm:py-8", style.tint)
          : "border-b border-border py-5 pl-5 pr-2 last:border-b-0",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", style.text)} aria-hidden="true" />
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.15em]",
            style.text,
          )}
        >
          {style.label} · {item.eyebrow}
        </p>
      </div>
      <h2
        className={cn(
          "font-editorial mt-3 font-medium leading-[1.05] tracking-[-0.02em] [overflow-wrap:anywhere]",
          lead
            ? "max-w-[18ch] text-[2.25rem] sm:text-[2.8rem]"
            : "max-w-[24ch] text-[1.65rem]",
        )}
      >
        {item.title}
      </h2>
      <p
        className={cn(
          "mt-3 leading-6 text-foreground/80",
          lead ? "max-w-[62ch] text-base" : "max-w-[58ch] text-sm",
        )}
      >
        {item.summary}
      </p>
      {lead ? (
        <p className="mt-3 max-w-[64ch] text-sm leading-6 text-muted-foreground">
          {item.detail}
        </p>
      ) : null}
      <div className="mt-4">
        <EvidenceTrigger item={item} />
      </div>
    </article>
  );
}

function DecisionBoundary({
  item,
  stacked = false,
}: {
  item: BriefItem;
  stacked?: boolean;
}) {
  return (
    <aside
      className={cn(
        "border-y border-border py-5",
        !stacked && "lg:border-y-0 lg:border-l lg:py-2 lg:pl-7",
      )}
    >
      <ShieldCheck className="h-5 w-5 text-info" aria-hidden="true" />
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-info">
        Decision boundary
      </p>
      <h2 className="font-editorial mt-2 max-w-[22ch] text-2xl font-medium leading-tight">
        {item.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {item.summary}
      </p>
      <div className="mt-3">
        <EvidenceTrigger item={item} compact />
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
      <div className="flex flex-wrap justify-between gap-4 border-b border-border pb-4">
        <div className="h-4 w-56 rounded-sm bg-muted" />
        <div className="h-4 w-44 rounded-sm bg-muted" />
      </div>
      <div className="pt-8">
        <div className="h-3 w-36 rounded-sm bg-muted" />
        <div className="mt-4 h-14 w-4/5 rounded-sm bg-muted" />
        <div className="mt-4 h-5 w-3/5 rounded-sm bg-muted" />
      </div>
      <div className="mt-8 grid min-h-[350px] gap-7 border border-border bg-card p-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div>
          <div className="h-3 w-36 rounded-sm bg-muted" />
          <div className="mt-5 h-12 w-5/6 rounded-sm bg-muted" />
          <div className="mt-4 h-4 w-full rounded-sm bg-muted" />
          <div className="mt-2 h-4 w-4/5 rounded-sm bg-muted" />
        </div>
        <div className="border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
          <div className="h-5 w-40 rounded-sm bg-muted" />
          <div className="mt-5 h-32 rounded-sm bg-muted" />
        </div>
      </div>
    </output>
  );
}

function DegradedNotice({
  label,
  title,
  detail,
  retryLabel = "Check again",
  onRetry,
}: {
  label: string;
  title: string;
  detail: string;
  retryLabel?: string;
  onRetry: () => void;
}) {
  return (
    <section
      aria-live="polite"
      className="mt-6 border-l-2 border-warning bg-warning/[0.055] px-5 py-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-warning">
        {label}
      </p>
      <h2 className="font-editorial mt-2 text-2xl font-medium">{title}</h2>
      <p className="mt-2 max-w-[68ch] text-sm leading-6 text-muted-foreground">
        {detail}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {retryLabel}
      </button>
    </section>
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
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
  const warningsQuery = useQuery({
    queryKey: ["met-warnings"],
    queryFn: () =>
      fetchValidatedSourceSnapshot<MetWarning[]>(
        "/api/data/met/warnings",
        metWarningsSchema,
      ),
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

  if (!hasHydrated) return <LoadingBrief />;
  if (!farmLocation) return <FarmSetup />;

  return (
    <div
      className={cn(
        "grid items-start gap-8",
        evidence && "xl:grid-cols-[minmax(0,1fr)_320px]",
      )}
    >
      <div className="min-w-0">
        <header>
          <div className="grid gap-3 border-b border-border pb-4 sm:grid-cols-[minmax(0,1fr)_280px] sm:items-end">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                Saved farm · weekly brief
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="min-w-0 break-all font-semibold text-foreground">
                  {farmLocation.routingKey ?? farmLocation.label}
                </span>
                <span aria-hidden="true">/</span>
                <span>{enterpriseLabels[enterprise]}</span>
                <span aria-hidden="true">/</span>
                <span>{weekFocusLabels[weekFocus]} focus</span>
              </p>
            </div>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-x-5 border-y border-border px-1 sm:border-y-0">
              <SourceState
                label="Forecast"
                status={forecastQuery.data?.status}
                isFetching={forecastQuery.isFetching}
              />
              <SourceState
                label="Warnings"
                status={warningsQuery.data?.status}
                isFetching={warningsQuery.isFetching}
              />
            </dl>
          </div>

          <div className="pb-8 pt-8 sm:pb-10 sm:pt-10">
            <h1 className="font-editorial max-w-[17ch] text-[3.15rem] font-medium leading-[0.94] tracking-[-0.045em] [overflow-wrap:anywhere] sm:text-[4.5rem]">
              What deserves your attention
            </h1>
            <p className="mt-5 max-w-[66ch] text-base leading-7 text-muted-foreground sm:text-lg">
              One weekly action, the checks around it, and the evidence behind
              each call. Your field and compliance decision stays yours.
            </p>
          </div>
        </header>

        {forecastQuery.isLoading ? (
          <LoadingBrief />
        ) : forecastUnavailable || !forecastQuery.data?.data ? (
          <section className="border-l-2 border-destructive bg-destructive/[0.035] px-5 py-7 sm:px-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-destructive">
              Forecast unavailable
            </p>
            <h2 className="font-editorial mt-3 max-w-[24ch] text-3xl font-medium">
              No weekly advice is safer than invented advice.
            </h2>
            <p className="mt-3 max-w-[64ch] text-sm leading-6 text-muted-foreground">
              The forecast source did not return a usable current snapshot.
              AgriView has not substituted sample values.
            </p>
            <button
              type="button"
              onClick={() => void forecastQuery.refetch()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try the forecast again
            </button>
          </section>
        ) : forecastEmpty || !leadItem ? (
          <DegradedNotice
            label="Forecast incomplete"
            title="No usable forecast days were returned."
            detail="The source responded, but it did not contain enough current data to build a weekly brief. No empty values have been treated as weather observations."
            onRetry={() => void forecastQuery.refetch()}
          />
        ) : (
          <>
            {forecastPartial ? (
              <DegradedNotice
                label="Partial forecast coverage"
                title="Incomplete days were excluded."
                detail={
                  forecastQuery.data.warning ??
                  "The brief uses only complete forecast days; missing values were not converted to zero."
                }
                retryLabel="Check forecast again"
                onRetry={() => void forecastQuery.refetch()}
              />
            ) : null}

            {warningsUnavailable ? (
              <DegradedNotice
                label="Warning source unavailable"
                title="Weather warnings could not be checked."
                detail="Met Éireann did not return a usable current snapshot. Do not interpret a missing warning row as confirmation that no warning is active."
                retryLabel="Check warnings again"
                onRetry={() => void warningsQuery.refetch()}
              />
            ) : null}

            {warningsPartial ? (
              <DegradedNotice
                label="Partial warning coverage"
                title="Some warning records were excluded."
                detail={
                  warningsQuery.data?.warning ??
                  "The valid warning records are shown, but the source response was incomplete. Confirm current notices with Met Éireann."
                }
                retryLabel="Check warnings again"
                onRetry={() => void warningsQuery.refetch()}
              />
            ) : null}

            <section
              className={cn(
                "paper-grain grid grid-cols-[minmax(0,1fr)] gap-7 border border-border bg-card px-0 py-0 xl:p-7",
                !evidence &&
                  "xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]",
              )}
              aria-label="Lead weekly priority and forecast evidence"
            >
              <PriorityArticle item={leadItem} lead />
              <div className="px-5 pb-6 sm:px-7 xl:px-0 xl:pb-0">
                <WeeklyEvidenceStrip days={days} stacked={Boolean(evidence)} />
              </div>
            </section>

            <section
              className={cn(
                "grid grid-cols-[minmax(0,1fr)] gap-8 py-9 lg:py-11",
                !evidence &&
                  "lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]",
              )}
              aria-label="Supporting priorities and decision boundary"
            >
              <div>
                <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Supporting checks
                    </p>
                    <h2 className="font-editorial mt-1 text-3xl font-medium">
                      Before the week moves
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {supportingItems.length}{" "}
                    {supportingItems.length === 1 ? "check" : "checks"}
                  </p>
                </div>
                {supportingItems.length ? (
                  <div>
                    {supportingItems.map((item) => (
                      <PriorityArticle key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <p className="py-5 text-sm leading-6 text-muted-foreground">
                    No additional weather check was produced from the usable
                    evidence.
                  </p>
                )}
              </div>
              {secondaryBoundary ? (
                <DecisionBoundary
                  item={secondaryBoundary}
                  stacked={Boolean(evidence)}
                />
              ) : null}
            </section>

            <footer className="flex items-start gap-3 border-t border-border py-6 text-sm leading-6 text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="max-w-[72ch]">
                AgriView is screening support, not legal, agronomic, or safety
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
