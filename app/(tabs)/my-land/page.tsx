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
  const [showSoilLayer, setShowSoilLayer] = useState(true);
  const [showNitrateLayer, setShowNitrateLayer] = useState(true);

  const suggestions = useMemo(() => {
    const query = routingQuery.trim().toUpperCase();
    if (!query) {
      return [];
    }

    return (routingKeys as RoutingKey[])
      .filter(
        (entry) =>
          entry.name.toUpperCase().includes(query) ||
          entry.description.toUpperCase().includes(query),
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
            <CardTitle>Yield Trend (ECharts)</CardTitle>
            <CardDescription>
              Sample chart scaffold for production metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SampleYieldChart />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Area Trend (Tremor)</CardTitle>
          <CardDescription>
            Sample Tremor chart to verify integration.
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
