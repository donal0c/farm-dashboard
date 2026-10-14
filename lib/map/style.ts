import type { StyleSpecification } from "maplibre-gl";

/**
 * OpenFreeMap serves OpenMapTiles vector styles without an API key under the
 * OSM/ODbL licence with attribution carried in the style itself. The light
 * theme uses Positron as published; the dark theme is derived at runtime so
 * both maps share one source of geographic truth.
 */
export const FARM_MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron";

export const farmMapPaper = {
  light: "#ece9dc",
  dark: "#0b120e",
} as const;

/** Minimal style used before the vector style has loaded. */
export function placeholderMapStyle(
  mode: "light" | "dark",
): StyleSpecification {
  return {
    version: 8,
    name: `AgriView placeholder · ${mode}`,
    sources: {},
    layers: [
      {
        id: "agriview-paper",
        type: "background",
        paint: { "background-color": farmMapPaper[mode] },
      },
    ],
  };
}

type Rgb = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgb | null {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(text);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      const [r, g, b, a = "f"] = digits.split("");
      return {
        r: Number.parseInt(r + r, 16),
        g: Number.parseInt(g + g, 16),
        b: Number.parseInt(b + b, 16),
        a: Number.parseInt(a + a, 16) / 255,
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        r: Number.parseInt(digits.slice(0, 2), 16),
        g: Number.parseInt(digits.slice(2, 4), 16),
        b: Number.parseInt(digits.slice(4, 6), 16),
        a:
          digits.length === 8
            ? Number.parseInt(digits.slice(6, 8), 16) / 255
            : 1,
      };
    }
    return null;
  }
  const rgb =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
      text,
    );
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  const hsl =
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(
      text,
    );
  if (hsl) {
    const { r, g, b } = hslToRgb(
      Number(hsl[1]),
      Number(hsl[2]) / 100,
      Number(hsl[3]) / 100,
    );
    return { r, g, b, a: hsl[4] === undefined ? 1 : Number(hsl[4]) };
  }
  return null;
}

function rgbToHsl({ r, g, b }: Rgb) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === red) h = (green - blue) / d + (green < blue ? 6 : 0);
  else if (max === green) h = (blue - red) / d + 2;
  else h = (red - green) / d + 4;
  return { h: h * 60, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) / 360;
  if (s === 0) {
    const grey = Math.round(l * 255);
    return { r: grey, g: grey, b: grey };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255),
  };
}

function toCss({ h, s, l }: { h: number; s: number; l: number }, a: number) {
  const { r, g, b } = hslToRgb(h, s, l);
  return a >= 1
    ? `rgb(${r},${g},${b})`
    : `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

type NightRole = "surface" | "text" | "halo";

/** Map a Positron colour into the AgriView night-field palette. */
export function nightColor(value: string, role: NightRole = "surface") {
  const parsed = parseColor(value);
  if (!parsed) return value;
  const { h, s, l } = rgbToHsl(parsed);
  if (role === "text") {
    return toCss({ h, s: Math.min(s * 0.35, 0.25), l: 0.78 }, parsed.a);
  }
  if (role === "halo") {
    return toCss({ h, s: Math.min(s * 0.4, 0.2), l: 0.1 }, parsed.a);
  }
  // Invert lightness into a compressed dark range, keep hue, calm saturation.
  const lightness = 0.09 + (1 - l) * 0.5;
  return toCss({ h, s: Math.min(s * 0.45, 0.35), l: lightness }, parsed.a);
}

function transformValue(value: unknown, role: NightRole): unknown {
  if (typeof value === "string") return nightColor(value, role);
  if (Array.isArray(value))
    return value.map((item) => transformValue(item, role));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        transformValue(item, role),
      ]),
    );
  }
  return value;
}

function roleForProperty(property: string): NightRole {
  if (property === "text-halo-color" || property === "icon-halo-color") {
    return "halo";
  }
  if (property === "text-color" || property === "icon-color") return "text";
  return "surface";
}

export function deriveNightStyle(
  style: StyleSpecification,
): StyleSpecification {
  return {
    ...style,
    name: "AgriView field map · night",
    layers: style.layers.map((layer) => {
      if (layer.type === "background") {
        return {
          ...layer,
          paint: { ...layer.paint, "background-color": farmMapPaper.dark },
        };
      }
      const paint = layer.paint
        ? Object.fromEntries(
            Object.entries(layer.paint).map(([property, value]) => [
              property,
              property.endsWith("-color")
                ? transformValue(value, roleForProperty(property))
                : value,
            ]),
          )
        : undefined;
      return paint ? ({ ...layer, paint } as typeof layer) : layer;
    }),
  };
}

export function deriveDayStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    name: "AgriView field map · day",
    layers: style.layers.map((layer) =>
      layer.type === "background"
        ? {
            ...layer,
            paint: { ...layer.paint, "background-color": farmMapPaper.light },
          }
        : layer,
    ),
  };
}

export const farmMapColors = {
  pin: "#315f45",
  parcelFill: "#70a36d",
  parcelLine: "#315f45",
  water: "#367b95",
} as const;

export const farmMapColorsDark = {
  pin: "#9fd3a6",
  parcelFill: "#7cc281",
  parcelLine: "#b6e3b9",
  water: "#6fb3cc",
} as const;
