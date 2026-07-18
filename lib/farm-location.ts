import { IRELAND_BOUNDS, type LatLng } from "./contracts/geo.ts";

export type CoordinateField = "latitude" | "longitude" | "both";

export type CoordinateParseResult =
  | { ok: true; location: LatLng }
  | { ok: false; field: CoordinateField; message: string };

export function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function parseFarmCoordinates(
  latitudeInput: string,
  longitudeInput: string,
): CoordinateParseResult {
  const latitudeText = latitudeInput.trim();
  const longitudeText = longitudeInput.trim();

  if (!latitudeText || !longitudeText) {
    return {
      ok: false,
      field:
        !latitudeText && !longitudeText
          ? "both"
          : !latitudeText
            ? "latitude"
            : "longitude",
      message: "Enter both latitude and longitude.",
    };
  }

  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude)) {
    return {
      ok: false,
      field: "latitude",
      message: "Latitude must be a number.",
    };
  }
  if (!Number.isFinite(longitude)) {
    return {
      ok: false,
      field: "longitude",
      message: "Longitude must be a number.",
    };
  }
  if (
    latitude < IRELAND_BOUNDS.minLatitude ||
    latitude > IRELAND_BOUNDS.maxLatitude
  ) {
    return {
      ok: false,
      field: "latitude",
      message: `Latitude must be between ${IRELAND_BOUNDS.minLatitude} and ${IRELAND_BOUNDS.maxLatitude}.`,
    };
  }
  if (
    longitude < IRELAND_BOUNDS.minLongitude ||
    longitude > IRELAND_BOUNDS.maxLongitude
  ) {
    return {
      ok: false,
      field: "longitude",
      message: `Longitude must be between ${IRELAND_BOUNDS.minLongitude} and ${IRELAND_BOUNDS.maxLongitude}.`,
    };
  }

  return { ok: true, location: { latitude, longitude } };
}
