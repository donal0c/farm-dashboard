"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  Layers3,
  LocateFixed,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";

import { CoordinateFields } from "@/components/farm/coordinate-fields";
import { IrelandMap } from "@/components/map/ireland-map";
import { Button } from "@/components/ui/button";
import { NeedsFarm, PageSkeleton } from "@/components/ui/needs-farm";
import { Fact, PageIntro, SectionHeading } from "@/components/ui/page-intro";
import { SourceNotice } from "@/components/ui/source-notice";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import { sourceQueryStaleTime } from "@/lib/client/source-query-policy";
import {
  type CapCountyAggregate,
  capCountyAggregateSchema,
} from "@/lib/contracts/cap";
import { featureCollectionContract } from "@/lib/contracts/geojson";
import {
  formatNitrateScreeningLabel,
  formatParcelReference,
  humanizeLandUse,
  prioritizeSelectedParcel,
} from "@/lib/land-format";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

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
    staleTime: sourceQueryStaleTime.lpis,
  });
  const nitratesQuery = useQuery({
    queryKey: ["nitrates", point?.latitude, point?.longitude],
    queryFn: () =>
      fetchValidatedSourceSnapshot<GeoJSON.FeatureCollection>(
        `/api/data/nitrates?lat=${point?.latitude}&lng=${point?.longitude}&radius=0.2`,
        featureCollectionContract,
      ),
    enabled: Boolean(point),
    staleTime: sourceQueryStaleTime.nitrates,
  });
  const capQuery = useQuery({
    queryKey: ["cap-summary", farmLocation?.county],
    queryFn: () =>
      fetchValidatedSourceSnapshot<CapCountyAggregate>(
        `/api/data/cap-summary?county=${farmLocation?.county}`,
        capCountyAggregateSchema,
      ),
    enabled: Boolean(farmLocation?.county),
    staleTime: sourceQueryStaleTime.cap,
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

  if (!hasHydrated) return <PageSkeleton label="Loading saved farm" />;

  if (!farmLocation || !point) {
    return (
      <NeedsFarm
        title="Set the farm first"
        detail="Land evidence needs a saved manual pin. AgriView will not infer an exact farm location from an Eircode."
      />
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
      <PageIntro
        title="Land around your pin"
        lede="LPIS parcels are reference features near the point you saved. They do not prove ownership, eligibility, or the boundary of your holding."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setIsEditingPin((current) => !current);
              setPendingPin(null);
            }}
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {isEditingPin ? "Stop moving pin" : "Move farm pin"}
          </Button>
        }
      />

      <dl className="grid min-h-[88px] gap-4 border-b border-rule py-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Nearby nitrate band">
          {nitratesQuery.isLoading
            ? "Loading"
            : nitratesUnavailable
              ? "Temporarily unavailable"
              : nitrateLabels.length
                ? nitrateLabels.map((label) => (
                    <span key={label.raw} className="block">
                      {label.rate}
                      {label.effective ? ` · from ${label.effective}` : ""}
                    </span>
                  ))
                : "No nearby band returned"}
        </Fact>
        <Fact label="Saved point">
          {farmLocation.latitude.toFixed(4)},{" "}
          {farmLocation.longitude.toFixed(4)}
        </Fact>
        <Fact label="LPIS source">
          {lpisQuery.isLoading
            ? "Loading"
            : lpisUnavailable
              ? "Temporarily unavailable"
              : lpisFeatureLimitReached
                ? `${parcels.length} unique · 500-feature limit`
                : `${parcels.length} nearby parcels`}
          {lpisFeatureLimitReached ? (
            <span className="block text-xs font-normal text-check">
              Response capped; this is not a complete parcel count.
            </span>
          ) : null}
        </Fact>
        <Fact label="Last checked">{sourceAge(lpisQuery.data?.fetchedAt)}</Fact>
      </dl>

      <section className="py-8">
        <SectionHeading
          title="Map and parcel register"
          lede="Select a parcel on either side to keep the visual and readable views in step. Results cover the search around your pin, not a declared farm boundary."
          aside={
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Map layers</legend>
              <Button
                variant={showSoil ? "default" : "outline"}
                aria-pressed={showSoil}
                onClick={() => setShowSoil((value) => !value)}
              >
                {showSoil ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : null}
                EPA soil overlay
              </Button>
            </fieldset>
          }
        />

        {isEditingPin ? (
          <section
            className="panel sheet-enter mt-5 grid gap-5 px-5 py-5 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]"
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
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
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

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.7fr)]">
          <div className="min-w-0">
            <IrelandMap
              center={point}
              candidate={pendingPin}
              onPickLocation={setPendingPin}
              onSelectParcel={setSelectedParcelId}
              pickLocation={isEditingPin}
              selectedParcelId={selectedParcelId}
              lpisGeoJson={lpisQuery.data?.data ?? undefined}
              showSoilLayer={showSoil}
            />
            <div className="meta mt-3 flex items-start gap-2 text-xs">
              <Layers3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Green outlines are DAFM LPIS 2024 reference features. LPIS does
                not establish ownership, eligibility, control, or your legal
                holding boundary. EPA soil is a contextual WMS overlay. Base map
                © OpenMapTiles © OpenStreetMap contributors.
              </p>
            </div>
          </div>

          <div className="min-w-0 border-t border-rule pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <SectionHeading
              as="h3"
              title="Largest nearby parcels"
              aside={
                parcels.length ? (
                  <p className="meta">{totalArea.toFixed(1)} ha returned</p>
                ) : null
              }
            />

            {lpisFeatureLimitReached ? (
              <SourceNotice
                tone="partial"
                className="mt-4"
                title="The source hit its 500-feature response limit."
                detail="The map and totals are a partial nearby sample, not a complete count."
              />
            ) : null}

            <div className="mt-4 border-y border-rule">
              {lpisQuery.isLoading ? (
                <output
                  className="block animate-pulse"
                  aria-label="Loading nearby parcel register"
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: Static loading placeholders have no identity.
                      key={index}
                      className="block h-16 border-b border-rule bg-muted last:border-b-0"
                    />
                  ))}
                </output>
              ) : lpisUnavailable ? (
                <div className="py-4">
                  <SourceNotice
                    tone="unavailable"
                    title="LPIS reference parcels are temporarily unavailable."
                    detail="The request failed; AgriView has not presented that as an empty result."
                    onRetry={() => void lpisQuery.refetch()}
                  />
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
                      className={cn(
                        "grid w-full min-h-16 items-center gap-2 border-b border-rule px-2 py-3 text-left transition-colors last:border-b-0 sm:grid-cols-[32px_minmax(0,1fr)_72px]",
                        isSelected
                          ? "bg-accent/70"
                          : "hover:bg-muted/60 focus-visible:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "font-editorial flex h-7 w-7 items-center justify-center rounded-full text-sm",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
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
                <div className="py-4">
                  <SourceNotice
                    tone="empty"
                    title="No valid LPIS parcel rows were returned nearby."
                    detail="This is a valid empty response for this search point, not evidence that no parcel or holding exists."
                  />
                </div>
              )}
            </div>
            <p className="meta mt-3 text-xs">
              Showing up to eight unique parcels, largest first. If you select
              another map feature, it replaces the final row so the readable
              register stays in step.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 border-t border-rule pt-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Nitrate screening context</h3>
            {nitratesQuery.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Checking the published map around the pin…
              </p>
            ) : nitratesUnavailable ? (
              <p className="mt-2 text-sm text-act">
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
          <div className="text-sm leading-6 text-muted-foreground">
            <h3 className="text-sm font-semibold text-foreground">
              How to use this
            </h3>
            <p className="mt-2">
              This workspace supplies location context to the weekly brief. It
              is not a compliance calculator. Confirm current DAFM maps, scheme
              correspondence, stocking records, and professional advice before
              making a compliance decision.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 border-t border-rule py-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]">
        <div>
          <h2 className="display display-sm">
            CAP beneficiaries in the county
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
            <SourceNotice
              tone="unavailable"
              title="CAP county context is temporarily unavailable."
              detail="No county figure has been substituted."
              onRetry={() => void capQuery.refetch()}
            />
          ) : capQuery.data?.data ? (
            <>
              <p className="text-base leading-7">
                <strong className="font-semibold">
                  {capQuery.data.data.beneficiaries.toLocaleString("en-IE")}
                </strong>{" "}
                beneficiaries in {capQuery.data.data.county}, 2025
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Official dataset
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
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

      <footer className="border-t border-rule py-6 text-sm leading-6 text-muted-foreground">
        The map is a screening workspace. Confirm official scheme maps,
        correspondence, and field records before acting.
      </footer>
    </div>
  );
}
