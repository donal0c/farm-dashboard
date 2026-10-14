import { cn } from "@/lib/utils";

/**
 * Page opening: a display heading, one sentence of promise, and an optional
 * action. No kicker; the heading carries its own weight.
 */
export function PageIntro({
  title,
  lede,
  action,
  className,
}: {
  title: string;
  lede?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid gap-4 border-b border-rule pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="display display-lg max-w-[16ch]">{title}</h1>
        {lede ? (
          <p className="mt-4 max-w-[62ch] text-base leading-7 text-muted-foreground">
            {lede}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SectionHeading({
  title,
  lede,
  aside,
  as: Tag = "h2",
  id,
  className,
}: {
  title: string;
  lede?: string;
  aside?: React.ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        <Tag id={id} className="display display-sm">
          {title}
        </Tag>
        {lede ? (
          <p className="mt-2 max-w-[60ch] text-sm leading-6 text-muted-foreground">
            {lede}
          </p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/** A fact pair for compact metadata rows. */
export function Fact({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold leading-5 [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}
