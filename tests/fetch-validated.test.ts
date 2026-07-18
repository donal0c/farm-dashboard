import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import {
  fetchValidated,
  UpstreamError,
} from "../lib/server/fetch-validated.ts";

const schema = z.object({ value: z.number() });

function json(payload: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(payload), { status, headers });
}

describe("validated upstream fetch policy", () => {
  it("retries one transient response and honours Retry-After", async () => {
    let attempts = 0;
    const delays: number[] = [];
    const result = await fetchValidated("https://example.test", {
      sourceId: "test-source",
      schema,
      maxAttempts: 2,
      fetcher: async () => {
        attempts += 1;
        return attempts === 1
          ? json({}, 503, { "Retry-After": "1" })
          : json({ value: 42 });
      },
      sleep: async (duration) => {
        delays.push(duration);
      },
    });

    assert.equal(attempts, 2);
    assert.deepEqual(delays, [1_000]);
    assert.equal(result.data.value, 42);
  });

  it("does not retry non-transient HTTP or invalid data", async () => {
    let httpAttempts = 0;
    await assert.rejects(
      () =>
        fetchValidated("https://example.test", {
          sourceId: "test-source",
          schema,
          maxAttempts: 2,
          fetcher: async () => {
            httpAttempts += 1;
            return json({}, 400);
          },
          sleep: async () => {},
        }),
      (error) =>
        error instanceof UpstreamError &&
        error.kind === "http" &&
        !error.retryable,
    );
    assert.equal(httpAttempts, 1);

    let schemaAttempts = 0;
    await assert.rejects(
      () =>
        fetchValidated("https://example.test", {
          sourceId: "test-source",
          schema,
          maxAttempts: 2,
          fetcher: async () => {
            schemaAttempts += 1;
            return json({ value: "wrong" });
          },
          sleep: async () => {},
        }),
      (error) =>
        error instanceof UpstreamError && error.kind === "invalid-data",
    );
    assert.equal(schemaAttempts, 1);
  });

  it("caps transport retries at the configured maximum", async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        fetchValidated("https://example.test", {
          sourceId: "test-source",
          schema,
          maxAttempts: 2,
          fetcher: async () => {
            attempts += 1;
            throw new TypeError("offline");
          },
          sleep: async () => {},
          random: () => 0,
        }),
      (error) =>
        error instanceof UpstreamError &&
        error.kind === "transport" &&
        error.retryable,
    );
    assert.equal(attempts, 2);
  });
});
