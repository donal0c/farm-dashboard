import { z } from "zod";

export type SourceStatus =
  | "live"
  | "cached"
  | "fallback"
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

export const sourceSnapshotEnvelopeSchema = z.object({
  data: z.unknown().nullable(),
  source: z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    url: z.string().min(1),
  }),
  scope: z.enum(["farm", "nearby", "county", "regional", "national"]),
  status: z.enum(["live", "cached", "fallback", "stale", "unavailable"]),
  observedAt: z.string().min(1).nullable(),
  fetchedAt: z.string().min(1),
  staleAfter: z.string().min(1),
  warning: z.string().nullable(),
  confidence: z.enum(["authoritative", "screening", "estimate", "sample"]),
});

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
