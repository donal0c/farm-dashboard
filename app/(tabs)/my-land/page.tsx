"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Layers3,
  LocateFixed,
  MapPin,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { IrelandMap } from "@/components/map/ireland-map";
import { Button } from "@/components/ui/button";
import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";
import {
  enterpriseLabels,
  enterpriseOptions,
  weekFocusLabels,
  weekFocusOptions,
} from "@/lib/farm-plan";
import type { CapCountyAggregate } from "@/lib/sources/cap";
import {
  type FarmEnterprise,
  type FarmWeekFocus,
  useUiStore,
} from "@/lib/store/ui-store";

type LatLng = { latitude: number; longitude: number };

function sourceAge(value: string | undefined) {
  if (!value) return "Not refreshed";
  return new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" }).format(
    Math.round((new Date(value).getTime() - Date.now()) / 60_000),
    "minute",
  );
}

function parcelReference(id: string) {
  return id.length > 16 ? `Parcel …${id.slice(-8)}` : `Parcel ${id}`;
}

export default function MyLandPage() {
  const farmLocation = useUiStore((state) => state.farmLocation);
  const setFarmLocation = useUiStore((state) => state.setFarmLocation);
  const enterprise = useUiStore((state) => state.enterprise);
  const setEnterprise = useUiStore((state) => state.setEnterprise);
  const weekFocus = useUiStore((state) => state.weekFocus);
  const setWeekFocus = useUiStore((state) => state.setWeekFocus);
  const hasHydrated = useUiStore((state) => state.hasHydrated);
  const [pendingPin, setPendingPin] = useState<LatLng | null>(null);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [showSoil, setShowSoil] = useState(false);

  const point = pendingPin ?? farmLocation;
  const lpisQuery = useQuery({
    queryKey: ["lpis", point?.latitude, point?.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/lpis?lat=${point?.latitude}&lng=${point?.longitude}&radius=0.08`,
      );
      return (await response.json()) as SourceSnapshot<GeoJSON.FeatureCollection>;
    },
    enabled: Boolean(point),
  });
  const nitratesQuery = useQuery({
    queryKey: ["nitrates", point?.latitude, point?.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/nitrates?lat=${point?.latitude}&lng=${point?.longitude}&radius=0.2`,
      );
      return (await response.json()) as SourceSnapshot<GeoJSON.FeatureCollection>;
    },
    enabled: Boolean(point),
  });
  const capQuery = useQuery({
    queryKey: ["cap-summary", farmLocation?.county],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/cap-summary?county=${farmLocation?.county}`,
      );
      return (await response.json()) as SourceSnapshot<CapCountyAggregate>;
    },
    enabled: Boolean(farmLocation?.county),
  });

  const parcels = useMemo(() => {
    const byParcel = new Map<
      string,
      {
        id: string;
        crop: string;
        area: number;
        claimedArea: number;
        organic: boolean;
        commonage: boolean;
      }
    >();
    for (const feature of lpisQuery.data?.data?.features ?? []) {
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      const id = String(properties.parcelId ?? feature.id ?? "Unlabelled");
      const parcel = {
        id,
        crop: String(properties.cropCode ?? "Land use not published"),
        area: Number(properties.digitisedAreaHa),
        claimedArea: Number(properties.claimedAreaHa),
        organic: properties.organic === true,
        commonage: properties.commonage === true,
      };
      if (
        Number.isFinite(parcel.area) &&
        (!byParcel.has(id) || parcel.area > (byParcel.get(id)?.area ?? 0))
      ) {
        byParcel.set(id, parcel);
      }
    }
    return Array.from(byParcel.values()).sort((a, b) => b.area - a.area);
  }, [lpisQuery.data]);
  const visibleParcels = parcels.slice(0, 8);
  const totalArea = parcels.reduce((sum, parcel) => sum + parcel.area, 0);
  const lpisFeatureLimitReached =
    (lpisQuery.data?.data?.features.length ?? 0) >= 500;
  const stockingRates = Array.from(
    new Set(
      (nitratesQuery.data?.data?.features ?? [])
        .map((feature) => feature.properties?.STK_RATE)
        .filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value.trim()),
        ),
    ),
  ).sort();

  if (!hasHydrated) {
    return (
      <output className="block animate-pulse" aria-label="Loading saved farm">
        <span className="block h-12 w-2/3 rounded bg-muted" />
        <span className="mt-8 block h-96 rounded bg-muted" />
      </output>
    );
  }

  if (!farmLocation || !point) {
    return (
      <div className="max-w-2xl border-t border-border pt-8">
        <MapPin className="h-7 w-7 text-primary" />
        <h1 className="font-editorial mt-5 text-5xl font-medium tracking-[-0.03em]">
          Set the farm first
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Land evidence needs a saved manual pin. AgriView will not infer an
          exact farm location from an Eircode.
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

  const savePin = () => {
    if (!pendingPin) return;
    setFarmLocation({
      ...farmLocation,
      ...pendingPin,
      precision: "manual-pin",
    });
    setPendingPin(null);
    setIsEditingPin(false);
  };

  return (
    <div>
      <header className="border-b border-border pb-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Saved farm · nearby evidence
            </p>
            <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.035em] sm:text-6xl">
              Land around your pin
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditingPin((current) => !current);
              setPendingPin(null);
            }}
            className="gap-2"
          >
            <LocateFixed className="h-4 w-4" />
            {isEditingPin ? "Stop moving pin" : "Move farm pin"}
          </Button>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          LPIS parcels are reference features near the point you saved. They do
          not prove ownership, eligibility, or the boundary of your holding.
        </p>
      </header>

      <section className="grid gap-3 border-b border-border py-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Nitrate screening</p>
          <p className="mt-1 font-semibold">
            {nitratesQuery.isLoading
              ? "Loading"
              : stockingRates.length
                ? stockingRates.join(" · ")
                : "No label returned"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Farm area</p>
          <p className="mt-1 font-semibold">
            {farmLocation.routingKey ?? farmLocation.label}
            {farmLocation.county ? ` · ${farmLocation.county}` : ""}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">LPIS source</p>
          <p className="mt-1 font-semibold">
            {lpisQuery.data?.status === "live"
              ? lpisFeatureLimitReached
                ? `${parcels.length} unique · 500-feature limit`
                : `${parcels.length} nearby parcels`
              : lpisQuery.isLoading
                ? "Loading"
                : "Unavailable"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Last checked</p>
          <p className="mt-1 font-semibold">
            {sourceAge(lpisQuery.data?.fetchedAt)}
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Reference map
            </p>
            <h2 className="font-editorial mt-1 text-3xl font-medium">
              Parcels and soil context
            </h2>
          </div>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Map layers</legend>
            <Button
              variant={showSoil ? "default" : "outline"}
              onClick={() => setShowSoil((value) => !value)}
              className="gap-2"
            >
              {showSoil ? <Check className="h-4 w-4" /> : null}
              Soil
            </Button>
          </fieldset>
        </div>

        {isEditingPin ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm">
            <p>
              Click the map to place a candidate pin. Data will refresh around
              it; save only when the point is right.
            </p>
            <div className="flex gap-2">
              {pendingPin ? <Button onClick={savePin}>Save pin</Button> : null}
              <Button
                variant="ghost"
                onClick={() => setPendingPin(null)}
                disabled={!pendingPin}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Undo
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <IrelandMap
            center={point}
            onPickLocation={(location) => {
              if (isEditingPin) setPendingPin(location);
            }}
            lpisGeoJson={lpisQuery.data?.data ?? undefined}
            showSoilLayer={showSoil}
          />
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Green: DAFM LPIS 2024 reference parcels. Soil is an optional EPA WMS
            overlay. Nitrate labels are screened without sending the source’s
            multi-megabyte national polygons to the browser.
          </p>
        </div>
      </section>

      <section className="grid gap-8 border-t border-border py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Text alternative
              </p>
              <h2 className="font-editorial mt-1 text-3xl font-medium">
                Largest nearby parcels
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalArea.toFixed(1)} ha in response
            </p>
          </div>
          <div className="mt-5 border-y border-border">
            {lpisQuery.isLoading ? (
              <p className="py-6 text-sm text-muted-foreground">
                Loading current LPIS reference parcels…
              </p>
            ) : visibleParcels.length ? (
              visibleParcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className="grid min-h-14 items-center gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_80px_120px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {parcel.crop}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {parcelReference(parcel.id)}
                    </p>
                  </div>
                  <p className="text-sm">{parcel.area.toFixed(2)} ha</p>
                  <p className="text-xs text-muted-foreground">
                    {parcel.organic
                      ? "Organic indicator"
                      : parcel.commonage
                        ? "Commonage indicator"
                        : "No special indicator"}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-muted-foreground">
                No valid LPIS parcel rows were returned near this point.
              </p>
            )}
          </div>
        </div>

        <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            County context
          </p>
          <h2 className="font-editorial mt-1 text-3xl font-medium">
            CAP beneficiaries
          </h2>
          {capQuery.data?.data ? (
            <>
              <p className="font-editorial mt-5 text-4xl font-medium">
                {capQuery.data.data.beneficiaries.toLocaleString("en-IE")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                beneficiaries in {capQuery.data.data.county}, 2025
              </p>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Total published payments:{" "}
                <strong className="font-semibold text-foreground">
                  {new Intl.NumberFormat("en-IE", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(capQuery.data.data.totalPayment)}
                </strong>
                . This is county-level public context, not a farm estimate.
              </p>
              <a
                href={capQuery.data.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
              >
                Official dataset
                <ExternalLink className="h-4 w-4" />
              </a>
            </>
          ) : (
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              {farmLocation.county
                ? "CAP county context is temporarily unavailable."
                : "Choose a routing area in farm setup to add county context."}
            </p>
          )}
        </aside>
      </section>

      <section
        id="farm-settings"
        className="grid gap-6 border-t border-border py-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Farm settings
          </p>
          <h2 className="font-editorial mt-1 text-3xl font-medium">
            Tune the working brief
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            These choices change the ordering and language of the weekly brief
            and the national series shown under Markets. They do not change the
            underlying public data.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
            Main enterprise
            <select
              value={enterprise}
              onChange={(event) =>
                setEnterprise(event.target.value as FarmEnterprise)
              }
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {enterpriseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="font-normal">
              Current: {enterpriseLabels[enterprise]}
            </span>
          </label>
          <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
            This week’s focus
            <select
              value={weekFocus}
              onChange={(event) =>
                setWeekFocus(event.target.value as FarmWeekFocus)
              }
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {weekFocusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="font-normal">
              Current: {weekFocusLabels[weekFocus]}
            </span>
          </label>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-sm leading-6 text-muted-foreground">
        The map is a screening workspace. Confirm official scheme maps,
        correspondence, and field records before acting.
      </footer>
    </div>
  );
}
