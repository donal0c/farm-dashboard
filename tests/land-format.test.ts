import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatNitrateScreeningLabel,
  formatParcelReference,
  humanizeLandUse,
  prioritizeSelectedParcel,
} from "../lib/land-format.ts";

describe("land evidence formatting", () => {
  it("humanizes the compact DAFM nitrate label and effective month", () => {
    assert.deepEqual(formatNitrateScreeningLabel("220kgN/haJan24"), {
      rate: "220 kg organic N/ha",
      effective: "January 2024",
      raw: "220kgN/haJan24",
    });
    assert.deepEqual(formatNitrateScreeningLabel("170 kg N/ha"), {
      rate: "170 kg organic N/ha",
      effective: null,
      raw: "170 kg N/ha",
    });
  });

  it("preserves unknown nitrate labels for traceability", () => {
    assert.deepEqual(formatNitrateScreeningLabel("Derogation zone B"), {
      rate: "Derogation zone B",
      effective: null,
      raw: "Derogation zone B",
    });
  });

  it("keeps long parcel identifiers secondary and readable", () => {
    assert.equal(
      formatParcelReference(
        "CA98F1F20DBCFB3B6B1AD1E4399E626CF4CB5D70F9299E874248ED2C795C1636",
      ),
      "Reference …795C1636",
    );
    assert.equal(formatParcelReference("A-17"), "Reference A-17");
    assert.equal(formatParcelReference("Unlabelled"), "No published reference");
  });

  it("humanizes machine-like land-use labels without flattening prose", () => {
    assert.equal(humanizeLandUse("PERMANENT_PASTURE"), "Permanent Pasture");
    assert.equal(humanizeLandUse("Permanent Pasture"), "Permanent Pasture");
    assert.equal(humanizeLandUse(""), "Land use not published");
  });

  it("keeps an out-of-list map selection visible in the parcel register", () => {
    const parcels = Array.from({ length: 12 }, (_, index) => ({
      id: `parcel-${index + 1}`,
    }));
    assert.deepEqual(
      prioritizeSelectedParcel(parcels, "parcel-12").map((parcel) => parcel.id),
      [
        "parcel-12",
        "parcel-1",
        "parcel-2",
        "parcel-3",
        "parcel-4",
        "parcel-5",
        "parcel-6",
        "parcel-7",
      ],
    );
    assert.deepEqual(
      prioritizeSelectedParcel(parcels, "parcel-3").map((parcel) => parcel.id),
      parcels.slice(0, 8).map((parcel) => parcel.id),
    );
  });
});
