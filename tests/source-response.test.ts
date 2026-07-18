import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import {
  fetchSourceSnapshot,
  fetchValidatedSourceSnapshot,
  SourceRequestError,
} from "../lib/client/fetch-source-snapshot.ts";
import {
  applyFreshnessStatus,
  type SourceSnapshot,
} from "../lib/contracts/source-snapshot.ts";

const source = {
  id: "test-source",
  label: "Test source",
  url: "https://example.com/source",
};

function snapshot(
  data: unknown,
  status: "live" | "unavailable" = "live",
): SourceSnapshot<unknown> {
  return {
    data,
    source,
    scope: "farm",
    status,
    observedAt: null,
    fetchedAt: "2026-07-18T12:00:00.000Z",
    staleAfter: "2099-07-18T12:30:00.000Z",
    warning: status === "unavailable" ? "Upstream unavailable." : null,
    confidence: "estimate",
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SourceSnapshot client boundary", () => {
  it("preserves live-empty as a successful source state", async () => {
    const result = await fetchSourceSnapshot(
      "https://example.test/data",
      undefined,
      async () => jsonResponse(snapshot([])),
    );

    assert.equal(result.status, "live");
    assert.deepEqual(result.data, []);
  });

  it("returns a valid unavailable snapshot from a 502 response", async () => {
    const result = await fetchSourceSnapshot(
      "https://example.test/data",
      undefined,
      async () => jsonResponse(snapshot(null, "unavailable"), 502),
    );

    assert.equal(result.status, "unavailable");
    assert.equal(result.data, null);
  });

  it("rejects a bare HTTP error without treating it as empty data", async () => {
    await assert.rejects(
      () =>
        fetchSourceSnapshot("https://example.test/data", undefined, async () =>
          jsonResponse({ error: "county is required" }, 400),
        ),
      (error) =>
        error instanceof SourceRequestError &&
        error.kind === "http" &&
        error.status === 400 &&
        error.message === "county is required",
    );
  });

  it("rejects a malformed successful envelope", async () => {
    await assert.rejects(
      () =>
        fetchSourceSnapshot("https://example.test/data", undefined, async () =>
          jsonResponse({ status: "live", data: [] }),
        ),
      (error) =>
        error instanceof SourceRequestError &&
        error.kind === "invalid-contract",
    );
  });

  it("classifies transport and unreadable JSON failures", async () => {
    await assert.rejects(
      () =>
        fetchSourceSnapshot(
          "https://example.test/data",
          undefined,
          async () => {
            throw new TypeError("offline");
          },
        ),
      (error) =>
        error instanceof SourceRequestError && error.kind === "transport",
    );

    await assert.rejects(
      () =>
        fetchSourceSnapshot(
          "https://example.test/data",
          undefined,
          async () => new Response("not json", { status: 200 }),
        ),
      (error) =>
        error instanceof SourceRequestError && error.kind === "invalid-json",
    );
  });

  it("validates source-specific data at the client boundary", async () => {
    const dataSchema = z.object({ value: z.number() });
    await assert.rejects(
      () =>
        fetchValidatedSourceSnapshot(
          "https://example.test/data",
          dataSchema,
          undefined,
          async () => jsonResponse(snapshot({ value: "wrong" })),
        ),
      (error) =>
        error instanceof SourceRequestError &&
        error.kind === "invalid-contract",
    );

    const result = await fetchValidatedSourceSnapshot(
      "https://example.test/data",
      dataSchema,
      undefined,
      async () => jsonResponse(snapshot({ value: 7 })),
    );
    assert.equal(result.data?.value, 7);
  });

  it("moves cached or live snapshots to stale only after their freshness window", () => {
    const current = {
      ...snapshot([1]),
      staleAfter: "2026-07-18T12:30:00.000Z",
    };
    assert.equal(
      applyFreshnessStatus(current, new Date("2026-07-18T12:29:59.000Z"))
        .status,
      "live",
    );
    const stale = applyFreshnessStatus(
      current,
      new Date("2026-07-18T12:30:00.000Z"),
    );
    assert.equal(stale.status, "stale");
    assert.match(stale.warning ?? "", /freshness window/);
  });
});
