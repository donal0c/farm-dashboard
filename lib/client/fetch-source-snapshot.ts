import { z } from "zod";

import {
  applyFreshnessStatus,
  type SourceSnapshot,
  sourceSnapshotEnvelopeSchema,
} from "../contracts/source-snapshot.ts";

const errorPayloadSchema = z.object({
  error: z.string().min(1),
});

export type SourceRequestErrorKind =
  | "transport"
  | "http"
  | "invalid-json"
  | "invalid-contract";

export class SourceRequestError extends Error {
  readonly kind: SourceRequestErrorKind;
  readonly status: number | null;

  constructor(
    message: string,
    kind: SourceRequestErrorKind,
    status: number | null = null,
  ) {
    super(message);
    this.name = "SourceRequestError";
    this.kind = kind;
    this.status = status;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new SourceRequestError(
      "The data service returned an unreadable response.",
      "invalid-json",
      response.status,
    );
  }
}

export async function fetchSourceSnapshot(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
): Promise<SourceSnapshot<unknown>> {
  let response: Response;
  try {
    response = await fetcher(input, init);
  } catch {
    throw new SourceRequestError(
      "The data service could not be reached.",
      "transport",
    );
  }

  const payload = await readJson(response);
  const parsedSnapshot = sourceSnapshotEnvelopeSchema.safeParse(payload);

  if (parsedSnapshot.success) {
    if (!response.ok && parsedSnapshot.data.status !== "unavailable") {
      throw new SourceRequestError(
        "The data service returned an unexpected error response.",
        "http",
        response.status,
      );
    }
    return applyFreshnessStatus(parsedSnapshot.data);
  }

  const parsedError = errorPayloadSchema.safeParse(payload);
  if (!response.ok) {
    throw new SourceRequestError(
      parsedError.success
        ? parsedError.data.error
        : "The data service is temporarily unavailable.",
      "http",
      response.status,
    );
  }

  throw new SourceRequestError(
    "The data response did not match the AgriView source contract.",
    "invalid-contract",
    response.status,
  );
}

export async function fetchValidatedSourceSnapshot<T>(
  input: RequestInfo | URL,
  dataSchema: z.ZodType<T>,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
): Promise<SourceSnapshot<T>> {
  const snapshot = await fetchSourceSnapshot(input, init, fetcher);
  if (snapshot.data === null) return { ...snapshot, data: null };
  const parsed = dataSchema.safeParse(snapshot.data);
  if (!parsed.success) {
    throw new SourceRequestError(
      "The source data did not match its AgriView client contract.",
      "invalid-contract",
    );
  }
  return { ...snapshot, data: parsed.data };
}
