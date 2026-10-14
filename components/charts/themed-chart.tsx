"use client";

import { LineChart } from "echarts/charts";
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts-for-react";
import EChartsReactCore from "echarts-for-react/lib/core";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { farmTheme, farmThemeDark } from "@/lib/charts/theme";

echarts.use([
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LineChart,
  SVGRenderer,
  TooltipComponent,
]);
echarts.registerTheme("farm", farmTheme);
echarts.registerTheme("farm-dark", farmThemeDark);

export type ChartTokens = {
  accent: string;
  secondary: string;
  foreground: string;
  muted: string;
  rule: string;
  sheet: string;
  fontFamily: string;
};

function readToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Chart colours come from the same CSS tokens as the rest of the page so a
 * theme change restyles the data graphics too. The SVG renderer accepts the
 * oklch strings directly.
 */
export function useChartTokens(): ChartTokens {
  const { resolvedTheme } = useTheme();
  const [tokens, setTokens] = useState<ChartTokens>({
    accent: "#3a7a52",
    secondary: "#4a6f8f",
    foreground: "#2b2b26",
    muted: "#6b6a60",
    rule: "#d6d2c4",
    sheet: "#fdfcf8",
    fontFamily: "IBM Plex Sans, system-ui, sans-serif",
  });
  useEffect(() => {
    const dark = resolvedTheme === "dark";
    setTokens({
      accent: readToken("--chart-1", dark ? "#7cc281" : "#3a7a52"),
      secondary: readToken("--chart-2", dark ? "#86b3cf" : "#4a6f8f"),
      foreground: readToken("--foreground", "#2b2b26"),
      muted: readToken("--muted-foreground", "#6b6a60"),
      rule: readToken("--rule", "#d6d2c4"),
      sheet: readToken("--sheet", "#fdfcf8"),
      fontFamily: `${readToken("--font-plex-sans", "IBM Plex Sans")}, system-ui, sans-serif`,
    });
  }, [resolvedTheme]);
  return tokens;
}

interface ThemedChartProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  notMerge?: boolean;
  lazyUpdate?: boolean;
}

export function ThemedChart({
  option,
  style,
  className,
  notMerge = true,
  lazyUpdate = true,
}: ThemedChartProps) {
  const { resolvedTheme } = useTheme();
  const tokens = useChartTokens();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themedOption = useMemo<EChartsOption>(
    () => ({
      color: [tokens.accent, tokens.secondary],
      textStyle: { fontFamily: tokens.fontFamily, color: tokens.foreground },
      tooltip: {
        backgroundColor: tokens.sheet,
        borderColor: tokens.rule,
        textStyle: { color: tokens.foreground, fontFamily: tokens.fontFamily },
        ...(option.tooltip as Record<string, unknown> | undefined),
      },
      ...option,
    }),
    [option, tokens],
  );

  if (!mounted) {
    return (
      <output
        className={className}
        style={{ ...style, display: "block" }}
        aria-label="Loading chart"
      >
        <span className="block h-full w-full animate-pulse rounded-md bg-muted" />
      </output>
    );
  }

  const theme = resolvedTheme === "dark" ? "farm-dark" : "farm";

  return (
    <EChartsReactCore
      echarts={echarts}
      option={themedOption}
      theme={theme}
      style={style}
      className={className}
      notMerge={notMerge}
      lazyUpdate={lazyUpdate}
      opts={{ renderer: "svg" }}
    />
  );
}
