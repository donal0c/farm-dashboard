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
