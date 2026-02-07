import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type KpiVariant = "default" | "success" | "info" | "warning" | "destructive";

const iconBgClasses: Record<KpiVariant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

const borderClasses: Record<KpiVariant, string> = {
  default: "border-l-primary/40",
  success: "border-l-success/40",
  info: "border-l-info/40",
  warning: "border-l-warning/40",
  destructive: "border-l-destructive/40",
};

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: KpiVariant;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  trend,
  trendUp,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border border-l-[3px] bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        borderClasses[variant],
        className,
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          iconBgClasses[variant],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-card-foreground">
          {value}
        </p>
        {trend ? (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trendUp === true && "text-success",
              trendUp === false && "text-destructive",
              trendUp === undefined && "text-muted-foreground",
            )}
          >
            {trend}
          </p>
        ) : null}
      </div>
    </div>
  );
}
