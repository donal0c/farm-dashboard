import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  boundingBox,
  distanceKm,
  isIrishCoordinate,
} from "../lib/contracts/geo.ts";

describe("geographic contracts", () => {
  it("accepts Irish points and rejects swapped or remote coordinates", () => {
    assert.equal(
      isIrishCoordinate({ latitude: 53.35, longitude: -6.26 }),
      true,
    );
    assert.equal(
      isIrishCoordinate({ latitude: -6.26, longitude: 53.35 }),
      false,
    );
    assert.equal(isIrishCoordinate({ latitude: 40.7, longitude: -74 }), false);
  });

  it("builds WFS bounding boxes in longitude-latitude order", () => {
    assert.deepEqual(
      boundingBox({ latitude: 53.5, longitude: -7.5 }, 0.25),
      [-7.75, 53.25, -7.25, 53.75],
    );
  });

  it("rejects implausibly broad search radii", () => {
    assert.throws(
      () => boundingBox({ latitude: 53.5, longitude: -7.5 }, 3),
      /no more than 2/,
    );
  });

  it("computes plausible short Irish distances", () => {
    const distance = distanceKm(
      { latitude: 53.2744, longitude: -9.0491 },
      { latitude: 53.286, longitude: -9.035 },
    );
    assert.ok(distance > 1 && distance < 2);
  });
});
