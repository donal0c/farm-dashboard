import { ArrowRight, CircleCheck, Eye, ShieldCheck } from "lucide-react";

import type { BriefPriority } from "@/lib/briefing/types";
import { cn } from "@/lib/utils";

export type MarkKind = BriefPriority | "boundary";

export const markStyle: Record<
  MarkKind,
  {
    label: string;
    icon: typeof ArrowRight;
    disc: string;
    text: string;
    tint: string;
  }
> = {
  act: {
    label: "Act",
    icon: ArrowRight,
    disc: "bg-act text-act-foreground",
    text: "text-act",
    tint: "bg-act/8",
  },
  check: {
    label: "Check",
    icon: CircleCheck,
    disc: "bg-check text-check-foreground",
    text: "text-check",
    tint: "bg-check/10",
  },
  watch: {
    label: "Watch",
    icon: Eye,
    disc: "bg-watch text-watch-foreground",
    text: "text-watch",
    tint: "bg-watch/8",
  },
  boundary: {
    label: "Boundary",
    icon: ShieldCheck,
    disc: "bg-muted text-foreground",
    text: "text-muted-foreground",
    tint: "bg-muted/60",
  },
};

/**
 * Notebook margin mark: a filled disc with the semantic icon and the word
 * beneath it. Meaning is carried by icon and text together; colour is never
 * the only signal.
 */
export function PriorityMark({
  kind,
  size = "md",
  className,
}: {
  kind: MarkKind;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const style = markStyle[kind];
  const Icon = style.icon;
  const disc =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon =
    size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full",
          disc,
          style.disc,
        )}
        aria-hidden="true"
      >
        <Icon className={icon} strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          "text-[11px] font-semibold leading-none tracking-[0.02em]",
          style.text,
        )}
      >
        {style.label}
      </span>
    </div>
  );
}
