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
import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const theme = resolvedTheme === "dark" ? "farm-dark" : "farm";

  return (
    <EChartsReactCore
      echarts={echarts}
      option={option}
      theme={theme}
      style={style}
      className={className}
      notMerge={notMerge}
      lazyUpdate={lazyUpdate}
      opts={{ renderer: "svg" }}
    />
  );
}
