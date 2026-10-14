"use client";

import type { StyleSpecification } from "maplibre-gl";
import { useEffect, useMemo, useState } from "react";

import {
  deriveDayStyle,
  deriveNightStyle,
  FARM_MAP_STYLE_URL,
  placeholderMapStyle,
} from "./style";

let stylePromise: Promise<StyleSpecification | null> | null = null;

function loadBaseStyle() {
  if (!stylePromise) {
    stylePromise = fetch(FARM_MAP_STYLE_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((style) =>
        style && typeof style === "object" && Array.isArray(style.layers)
          ? (style as StyleSpecification)
          : null,
      )
      .catch(() => null);
  }
  return stylePromise;
}

/**
 * Resolve the themed vector style for the farm maps. Until the style has
 * loaded a paper-coloured placeholder keeps the map region stable.
 */
export function useFarmMapStyle(resolvedTheme: string | undefined) {
  const [base, setBase] = useState<StyleSpecification | null>(null);
  const mode = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    let active = true;
    void loadBaseStyle().then((style) => {
      if (active && style) setBase(style);
    });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    if (!base) return placeholderMapStyle(mode);
    return mode === "dark" ? deriveNightStyle(base) : deriveDayStyle(base);
  }, [base, mode]);
}
