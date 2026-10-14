"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Droplets, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { NeedsFarm, PageSkeleton } from "@/components/ui/needs-farm";
import { PageIntro, SectionHeading } from "@/components/ui/page-intro";
import { SourceNotice } from "@/components/ui/source-notice";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import { sourceQueryStaleTime } from "@/lib/client/source-query-policy";
import { featureCollectionContract } from "@/lib/contracts/geojson";
import {
  formatPublishedReference,
  formatSourceState,
  humanizeWaterbodyName,
} from "@/lib/evidence-format";
import { formatNitrateScreeningLabel } from "@/lib/land-format";
import { type WfdStatusData, wfdStatusDataSchema } from "@/lib/sources/epa-wfd";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

type Waterbody = {
  id: string;
  name: string;
  kind: "River" | "Groundwater";
  status: string;
  period: string;
};

function formatCheckedAt(value: string | undefined) {
  if (!value) return "Not checked";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function baseStatus(status: string) {
  return ["High", "Good", "Moderate", "Poor", "Bad"].find((value) =>
    status.startsWith(value),
  );
}

function statusTone(status: string) {
  const category = baseStatus(status);
  if (category === "High" || category === "Good") return "text-success";
  if (category === "Moderate") return "text-check";
  if (category === "Poor" || category === "Bad") return "text-act";
  return "text-muted-foreground";
}

function statusDot(status: string) {
  const category = baseStatus(status);
  if (category === "High" || category === "Good") return "bg-success";
  if (category === "Moderate") return "bg-check";
  if (category === "Poor" || category === "Bad") return "bg-act";
  return "bg-muted-foreground";
}

function Figure({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
  className?: string;
}) {
  return (
    <div className={cn("py-6", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-editorial mt-2 text-[2.25rem] font-medium leading-none tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export default function EnvironmentCompliancePage() {
  const farmLocation = useUiStore((state) => state.farmLocation);
  const hasHydrated = useUiStore((state) => state.hasHydrated);

  const wfdQuery = useQuery({
    queryKey: ["wfd-status", farmLocation?.latitude, farmLocation?.longitude],
    queryFn: () =>
      fetchValidatedSourceSnapshot<WfdStatusData>(
        `/api/data/epa/wfd-status?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}&radius=0.1`,
        wfdStatusDataSchema,
      ),
    enabled: Boolean(farmLocation),
    staleTime: sourceQueryStaleTime.epaWfd,
  });
  const nitratesQuery = useQuery({
    queryKey: ["nitrates", farmLocation?.latitude, farmLocation?.longitude],
    queryFn: () =>
      fetchValidatedSourceSnapshot<GeoJSON.FeatureCollection>(
        `/api/data/nitrates?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}&radius=0.2`,
        featureCollectionContract,
      ),
    enabled: Boolean(farmLocation),
    staleTime: sourceQueryStaleTime.nitrates,
  });

  const waterbodies = useMemo(() => {
    const found = new Map<string, Waterbody>();
    for (const feature of wfdQuery.data?.data?.rivers.features ?? []) {
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      const id = String(properties.European_Code ?? feature.id ?? "");
      if (!id || found.has(id)) continue;
      found.set(id, {
        id,
        name: humanizeWaterbodyName(String(properties.Name ?? ""), "River"),
        kind: "River",
        status: String(properties.Status ?? "Not classified"),
        period: String(properties.Period_for_WFD_Status ?? "2019–2024"),
      });
    }
    for (const feature of wfdQuery.data?.data?.groundwater.features ?? []) {
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      const id = String(properties.European_Code ?? feature.id ?? "");
      if (!id || found.has(id)) continue;
      found.set(id, {
        id,
        name: humanizeWaterbodyName(
          String(properties.Name ?? ""),
          "Groundwater",
        ),
        kind: "Groundwater",
        status: String(properties.Overall_GW_Status ?? "Not classified"),
        period: String(properties.Period_for_WFD_Status ?? "2019–2024"),
      });
    }
    return Array.from(found.values()).sort((a, b) => {
      const order = [
        "Bad",
        "Poor",
        "Moderate",
        "Not classified",
        "Good",
        "High",
      ];
      return (
        order.indexOf(baseStatus(a.status) ?? "Not classified") -
        order.indexOf(baseStatus(b.status) ?? "Not classified")
      );
    });
  }, [wfdQuery.data]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of waterbodies) {
      const status = baseStatus(item.status) ?? item.status;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [waterbodies]);

  const stockingRates = useMemo(() => {
    const rates = new Set<string>();
    for (const feature of nitratesQuery.data?.data?.features ?? []) {
      const value = (feature.properties as Record<string, unknown> | null)
        ?.STK_RATE;
      if (typeof value === "string" && value.trim()) rates.add(value.trim());
    }
    return Array.from(rates).sort();
  }, [nitratesQuery.data]);
  const nitrateLabels = stockingRates.map(formatNitrateScreeningLabel);

  if (!hasHydrated) return <PageSkeleton label="Loading environment" />;

  if (!farmLocation) {
    return (
      <NeedsFarm
        title="Environmental context needs a farm pin"
        detail="Save a manual point before loading nearby EPA and DAFM screening layers."
      />
    );
  }

  const nonGoodCount = waterbodies.filter(
    (item) => !["Good", "High"].includes(baseStatus(item.status) ?? ""),
  ).length;
  const wfdUnavailable =
    wfdQuery.isError || wfdQuery.data?.status === "unavailable";
  const nitratesUnavailable =
    nitratesQuery.isError || nitratesQuery.data?.status === "unavailable";

  return (
    <div className="min-w-0">
      <PageIntro
        title="Water and nitrates, kept in scope"
        lede="EPA waterbody classifications and the current DAFM nitrate layer near the saved pin. These are screening signals—not a field assessment, holding determination, or compliance decision."
      />

      <section className="grid border-b border-rule sm:grid-cols-3">
        <Figure
          label="Waterbodies returned nearby"
          value={
            wfdQuery.isLoading || wfdUnavailable ? "—" : waterbodies.length
          }
          note={
            wfdUnavailable
              ? "Source unavailable"
              : `${formatSourceState(wfdQuery.data?.status)} · nearby search`
          }
          className="border-b border-rule sm:border-b-0 sm:border-r sm:pr-6"
        />
        <Figure
          label="Below Good or unclassified"
          value={wfdQuery.isLoading || wfdUnavailable ? "—" : nonGoodCount}
          note="Classification period 2019–2024"
          className="border-b border-rule sm:border-b-0 sm:border-r sm:px-6"
        />
        <Figure
          label="Nitrate map features nearby"
          value={
            nitratesQuery.isLoading || nitratesUnavailable
              ? "—"
              : (nitratesQuery.data?.data?.features.length ?? 0)
          }
          note={
            nitratesUnavailable
              ? "Source unavailable"
              : `${formatSourceState(nitratesQuery.data?.status)} · screening only`
          }
          className="sm:pl-6"
        />
      </section>

      <section className="grid gap-8 border-b border-rule py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <SectionHeading
            title="Waterbodies in the screening box"
            lede="EPA Water Framework Directive classification, most cautionary first."
          />
          {wfdQuery.isLoading ? (
            <output
              className="mt-5 block animate-pulse"
              aria-label="Loading nearby EPA waterbody classifications"
            >
              <span className="block h-10 rounded-sm bg-muted" />
              {Array.from({ length: 5 }, (_, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static loading placeholders have no identity.
                  key={index}
                  className="mt-2 block h-16 rounded-sm bg-muted"
                />
              ))}
            </output>
          ) : !wfdUnavailable && waterbodies.length ? (
            <>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-y border-rule py-3 text-sm">
                {statusCounts.map(([status, count]) => (
                  <li key={status} className="inline-flex items-center gap-2">
                    <span
                      className={cn("h-2 w-2 rounded-full", statusDot(status))}
                      aria-hidden="true"
                    />
                    <strong className="font-semibold">{count}</strong>
                    <span className="text-muted-foreground">{status}</span>
                  </li>
                ))}
              </ul>
              <div className="divide-y divide-rule border-b border-rule">
                {waterbodies.slice(0, 5).map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_120px_120px] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.kind} ·{" "}
                        {formatPublishedReference(item.id, "Code")}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "inline-flex items-center gap-2 text-sm font-semibold",
                        statusTone(item.status),
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          statusDot(item.status),
                        )}
                        aria-hidden="true"
                      />
                      {item.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.period}
                    </p>
                  </article>
                ))}
              </div>
              {waterbodies.length > 5 ? (
                <p className="meta mt-3 text-xs">
                  Showing the 5 most cautionary of {waterbodies.length} unique
                  waterbodies returned.
                </p>
              ) : null}
            </>
          ) : wfdUnavailable ? (
            <SourceNotice
              tone="unavailable"
              className="mt-5"
              title="EPA classifications are unavailable."
              detail="No status or zero value has been substituted."
              onRetry={() => void wfdQuery.refetch()}
            />
          ) : (
            <SourceNotice
              tone="empty"
              className="mt-5"
              title="No mapped waterbodies were returned in this screening box."
              detail="This is a valid empty nearby result, not evidence that no waterbody or environmental constraint exists."
            />
          )}
        </div>

        <aside className="border-t border-rule pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <Droplets className="h-5 w-5 text-info" aria-hidden="true" />
          <h3 className="display display-sm mt-3">How to use this</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A Moderate, Poor, or Bad classification raises the bar for checking
            nutrient, drainage, bank-side, and buffer decisions. It does not by
            itself establish the rule for a field.
          </p>
          <Link
            href="/my-land"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Inspect the map layers
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </section>

      <section className="grid gap-8 border-b border-rule py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <SectionHeading
            title="Published stocking-rate layer"
            lede="DAFM nitrate screening labels from map features that intersect the search box."
          />
          {nitratesQuery.isLoading ? (
            <output
              className="mt-5 block animate-pulse"
              aria-label="Loading DAFM nitrate screening labels"
            >
              <span className="block h-10 w-52 rounded-sm bg-muted" />
              <span className="mt-3 block h-4 w-full rounded-sm bg-muted" />
            </output>
          ) : !nitratesUnavailable && nitratesQuery.data?.data ? (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {nitrateLabels.length ? (
                  nitrateLabels.map((label) => (
                    <div
                      key={label.raw}
                      className="panel px-4 py-3 text-sm font-semibold"
                    >
                      <p>{label.rate}</p>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        {label.effective
                          ? `Effective label: ${label.effective}`
                          : "Effective month not published"}{" "}
                        · raw: {label.raw}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No stocking-rate label was returned in this screening box.
                  </p>
                )}
              </div>
              <p className="mt-4 max-w-[64ch] text-sm leading-6 text-muted-foreground">
                These are labels from intersecting map features, not a holding
                calculation. Confirm the current National Action Programme,
                derogation terms, stocking records, and adviser guidance.
              </p>
            </>
          ) : (
            <SourceNotice
              tone="unavailable"
              className="mt-5"
              title="The DAFM screening layer is unavailable."
              detail="No result has been inferred."
              onRetry={() => void nitratesQuery.refetch()}
            />
          )}
        </div>
        <aside className="border-t border-rule pt-6 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <dl className="grid gap-4">
            <div>
              <dt className="text-xs text-muted-foreground">Current source</dt>
              <dd className="mt-1 font-semibold">
                {nitratesQuery.data?.source.label ?? "DAFM nitrates map"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Checked</dt>
              <dd className="mt-1 font-semibold">
                {formatCheckedAt(nitratesQuery.data?.fetchedAt)}
              </dd>
            </div>
          </dl>
          {nitratesQuery.data?.source.url ? (
            <a
              href={nitratesQuery.data.source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
            >
              Official map source
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-5 py-7 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
        <div className="flex gap-3">
          <Droplets
            className="mt-0.5 h-5 w-5 shrink-0 text-info"
            aria-hidden="true"
          />
          <p>
            EPA WFD classifications cover the 2019–2024 assessment period and
            describe mapped waterbodies returned near the pin, not the farm.
            Checked {formatCheckedAt(wfdQuery.data?.fetchedAt)}.
          </p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>
            AgriView does not show biodiversity records until a maintained,
            redistributable source and a farmer decision use-case are both
            established. Absence of a layer is not evidence of absence.
          </p>
        </div>
      </section>
    </div>
  );
}
