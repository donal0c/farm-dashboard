import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "warning" | "danger";

const toneClasses: Record<NoticeTone, string> = {
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning-foreground",
  danger: "border-destructive/35 bg-destructive/10 text-destructive",
};

const toneIcons: Record<NoticeTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

export function DataNotice({
  title,
  children,
  tone = "info",
  className,
}: {
  title: string;
  children: React.ReactNode;
  tone?: NoticeTone;
  className?: string;
}) {
  const Icon = toneIcons[tone];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-sm",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function DecisionPanel({
  title = "What to do next",
  items,
  compact = false,
}: {
  title?: string;
  items: Array<{ label: string; detail: string; tone?: NoticeTone }>;
  compact?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
          decision support
        </span>
      </div>
      <div
        className={cn(
          "grid gap-3",
          compact ? "md:grid-cols-2" : "md:grid-cols-3",
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border/80 bg-background/45 p-3"
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ChartState({
  isLoading,
  isError,
  isEmpty,
  errorLabel = "Feed unavailable",
  emptyLabel = "No data returned for this selection.",
  loadingLabel = "Loading feed...",
  minHeightClassName = "min-h-64",
  children,
}: {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  errorLabel?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  minHeightClassName?: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground",
          minHeightClassName,
        )}
      >
        {loadingLabel}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-destructive/40 bg-destructive/10 px-4 text-center text-sm text-muted-foreground",
          minHeightClassName,
        )}
      >
        {errorLabel}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground",
          minHeightClassName,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return children;
}
