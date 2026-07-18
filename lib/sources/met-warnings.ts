import { z } from "zod";

import type { SourceSnapshot } from "../contracts/source-snapshot.ts";

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

export const metWarningSchema = z.object({
  id: z.string().min(1),
  level: z.enum(["Yellow", "Orange", "Red", "Advisory", "Unknown"]),
  headline: z.string().min(1),
  description: z.string(),
  issuedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  startsAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  expiresAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  regions: z.array(z.string()),
});

export const metWarningsSchema = z.array(metWarningSchema);

export const rawMetWarningsSchema = z.array(
  z
    .object({
      id: z.union([z.string(), z.number()]).optional(),
      capId: z.string().optional(),
      level: z.string().optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
      issued: z
        .string()
        .refine((value) => Number.isFinite(Date.parse(value)))
        .optional(),
      onset: z
        .string()
        .refine((value) => Number.isFinite(Date.parse(value)))
        .optional(),
      expiry: z
        .string()
        .refine((value) => Number.isFinite(Date.parse(value)))
        .optional(),
      regions: z.array(z.string()).optional(),
    })
    .passthrough(),
);

type RawMetWarning = z.infer<typeof rawMetWarningsSchema>[number];

export const MET_WARNINGS_SOURCE = {
  id: "met-eireann-warnings",
  label: "Met Éireann warnings",
  url: "https://www.met.ie/warnings-today.html",
};

const severityRank: Record<MetWarning["level"], number> = {
  Red: 0,
  Orange: 1,
  Yellow: 2,
  Advisory: 3,
  Unknown: 4,
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
    }))
    .sort(
      (left, right) =>
        severityRank[left.level] - severityRank[right.level] ||
        Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
        Date.parse(left.expiresAt) - Date.parse(right.expiresAt) ||
        left.id.localeCompare(right.id),
    );
  const fetchedIso = fetchedAt.toISOString();

  return {
    data,
    source: MET_WARNINGS_SOURCE,
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
