import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatCoordinate,
  parseFarmCoordinates,
} from "../lib/farm-location.ts";

describe("farm coordinate input", () => {
  it("accepts valid Irish decimal coordinates", () => {
    assert.deepEqual(parseFarmCoordinates("53.2744", "-9.0491"), {
      ok: true,
      location: { latitude: 53.2744, longitude: -9.0491 },
    });
  });

  it("accepts the documented Irish bounding values", () => {
    assert.equal(parseFarmCoordinates("51.2", "-11").ok, true);
    assert.equal(parseFarmCoordinates("55.7", "-5.2").ok, true);
  });

  it("identifies incomplete coordinate pairs", () => {
    assert.deepEqual(parseFarmCoordinates("", ""), {
      ok: false,
      field: "both",
      message: "Enter both latitude and longitude.",
    });
    assert.deepEqual(parseFarmCoordinates("53.3", ""), {
      ok: false,
      field: "longitude",
      message: "Enter both latitude and longitude.",
    });
  });

  it("rejects malformed and out-of-Ireland values by field", () => {
    assert.deepEqual(parseFarmCoordinates("north", "-8"), {
      ok: false,
      field: "latitude",
      message: "Latitude must be a number.",
    });
    assert.deepEqual(parseFarmCoordinates("53", "west"), {
      ok: false,
      field: "longitude",
      message: "Longitude must be a number.",
    });
    const invalidLatitude = parseFarmCoordinates("50", "-8");
    assert.equal(invalidLatitude.ok, false);
    if (invalidLatitude.ok) assert.fail("Expected invalid latitude.");
    assert.match(invalidLatitude.message, /Latitude must be between/);

    const invalidLongitude = parseFarmCoordinates("53", "-4");
    assert.equal(invalidLongitude.ok, false);
    if (invalidLongitude.ok) assert.fail("Expected invalid longitude.");
    assert.match(invalidLongitude.message, /Longitude must be between/);
  });

  it("formats map coordinates without excessive precision", () => {
    assert.equal(formatCoordinate(53.274412345), "53.27441");
  });
});
