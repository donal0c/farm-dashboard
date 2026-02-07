"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart } from "@tremor/react";
import { useMemo, useState } from "react";
import { SampleYieldChart } from "@/components/charts/sample-yield-chart";
import { IrelandMap } from "@/components/map/ireland-map";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import routingKeys from "@/lib/data/eircode-routing-keys.json";

type LatLng = { latitude: number; longitude: number };

type RoutingKey = {
  name: string;
  description: string;
};

const kpiData = [
  { month: "Jan", area: 120 },
  { month: "Feb", area: 124 },
  { month: "Mar", area: 126 },
  { month: "Apr", area: 130 },
  { month: "May", area: 133 },
  { month: "Jun", area: 134 },
];

const defaultCenter: LatLng = {
  latitude: 53.5,
  longitude: -7.5,
};

function extractRoutingKey(value: string) {
  const normalized = value.toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^(D6W|[A-Z]\d{2})/);
  return match?.[1] ?? null;
}

function normalizeEircode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function formatEircode(value: string) {
  const normalized = normalizeEircode(value);
  if (!/^(D6W|[A-Z]\d{2})[0-9A-Z]{4}$/.test(normalized)) {
    return null;
  }
  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}

function countyFromDescription(description: string) {
  const tokens = description
    .replace(/\d+/g, "")
    .trim()
    .split(" ")
    .filter(Boolean);

  return tokens[tokens.length - 1]?.toUpperCase() ?? "";
}

function distanceKm(a: LatLng, b: LatLng) {
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians;
  const dLng = (b.longitude - a.longitude) * radians;
  const lat1 = a.latitude * radians;
  const lat2 = b.latitude * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function MyLandPage() {
  const [routingQuery, setRoutingQuery] = useState("");
  const [selectedRoutingKey, setSelectedRoutingKey] =
    useState<RoutingKey | null>(null);
  const [location, setLocation] = useState<LatLng>(defaultCenter);
  const [showSoilLayer, setShowSoilLayer] = useState(true);
  const [showNitrateLayer, setShowNitrateLayer] = useState(true);

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
      return response.json() as Promise<GeoJSON.FeatureCollection>;
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

  const capSummaryQuery = useQuery({
    queryKey: ["cap-summary", county],
    queryFn: async () => {
      const response = await fetch(`/api/data/cap-summary?county=${county}`);
      if (!response.ok) {
        throw new Error("CAP summary failed");
      }

      return response.json() as Promise<{
        county: string;
        beneficiaryCount: number;
        totalPayment: number;
      }>;
    },
    enabled: Boolean(county),
  });

  const parcelPreview = (lpisQuery.data?.features ?? [])
    .map((feature) => {
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      return {
        id: String(properties.LNU_PARCEL_ID ?? properties.id ?? "Unknown"),
        cropType: String(
          properties.CROP_DESC ?? properties.CROP_TYPE ?? "Unknown",
        ),
        areaHa: Number(properties.DIGITISED_AREA ?? properties.AREA_HA ?? 0),
        tenure: String(
          properties.TENURE_STATUS ??
            properties.COMMONAGE_INDICATOR ??
            "Unknown",
        ),
      };
    })
    .slice(0, 5);

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

  const geocodeQuery = async (query: string) => {
    const geocodeResponse = await fetch(
      `/api/data/geocode?q=${encodeURIComponent(query)}`,
    );
    if (!geocodeResponse.ok) {
      return null;
    }

    return (await geocodeResponse.json()) as LatLng;
  };

  const onRoutingSubmit = async () => {
    const routingKey = extractRoutingKey(routingQuery);
    const match = (routingKeys as RoutingKey[]).find(
      (entry) => entry.name.toUpperCase() === routingKey,
    );

    const formattedEircode = formatEircode(routingQuery);
    if (formattedEircode) {
      const exactLocation = await geocodeQuery(formattedEircode);
      if (exactLocation) {
        if (match) {
          const areaLocation = await geocodeQuery(match.description);
          const finalLocation =
            areaLocation && distanceKm(exactLocation, areaLocation) > 75
              ? areaLocation
              : exactLocation;
          setRoutingQuery(formattedEircode);
          setSelectedRoutingKey(match);
          setLocation(finalLocation);
          return;
        }

        setRoutingQuery(formattedEircode);
        setSelectedRoutingKey(null);
        setLocation(exactLocation);
        return;
      }
    }

    if (!routingKey || !match) {
      return;
    }
    await onRoutingSelect(match);
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Farm Locator</CardTitle>
            <CardDescription>
              Search an Eircode routing key (139 static entries) or click on map
              to set farm location.
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              CAP Summary ({county ?? "No county selected"})
            </CardTitle>
            <CardDescription>
              County-level 2024 CAP payment totals from DAFM data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {capSummaryQuery.data ? (
              <div className="grid gap-2 text-sm">
                <p>
                  Beneficiaries:{" "}
                  <strong>
                    {capSummaryQuery.data.beneficiaryCount.toLocaleString()}
                  </strong>
                </p>
                <p>
                  Total payments:{" "}
                  <strong>
                    EUR{" "}
                    {capSummaryQuery.data.totalPayment.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 },
                    )}
                  </strong>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose an Eircode routing key to load county CAP summary.
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
            lpisGeoJson={lpisQuery.data}
            nitratesGeoJson={nitratesQuery.data}
            showSoilLayer={showSoilLayer}
            showNitrateLayer={showNitrateLayer}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parcel Preview</CardTitle>
            <CardDescription>
              Showing crop, area (ha), and tenure fields from LPIS response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {parcelPreview.length ? (
                parcelPreview.map((parcel, index) => (
                  <div
                    key={`${parcel.id}-${parcel.cropType}-${index}`}
                    className="rounded-md border border-border p-2"
                  >
                    <p>
                      <strong>Parcel:</strong> {parcel.id}
                    </p>
                    <p>
                      <strong>Crop:</strong> {parcel.cropType}
                    </p>
                    <p>
                      <strong>Area:</strong> {parcel.areaHa.toFixed(2)} ha
                    </p>
                    <p>
                      <strong>Tenure:</strong> {parcel.tenure}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  No parcel records returned for current map area.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yield Trend</CardTitle>
            <CardDescription>
              Monthly yield outlook index for selected area.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SampleYieldChart />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Area Trend</CardTitle>
          <CardDescription>
            Farm area utilisation trend over recent months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart
            className="h-72"
            data={kpiData}
            index="month"
            categories={["area"]}
            yAxisWidth={48}
            showLegend={false}
            showAnimation
          />
        </CardContent>
      </Card>
    </div>
  );
}
