"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CircleAlert,
  Droplets,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
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
  if (category === "Moderate") return "text-warning";
  if (category === "Poor" || category === "Bad") return "text-destructive";
  return "text-muted-foreground";
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
  });
  const nitratesQuery = useQuery({
    queryKey: [
      "nitrates",
      farmLocation?.latitude,
      farmLocation?.longitude,
      "environment",
    ],
    queryFn: () =>
      fetchValidatedSourceSnapshot<GeoJSON.FeatureCollection>(
        `/api/data/nitrates?lat=${farmLocation?.latitude}&lng=${farmLocation?.longitude}&radius=0.2`,
        featureCollectionContract,
      ),
    enabled: Boolean(farmLocation),
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

  if (!hasHydrated) {
    return (
      <output className="block animate-pulse" aria-label="Loading environment">
        <span className="block h-12 w-2/3 rounded bg-muted" />
        <span className="mt-8 block h-72 rounded bg-muted" />
      </output>
    );
  }

  if (!farmLocation) {
    return (
      <div className="max-w-2xl border-t border-border pt-8">
        <MapPin className="h-7 w-7 text-primary" />
        <h1 className="font-editorial mt-5 text-5xl font-medium">
          Environmental context needs a farm pin
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Save a manual point before loading nearby EPA and DAFM screening
          layers.
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

  const nonGoodCount = waterbodies.filter(
    (item) => !["Good", "High"].includes(baseStatus(item.status) ?? ""),
  ).length;
  const wfdUnavailable =
    wfdQuery.isError || wfdQuery.data?.status === "unavailable";
  const nitratesUnavailable =
    nitratesQuery.isError || nitratesQuery.data?.status === "unavailable";

  return (
    <div className="min-w-0">
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Environment · nearby screening evidence
        </p>
        <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.035em] sm:text-6xl">
          Water and nitrates, kept in scope
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          EPA waterbody classifications and the current DAFM nitrate layer near
          the saved pin. These are screening signals—not a field assessment,
          holding determination, or compliance decision.
        </p>
      </header>

      <section className="grid border-b border-border sm:grid-cols-3">
        <div className="border-b border-border py-6 sm:border-b-0 sm:border-r sm:pr-6">
          <p className="text-xs text-muted-foreground">
            Waterbodies returned nearby
          </p>
          <p className="font-editorial mt-2 text-4xl font-medium">
            {wfdQuery.isLoading || wfdUnavailable ? "—" : waterbodies.length}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {wfdUnavailable
              ? "Source unavailable"
              : `${formatSourceState(wfdQuery.data?.status)} · nearby search`}
          </p>
        </div>
        <div className="border-b border-border py-6 sm:border-b-0 sm:border-r sm:px-6">
          <p className="text-xs text-muted-foreground">
            Below Good / unclassified
          </p>
          <p className="font-editorial mt-2 text-4xl font-medium">
            {wfdQuery.isLoading || wfdUnavailable ? "—" : nonGoodCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Classification period 2019–2024
          </p>
        </div>
        <div className="py-6 sm:pl-6">
          <p className="text-xs text-muted-foreground">
            Nitrate map features nearby
          </p>
          <p className="font-editorial mt-2 text-4xl font-medium">
            {nitratesQuery.isLoading
              ? "—"
              : nitratesUnavailable
                ? "—"
                : (nitratesQuery.data?.data?.features.length ?? 0)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {nitratesUnavailable
              ? "Source unavailable"
              : `${formatSourceState(nitratesQuery.data?.status)} · screening only`}
          </p>
        </div>
      </section>

      <section className="grid gap-8 border-b border-border py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            EPA classification
          </p>
          <h2 className="font-editorial mt-1 text-3xl font-medium">
            Waterbodies in the screening box
          </h2>
          {wfdQuery.isLoading ? (
            <output
              className="mt-5 block animate-pulse"
              aria-label="Loading nearby EPA waterbody classifications"
            >
              <span className="block h-10 rounded bg-muted" />
              <span className="mt-2 block h-16 rounded bg-muted" />
              <span className="mt-2 block h-16 rounded bg-muted" />
            </output>
          ) : !wfdUnavailable && waterbodies.length ? (
            <>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-3 text-xs">
                {statusCounts.map(([status, count]) => (
                  <span key={status} className={statusTone(status)}>
                    <strong>{count}</strong> {status}
                  </span>
                ))}
              </div>
              <div className="border-b border-border">
                {waterbodies.slice(0, 10).map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_110px_120px]"
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
                        "text-sm font-semibold",
                        statusTone(item.status),
                      )}
                    >
                      {item.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.period}
                    </p>
                  </article>
                ))}
              </div>
              {waterbodies.length > 10 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing the 10 most cautionary of {waterbodies.length} unique
                  waterbodies returned.
                </p>
              ) : null}
            </>
          ) : wfdUnavailable ? (
            <div className="mt-5 flex gap-3 border-l-2 border-destructive py-2 pl-4 text-sm text-muted-foreground">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p>
                EPA classifications are unavailable. No status or zero value has
                been substituted.
              </p>
            </div>
          ) : (
            <div className="mt-5 border-l-2 border-border py-2 pl-4 text-sm">
              <p className="font-semibold">
                No mapped waterbodies were returned in this screening box.
              </p>
              <p className="mt-1 text-muted-foreground">
                This is a valid empty nearby result, not evidence that no
                waterbody or environmental constraint exists.
              </p>
            </div>
          )}
        </div>

        <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <Waves className="h-5 w-5 text-info" />
          <h2 className="font-editorial mt-3 text-3xl font-medium">
            How to use this
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A Moderate, Poor, or Bad classification raises the bar for checking
            nutrient, drainage, bank-side, and buffer decisions. It does not by
            itself establish the rule for a field.
          </p>
          <Link
            href="/my-land"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
          >
            Inspect the map layers
            <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </section>

      <section className="grid gap-8 border-b border-border py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            DAFM nitrate screening
          </p>
          <h2 className="font-editorial mt-1 text-3xl font-medium">
            Published stocking-rate layer
          </h2>
          {nitratesQuery.isLoading ? (
            <output
              className="mt-5 block animate-pulse"
              aria-label="Loading DAFM nitrate screening labels"
            >
              <span className="block h-10 w-52 rounded bg-muted" />
              <span className="mt-3 block h-4 w-full rounded bg-muted" />
            </output>
          ) : !nitratesUnavailable && nitratesQuery.data?.data ? (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {nitrateLabels.length ? (
                  nitrateLabels.map((label) => (
                    <div
                      key={label.raw}
                      className="border border-warning/35 bg-warning/10 px-3 py-2 text-sm font-semibold"
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
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                These are labels from intersecting map features, not a holding
                calculation. Confirm the current National Action Programme,
                derogation terms, stocking records, and adviser guidance.
              </p>
            </>
          ) : (
            <p className="mt-5 border-l-2 border-destructive py-2 pl-4 text-sm text-muted-foreground">
              The DAFM screening layer is unavailable. No result has been
              inferred.
            </p>
          )}
        </div>
        <aside className="border-t border-border pt-6 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-xs text-muted-foreground">Current source</p>
          <p className="mt-1 font-semibold">
            {nitratesQuery.data?.source.label ?? "DAFM nitrates map"}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Checked</p>
          <p className="mt-1 font-semibold">
            {formatCheckedAt(nitratesQuery.data?.fetchedAt)}
          </p>
          {nitratesQuery.data?.source.url ? (
            <a
              href={nitratesQuery.data.source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary"
            >
              Official map source
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-5 py-7 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
        <div className="flex gap-3">
          <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <p>
            EPA WFD classifications cover the 2019–2024 assessment period and
            describe mapped waterbodies returned near the pin, not the farm.
            Checked {formatCheckedAt(wfdQuery.data?.fetchedAt)}.
          </p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
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
