import { z } from "zod";

export type SourceStatus =
  | "live"
  | "cached"
  | "partial"
  | "stale"
  | "unavailable";

export type SourceConfidence =
  | "authoritative"
  | "screening"
  | "estimate"
  | "sample";

export type SourceScope =
  | "farm"
  | "nearby"
  | "county"
  | "regional"
  | "national";

export type SourceSnapshot<T> = {
  data: T | null;
  source: {
    id: string;
    label: string;
    url: string;
  };
  scope: SourceScope;
  status: SourceStatus;
  observedAt: string | null;
  fetchedAt: string;
  staleAfter: string;
  warning: string | null;
  confidence: SourceConfidence;
};

const timestampSchema = z
  .string()
  .min(1)
  .refine((value) => Number.isFinite(Date.parse(value)), "Invalid timestamp.");

export const sourceSnapshotEnvelopeSchema = z
  .object({
    data: z.unknown().nullable(),
    source: z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      url: z.string().min(1),
    }),
    scope: z.enum(["farm", "nearby", "county", "regional", "national"]),
    status: z.enum(["live", "cached", "partial", "stale", "unavailable"]),
    observedAt: timestampSchema.nullable(),
    fetchedAt: timestampSchema,
    staleAfter: timestampSchema,
    warning: z.string().nullable(),
    confidence: z.enum(["authoritative", "screening", "estimate", "sample"]),
  })
  .superRefine((snapshot, context) => {
    if (snapshot.status === "unavailable" && snapshot.data !== null) {
      context.addIssue({
        code: "custom",
        message: "Unavailable snapshots must have null data.",
      });
    }
  });

type AvailableSourceStatus = Exclude<SourceStatus, "unavailable">;

export function availableSnapshot<T>({
  data,
  source,
  scope,
  status,
  observedAt,
  fetchedAt,
  staleAfter,
  warning,
  confidence,
}: SourceSnapshot<T> & {
  data: T;
  status: AvailableSourceStatus;
}): SourceSnapshot<T> {
  return {
    data,
    source,
    scope,
    status,
    observedAt,
    fetchedAt,
    staleAfter,
    warning,
    confidence,
  };
}

export function applyFreshnessStatus<T>(
  snapshot: SourceSnapshot<T>,
  now = new Date(),
): SourceSnapshot<T> {
  if (
    snapshot.status === "unavailable" ||
    snapshot.status === "stale" ||
    Date.parse(snapshot.staleAfter) > now.getTime()
  ) {
    return snapshot;
  }
  return {
    ...snapshot,
    status: "stale",
    warning: [snapshot.warning, "The source freshness window has elapsed."]
      .filter(Boolean)
      .join(" "),
  };
}

export function unavailableSnapshot<T>({
  source,
  scope,
  staleAfter,
  warning,
  confidence,
}: Pick<
  SourceSnapshot<T>,
  "source" | "scope" | "staleAfter" | "warning" | "confidence"
>): SourceSnapshot<T> {
  return {
    data: null,
    source,
    scope,
    status: "unavailable",
    observedAt: null,
    fetchedAt: new Date().toISOString(),
    staleAfter,
    warning,
    confidence,
  };
}
