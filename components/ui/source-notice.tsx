import { CircleAlert, RefreshCw, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type SourceNoticeProps = {
  tone: "unavailable" | "partial" | "empty" | "info";
  title: string;
  /** Short state name shown under the title, e.g. "Forecast unavailable". */
  status?: string;
  detail: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  children?: React.ReactNode;
};

/**
 * One voice for every degraded, partial, or empty source state. Says what is
 * missing, what was not inferred, and offers a retry when one is possible.
 */
export function SourceNotice({
  tone,
  title,
  status,
  detail,
  retryLabel = "Check again",
  onRetry,
  className,
  children,
}: SourceNoticeProps) {
  const Icon = tone === "unavailable" ? TriangleAlert : CircleAlert;
  const iconTone =
    tone === "unavailable"
      ? "text-act"
      : tone === "partial"
        ? "text-check"
        : "text-muted-foreground";
  return (
    <section
      aria-live="polite"
      className={cn(
        "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 rounded-md border border-dashed border-rule px-4 py-4",
        tone === "unavailable" && "bg-act/5",
        tone === "partial" && "bg-check/8",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 h-[18px] w-[18px]", iconTone)}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">{title}</h3>
        {status ? (
          <p
            className={cn(
              "mt-1 text-xs font-semibold",
              tone === "unavailable" ? "text-act" : "text-check",
            )}
          >
            {status}
          </p>
        ) : null}
        <p className="mt-1 max-w-[64ch] text-sm leading-6 text-muted-foreground">
          {detail}
        </p>
        {children}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
