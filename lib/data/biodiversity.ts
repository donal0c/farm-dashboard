export type BiodiversityRecord = {
  species: string;
  protected: boolean;
  lat: number;
  lng: number;
  source: string;
};

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
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

export function searchBiodiversityRecords(
  records: BiodiversityRecord[],
  lat: number,
  lng: number,
  radiusKm: number,
) {
  const matches = records
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
    if (record.protected) {
      protectedCount += 1;
    }
  }

  const topSpecies = Array.from(speciesCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([species, count]) => ({ species, count }));

  return {
    totalRecords: matches.length,
    protectedCount,
    topSpecies,
    records: matches,
    source: {
      status: "sample" as const,
      label: "Prototype sample records",
      warning:
        "Biodiversity results are bundled sample records for workflow validation, not a live NBDC response.",
    },
  };
}
