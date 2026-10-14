"use client";

import { LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapView, { Marker, NavigationControl } from "react-map-gl/maplibre";

import { CoordinateFields } from "@/components/farm/coordinate-fields";
import { Button } from "@/components/ui/button";
import { fetchValidatedSourceSnapshot } from "@/lib/client/fetch-source-snapshot";
import { isIrishCoordinate, type LatLng } from "@/lib/contracts/geo";
import routingKeys from "@/lib/data/eircode-routing-keys.json";
import { enterpriseOptions, weekFocusOptions } from "@/lib/farm-plan";
import { farmMapColors, farmMapColorsDark } from "@/lib/map/style";
import { useFarmMapStyle } from "@/lib/map/use-farm-map-style";
import {
  type GeocodedFarmArea,
  geocodedFarmAreaSchema,
} from "@/lib/sources/geocode";
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

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-editorial grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-[15px] font-medium text-background">
      {children}
    </span>
  );
}

export function FarmSetup() {
  const { resolvedTheme } = useTheme();
  const mapStyle = useFarmMapStyle(resolvedTheme);
  const pinColors =
    resolvedTheme === "dark" ? farmMapColorsDark : farmMapColors;
  const [query, setQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<RoutingKey | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [hasPlacedPin, setHasPlacedPin] = useState(false);
  const [viewState, setViewState] = useState({
    ...irelandCenter,
    zoom: 6.2,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const enterprise = useUiStore((state) => state.enterprise);
  const weekFocus = useUiStore((state) => state.weekFocus);
  const setEnterprise = useUiStore((state) => state.setEnterprise);
  const setWeekFocus = useUiStore((state) => state.setWeekFocus);
  const setFarmLocation = useUiStore((state) => state.setFarmLocation);

  const suggestions = useMemo(() => {
    const term = query.trim().toUpperCase();
    if (term.length < 2 || selectedArea) return [];
    return (routingKeys as RoutingKey[])
      .filter(
        (entry) =>
          entry.name.toUpperCase().includes(term) ||
          entry.description.toUpperCase().includes(term),
      )
      .slice(0, 6);
  }, [query, selectedArea]);

  const placePin = (location: LatLng, placedByUser: boolean) => {
    setPin(location);
    setHasPlacedPin(placedByUser);
    setViewState((current) => ({
      ...current,
      ...location,
      zoom: Math.max(current.zoom, placedByUser ? 12 : 10.5),
    }));
  };

  const chooseArea = async (area: RoutingKey) => {
    setSelectedArea(area);
    setQuery(`${area.name} · ${area.description}`);
    setGeocodeError(null);
    setIsLocating(true);
    try {
      const snapshot = await fetchValidatedSourceSnapshot<GeocodedFarmArea>(
        `/api/data/geocode?q=${encodeURIComponent(area.description)}`,
        geocodedFarmAreaSchema,
      );
      if (snapshot.status === "unavailable" || !snapshot.data) {
        throw new Error("The routing area returned an invalid location.");
      }
      const location = snapshot.data;
      if (!isIrishCoordinate(location)) {
        setGeocodeError(
          "The routing service returned a point outside Ireland. Choose another area or enter the farm coordinates below.",
        );
        return;
      }
      setSelectedCounty(location.county);
      placePin(location, false);
    } catch {
      setGeocodeError(
        "We could not locate that routing area. Try again, choose another area, or enter the farm coordinates below.",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const useDeviceLocation = () => {
    setGeolocationError(null);
    if (!("geolocation" in navigator)) {
      setGeolocationError("This browser does not offer device location.");
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGeolocating(false);
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!isIrishCoordinate(location)) {
          setGeolocationError(
            "Your device reported a point outside Ireland, so it was not used.",
          );
          return;
        }
        placePin(location, true);
      },
      (error) => {
        setIsGeolocating(false);
        setGeolocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was declined. Use the map or coordinates instead."
            : "Your device could not provide a location right now. Use the map or coordinates instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const saveFarm = () => {
    if (!pin || !hasPlacedPin) return;
    setFarmLocation({
      ...pin,
      label: selectedArea?.description ?? "Pinned farm location",
      routingKey: selectedArea?.name ?? null,
      county: selectedArea ? selectedCounty : null,
      precision: "manual-pin",
    });
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };

  const canSave = Boolean(pin && hasPlacedPin);
  const mapStatus = isLocating
    ? "Finding the routing area…"
    : isGeolocating
      ? "Asking your device for a location…"
      : pin && !hasPlacedPin
        ? "Approximate area centre — click the map, use your location, or enter coordinates to place the farm point"
        : hasPlacedPin
          ? "Farm pin placed"
          : "Choose an area, click the map, or enter coordinates";

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-rule pb-6">
        <h1 className="display display-lg max-w-[14ch]">Where is your farm?</h1>
        <p className="mt-4 max-w-[60ch] text-base leading-7 text-muted-foreground">
          Place one farm point. It stays in this browser and is sent only to
          AgriView’s own data routes when you load nearby evidence. Routing keys
          are approximate search aids, never an Eircode or property lookup.
        </p>
      </header>

      <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-5">
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <StepNumber>1</StepNumber>
              <label htmlFor="farm-area" className="text-sm font-semibold">
                Routing key or area
              </label>
            </div>
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
                  setSelectedCounty(null);
                  setGeocodeError(null);
                  if (!hasPlacedPin) {
                    setPin(null);
                  }
                }}
                placeholder="Try H91, A92, Clonmel…"
                autoComplete="postal-code"
                className="control w-full pl-10 text-base"
              />
            </div>

            {suggestions.length ? (
              <ul
                className="panel overflow-hidden"
                aria-label="Area suggestions"
              >
                {suggestions.map((area, index) => (
                  <li key={`${area.name}-${area.description}-${index}`}>
                    <button
                      type="button"
                      onClick={() => void chooseArea(area)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-rule px-3 text-left text-sm last:border-b-0 hover:bg-muted"
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
                className="rounded-md border border-dashed border-rule bg-act/5 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-act">
                  Routing area unavailable
                </p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  {geocodeError}
                </p>
                {selectedArea ? (
                  <Button
                    type="button"
                    variant="quiet"
                    className="mt-1"
                    onClick={() => void chooseArea(selectedArea)}
                    disabled={isLocating}
                  >
                    Try this area again
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StepNumber>2</StepNumber>
                <p className="text-sm font-semibold">Place the farm point</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useDeviceLocation}
                disabled={isGeolocating}
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                {isGeolocating ? "Locating…" : "Use my location"}
              </Button>
            </div>
            {geolocationError ? (
              <p role="alert" className="text-sm text-act">
                {geolocationError}
              </p>
            ) : null}
            <div className="panel overflow-hidden">
              <div
                aria-live="polite"
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule px-3 py-2 text-xs text-muted-foreground"
              >
                <span>{mapStatus}</span>
                {pin ? (
                  <span className="font-semibold text-foreground">
                    {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                  </span>
                ) : null}
              </div>
              <div className="h-[360px] bg-muted">
                <MapView
                  mapStyle={mapStyle}
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
                  attributionControl={{ compact: true }}
                >
                  <NavigationControl position="top-right" showCompass={false} />
                  {pin ? (
                    <Marker
                      {...pin}
                      anchor="bottom"
                      style={{ pointerEvents: "none" }}
                    >
                      <MapPin
                        className="h-9 w-9 drop-shadow-sm"
                        color={pinColors.pin}
                        fill={resolvedTheme === "dark" ? "#1a2a1f" : "#f7f3e8"}
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
              <div className="border-t border-rule p-4">
                <CoordinateFields
                  idPrefix="farm-setup"
                  value={pin}
                  onApply={(location) => placePin(location, true)}
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-5 border-t border-rule pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center gap-3">
            <StepNumber>3</StepNumber>
            <p className="text-sm font-semibold">Farm context</p>
          </div>
          <p className="-mt-2 text-sm leading-6 text-muted-foreground">
            This changes which rules the brief applies. You can change it any
            time.
          </p>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            Enterprise
            <select
              value={enterprise}
              onChange={(event) =>
                setEnterprise(event.target.value as FarmEnterprise)
              }
              className="control"
            >
              {enterpriseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            This week
            <select
              value={weekFocus}
              onChange={(event) =>
                setWeekFocus(event.target.value as FarmWeekFocus)
              }
              className="control"
            >
              {weekFocusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            size="lg"
            onClick={saveFarm}
            disabled={!canSave}
            className={cn("w-full", !canSave && "cursor-not-allowed")}
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Use this farm
          </Button>
          <p className="meta">
            {canSave
              ? "Saves the pin and opens this week’s brief."
              : "Place the farm point first."}
          </p>
        </aside>
      </div>
    </div>
  );
}
