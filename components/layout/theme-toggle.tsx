"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  surface?: "page" | "sidebar";
};

export function ThemeToggle({ surface = "sidebar" }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const className = cn(
    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
    surface === "sidebar"
      ? "w-full text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground"
      : "w-auto text-muted-foreground hover:bg-muted hover:text-foreground",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button type="button" className={className} aria-label="Theme">
        <Sun className="h-4 w-4" />
        <span className={surface === "page" ? "sr-only" : undefined}>
          Theme
        </span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className={surface === "page" ? "sr-only" : undefined}>
        {isDark ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
}
