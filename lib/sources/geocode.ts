import { z } from "zod";

import { isIrishCoordinate, type LatLng } from "../contracts/geo.ts";
import type { SourceSnapshot } from "../contracts/source-snapshot.ts";
import { countyFromGeocode } from "../ireland/counties.ts";

export const GEOCODE_SOURCE = {
  id: "nominatim-ireland",
  label: "OpenStreetMap Nominatim",
  url: "https://nominatim.openstreetmap.org/",
};

export const nominatimResultsSchema = z.array(
  z.object({
    lat: z.string().min(1),
    lon: z.string().min(1),
    address: z
      .object({
        county: z.string().optional(),
        region: z.string().optional(),
      })
      .optional(),
  }),
);

export type GeocodedFarmArea = LatLng & {
  county: string | null;
};

export const geocodedFarmAreaSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  county: z.string().nullable(),
});

export function normalizeGeocodeResult(
  results: z.infer<typeof nominatimResultsSchema>,
  routingArea: string,
  fetchedAt = new Date(),
): SourceSnapshot<GeocodedFarmArea> {
  const first = results[0];
  if (!first) throw new Error("No location was found.");
  const data = {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    county: countyFromGeocode(first.address?.county, routingArea),
  };
  if (!isIrishCoordinate(data)) {
    throw new Error("The geocoder returned a point outside Ireland.");
  }
  const fetchedIso = fetchedAt.toISOString();
  return {
    data,
    source: GEOCODE_SOURCE,
    scope: "regional",
    status: "cached",
    observedAt: null,
    fetchedAt: fetchedIso,
    staleAfter: new Date(
      fetchedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    warning:
      "Routing-area geocoding supplies an approximate centre only. The manually saved pin is the working farm location.",
    confidence: "screening",
  };
}
