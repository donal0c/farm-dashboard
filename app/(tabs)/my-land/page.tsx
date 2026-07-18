"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CircleAlert,
  ExternalLink,
  Layers3,
  LocateFixed,
  MapPin,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CoordinateFields } from "@/components/farm/coordinate-fields";
import { IrelandMap } from "@/components/map/ireland-map";
import { Button } from "@/components/ui/button";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import {
  type CapCountyAggregate,
  capCountyAggregateSchema,
} from "@/lib/contracts/cap";
import { featureCollectionContract } from "@/lib/contracts/geojson";
import {
  enterpriseLabels,
  enterpriseOptions,
  weekFocusLabels,
  weekFocusOptions,
} from "@/lib/farm-plan";
import {
  formatNitrateScreeningLabel,
  formatParcelReference,
  humanizeLandUse,
  prioritizeSelectedParcel,
} from "@/lib/land-format";
import {
  type FarmEnterprise,
  type FarmWeekFocus,
  useUiStore,
} from "@/lib/store/ui-store";

type LatLng = { latitude: number; longitude: number };

function sourceAge(value: string | undefined) {
  if (!value) return "Not refreshed";
  const differenceMinutes = Math.round(
    (new Date(value).getTime() - Date.now()) / 60_000,
  );
  const formatter = new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" });
  if (Math.abs(differenceMinutes) < 120) {
    return formatter.format(differenceMinutes, "minute");
  }
  const differenceHours = Math.round(differenceMinutes / 60);
  if (Math.abs(differenceHours) < 48) {
    return formatter.format(differenceHours, "hour");
  }
  return formatter.format(Math.round(differenceHours / 24), "day");
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
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [showSoil, setShowSoil] = useState(false);

  const point = pendingPin ?? farmLocation;
  const lpisQuery = useQuery({
    queryKey: ["lpis", point?.latitude, point?.longitude],
    queryFn: () =>
      fetchValidatedSourceSnapshot<GeoJSON.FeatureCollection>(
        `/api/data/lpis?lat=${point?.latitude}&lng=${point?.longitude}&radius=0.08`,
        featureCollectionContract,
      ),
    enabled: Boolean(point),
  });
  const nitratesQuery = useQuery({
    queryKey: ["nitrates", point?.latitude, point?.longitude],
    queryFn: () =>
      fetchValidatedSourceSnapshot<GeoJSON.FeatureCollection>(
        `/api/data/nitrates?lat=${point?.latitude}&lng=${point?.longitude}&radius=0.2`,
        featureCollectionContract,
      ),
    enabled: Boolean(point),
  });
  const capQuery = useQuery({
    queryKey: ["cap-summary", farmLocation?.county],
    queryFn: () =>
      fetchValidatedSourceSnapshot<CapCountyAggregate>(
        `/api/data/cap-summary?county=${farmLocation?.county}`,
        capCountyAggregateSchema,
      ),
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
        crop: humanizeLandUse(
          String(properties.cropCode ?? "Land use not published"),
        ),
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
  const visibleParcels = prioritizeSelectedParcel(parcels, selectedParcelId);
  const totalArea = parcels.reduce((sum, parcel) => sum + parcel.area, 0);
  const lpisFeatureLimitReached =
    (lpisQuery.data?.data?.features.length ?? 0) >= 500;
  const lpisUnavailable =
    lpisQuery.isError || lpisQuery.data?.status === "unavailable";
  const nitratesUnavailable =
    nitratesQuery.isError || nitratesQuery.data?.status === "unavailable";
  const capUnavailable =
    capQuery.isError || capQuery.data?.status === "unavailable";
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
  const nitrateLabels = stockingRates.map(formatNitrateScreeningLabel);

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
          <p className="text-muted-foreground">Nearby nitrate band</p>
          <div className="mt-1 font-semibold">
            {nitratesQuery.isLoading
              ? "Loading"
              : nitratesUnavailable
                ? "Temporarily unavailable"
                : nitrateLabels.length
                  ? nitrateLabels.map((label) => (
                      <p key={label.raw}>
                        {label.rate}
                        {label.effective ? ` · from ${label.effective}` : ""}
                      </p>
                    ))
                  : "No nearby band returned"}
          </div>
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
            {lpisQuery.isLoading
              ? "Loading"
              : lpisUnavailable
                ? "Temporarily unavailable"
                : lpisFeatureLimitReached
                  ? `${parcels.length} unique · 500-feature limit`
                  : `${parcels.length} nearby parcels`}
          </p>
          {lpisFeatureLimitReached ? (
            <p className="mt-1 text-warning">
              Response capped; this is not a complete parcel count.
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-muted-foreground">Last checked</p>
          <p className="mt-1 font-semibold">
            {sourceAge(lpisQuery.data?.fetchedAt)}
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Nearby evidence workspace
            </p>
            <h2 className="font-editorial mt-1 text-3xl font-medium">
              Map and parcel register
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Select a parcel on either side to keep the visual and readable
              views in step. Results cover the search around your pin, not a
              declared farm boundary.
            </p>
          </div>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Map layers</legend>
            <Button
              variant={showSoil ? "default" : "outline"}
              aria-pressed={showSoil}
              onClick={() => setShowSoil((value) => !value)}
              className="gap-2"
            >
              {showSoil ? <Check className="h-4 w-4" /> : null}
              EPA soil overlay
            </Button>
          </fieldset>
        </div>

        {isEditingPin ? (
          <section
            className="mt-5 grid gap-5 border-l-2 border-warning bg-warning/10 px-5 py-5 text-sm lg:grid-cols-[minmax(0,1fr)_320px]"
            aria-label="Move farm pin"
          >
            <div>
              <p className="font-semibold">Choose a candidate point</p>
              <p className="mt-1 max-w-xl leading-6 text-muted-foreground">
                Click the map or enter coordinates. Nearby evidence refreshes
                for the candidate, but your saved farm stays unchanged until you
                confirm.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={savePin} disabled={!pendingPin}>
                  Save candidate pin
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPendingPin(null)}
                  disabled={!pendingPin}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Undo candidate
                </Button>
              </div>
            </div>
            <CoordinateFields
              idPrefix="farm-edit"
              value={point}
              actionLabel="Use as candidate"
              onApply={setPendingPin}
            />
          </section>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.7fr)]">
          <div className="min-w-0">
            <IrelandMap
              center={point}
              onPickLocation={setPendingPin}
              onSelectParcel={setSelectedParcelId}
              pickLocation={isEditingPin}
              selectedParcelId={selectedParcelId}
              lpisGeoJson={lpisQuery.data?.data ?? undefined}
              showSoilLayer={showSoil}
            />
            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Green outlines are DAFM LPIS 2024 reference features. LPIS does
                not establish ownership, eligibility, control, or your legal
                holding boundary. EPA soil is a contextual WMS overlay.
              </p>
            </div>
          </div>

          <div className="min-w-0 border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Readable register
                </p>
                <h3 className="font-editorial mt-1 text-2xl font-medium">
                  Largest nearby parcels
                </h3>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {totalArea.toFixed(1)} ha returned
              </p>
            </div>

            {lpisFeatureLimitReached ? (
              <div className="mt-4 flex gap-2 border-l-2 border-warning bg-warning/10 px-3 py-3 text-xs leading-5">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p>
                  The source hit its 500-feature response limit. The map and
                  totals are a partial nearby sample, not a complete count.
                </p>
              </div>
            ) : null}

            <div className="mt-4 border-y border-border">
              {lpisQuery.isLoading ? (
                <output
                  className="block animate-pulse py-5"
                  aria-label="Loading nearby parcel register"
                >
                  <span className="block h-12 rounded bg-muted" />
                  <span className="mt-2 block h-12 rounded bg-muted" />
                  <span className="mt-2 block h-12 rounded bg-muted" />
                </output>
              ) : lpisUnavailable ? (
                <div className="py-6 text-sm">
                  <p className="font-semibold text-destructive">
                    LPIS reference parcels are temporarily unavailable.
                  </p>
                  <p className="mt-1 leading-6 text-muted-foreground">
                    The request failed; AgriView has not presented that as an
                    empty result.
                  </p>
                </div>
              ) : visibleParcels.length ? (
                visibleParcels.map((parcel) => {
                  const isSelected = selectedParcelId === parcel.id;
                  const parcelRank =
                    parcels.findIndex(
                      (candidate) => candidate.id === parcel.id,
                    ) + 1;
                  return (
                    <button
                      key={parcel.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedParcelId(parcel.id)}
                      onFocus={() => setSelectedParcelId(parcel.id)}
                      onPointerEnter={() => setSelectedParcelId(parcel.id)}
                      className={`grid w-full min-h-16 items-center gap-2 border-b border-border px-2 py-3 text-left transition-colors last:border-b-0 sm:grid-cols-[32px_minmax(0,1fr)_72px] ${
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-muted/60 focus-visible:bg-muted/60"
                      }`}
                    >
                      <span
                        className={`font-editorial flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        aria-hidden="true"
                      >
                        {parcelRank}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {parcel.crop}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatParcelReference(parcel.id)}
                        </span>
                        {parcel.organic || parcel.commonage ? (
                          <span className="mt-1 block text-xs text-primary">
                            {parcel.organic
                              ? "Organic indicator"
                              : "Commonage indicator"}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right text-sm font-semibold">
                        {parcel.area.toFixed(2)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ha
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 text-sm">
                  <p className="font-semibold">
                    No valid LPIS parcel rows were returned nearby.
                  </p>
                  <p className="mt-1 leading-6 text-muted-foreground">
                    This is a valid empty response for this search point, not
                    evidence that no parcel or holding exists.
                  </p>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Showing up to eight unique parcels, largest first. If you select
              another map feature, it replaces the final row so the readable
              register stays in step. Published source references remain
              secondary to the land-use labels.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Nitrate screening context
            </p>
            {nitratesQuery.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Checking the published map around the pin…
              </p>
            ) : nitratesUnavailable ? (
              <p className="mt-2 text-sm text-destructive">
                Nitrate screening is temporarily unavailable.
              </p>
            ) : nitrateLabels.length ? (
              nitrateLabels.map((label) => (
                <div key={label.raw} className="mt-2">
                  <p className="text-sm font-semibold">{label.rate}</p>
                  <p className="text-xs text-muted-foreground">
                    {label.effective
                      ? `Published label effective from ${label.effective}.`
                      : "The source did not publish an effective month in this label."}{" "}
                    Raw source label: {label.raw}
                  </p>
                </div>
              ))
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No nitrate band label was returned for the nearby screening
                area.
              </p>
            )}
          </div>
          <div className="text-xs leading-5 text-muted-foreground">
            <p className="font-semibold uppercase tracking-[0.14em]">
              How to use this
            </p>
            <p className="mt-2">
              This workspace supplies location context to the weekly brief. It
              is not a compliance calculator. Confirm current DAFM maps, scheme
              correspondence, stocking records, and professional advice before
              making a compliance decision.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 border-t border-border py-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            County context
          </p>
          <h2 className="font-editorial mt-1 text-3xl font-medium">
            CAP beneficiaries
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            A public county aggregate for context only. It is not a farm payment
            estimate and cannot identify an individual beneficiary.
          </p>
        </div>
        <aside>
          {capQuery.isLoading ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Loading county context…
            </p>
          ) : capUnavailable ? (
            <p className="text-sm leading-6 text-muted-foreground">
              CAP county context is temporarily unavailable.
            </p>
          ) : capQuery.data?.data ? (
            <>
              <p className="font-editorial text-4xl font-medium">
                {capQuery.data.data.beneficiaries.toLocaleString("en-IE")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                beneficiaries in {capQuery.data.data.county}, 2025
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Total published payments:{" "}
                <strong className="font-semibold text-foreground">
                  {new Intl.NumberFormat("en-IE", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(capQuery.data.data.totalPayment)}
                </strong>
                .
              </p>
              <a
                href={capQuery.data.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
              >
                Official dataset
                <ExternalLink className="h-4 w-4" />
              </a>
            </>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {farmLocation.county
                ? `No ${farmLocation.county} aggregate was present in the current published release.`
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
            These choices tune the weekly brief when a relevant rule exists and
            choose the national series shown under Markets. They do not change
            the underlying public data.
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
