"use client";

import { LocateFixed, MapPin, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapView, { Marker } from "react-map-gl/maplibre";

import { CoordinateFields } from "@/components/farm/coordinate-fields";
import { Button } from "@/components/ui/button";
import { isIrishCoordinate, type LatLng } from "@/lib/contracts/geo";
import routingKeys from "@/lib/data/eircode-routing-keys.json";
import { enterpriseOptions, weekFocusOptions } from "@/lib/farm-plan";
import { farmMapColors, farmMapStyles } from "@/lib/map/style";
import {
  type FarmEnterprise,
  type FarmWeekFocus,
  useUiStore,
} from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

type RoutingKey = {
  name: string;
  description: string;
};

const irelandCenter = { latitude: 53.42, longitude: -7.83 };

function countyFromDescription(description: string) {
  const county = description.split(/\s+/).filter(Boolean).at(-1);
  return county ? county.toUpperCase() : null;
}

export function FarmSetup() {
  const { resolvedTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<RoutingKey | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [hasPlacedPin, setHasPlacedPin] = useState(false);
  const [viewState, setViewState] = useState({
    ...irelandCenter,
    zoom: 6.2,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const enterprise = useUiStore((state) => state.enterprise);
  const weekFocus = useUiStore((state) => state.weekFocus);
  const setEnterprise = useUiStore((state) => state.setEnterprise);
  const setWeekFocus = useUiStore((state) => state.setWeekFocus);
  const setFarmLocation = useUiStore((state) => state.setFarmLocation);

  const suggestions = useMemo(() => {
    const term = query.trim().toUpperCase();
    if (term.length < 2) return [];
    return (routingKeys as RoutingKey[])
      .filter(
        (entry) =>
          entry.name.toUpperCase().includes(term) ||
          entry.description.toUpperCase().includes(term),
      )
      .slice(0, 6);
  }, [query]);

  const placePin = (location: LatLng, placedByUser: boolean) => {
    setPin(location);
    setHasPlacedPin(placedByUser);
    setViewState((current) => ({
      ...current,
      ...location,
      zoom: Math.max(current.zoom, 10.5),
    }));
  };

  const chooseArea = async (area: RoutingKey) => {
    setSelectedArea(area);
    setQuery(`${area.name} · ${area.description}`);
    setGeocodeError(null);
    setIsLocating(true);
    try {
      const response = await fetch(
        `/api/data/geocode?q=${encodeURIComponent(area.description)}`,
      );
      if (!response.ok) {
        throw new Error("The routing area could not be located.");
      }
      const payload = (await response.json()) as unknown;
      if (
        !payload ||
        typeof payload !== "object" ||
        !("latitude" in payload) ||
        !("longitude" in payload)
      ) {
        throw new Error("The routing area returned an invalid location.");
      }
      const location = {
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
      };
      if (!isIrishCoordinate(location)) {
        setGeocodeError(
          "The routing service returned a point outside Ireland. Choose another area or enter the farm coordinates below.",
        );
        return;
      }
      placePin(location, false);
    } catch {
      setGeocodeError(
        "We could not locate that routing area. Try again, choose another area, or enter the farm coordinates below.",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const saveFarm = () => {
    if (!pin || !hasPlacedPin) return;
    setFarmLocation({
      ...pin,
      label: selectedArea?.description ?? "Pinned farm location",
      routingKey: selectedArea?.name ?? null,
      county: selectedArea
        ? countyFromDescription(selectedArea.description)
        : null,
      precision: "manual-pin",
    });
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-b border-border pb-7">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Set up your weekly brief
        </p>
        <h1 className="font-editorial text-4xl font-medium leading-[1.05] tracking-[-0.025em] sm:text-5xl">
          Where is your farm?
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Choose a routing area, then place the farm point with the map or
          coordinates. The saved profile stays in this browser; the point is
          sent to AgriView’s data routes when you load nearby evidence.
        </p>
      </div>

      <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="grid gap-4">
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="farm-area"
          >
            Routing key or area
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="farm-area"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedArea(null);
                  setGeocodeError(null);
                  if (!hasPlacedPin) {
                    setPin(null);
                  }
                }}
                placeholder="Try H91, A92, Clonmel…"
                autoComplete="postal-code"
                className="min-h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-base"
              />
            </div>
          </label>

          {suggestions.length ? (
            <ul
              className="overflow-hidden rounded-md border border-border bg-card"
              aria-label="Area suggestions"
            >
              {suggestions.map((area, index) => (
                <li key={`${area.name}-${area.description}-${index}`}>
                  <button
                    type="button"
                    onClick={() => void chooseArea(area)}
                    className="flex min-h-12 w-full items-center justify-between border-b border-border px-3 text-left text-sm last:border-b-0 hover:bg-muted"
                  >
                    <span>{area.description}</span>
                    <span className="font-semibold text-primary">
                      {area.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {geocodeError ? (
            <div
              role="alert"
              className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm"
            >
              <p className="font-semibold text-destructive">
                Routing area unavailable
              </p>
              <p className="mt-1 leading-6 text-muted-foreground">
                {geocodeError}
              </p>
              {selectedArea ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 px-0 text-primary"
                  onClick={() => void chooseArea(selectedArea)}
                  disabled={isLocating}
                >
                  Try this area again
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div
              aria-live="polite"
              className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground"
            >
              <span>
                {isLocating
                  ? "Finding the routing area…"
                  : pin && !hasPlacedPin
                    ? "Approximate area centre — use the map or coordinates to place the farm point"
                    : hasPlacedPin
                      ? "Farm pin placed"
                      : "Choose an area, click the map, or enter coordinates"}
              </span>
              {pin ? (
                <span>
                  {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                </span>
              ) : null}
            </div>
            <div className="h-[340px]">
              <MapView
                mapStyle={
                  resolvedTheme === "dark"
                    ? farmMapStyles.dark
                    : farmMapStyles.light
                }
                {...viewState}
                onMove={(event) => setViewState(event.viewState)}
                onClick={(event) => {
                  placePin(
                    {
                      latitude: event.lngLat.lat,
                      longitude: event.lngLat.lng,
                    },
                    true,
                  );
                }}
                cursor="crosshair"
                cooperativeGestures
              >
                {pin ? (
                  <Marker {...pin} anchor="bottom">
                    <MapPin
                      className="h-9 w-9 drop-shadow-sm"
                      color={farmMapColors.pin}
                      fill="#f7f3e8"
                      strokeWidth={1.8}
                      aria-label={
                        hasPlacedPin
                          ? "Selected farm point"
                          : "Approximate area centre"
                      }
                    />
                  </Marker>
                ) : null}
              </MapView>
            </div>
            <div className="border-t border-border p-4">
              <CoordinateFields
                idPrefix="farm-setup"
                value={pin}
                onApply={(location) => placePin(location, true)}
              />
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-6 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-sm font-semibold">Farm context</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              This changes which signals AgriView prioritises. You can edit it
              later.
            </p>
          </div>
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Enterprise
            <select
              value={enterprise}
              onChange={(event) =>
                setEnterprise(event.target.value as FarmEnterprise)
              }
              className="min-h-11 rounded-md border border-input bg-card px-3 text-sm normal-case tracking-normal text-foreground"
            >
              {enterpriseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            This week
            <select
              value={weekFocus}
              onChange={(event) =>
                setWeekFocus(event.target.value as FarmWeekFocus)
              }
              className="min-h-11 rounded-md border border-input bg-card px-3 text-sm normal-case tracking-normal text-foreground"
            >
              {weekFocusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="border-l-2 border-warning pl-3 text-sm leading-6 text-muted-foreground">
            Routing areas are approximate. This is not an official Eircode or
            property boundary lookup.
          </div>

          <Button
            type="button"
            onClick={saveFarm}
            disabled={!pin || !hasPlacedPin}
            className={cn(
              "w-full gap-2",
              (!pin || !hasPlacedPin) && "cursor-not-allowed",
            )}
          >
            <LocateFixed className="h-4 w-4" />
            Use this farm
          </Button>
        </aside>
      </div>
    </div>
  );
}
