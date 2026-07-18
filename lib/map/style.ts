import type { StyleSpecification } from "maplibre-gl";

function createFarmMapStyle(mode: "light" | "dark"): StyleSpecification {
  const dark = mode === "dark";
  const tileTheme = dark ? "dark_all" : "light_all";

  return {
    version: 8,
    name: `AgriView field map · ${mode}`,
    sources: {
      "agriview-base": {
        type: "raster",
        tiles: [
          `https://a.basemaps.cartocdn.com/${tileTheme}/{z}/{x}/{y}@2x.png`,
          `https://b.basemaps.cartocdn.com/${tileTheme}/{z}/{x}/{y}@2x.png`,
        ],
        tileSize: 512,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
    },
    layers: [
      {
        id: "agriview-paper",
        type: "background",
        paint: { "background-color": dark ? "#08110c" : "#ece9dc" },
      },
      {
        id: "agriview-base",
        type: "raster",
        source: "agriview-base",
        paint: dark
          ? {
              "raster-saturation": -0.45,
              "raster-contrast": 0.08,
              "raster-brightness-min": 0.02,
              "raster-brightness-max": 0.72,
            }
          : {
              "raster-saturation": -0.58,
              "raster-contrast": 0.08,
              "raster-brightness-min": 0.08,
              "raster-brightness-max": 0.94,
            },
      },
    ],
  };
}

export const farmMapStyles = {
  light: createFarmMapStyle("light"),
  dark: createFarmMapStyle("dark"),
} as const;

export const farmMapColors = {
  pin: "#315f45",
  parcelFill: "#70a36d",
  parcelLine: "#315f45",
  water: "#367b95",
};
