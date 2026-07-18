"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { IrelandMap } from "@/components/map/ireland-map";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataNotice, DecisionPanel } from "@/components/ui/data-status";
import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";
import routingKeys from "@/lib/data/eircode-routing-keys.json";
import { useUiStore } from "@/lib/store/ui-store";

type LatLng = { latitude: number; longitude: number };

type RoutingKey = {
  name: string;
  description: string;
};

const defaultCenter: LatLng = {
  latitude: 53.5,
  longitude: -7.5,
};

function extractRoutingKey(value: string) {
  const normalized = value.toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^(D6W|[A-Z]\d{2})/);
  return match?.[1] ?? null;
}

function countyFromDescription(description: string) {
  const tokens = description
    .replace(/\d+/g, "")
    .trim()
    .split(" ")
    .filter(Boolean);

  return tokens[tokens.length - 1]?.toUpperCase() ?? "";
}

export default function MyLandPage() {
  const [routingQuery, setRoutingQuery] = useState("");
  const [selectedRoutingKey, setSelectedRoutingKey] =
    useState<RoutingKey | null>(null);
  const [location, setLocation] = useState<LatLng>(defaultCenter);
  const [showSoilLayer, setShowSoilLayer] = useState(false);
  const [showNitrateLayer, setShowNitrateLayer] = useState(true);
  const enterprise = useUiStore((state) => state.enterprise);
  const weekFocus = useUiStore((state) => state.weekFocus);
  const setFarmCounty = useUiStore((state) => state.setFarmCounty);

  const suggestions = useMemo(() => {
    const query = routingQuery.trim().toUpperCase();
    if (!query) {
      return [];
    }

    const normalized = query.replace(/\s+/g, "");
    const routingKey = extractRoutingKey(query);
    const terms = [query, normalized, routingKey].filter(
      (term): term is string => Boolean(term),
    );

    return (routingKeys as RoutingKey[])
      .filter((entry) =>
        terms.some(
          (term) =>
            entry.name.toUpperCase().includes(term) ||
            entry.description.toUpperCase().includes(term),
        ),
      )
      .slice(0, 8);
  }, [routingQuery]);

  const lpisQuery = useQuery({
    queryKey: ["lpis", location.latitude, location.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/lpis?lat=${location.latitude}&lng=${location.longitude}&radius=0.12`,
      );
      if (!response.ok) {
        throw new Error("LPIS query failed");
      }
      return response.json() as Promise<
        SourceSnapshot<GeoJSON.FeatureCollection>
      >;
    },
  });

  const nitratesQuery = useQuery({
    queryKey: ["nitrates", location.latitude, location.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/nitrates?lat=${location.latitude}&lng=${location.longitude}&radius=0.2`,
      );
      if (!response.ok) {
        throw new Error("Nitrate query failed");
      }
      return response.json() as Promise<GeoJSON.FeatureCollection>;
    },
  });

  const county = selectedRoutingKey
    ? countyFromDescription(selectedRoutingKey.description)
    : null;

  useEffect(() => {
    setFarmCounty(county);
  }, [county, setFarmCounty]);

  const capSummaryQuery = useQuery({
    queryKey: ["cap-summary", county],
    queryFn: async () => {
      const response = await fetch(`/api/data/cap-summary?county=${county}`);
      if (!response.ok) {
        throw new Error("CAP summary failed");
      }

      return response.json() as Promise<{
        data: {
          county: string;
          beneficiaries: number;
          totalPayment: number;
        } | null;
      }>;
    },
    enabled: Boolean(county),
  });

  const parcelPreview = (lpisQuery.data?.data?.features ?? [])
    .map((feature) => {
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      return {
        id: String(properties.parcelId ?? "Unknown"),
        cropType: String(properties.cropCode ?? "Not published"),
        areaHa: Number(properties.digitisedAreaHa ?? 0),
        tenure: properties.commonage ? "Commonage indicator" : "Not indicated",
      };
    })
    .slice(0, 5);
  const parcelCount = lpisQuery.data?.data?.features.length ?? 0;
  const landDecisionItems = [
    {
      label: "Locate first",
      detail: selectedRoutingKey
        ? `${selectedRoutingKey.name} is selected for a ${enterprise} farm; CAP and nearby parcel context can now be read together.`
        : `Set a routing key before using ${weekFocus} advice as local.`,
    },
    {
      label: "Parcel screen",
      detail: parcelCount
        ? `${parcelCount} LPIS features returned nearby; inspect crop mix before planning ${weekFocus} work.`
        : "No nearby LPIS features yet; move the map point or try a routing key for farm context.",
    },
    {
      label: "Overlay choice",
      detail: showSoilLayer
        ? "Soil overlay is on. If the basemap becomes hard to read, switch it off and keep nitrates visible."
        : "Soil overlay starts off so the map remains readable; turn it on only for a soil-specific check.",
    },
  ];

  const onRoutingSelect = async (entry: RoutingKey) => {
    setSelectedRoutingKey(entry);
    setRoutingQuery(`${entry.name} ${entry.description}`);

    const geocodeResponse = await fetch(
      `/api/data/geocode?q=${encodeURIComponent(entry.description)}`,
    );
    if (!geocodeResponse.ok) {
      return;
    }

    const nextLocation = (await geocodeResponse.json()) as LatLng;
    setLocation(nextLocation);
  };

  const onRoutingSubmit = async () => {
    const routingKey = extractRoutingKey(routingQuery);
    const match = (routingKeys as RoutingKey[]).find(
      (entry) => entry.name.toUpperCase() === routingKey,
    );

    if (!routingKey || !match) {
      return;
    }
    await onRoutingSelect(match);
  };

  return (
    <div className="grid gap-6">
      <DecisionPanel title="Land decision brief" items={landDecisionItems} />

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Farm Locator</CardTitle>
            <CardDescription>
              Search an approximate routing area, then click the map to place
              the farm pin.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <input
              value={routingQuery}
              onChange={(event) => setRoutingQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void onRoutingSubmit();
                }
              }}
              placeholder="e.g. D15, A92, H91"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            {suggestions.length ? (
              <div className="grid gap-2">
                {suggestions.map((entry, index) => (
                  <Button
                    key={`${entry.name}-${entry.description}-${index}`}
                    variant="outline"
                    className="justify-start"
                    onClick={() => onRoutingSelect(entry)}
                  >
                    {entry.name} - {entry.description}
                  </Button>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Current location: {location.latitude.toFixed(4)},{" "}
              {location.longitude.toFixed(4)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showSoilLayer ? "default" : "outline"}
                onClick={() => setShowSoilLayer((v) => !v)}
              >
                Soil WMS
              </Button>
              <Button
                variant={showNitrateLayer ? "default" : "outline"}
                onClick={() => setShowNitrateLayer((v) => !v)}
              >
                Nitrate Overlay
              </Button>
            </div>
            <DataNotice title="Map readability" tone="info">
              Soil WMS is optional and starts off because the overlay can
              obscure base-map detail. Keep nitrates on for a clearer compliance
              screen.
            </DataNotice>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              CAP Summary ({county ?? "No county selected"})
            </CardTitle>
            <CardDescription>
              County-level 2025 CAP beneficiary totals from DAFM data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {capSummaryQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading county CAP summary...
              </p>
            ) : capSummaryQuery.isError ? (
              <DataNotice title="CAP summary unavailable" tone="warning">
                County CAP data did not load. Parcel and map context remain
                available.
              </DataNotice>
            ) : capSummaryQuery.data?.data ? (
              <div className="grid gap-2 text-sm">
                <p>
                  Beneficiaries:{" "}
                  <strong>
                    {capSummaryQuery.data.data.beneficiaries.toLocaleString()}
                  </strong>
                </p>
                <p>
                  Total payments:{" "}
                  <strong>
                    EUR{" "}
                    {capSummaryQuery.data.data.totalPayment.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 },
                    )}
                  </strong>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a routing area to load the county CAP summary.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Parcel Coverage</CardTitle>
          <CardDescription>
            LPIS polygons (via proxy), EPA soil WMS overlay, and nitrates
            overlay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IrelandMap
            center={location}
            onPickLocation={setLocation}
            lpisGeoJson={lpisQuery.data?.data ?? undefined}
            nitratesGeoJson={nitratesQuery.data}
            showSoilLayer={showSoilLayer}
            showNitrateLayer={showNitrateLayer}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nearby parcel preview</CardTitle>
          <CardDescription>
            Current DAFM LPIS 2024 reference parcels near the selected point.
            These do not establish farm ownership or boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {parcelPreview.length ? (
              parcelPreview.map((parcel, index) => (
                <div
                  key={`${parcel.id}-${parcel.cropType}-${index}`}
                  className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto]"
                >
                  <p className="truncate font-medium">{parcel.cropType}</p>
                  <p>{parcel.areaHa.toFixed(2)} ha</p>
                  <p className="text-muted-foreground">{parcel.tenure}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                No parcel records returned for the current map area.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
