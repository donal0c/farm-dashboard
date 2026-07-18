import type { ZodType } from "zod";

export type UpstreamErrorKind =
  | "timeout"
  | "transport"
  | "http"
  | "invalid-json"
  | "invalid-data";

export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly sourceId: string;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;

  constructor({
    message,
    kind,
    sourceId,
    status = null,
    retryable = false,
    retryAfterMs = null,
  }: {
    message: string;
    kind: UpstreamErrorKind;
    sourceId: string;
    status?: number | null;
    retryable?: boolean;
    retryAfterMs?: number | null;
  }) {
    super(message);
    this.name = "UpstreamError";
    this.kind = kind;
    this.sourceId = sourceId;
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

type NextRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

type FetchValidatedOptions<T> = {
  sourceId: string;
  schema: ZodType<T>;
  init?: NextRequestInit;
  timeoutMs?: number;
  maxAttempts?: 1 | 2;
  fetcher?: typeof fetch;
  sleep?: (durationMs: number) => Promise<void>;
  random?: () => number;
};

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function retryAfterMs(response: Response) {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function retryDelayMs(retryAfter: number | null, random: () => number) {
  const jitteredDelay = 200 + random() * 300;
  return Math.min(retryAfter ?? jitteredDelay, 2_000);
}

async function oneAttempt<T>(
  input: RequestInfo | URL,
  {
    sourceId,
    schema,
    init,
    timeoutMs,
    fetcher,
  }: Required<
    Pick<
      FetchValidatedOptions<T>,
      "sourceId" | "schema" | "timeoutMs" | "fetcher"
    >
  > &
    Pick<FetchValidatedOptions<T>, "init">,
) {
  let response: Response;
  try {
    response = await fetcher(input, {
      ...init,
      signal: AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        AbortSignal.timeout(timeoutMs),
      ]),
    });
  } catch (error) {
    const timeout =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new UpstreamError({
      sourceId,
      kind: timeout ? "timeout" : "transport",
      message: timeout
        ? `${sourceId} timed out.`
        : `${sourceId} could not be reached.`,
      retryable: true,
    });
  }

  if (!response.ok) {
    throw new UpstreamError({
      sourceId,
      kind: "http",
      message: `${sourceId} returned HTTP ${response.status}.`,
      status: response.status,
      retryable: RETRYABLE_STATUSES.has(response.status),
      retryAfterMs: retryAfterMs(response),
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UpstreamError({
      sourceId,
      kind: "invalid-json",
      message: `${sourceId} returned unreadable JSON.`,
    });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new UpstreamError({
      sourceId,
      kind: "invalid-data",
      message: `${sourceId} returned data that did not match its contract.`,
    });
  }

  return { data: parsed.data, response };
}

export async function fetchValidated<T>(
  input: RequestInfo | URL,
  options: FetchValidatedOptions<T>,
) {
  const {
    maxAttempts = 1,
    timeoutMs = 8_000,
    fetcher = fetch,
    sleep = (durationMs) =>
      new Promise<void>((resolve) => setTimeout(resolve, durationMs)),
    random = Math.random,
  } = options;

  let lastError: UpstreamError | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await oneAttempt(input, {
        sourceId: options.sourceId,
        schema: options.schema,
        init: options.init,
        timeoutMs,
        fetcher,
      });
    } catch (error) {
      if (!(error instanceof UpstreamError)) throw error;
      lastError = error;
      if (!error.retryable || attempt === maxAttempts) throw error;
      await sleep(retryDelayMs(error.retryAfterMs, random));
    }
  }

  throw lastError;
}
