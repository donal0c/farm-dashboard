"use client";

import { QueryTrpcProvider } from "@/components/providers/query-trpc-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryTrpcProvider>{children}</QueryTrpcProvider>
    </ThemeProvider>
  );
}
