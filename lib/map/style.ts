import type { StyleSpecification } from "maplibre-gl";

export const farmMapStyle: StyleSpecification = {
  version: 8,
  name: "AgriView field map",
  sources: {
    "agriview-base": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 512,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "agriview-paper",
      type: "background",
      paint: { "background-color": "#ece9dc" },
    },
    {
      id: "agriview-base",
      type: "raster",
      source: "agriview-base",
      paint: {
        "raster-saturation": -0.58,
        "raster-contrast": 0.08,
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.94,
      },
    },
  ],
};

export const farmMapColors = {
  pin: "#315f45",
  parcelFill: "#70a36d",
  parcelLine: "#315f45",
  water: "#367b95",
};
