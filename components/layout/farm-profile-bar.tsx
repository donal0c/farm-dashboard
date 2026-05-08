"use client";

import { SlidersHorizontal } from "lucide-react";

import {
  enterpriseLabels,
  enterpriseOptions,
  weekFocusLabels,
  weekFocusOptions,
} from "@/lib/farm-plan";
import { useUiStore } from "@/lib/store/ui-store";

export function FarmProfileBar() {
  const enterprise = useUiStore((state) => state.enterprise);
  const weekFocus = useUiStore((state) => state.weekFocus);
  const farmCounty = useUiStore((state) => state.farmCounty);
  const setEnterprise = useUiStore((state) => state.setEnterprise);
  const setWeekFocus = useUiStore((state) => state.setWeekFocus);

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Farm working profile</h2>
            <p className="text-xs text-muted-foreground">
              {enterpriseLabels[enterprise]} enterprise ·{" "}
              {weekFocusLabels[weekFocus]} focus ·{" "}
              {farmCounty ?? "county not set"}
            </p>
          </div>
        </div>

        <label className="grid gap-1 text-xs text-muted-foreground">
          Enterprise
          <select
            value={enterprise}
            onChange={(event) =>
              setEnterprise(event.target.value as typeof enterprise)
            }
            className="h-9 min-w-36 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {enterpriseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-muted-foreground">
          This week
          <select
            value={weekFocus}
            onChange={(event) =>
              setWeekFocus(event.target.value as typeof weekFocus)
            }
            className="h-9 min-w-36 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {weekFocusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
