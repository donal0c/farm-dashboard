/**
 * Unified ECharts theme — "farm" — Irish Terroir palette.
 *
 * Register once at app startup with echarts.registerTheme("farm", farmTheme)
 * then pass theme="farm" to every <ReactECharts />.
 */

export const CHART_COLORS = {
  pasture: "#3a8a5c", // oklch(0.55 0.16 150) — livestock
  stream: "#3a7dae", // oklch(0.55 0.10 240) — water/dairy
  harvest: "#c5982a", // oklch(0.70 0.16 85)  — crops/grain
  clay: "#a0603a", // oklch(0.55 0.12 30)  — soil/land
  heather: "#8a4a98", // oklch(0.50 0.12 310) — supplementary
} as const;

export const CHART_COLOR_LIST = [
  CHART_COLORS.pasture,
  CHART_COLORS.stream,
  CHART_COLORS.harvest,
  CHART_COLORS.clay,
  CHART_COLORS.heather,
];

const fontFamily =
  "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif";

const axisCommon = {
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: {
    fontFamily,
    fontSize: 11,
    color: "#7a8a7e",
  },
  splitLine: {
    lineStyle: {
      color: "#e4ebe6",
      type: "dashed" as const,
    },
  },
};

export const farmTheme = {
  color: CHART_COLOR_LIST,

  backgroundColor: "transparent",

  textStyle: {
    fontFamily,
    color: "#2d3b30",
  },

  title: {
    textStyle: {
      fontFamily,
      fontWeight: 600,
      fontSize: 14,
      color: "#2d3b30",
    },
    subtextStyle: {
      fontFamily,
      fontSize: 12,
      color: "#7a8a7e",
    },
  },

  legend: {
    textStyle: {
      fontFamily,
      fontSize: 11,
      color: "#5a6a5e",
    },
    icon: "roundRect",
    itemWidth: 12,
    itemHeight: 8,
    itemGap: 16,
  },

  tooltip: {
    backgroundColor: "rgba(30, 42, 34, 0.95)",
    borderColor: "transparent",
    borderWidth: 0,
    textStyle: {
      fontFamily,
      fontSize: 12,
      color: "#e8f0ea",
    },
    extraCssText:
      "border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); padding: 10px 14px;",
  },

  grid: {
    containLabel: true,
    left: 16,
    right: 16,
    top: 48,
    bottom: 48,
  },

  categoryAxis: axisCommon,
  valueAxis: axisCommon,

  xAxis: axisCommon,
  yAxis: axisCommon,

  line: {
    itemStyle: {
      borderWidth: 2,
    },
    lineStyle: {
      width: 2.5,
    },
    symbolSize: 6,
    symbol: "circle",
    smooth: true,
    areaStyle: {
      opacity: 0.08,
    },
  },

  bar: {
    itemStyle: {
      borderRadius: [4, 4, 0, 0],
    },
    barMaxWidth: 40,
  },

  dataZoom: [
    {
      type: "inside" as const,
    },
    {
      type: "slider" as const,
      height: 20,
      borderColor: "transparent",
      backgroundColor: "#f0f5f1",
      fillerColor: "rgba(58, 138, 92, 0.15)",
      handleStyle: {
        color: "#3a8a5c",
        borderColor: "#3a8a5c",
      },
      textStyle: {
        fontFamily,
        fontSize: 10,
        color: "#7a8a7e",
      },
    },
  ],
};

/** Dark variant adjustments — merge on top of farmTheme */
export const farmThemeDark = {
  ...farmTheme,

  textStyle: {
    ...farmTheme.textStyle,
    color: "#d0e0d4",
  },

  title: {
    ...farmTheme.title,
    textStyle: {
      ...farmTheme.title.textStyle,
      color: "#d0e0d4",
    },
    subtextStyle: {
      ...farmTheme.title.subtextStyle,
      color: "#8a9a8e",
    },
  },

  legend: {
    ...farmTheme.legend,
    textStyle: {
      ...farmTheme.legend.textStyle,
      color: "#a0b0a4",
    },
  },

  tooltip: {
    ...farmTheme.tooltip,
    backgroundColor: "rgba(20, 32, 24, 0.95)",
  },

  categoryAxis: {
    ...axisCommon,
    axisLabel: {
      ...axisCommon.axisLabel,
      color: "#8a9a8e",
    },
    splitLine: {
      lineStyle: {
        color: "rgba(255,255,255,0.08)",
        type: "dashed" as const,
      },
    },
  },
  valueAxis: {
    ...axisCommon,
    axisLabel: {
      ...axisCommon.axisLabel,
      color: "#8a9a8e",
    },
    splitLine: {
      lineStyle: {
        color: "rgba(255,255,255,0.08)",
        type: "dashed" as const,
      },
    },
  },
  xAxis: {
    ...axisCommon,
    axisLabel: { ...axisCommon.axisLabel, color: "#8a9a8e" },
    splitLine: {
      lineStyle: { color: "rgba(255,255,255,0.08)", type: "dashed" as const },
    },
  },
  yAxis: {
    ...axisCommon,
    axisLabel: { ...axisCommon.axisLabel, color: "#8a9a8e" },
    splitLine: {
      lineStyle: { color: "rgba(255,255,255,0.08)", type: "dashed" as const },
    },
  },

  dataZoom: [
    { type: "inside" as const },
    {
      ...farmTheme.dataZoom[1],
      backgroundColor: "rgba(255,255,255,0.05)",
      fillerColor: "rgba(100, 180, 120, 0.2)",
      textStyle: {
        ...farmTheme.dataZoom[1].textStyle,
        color: "#8a9a8e",
      },
    },
  ],

  color: [
    "#5cb87a", // brighter pasture
    "#5aa0d0", // brighter stream
    "#d4ae3a", // brighter harvest
    "#c07a50", // brighter clay
    "#a06ab0", // brighter heather
  ],
};
