const countyWarningCodes = {
  CARLOW: "EI01",
  CAVAN: "EI02",
  CLARE: "EI03",
  CORK: "EI04",
  DONEGAL: "EI06",
  DUBLIN: "EI07",
  GALWAY: "EI10",
  KERRY: "EI11",
  KILDARE: "EI12",
  KILKENNY: "EI13",
  LEITRIM: "EI14",
  LAOIS: "EI15",
  LIMERICK: "EI16",
  LONGFORD: "EI18",
  LOUTH: "EI19",
  MAYO: "EI20",
  MEATH: "EI21",
  MONAGHAN: "EI22",
  OFFALY: "EI23",
  ROSCOMMON: "EI24",
  SLIGO: "EI25",
  TIPPERARY: "EI26",
  WATERFORD: "EI27",
  WESTMEATH: "EI29",
  WEXFORD: "EI30",
  WICKLOW: "EI31",
} as const;

export type IrishCounty = keyof typeof countyWarningCodes;

const countyNames = Object.keys(countyWarningCodes) as IrishCounty[];

export function normalizeIrishCounty(
  value?: string | null,
): IrishCounty | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/^COUNTY\s+/i, "")
    .trim()
    .toUpperCase();
  return countyNames.includes(normalized as IrishCounty)
    ? (normalized as IrishCounty)
    : null;
}

export function countyFromGeocode(
  addressCounty: string | null | undefined,
  routingArea: string,
): IrishCounty | null {
  const fromAddress = normalizeIrishCounty(addressCounty);
  if (fromAddress) return fromAddress;

  const area = routingArea.trim().toUpperCase();
  return (
    countyNames.find(
      (county) =>
        area === county ||
        area.startsWith(`${county} `) ||
        area.startsWith(`${county} -`),
    ) ?? null
  );
}

export function routingAreaSearchQuery(routingArea: string) {
  const [county, place, ...rest] = routingArea
    .split(/\s+-\s+/)
    .map((part) => part.trim());
  if (!county || !place || rest.length) return routingArea.trim();
  return `${place}, ${county}`;
}

export function warningRegionsIncludeCounty(
  regions: string[],
  countyValue?: string | null,
) {
  const county = normalizeIrishCounty(countyValue);
  if (!county) return false;
  const warningCode = countyWarningCodes[county];
  return regions.some((region) => {
    const normalized = region.trim().toUpperCase();
    return (
      normalized === warningCode || normalizeIrishCounty(region) === county
    );
  });
}
