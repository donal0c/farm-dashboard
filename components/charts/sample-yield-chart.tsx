"use client";

import { ThemedChart } from "@/components/charts/themed-chart";

export function SampleYieldChart() {
  return (
    <ThemedChart
      style={{ height: 320 }}
      option={{
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        },
        yAxis: { type: "value", name: "Index" },
        series: [
          {
            name: "Yield outlook",
            type: "line",
            smooth: true,
            data: [70, 72, 74, 78, 83, 88],
            areaStyle: {},
          },
        ],
      }}
    />
  );
}
