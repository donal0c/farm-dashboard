import { distanceKm, type LatLng } from "../contracts/geo.ts";
import type { SourceSnapshot } from "../contracts/source-snapshot.ts";

type RawOpwFeature = {
  properties?: {
    station_ref?: string;
    station_name?: string;
    sensor_ref?: string;
    datetime?: string;
    value?: string;
    csv_file?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
};

export type NearbyOpwReading = {
  stationRef: string;
  stationName: string;
  sensorRef: string;
  parameter: "Water level";
  unit: "m";
  observedAt: string;
  value: number;
  distanceKm: number;
  latitude: number;
  longitude: number;
  csvFile: string | null;
};

export function normalizeNearbyOpw(
  payload: { features?: RawOpwFeature[] },
  farm: LatLng,
  fetchedAt = new Date(),
): SourceSnapshot<NearbyOpwReading[]> {
  const readings = (payload.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties;
      const value = Number(properties?.value);
      const observedAt = String(properties?.datetime ?? "");
      const stationNumber = Number.parseInt(properties?.station_ref ?? "", 10);
      if (
        !coordinates ||
        !Number.isFinite(coordinates[0]) ||
        !Number.isFinite(coordinates[1]) ||
        !Number.isFinite(value) ||
        !Number.isFinite(Date.parse(observedAt)) ||
        !properties?.station_ref ||
        properties.sensor_ref !== "0001" ||
        !Number.isFinite(stationNumber) ||
        stationNumber > 41_000
      ) {
        return null;
      }
      const location = {
        longitude: coordinates[0],
        latitude: coordinates[1],
      };
      return {
        stationRef: properties.station_ref,
        stationName: properties.station_name ?? properties.station_ref,
        sensorRef: properties.sensor_ref,
        parameter: "Water level" as const,
        unit: "m" as const,
        observedAt,
        value,
        distanceKm: distanceKm(farm, location),
        ...location,
        csvFile: properties.csv_file ?? null,
      };
    })
    .filter((reading): reading is NearbyOpwReading => Boolean(reading))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8);
  const fetchedIso = fetchedAt.toISOString();

  return {
    data: readings,
    source: {
      id: "opw-water-levels",
      label: "OPW waterlevel.ie",
      url: "https://waterlevel.ie/",
    },
    scope: "nearby",
    status: "live",
    observedAt:
      readings
        .map((reading) => reading.observedAt)
        .sort()
        .at(-1) ?? null,
    fetchedAt: fetchedIso,
    staleAfter: new Date(fetchedAt.getTime() + 20 * 60 * 1000).toISOString(),
    warning:
      "Water levels are raw OPW sensor readings in metres. AgriView does not infer flood thresholds or farm impact without station-specific context.",
    confidence: "authoritative",
  };
}
