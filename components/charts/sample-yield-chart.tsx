"use client";

import ReactECharts from "echarts-for-react";

export function SampleYieldChart() {
  return (
    <ReactECharts
      style={{ height: 320 }}
      option={{
        tooltip: { trigger: "axis" },
        grid: { left: 40, right: 20, top: 20, bottom: 30 },
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
