"use client";

import * as echarts from "echarts/core";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { farmTheme, farmThemeDark } from "@/lib/charts/theme";

// Register ECharts themes once at module load
echarts.registerTheme("farm", farmTheme);
echarts.registerTheme("farm-dark", farmThemeDark);

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
