import { NextResponse } from "next/server";

import records from "@/lib/data/nbdc-sample-records.json";

type RecordItem = {
  species: string;
  protected: boolean;
  lat: number;
  lng: number;
  source: string;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthKm * c;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "53.5");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "-7.5");
  const radiusKm = Number.parseFloat(searchParams.get("radiusKm") ?? "50");

  const matches = (records as RecordItem[])
    .map((record) => ({
      ...record,
      distanceKm: haversineKm(lat, lng, record.lat, record.lng),
    }))
    .filter((record) => record.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const speciesCounts = new Map<string, number>();
  let protectedCount = 0;

  for (const record of matches) {
    speciesCounts.set(
      record.species,
      (speciesCounts.get(record.species) ?? 0) + 1,
    );
    if (record.protected) protectedCount += 1;
  }

  const topSpecies = Array.from(speciesCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([species, count]) => ({ species, count }));

  return NextResponse.json({
    totalRecords: matches.length,
    protectedCount,
    topSpecies,
    records: matches,
  });
}
