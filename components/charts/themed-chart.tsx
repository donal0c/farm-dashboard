"use client";

import ReactECharts, { type EChartsOption } from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
    <ReactECharts
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
