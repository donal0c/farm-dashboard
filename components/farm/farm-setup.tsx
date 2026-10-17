"use client";

import { LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapView, {
  Marker,
  NavigationControl,
  type ViewState,
} from "react-map-gl/maplibre";

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

const irelandCenter = { latitude: 53.35, longitude: -7.9 };

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
  const [viewState, setViewState] = useState<ViewState>(() => ({
    ...irelandCenter,
    zoom: 6.4,
    bearing: 0,
    pitch: 0,
    // On wide screens the card floats over the west; keep the island clear of it.
    padding:
      typeof window !== "undefined" && window.innerWidth >= 1024
        ? { left: 480, top: 0, right: 0, bottom: 0 }
        : { left: 0, top: 0, right: 0, bottom: 0 },
  }));
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
          "The routing service returned a point outside Ireland. Choose another area or enter the farm coordinates.",
        );
        return;
      }
      setSelectedCounty(location.county);
      placePin(location, false);
    } catch {
      setGeocodeError(
        "We could not locate that routing area. Try again, choose another area, or enter the farm coordinates.",
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
    <div className="bleed -mt-6 md:-mt-9">
      <div className="relative lg:min-h-[720px]">
        <div className="relative h-[300px] overflow-hidden bg-muted sm:h-[360px] lg:absolute lg:inset-0 lg:h-auto">
          <MapView
            mapStyle={mapStyle}
            {...viewState}
            onMove={(event) => setViewState(event.viewState)}
            onClick={(event) => {
              placePin(
                { latitude: event.lngLat.lat, longitude: event.lngLat.lng },
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
                  className="h-10 w-10 drop-shadow-md"
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

        <div className="sheet relative z-10 mx-auto -mt-6 w-[min(100%,34rem)] px-5 py-6 sm:px-7 sm:py-7 lg:absolute lg:left-10 lg:top-10 lg:mx-0 lg:mt-0 lg:w-[26.5rem]">
          <h1 className="display display-md">Where is your farm?</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            One farm point, kept in this browser. Routing keys are an
            approximate search aid, not an Eircode lookup.
          </p>

          <label
            htmlFor="farm-area"
            className="mt-5 block text-sm font-semibold"
          >
            Routing key or area
          </label>
          <div className="relative mt-1.5">
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
                if (!hasPlacedPin) setPin(null);
              }}
              placeholder="Try H91, A92, Clonmel…"
              autoComplete="postal-code"
              className="control w-full pl-10 text-base"
            />
          </div>
          {suggestions.length ? (
            <ul
              className="panel mt-2 overflow-hidden"
              aria-label="Area suggestions"
            >
              {suggestions.map((area, index) => (
                <li key={`${area.name}-${area.description}-${index}`}>
                  <button
                    type="button"
                    onClick={() => void chooseArea(area)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-rule px-3 text-left text-sm last:border-b-0 hover:bg-muted"
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
              className="mt-3 rounded-md border border-dashed border-rule bg-act/5 px-4 py-3 text-sm"
            >
              <p className="font-semibold text-act">Routing area unavailable</p>
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

          <p aria-live="polite" className="footnote mt-3">
            {mapStatus}
            {pin ? (
              <span className="ml-1 font-semibold text-foreground">
                {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
              </span>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
            <span className="text-xs text-muted-foreground">
              or click the map
            </span>
          </div>
          {geolocationError ? (
            <p role="alert" className="mt-2 text-sm text-act">
              {geolocationError}
            </p>
          ) : null}

          <div className="mt-4 border-t border-rule pt-4">
            <CoordinateFields
              idPrefix="farm-setup"
              value={pin}
              onApply={(location) => placePin(location, true)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-4">
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
          </div>

          <Button
            type="button"
            size="lg"
            onClick={saveFarm}
            disabled={!canSave}
            className={cn("mt-5 w-full", !canSave && "cursor-not-allowed")}
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Use this farm
          </Button>
          <p className="footnote mt-2">
            {canSave
              ? "Opens this week’s brief for the pinned farm."
              : "Place the farm point first."}
          </p>
        </div>
      </div>
    </div>
  );
}
