const monthNames: Record<string, string> = {
  jan: "January",
  feb: "February",
  mar: "March",
  apr: "April",
  may: "May",
  jun: "June",
  jul: "July",
  aug: "August",
  sep: "September",
  oct: "October",
  nov: "November",
  dec: "December",
};

export type NitrateScreeningLabel = {
  rate: string;
  effective: string | null;
  raw: string;
};

export function formatNitrateScreeningLabel(
  value: string,
): NitrateScreeningLabel {
  const raw = value.trim();
  const match = raw.match(
    /^(\d+(?:\.\d+)?)\s*kg\s*N\s*\/\s*ha(?:\s*([a-z]{3,9})\s*(\d{2,4}))?$/i,
  );

  if (!match) {
    return {
      rate: raw || "Unlabelled screening band",
      effective: null,
      raw,
    };
  }

  const [, amount, monthToken, yearToken] = match;
  const month = monthToken
    ? monthNames[monthToken.slice(0, 3).toLowerCase()]
    : null;
  const year = yearToken
    ? Number(yearToken) < 100
      ? 2000 + Number(yearToken)
      : Number(yearToken)
    : null;

  return {
    rate: `${amount} kg organic N/ha`,
    effective: month && year ? `${month} ${year}` : null,
    raw,
  };
}

export function formatParcelReference(value: string) {
  const reference = value.trim();
  if (!reference || reference === "Unlabelled") return "No published reference";
  return reference.length > 16
    ? `Reference …${reference.slice(-8)}`
    : `Reference ${reference}`;
}

export function humanizeLandUse(value: string) {
  const normalized = value.trim().replaceAll(/[_-]+/g, " ");
  if (!normalized) return "Land use not published";
  if (normalized === normalized.toUpperCase()) {
    return normalized
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return normalized;
}

export function prioritizeSelectedParcel<T extends { id: string }>(
  parcels: T[],
  selectedParcelId: string | null,
  limit = 8,
) {
  const leadingParcels = parcels.slice(0, limit);
  if (
    !selectedParcelId ||
    leadingParcels.some((parcel) => parcel.id === selectedParcelId)
  ) {
    return leadingParcels;
  }

  const selectedParcel = parcels.find(
    (parcel) => parcel.id === selectedParcelId,
  );
  return selectedParcel
    ? [selectedParcel, ...leadingParcels.slice(0, Math.max(limit - 1, 0))]
    : leadingParcels;
}
