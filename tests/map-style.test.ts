import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveNightStyle,
  farmMapPaper,
  nightColor,
} from "../lib/map/style.ts";

describe("farm map night style", () => {
  it("darkens light surfaces and lightens label text", () => {
    assert.equal(nightColor("#ffffff"), "rgb(23,23,23)");
    assert.match(nightColor("rgb(0,0,0)"), /^rgb\(\d+,\d+,\d+\)$/);
    assert.equal(nightColor("#000000", "text"), "rgb(199,199,199)");
    assert.equal(nightColor("not-a-colour"), "not-a-colour");
    assert.match(nightColor("rgba(255,255,255,0.5)"), /^rgba\(.*,0\.500\)$/);
  });

  it("rewrites colour paint properties inside expressions and keeps the rest", () => {
    const style = deriveNightStyle({
      version: 8,
      sources: {},
      layers: [
        {
          id: "background",
          type: "background",
          paint: { "background-color": "#f9f9f9" },
        },
        {
          id: "water",
          type: "fill",
          source: "x",
          paint: {
            "fill-color": "hsl(200, 50%, 80%)",
            "fill-opacity": 0.8,
          },
        },
        {
          id: "labels",
          type: "symbol",
          source: "x",
          paint: {
            "text-color": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5,
              "#222",
              10,
              "#333",
            ],
            "text-halo-color": "#fff",
          },
        },
      ],
    });
    assert.equal(
      (style.layers[0] as { paint: { "background-color": string } }).paint[
        "background-color"
      ],
      farmMapPaper.dark,
    );
    const water = style.layers[1] as { paint: Record<string, unknown> };
    assert.match(String(water.paint["fill-color"]), /^rgb\(/);
    assert.equal(water.paint["fill-opacity"], 0.8);
    const labels = style.layers[2] as { paint: Record<string, unknown> };
    const expression = labels.paint["text-color"] as unknown[];
    assert.equal(expression[0], "interpolate");
    assert.match(String(expression[4]), /^rgb\(/);
    assert.equal(expression[3], 5);
  });
});
