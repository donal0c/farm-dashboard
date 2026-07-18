import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";

export const LPIS_COLLECTION = "anonymous-lpis-data-for-2024_2024-lpis-data";

export type NormalizedLpisProperties = Record<string, unknown> & {
  parcelId: string;
  cropCode: string | null;
  digitisedAreaHa: number | null;
  claimedAreaHa: number | null;
  referenceAreaHa: number | null;
  commonage: boolean;
  organic: boolean;
};

function nullableNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeLpisCollection(
  featureCollection: GeoJSON.FeatureCollection,
  fetchedAt = new Date(),
): SourceSnapshot<GeoJSON.FeatureCollection> {
  if (!Array.isArray(featureCollection.features)) {
    throw new Error("LPIS response has no feature collection.");
  }

  const features = featureCollection.features.map((feature, index) => {
    const original = (feature.properties ?? {}) as Record<string, unknown>;
    const parcelId = String(
      original.PAR_LAB ?? original.LNU_PARCEL_ID ?? feature.id ?? index,
    );
    const properties: NormalizedLpisProperties = {
      ...original,
      parcelId,
      cropCode: original.CROP ? String(original.CROP) : null,
      digitisedAreaHa: nullableNumber(original.DIGITISED),
      claimedAreaHa: nullableNumber(original.CLAIM_AREA),
      referenceAreaHa: nullableNumber(original.REF_AREA),
      commonage: String(original.COMM_IND ?? "").toUpperCase() === "Y",
      organic: String(original.ORGANICS ?? "").toUpperCase() === "Y",
    };

    return { ...feature, properties };
  });
  const fetchedIso = fetchedAt.toISOString();

  return {
    data: { ...featureCollection, features },
    source: {
      id: "dafm-lpis-2024",
      label: "DAFM LPIS 2024",
      url: `https://geoapi.opendata.agriculture.gov.ie/shps/collections/${LPIS_COLLECTION}`,
    },
    scope: "nearby",
    status: "live",
    observedAt: null,
    fetchedAt: fetchedIso,
    staleAfter: new Date(
      fetchedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    warning:
      "Nearby LPIS parcels are scheme reference data. They do not establish ownership or the boundary of the saved farm.",
    confidence: "authoritative",
  };
}
