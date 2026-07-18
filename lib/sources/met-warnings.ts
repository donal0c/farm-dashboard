import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";

export type MetWarning = {
  id: string;
  level: "Yellow" | "Orange" | "Red" | "Advisory" | "Unknown";
  headline: string;
  description: string;
  issuedAt: string;
  startsAt: string;
  expiresAt: string;
  regions: string[];
};

type RawMetWarning = {
  id?: string | number;
  capId?: string;
  level?: string;
  headline?: string;
  description?: string;
  issued?: string;
  onset?: string;
  expiry?: string;
  regions?: string[];
};

function warningLevel(level: string | undefined): MetWarning["level"] {
  return ["Yellow", "Orange", "Red", "Advisory"].includes(level ?? "")
    ? (level as MetWarning["level"])
    : "Unknown";
}

export function normalizeMetWarnings(
  payload: RawMetWarning[],
  fetchedAt = new Date(),
): SourceSnapshot<MetWarning[]> {
  if (!Array.isArray(payload)) {
    throw new Error("Met Éireann returned an invalid warning payload.");
  }

  const data = payload
    .filter(
      (warning) =>
        warning.headline &&
        warning.expiry &&
        Date.parse(warning.expiry) > fetchedAt.getTime(),
    )
    .map((warning) => ({
      id: String(warning.capId ?? warning.id ?? warning.headline),
      level: warningLevel(warning.level),
      headline: String(warning.headline),
      description: String(warning.description ?? "").trim(),
      issuedAt: String(warning.issued ?? fetchedAt.toISOString()),
      startsAt: String(
        warning.onset ?? warning.issued ?? fetchedAt.toISOString(),
      ),
      expiresAt: String(warning.expiry),
      regions: Array.isArray(warning.regions) ? warning.regions : [],
    }));
  const fetchedIso = fetchedAt.toISOString();

  return {
    data,
    source: {
      id: "met-eireann-warnings",
      label: "Met Éireann warnings",
      url: "https://www.met.ie/warnings-today.html",
    },
    scope: "national",
    status: "live",
    observedAt:
      data
        .map((warning) => warning.issuedAt)
        .sort()
        .at(-1) ?? fetchedIso,
    fetchedAt: fetchedIso,
    staleAfter: new Date(fetchedAt.getTime() + 15 * 60 * 1000).toISOString(),
    warning: data.length
      ? "National and regional warnings still require local interpretation for the saved farm."
      : null,
    confidence: "authoritative",
  };
}
