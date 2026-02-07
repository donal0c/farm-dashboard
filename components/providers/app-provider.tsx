"use client";

import * as echarts from "echarts/core";
import { QueryTrpcProvider } from "@/components/providers/query-trpc-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { farmTheme, farmThemeDark } from "@/lib/charts/theme";

// Register ECharts themes once at module load
echarts.registerTheme("farm", farmTheme);
echarts.registerTheme("farm-dark", farmThemeDark);

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryTrpcProvider>{children}</QueryTrpcProvider>
    </ThemeProvider>
  );
}
