"use client";

import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapView, { Layer, Source } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  decodeJsonStat,
  type JsonStatDataset,
  parseYear,
} from "@/lib/cso/jsonstat";

type LatLng = { latitude: number; longitude: number };

type BiodiversityResponse = {
  totalRecords: number;
  protectedCount: number;
  topSpecies: Array<{ species: string; count: number }>;
  records: Array<{
    species: string;
    protected: boolean;
    lat: number;
    lng: number;
    distanceKm: number;
  }>;
};

function statusColorExpression(property: string) {
  return [
    "match",
    ["get", property],
    "High",
    "#166534",
    "Good",
    "#22c55e",
    "Moderate",
    "#eab308",
    "Poor",
    "#f97316",
    "Bad",
    "#dc2626",
    "#6b7280",
  ];
}

export default function EnvironmentCompliancePage() {
  const [location, setLocation] = useState<LatLng>({
    latitude: 53.5,
    longitude: -7.5,
  });
  const [showNitrate, setShowNitrate] = useState(true);
  const [showNitrateSusc, setShowNitrateSusc] = useState(false);
  const [showPhosphorusSusc, setShowPhosphorusSusc] = useState(false);
  const [showAgPressure, setShowAgPressure] = useState(false);
  const [showCorine, setShowCorine] = useState(false);
  const [showCorineChange, setShowCorineChange] = useState(false);

  const wfdQuery = useQuery({
    queryKey: ["wfd-status", location.latitude, location.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/epa/wfd-status?lat=${location.latitude}&lng=${location.longitude}&radius=1.2`,
      );
      if (!response.ok) throw new Error("WFD status failed");
      return response.json() as Promise<{
        rivers: GeoJSON.FeatureCollection;
        groundwater: GeoJSON.FeatureCollection;
      }>;
    },
  });

  const nitratesQuery = useQuery({
    queryKey: ["nitrates", location.latitude, location.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/nitrates?lat=${location.latitude}&lng=${location.longitude}&radius=0.3`,
      );
      if (!response.ok) throw new Error("Nitrates failed");
      return response.json() as Promise<GeoJSON.FeatureCollection>;
    },
  });

  const biodiversityQuery = useQuery({
    queryKey: ["biodiversity", location.latitude, location.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/biodiversity/search?lat=${location.latitude}&lng=${location.longitude}&radiusKm=60`,
      );
      if (!response.ok) throw new Error("Biodiversity failed");
      return response.json() as Promise<BiodiversityResponse>;
    },
  });

  const ghgQuery = useQuery({
    queryKey: ["cso", "EAA01"],
    queryFn: async () => {
      const response = await fetch("/api/data/cso/EAA01");
      if (!response.ok) throw new Error("EAA01 failed");
      return response.json() as Promise<JsonStatDataset>;
    },
  });

  const ghgSeries = useMemo(() => {
    if (!ghgQuery.data) {
      return { years: [], co2: [], n2o: [], ch4: [], all: [] };
    }

    const rows = decodeJsonStat(ghgQuery.data).filter(
      (row) => row.C02414V02915 === "80000",
    );

    const years = Array.from(
      new Set(
        rows
          .map((row) => parseYear(String(row["TLIST(A1)"])))
          .filter((year) => Number.isFinite(year)),
      ),
    ).sort((a, b) => a - b);

    function valuesFor(statCode: string) {
      return years.map((year) => {
        const row = rows.find(
          (candidate) =>
            parseYear(String(candidate["TLIST(A1)"])) === year &&
            candidate.STATISTIC === statCode,
        );
        return row ? Number(row.value) : 0;
      });
    }

    return {
      years,
      co2: valuesFor("EAA01C1"),
      n2o: valuesFor("EAA01C2"),
      ch4: valuesFor("EAA01C3"),
      all: valuesFor("EAA01C4"),
    };
  }, [ghgQuery.data]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const feature of wfdQuery.data?.rivers.features ?? []) {
      const status = String(
        (feature.properties as Record<string, unknown>)?.Status ?? "Unknown",
      );
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    for (const feature of wfdQuery.data?.groundwater.features ?? []) {
      const status = String(
        (feature.properties as Record<string, unknown>)?.Overall_GW_Status ??
          "Unknown",
      );
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  }, [wfdQuery.data]);

  const wms = {
    nitrateSusc:
      "https://gis.epa.ie/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=EPA:WFD_CCTnsNitrateSusc&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true",
    phosphorusSusc:
      "https://gis.epa.ie/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=EPA:WFD_CCTnsPhosphateSusc&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true",
    agPressure:
      "https://gis.epa.ie/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=EPA:WFD_RWB_Pressures_Agriculture&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true",
    corine:
      "https://gis.epa.ie/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=EPA:LAND_CLC18&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true",
    corineChange:
      "https://gis.epa.ie/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=EPA:LAND_CLCCH_12_18&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true",
  };

  const totalWaterbodies = statusCounts.reduce(
    (acc, item) => acc + item.count,
    0,
  );
  const goodHighCount = statusCounts
    .filter((item) => ["Good", "High"].includes(item.status))
    .reduce((acc, item) => acc + item.count, 0);
  const goodHighShare = totalWaterbodies
    ? `${Math.round((goodHighCount / totalWaterbodies) * 100)}%`
    : "0%";

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Waterbodies in view</CardDescription>
            <CardTitle>{totalWaterbodies}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Good/High status share</CardDescription>
            <CardTitle>{goodHighShare}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Biodiversity records (60km)</CardDescription>
            <CardTitle>{biodiversityQuery.data?.totalRecords ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Protected species records</CardDescription>
            <CardTitle>{biodiversityQuery.data?.protectedCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>EPA Water Quality Status Map</CardTitle>
          <CardDescription>
            River and groundwater bodies colour-coded by
            High/Good/Moderate/Poor/Bad status.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showNitrate ? "default" : "outline"}
              onClick={() => setShowNitrate((v) => !v)}
            >
              DAFM Nitrate Zone
            </Button>
            <Button
              variant={showNitrateSusc ? "default" : "outline"}
              onClick={() => setShowNitrateSusc((v) => !v)}
            >
              Nitrate Susceptibility
            </Button>
            <Button
              variant={showPhosphorusSusc ? "default" : "outline"}
              onClick={() => setShowPhosphorusSusc((v) => !v)}
            >
              Phosphorus Susceptibility
            </Button>
            <Button
              variant={showAgPressure ? "default" : "outline"}
              onClick={() => setShowAgPressure((v) => !v)}
            >
              Agricultural Pressure
            </Button>
            <Button
              variant={showCorine ? "default" : "outline"}
              onClick={() => setShowCorine((v) => !v)}
            >
              CORINE Land Cover
            </Button>
            <Button
              variant={showCorineChange ? "default" : "outline"}
              onClick={() => setShowCorineChange((v) => !v)}
            >
              CORINE Change 12-18
            </Button>
          </div>

          <div className="h-[460px] overflow-hidden rounded-lg border border-border">
            <MapView
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              initialViewState={{ longitude: -7.5, latitude: 53.5, zoom: 7 }}
              longitude={location.longitude}
              latitude={location.latitude}
              zoom={8}
              onClick={(event) => {
                setLocation({
                  latitude: event.lngLat.lat,
                  longitude: event.lngLat.lng,
                });
              }}
            >
              {showNitrateSusc ? (
                <Source
                  id="nitrate-susc"
                  type="raster"
                  tiles={[wms.nitrateSusc]}
                  tileSize={256}
                >
                  <Layer
                    id="nitrate-susc-layer"
                    type="raster"
                    paint={{ "raster-opacity": 0.5 }}
                  />
                </Source>
              ) : null}

              {showPhosphorusSusc ? (
                <Source
                  id="phosphorus-susc"
                  type="raster"
                  tiles={[wms.phosphorusSusc]}
                  tileSize={256}
                >
                  <Layer
                    id="phosphorus-susc-layer"
                    type="raster"
                    paint={{ "raster-opacity": 0.5 }}
                  />
                </Source>
              ) : null}

              {showAgPressure ? (
                <Source
                  id="ag-pressure"
                  type="raster"
                  tiles={[wms.agPressure]}
                  tileSize={256}
                >
                  <Layer
                    id="ag-pressure-layer"
                    type="raster"
                    paint={{ "raster-opacity": 0.45 }}
                  />
                </Source>
              ) : null}

              {showCorine ? (
                <Source
                  id="corine"
                  type="raster"
                  tiles={[wms.corine]}
                  tileSize={256}
                >
                  <Layer
                    id="corine-layer"
                    type="raster"
                    paint={{ "raster-opacity": 0.45 }}
                  />
                </Source>
              ) : null}

              {showCorineChange ? (
                <Source
                  id="corine-change"
                  type="raster"
                  tiles={[wms.corineChange]}
                  tileSize={256}
                >
                  <Layer
                    id="corine-change-layer"
                    type="raster"
                    paint={{ "raster-opacity": 0.5 }}
                  />
                </Source>
              ) : null}

              {showNitrate && nitratesQuery.data ? (
                <Source
                  id="nitrates-zone"
                  type="geojson"
                  data={nitratesQuery.data}
                >
                  <Layer
                    id="nitrate-zone-fill"
                    type="fill"
                    paint={{ "fill-color": "#f59e0b", "fill-opacity": 0.18 }}
                  />
                </Source>
              ) : null}

              {wfdQuery.data?.groundwater ? (
                <Source
                  id="wfd-groundwater"
                  type="geojson"
                  data={wfdQuery.data.groundwater}
                >
                  <Layer
                    id="wfd-groundwater-fill"
                    type="fill"
                    paint={{
                      "fill-color": statusColorExpression(
                        "Overall_GW_Status",
                      ) as never,
                      "fill-opacity": 0.25,
                    }}
                  />
                </Source>
              ) : null}

              {wfdQuery.data?.rivers ? (
                <Source
                  id="wfd-rivers"
                  type="geojson"
                  data={wfdQuery.data.rivers}
                >
                  <Layer
                    id="wfd-rivers-line"
                    type="line"
                    paint={{
                      "line-color": statusColorExpression("Status") as never,
                      "line-width": 2,
                    }}
                  />
                </Source>
              ) : null}
            </MapView>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Catchment Status Summary</CardTitle>
            <CardDescription>
              Water quality status counts in current map view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReactECharts
              style={{ height: 300 }}
              option={{
                tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
                xAxis: {
                  type: "category",
                  data: statusCounts.map((item) => item.status),
                },
                yAxis: { type: "value" },
                series: [
                  { type: "bar", data: statusCounts.map((item) => item.count) },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biodiversity Search by Area</CardTitle>
            <CardDescription>
              NBDC-style records filtered by proximity to selected map location.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>
              Search center: {location.latitude.toFixed(3)},{" "}
              {location.longitude.toFixed(3)}
            </p>
            <p>Total records: {biodiversityQuery.data?.totalRecords ?? 0}</p>
            <p>
              Protected species records:{" "}
              {biodiversityQuery.data?.protectedCount ?? 0}
            </p>
            <div className="grid gap-2">
              {(biodiversityQuery.data?.topSpecies ?? []).map((item) => (
                <div
                  key={item.species}
                  className="rounded-md border border-border p-2"
                >
                  {item.species}: {item.count}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Agricultural GHG Emissions (CSO EAA01)</CardTitle>
          <CardDescription>
            Time series for agriculture, forestry and fishing emissions by gas
            and total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReactECharts
            style={{ height: 340 }}
            option={{
              tooltip: { trigger: "axis" },
              legend: { data: ["CO2", "N2O", "CH4", "All GHG"] },
              xAxis: { type: "category", data: ghgSeries.years },
              yAxis: { type: "value" },
              dataZoom: [{ type: "inside" }, { type: "slider" }],
              series: [
                { name: "CO2", type: "line", data: ghgSeries.co2 },
                { name: "N2O", type: "line", data: ghgSeries.n2o },
                { name: "CH4", type: "line", data: ghgSeries.ch4 },
                { name: "All GHG", type: "line", data: ghgSeries.all },
              ],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
