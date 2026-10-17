import { z } from "zod";

import type { SourceSnapshot } from "../contracts/source-snapshot.ts";

export type MetWarningLevel =
  | "Yellow"
  | "Orange"
  | "Red"
  | "Advisory"
  | "Unknown";

export type MetWarning = {
  id: string;
  level: MetWarningLevel;
  /** Hazard type as published, e.g. "Rain", "Wind". Null when not published. */
  type: string | null;
  /** CAP certainty as published, e.g. "Observed", "Likely". Null when absent. */
  certainty: string | null;
  headline: string;
  /** Plain-text description; upstream HTML has been converted to sentences. */
  description: string;
  issuedAt: string;
  startsAt: string;
  expiresAt: string;
  regions: string[];
};

const timestamp = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), "Invalid timestamp.");

export const metWarningSchema = z.object({
  id: z.string().min(1),
  level: z.enum(["Yellow", "Orange", "Red", "Advisory", "Unknown"]),
  type: z.string().nullable().default(null),
  certainty: z.string().nullable().default(null),
  headline: z.string().min(1),
  description: z.string(),
  issuedAt: timestamp,
  startsAt: timestamp,
  expiresAt: timestamp,
  regions: z.array(z.string()),
});

export const metWarningsSchema = z.array(metWarningSchema);

export const rawMetWarningsSchema = z.array(
  z
    .object({
      id: z.union([z.string(), z.number()]).optional(),
      capId: z.string().optional(),
      level: z.string().optional(),
      type: z.string().optional(),
      certainty: z.string().optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
      issued: timestamp.optional(),
      onset: timestamp.optional(),
      expiry: timestamp.optional(),
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

/**
 * Met Éireann only publishes warning_IRELAND.json while a land warning is in
 * force; the file returns 404 on a quiet day. warning_ALL.json always exists
 * and also carries marine (sea-area EI8xx) notices, which AgriView drops.
 */
export const MET_WARNINGS_FEED_URL =
  "https://www.met.ie/Open_Data/json/warning_ALL.json";

const landRegion = /^EI(0[1-9]|[12][0-9]|3[01])$/i;

/** True for a national notice or one that names at least one county region. */
export function isLandWarning(regions: string[] | undefined) {
  if (!regions?.length) return true;
  return regions.some(
    (region) =>
      landRegion.test(region.trim()) || /ireland|national|all/i.test(region),
  );
}

const severityRank: Record<MetWarningLevel, number> = {
  Red: 0,
  Orange: 1,
  Yellow: 2,
  Advisory: 3,
  Unknown: 4,
};

const knownLevels: MetWarningLevel[] = ["Yellow", "Orange", "Red", "Advisory"];

/**
 * Met Éireann publishes the level in lower case ("yellow"). Match without
 * regard to case so severity promotion rules can actually run.
 */
export function warningLevel(level: string | undefined): MetWarningLevel {
  const normalized = (level ?? "").trim().toLowerCase();
  return (
    knownLevels.find((known) => known.toLowerCase() === normalized) ?? "Unknown"
  );
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

function ensureTerminal(sentence: string) {
  return /[.!?:;]$/.test(sentence) ? sentence : `${sentence}.`;
}

/**
 * Convert the published HTML description into readable plain text.
 * Paragraphs become sentences; list items are joined with semicolons so a
 * warning reads as prose rather than markup.
 */
export function warningDescriptionToText(html: string) {
  if (!/<[a-z!/]/i.test(html)) {
    return decodeEntities(html).replace(/\s+/g, " ").trim();
  }
  const lines = html
    .replace(/<\s*li[^>]*>/gi, "\n\u0000")
    .replace(/<\s*(\/li|\/p|\/ul|\/ol|\/div|\/h\d|br\s*\/?)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((line) => decodeEntities(line).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const output: string[] = [];
  let bullets: string[] = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    output.push(ensureTerminal(bullets.join("; ")));
    bullets = [];
  };
  for (const line of lines) {
    if (line.startsWith("\u0000")) {
      bullets.push(line.slice(1).trim());
      continue;
    }
    flushBullets();
    output.push(ensureTerminal(line));
  }
  flushBullets();
  return output.join(" ");
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
        Date.parse(warning.expiry) > fetchedAt.getTime() &&
        isLandWarning(warning.regions),
    )
    .map((warning) => ({
      id: String(warning.capId ?? warning.id ?? warning.headline),
      level: warningLevel(warning.level),
      type: warning.type?.trim() || null,
      certainty: warning.certainty?.trim() || null,
      headline: String(warning.headline),
      description: warningDescriptionToText(String(warning.description ?? "")),
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
      ? "National and regional warnings still require local interpretation for the saved farm. Marine sea-area notices are not shown."
      : "No land warning is in force in the published feed. Marine sea-area notices are not shown.",
    confidence: "authoritative",
  };
}
