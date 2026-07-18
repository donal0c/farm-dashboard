export type LatLng = {
  latitude: number;
  longitude: number;
};

const IRELAND_BOUNDS = {
  minLatitude: 51.2,
  maxLatitude: 55.7,
  minLongitude: -11,
  maxLongitude: -5.2,
};

export function isIrishCoordinate(location: LatLng) {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= IRELAND_BOUNDS.minLatitude &&
    location.latitude <= IRELAND_BOUNDS.maxLatitude &&
    location.longitude >= IRELAND_BOUNDS.minLongitude &&
    location.longitude <= IRELAND_BOUNDS.maxLongitude
  );
}

export function assertIrishCoordinate(location: LatLng) {
  if (!isIrishCoordinate(location)) {
    throw new Error("Coordinates must be a valid point on or near Ireland.");
  }
}

export function boundingBox({ latitude, longitude }: LatLng, radius: number) {
  if (!Number.isFinite(radius) || radius <= 0 || radius > 2) {
    throw new Error(
      "Radius must be greater than 0 and no more than 2 degrees.",
    );
  }

  return [
    longitude - radius,
    latitude - radius,
    longitude + radius,
    latitude + radius,
  ] as const;
}
