"use client";

import { ChevronDown, LocateFixed } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { SourceStatus } from "@/lib/contracts/source-snapshot";
import {
  enterpriseLabels,
  enterpriseOptions,
  weekFocusLabels,
  weekFocusOptions,
} from "@/lib/farm-plan";
import {
  type FarmEnterprise,
  type FarmLocation,
  type FarmWeekFocus,
  useUiStore,
} from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

function statusText(status?: SourceStatus, isFetching?: boolean) {
  if (isFetching && !status) return "Loading";
  if (isFetching) return "Refreshing";
  if (!status) return "Not checked";
  return {
    live: "Current",
    cached: "Cached",
    partial: "Partial",
    stale: "Stale",
    unavailable: "Unavailable",
  }[status];
}

export function SourceDot({
  label,
  status,
  isFetching,
}: {
  label: string;
  status?: SourceStatus;
  isFetching?: boolean;
}) {
  const tone =
    status === "unavailable"
      ? "bg-act"
      : status === "partial" || status === "stale" || !status
        ? "bg-check"
        : "bg-success";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={cn("h-1.5 w-1.5 rounded-full", tone)}
        aria-hidden="true"
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">
        {statusText(status, isFetching)}
      </span>
    </span>
  );
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function farmTitle(location: FarmLocation) {
  const county = location.county ? titleCase(location.county) : null;
  if (location.routingKey && county)
    return `${location.routingKey} · ${county}`;
  return location.routingKey ?? county ?? location.label;
}

/**
 * The week's framing line and the farm context that shapes the brief. The
 * enterprise and focus are editable in place so the brief updates as the
 * farmer changes them; nothing here leaves the browser.
 */
export function FarmContextBar({
  location,
  weekStart,
  sources,
}: {
  location: FarmLocation;
  weekStart: Date;
  sources: React.ReactNode;
}) {
  const enterprise = useUiStore((state) => state.enterprise);
  const weekFocus = useUiStore((state) => state.weekFocus);
  const setEnterprise = useUiStore((state) => state.setEnterprise);
  const setWeekFocus = useUiStore((state) => state.setWeekFocus);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (window.location.hash === "#farm-context") {
      setOpen(true);
      requestAnimationFrame(() =>
        document.getElementById("farm-context")?.scrollIntoView({
          block: "start",
        }),
      );
    }
  }, []);

  const weekLabel = new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(weekStart);

  return (
    <header
      id="farm-context"
      className="scroll-mt-20 border-b border-rule pb-5"
    >
      <p className="meta">
        Brief for the week from{" "}
        <span className="font-editorial text-[15px] italic text-foreground">
          {weekLabel}
        </span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="display display-md min-w-0 [overflow-wrap:anywhere]">
          {farmTitle(location)}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pb-1 text-[13px]">
          {sources}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">
            {enterpriseLabels[enterprise]}
          </span>{" "}
          ·{" "}
          <span className="font-semibold text-foreground">
            {weekFocusLabels[weekFocus]}
          </span>{" "}
          focus
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary hover:bg-accent/60"
        >
          {open ? "Done" : "Change"}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {open ? (
        <div
          id={panelId}
          className="panel sheet-enter mt-3 grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            Main enterprise
            <select
              value={enterprise}
              onChange={(event) =>
                setEnterprise(event.target.value as FarmEnterprise)
              }
              className="control"
            >
              {enterpriseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            This week’s focus
            <select
              value={weekFocus}
              onChange={(event) =>
                setWeekFocus(event.target.value as FarmWeekFocus)
              }
              className="control"
            >
              {weekFocusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/my-land"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-sheet px-3 text-sm font-semibold hover:border-foreground/40"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Move farm pin
          </Link>
          <p className="meta sm:col-span-3">
            Saved pin {location.latitude.toFixed(4)},{" "}
            {location.longitude.toFixed(4)} · stays in this browser. These
            choices tune which rules apply and which national series Markets
            shows.
          </p>
        </div>
      ) : null}
    </header>
  );
}
