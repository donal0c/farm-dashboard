"use client";

import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MapView, { Layer, Source } from "react-map-gl/maplibre";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MET_STATIONS } from "@/lib/data/met-stations";

type AgStation = {
  "@name": string;
  temp?: { "#text"?: string };
  rain?: { "#text"?: string };
  soil?: { "#text"?: string };
  wind?: { "#text"?: string };
  radiation?: { "#text"?: string };
  "temp-diff"?: { "#text"?: string };
  "rain-per"?: string;
};

type OpwFeature = {
  type: "Feature";
  properties: {
    station_ref: string;
    station_name: string;
    sensor_ref: string;
    datetime: string;
    value: string;
    csv_file: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
};

function asNumber(input?: string) {
  const parsed = Number.parseFloat(input ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function WeatherWaterPage() {
  const [selectedObservationStation, setSelectedObservationStation] = useState(
    MET_STATIONS[0],
  );
  const [selectedHistoricalStation, setSelectedHistoricalStation] = useState(
    MET_STATIONS[2],
  );
  const [historyFrom, setHistoryFrom] = useState("2020-01-01");
  const [historyTo, setHistoryTo] = useState("2025-12-31");
  const [selectedOpwFeature, setSelectedOpwFeature] =
    useState<OpwFeature | null>(null);

  const agReportQuery = useQuery({
    queryKey: ["met", "ag-report"],
    queryFn: async () => {
      const response = await fetch("/api/data/met/ag-report");
      if (!response.ok) throw new Error("ag report failed");
      return response.json() as Promise<{ report?: { station?: AgStation[] } }>;
    },
    refetchInterval: 60 * 60 * 1000,
  });

  const observationsQuery = useQuery({
    queryKey: ["met", "obs", selectedObservationStation.slug],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/met/observations?station=${selectedObservationStation.slug}`,
      );
      if (!response.ok) throw new Error("observations failed");
      return response.json() as Promise<
        Array<{
          reportTime: string;
          temperature: string;
          rainfall: string;
          pressure: string;
        }>
      >;
    },
    refetchInterval: 60 * 60 * 1000,
  });

  const warningsQuery = useQuery({
    queryKey: ["met", "warnings"],
    queryFn: async () => {
      const response = await fetch("/api/data/met/warnings");
      if (!response.ok) throw new Error("warnings failed");
      return response.json() as Promise<Array<Record<string, unknown>>>;
    },
    refetchInterval: 15 * 60 * 1000,
  });

  const opwQuery = useQuery({
    queryKey: ["opw", "latest"],
    queryFn: async () => {
      const response = await fetch("/api/data/opw/latest");
      if (!response.ok) throw new Error("opw latest failed");
      return response.json() as Promise<{
        type: string;
        features: OpwFeature[];
      }>;
    },
    refetchInterval: 15 * 60 * 1000,
  });

  const selectedOpwSeriesQuery = useQuery({
    queryKey: ["opw", "station", selectedOpwFeature?.properties.csv_file],
    queryFn: async () => {
      const csvFile = selectedOpwFeature?.properties.csv_file;
      if (!csvFile) {
        return [];
      }
      const response = await fetch(
        `/api/data/opw/station?csv_file=${encodeURIComponent(csvFile)}`,
      );
      if (!response.ok) throw new Error("opw series failed");
      return response.json() as Promise<
        Array<{ datetime: string; value: number }>
      >;
    },
    enabled: Boolean(selectedOpwFeature?.properties.csv_file),
    refetchInterval: 15 * 60 * 1000,
  });

  const historicalQuery = useQuery({
    queryKey: [
      "met",
      "historical",
      selectedHistoricalStation.historicalId,
      historyFrom,
      historyTo,
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/data/met/historical?stationId=${selectedHistoricalStation.historicalId}&from=${historyFrom}&to=${historyTo}`,
      );
      if (!response.ok) throw new Error("historical failed");
      return response.json() as Promise<
        Array<{
          date: string;
          maxTemp: number | null;
          minTemp: number | null;
          rainfall: number | null;
          soilTemp: number | null;
          smd: number | null;
        }>
      >;
    },
  });

  const agStations = agReportQuery.data?.report?.station ?? [];

  const agKpis = useMemo(() => {
    if (!agStations.length) {
      return {
        avgTemp: 0,
        avgRain: 0,
        avgSoil: 0,
        avgWind: 0,
      };
    }

    const totals = agStations.reduce(
      (acc, station) => {
        acc.temp += asNumber(station.temp?.["#text"]);
        acc.rain += asNumber(station.rain?.["#text"]);
        acc.soil += asNumber(station.soil?.["#text"]);
        acc.wind += asNumber(station.wind?.["#text"]);
        return acc;
      },
      { temp: 0, rain: 0, soil: 0, wind: 0 },
    );

    return {
      avgTemp: totals.temp / agStations.length,
      avgRain: totals.rain / agStations.length,
      avgSoil: totals.soil / agStations.length,
      avgWind: totals.wind / agStations.length,
    };
  }, [agStations]);

  const opwFeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: opwQuery.data?.features ?? [],
    }),
    [opwQuery.data?.features],
  );

  const historicalRows = historicalQuery.data ?? [];
  const observationsRows = observationsQuery.data ?? [];
  const warningRows = warningsQuery.data ?? [];

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Avg Temperature (16 ag stations)</CardDescription>
            <CardTitle>{agKpis.avgTemp.toFixed(1)} C</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg Rainfall (7-day)</CardDescription>
            <CardTitle>{agKpis.avgRain.toFixed(1)} mm</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg Soil Temp</CardDescription>
            <CardTitle>{agKpis.avgSoil.toFixed(1)} C</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg Wind</CardDescription>
            <CardTitle>{agKpis.avgWind.toFixed(1)} kts</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Weather Warnings</CardTitle>
          <CardDescription>
            Met Eireann warnings feed (display required by Met Eireann Open Data
            licence).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warningRows.length ? (
            <div className="grid gap-2">
              {warningRows.slice(0, 8).map((warning) => (
                <div
                  key={JSON.stringify(warning)}
                  className="rounded-md border border-border bg-amber-100/40 p-3 text-sm"
                >
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(warning, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active warnings in current feed.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live Observations</CardTitle>
            <CardDescription>
              Hourly Met Eireann observations (auto refresh hourly).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <select
              value={selectedObservationStation.slug}
              onChange={(event) => {
                const station = MET_STATIONS.find(
                  (item) => item.slug === event.target.value,
                );
                if (station) setSelectedObservationStation(station);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {MET_STATIONS.map((station) => (
                <option key={station.slug} value={station.slug}>
                  {station.name}
                </option>
              ))}
            </select>
            <ReactECharts
              style={{ height: 280 }}
              option={{
                tooltip: { trigger: "axis" },
                xAxis: {
                  type: "category",
                  data: observationsRows.map((row) => row.reportTime),
                },
                yAxis: [{ type: "value" }, { type: "value" }],
                series: [
                  {
                    name: "Temperature",
                    type: "line",
                    data: observationsRows.map((row) =>
                      Number.parseFloat(row.temperature),
                    ),
                  },
                  {
                    name: "Rainfall",
                    type: "bar",
                    yAxisIndex: 1,
                    data: observationsRows.map((row) =>
                      Number.parseFloat(row.rainfall),
                    ),
                  },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historical Weather Explorer</CardTitle>
            <CardDescription>
              Station selector + date range + historical daily chart.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-3">
              <select
                value={selectedHistoricalStation.slug}
                onChange={(event) => {
                  const station = MET_STATIONS.find(
                    (item) => item.slug === event.target.value,
                  );
                  if (station) setSelectedHistoricalStation(station);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {MET_STATIONS.map((station) => (
                  <option key={`${station.slug}-hist`} value={station.slug}>
                    {station.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={historyFrom}
                onChange={(event) => setHistoryFrom(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
              <input
                type="date"
                value={historyTo}
                onChange={(event) => setHistoryTo(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <ReactECharts
              style={{ height: 280 }}
              option={{
                tooltip: { trigger: "axis" },
                dataZoom: [{ type: "inside" }, { type: "slider" }],
                xAxis: {
                  type: "category",
                  data: historicalRows.map((row) => row.date),
                },
                yAxis: [{ type: "value" }, { type: "value" }],
                series: [
                  {
                    name: "Max Temp",
                    type: "line",
                    data: historicalRows.map((row) => row.maxTemp),
                  },
                  {
                    name: "Rainfall",
                    type: "bar",
                    yAxisIndex: 1,
                    data: historicalRows.map((row) => row.rainfall),
                  },
                  {
                    name: "SMD",
                    type: "line",
                    data: historicalRows.map((row) => row.smd),
                  },
                ],
              }}
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>OPW Water Level Stations</CardTitle>
          <CardDescription>
            15-minute updates via polling. Click station marker for detail and
            time series.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="h-[420px] overflow-hidden rounded-lg border border-border">
            <MapView
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              initialViewState={{ longitude: -7.5, latitude: 53.5, zoom: 6.2 }}
              interactiveLayerIds={["opw-circles"]}
              onClick={(event) => {
                const feature = event.features?.[0];
                if (!feature) return;
                setSelectedOpwFeature(feature as unknown as OpwFeature);
              }}
            >
              <Source id="opw" type="geojson" data={opwFeatureCollection}>
                <Layer
                  id="opw-circles"
                  type="circle"
                  paint={{
                    "circle-radius": 4,
                    "circle-color": [
                      "step",
                      ["to-number", ["get", "value"]],
                      "#16a34a",
                      1,
                      "#f59e0b",
                      2,
                      "#dc2626",
                    ],
                    "circle-stroke-color": "#111827",
                    "circle-stroke-width": 0.5,
                    "circle-opacity": 0.85,
                  }}
                />
              </Source>
            </MapView>
          </div>

          <div className="grid gap-3">
            {selectedOpwFeature ? (
              <>
                <div className="rounded-md border border-border p-3 text-sm">
                  <p>
                    <strong>Station:</strong>{" "}
                    {selectedOpwFeature.properties.station_name}
                  </p>
                  <p>
                    <strong>Ref:</strong>{" "}
                    {selectedOpwFeature.properties.station_ref} /
                    {selectedOpwFeature.properties.sensor_ref}
                  </p>
                  <p>
                    <strong>Current:</strong>{" "}
                    {selectedOpwFeature.properties.value} m
                  </p>
                  <p>
                    <strong>Timestamp:</strong>{" "}
                    {selectedOpwFeature.properties.datetime}
                  </p>
                </div>
                <ReactECharts
                  style={{ height: 220 }}
                  option={{
                    tooltip: { trigger: "axis" },
                    xAxis: {
                      type: "category",
                      data: (selectedOpwSeriesQuery.data ?? []).map(
                        (row) => row.datetime,
                      ),
                    },
                    yAxis: { type: "value" },
                    dataZoom: [{ type: "inside" }, { type: "slider" }],
                    series: [
                      {
                        type: "line",
                        data: (selectedOpwSeriesQuery.data ?? []).map(
                          (row) => row.value,
                        ),
                      },
                    ],
                  }}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a station marker to view detailed readings.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data refresh policy: OPW every 15 minutes, Met observations hourly
        (TanStack Query polling).
      </p>
    </div>
  );
}
