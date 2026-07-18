import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSourceFailureEvent,
  logSourceFailure,
} from "../lib/server/source-observability.ts";

describe("source failure observability", () => {
  it("records only privacy-safe source and transport fields", () => {
    const event = createSourceFailureEvent({
      sourceId: "dafm-lpis-2024",
      failureClass: "timeout",
      status: null,
      durationMs: 1_204.6,
    });

    assert.deepEqual(event, {
      event: "source_failure",
      sourceId: "dafm-lpis-2024",
      failureClass: "timeout",
      status: null,
      durationMs: 1_205,
    });
    assert.equal("latitude" in event, false);
    assert.equal("longitude" in event, false);
    assert.equal("url" in event, false);
  });

  it("emits one structured JSON record", () => {
    const messages: string[] = [];
    logSourceFailure(
      {
        sourceId: "opw-water-levels",
        failureClass: "http",
        status: 503,
        durationMs: 42,
      },
      (message) => messages.push(message),
    );

    assert.equal(messages.length, 1);
    assert.deepEqual(JSON.parse(messages[0]), {
      event: "source_failure",
      sourceId: "opw-water-levels",
      failureClass: "http",
      status: 503,
      durationMs: 42,
    });
  });
});
