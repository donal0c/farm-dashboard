import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

/** Shared empty state for evidence pages that need a saved farm pin. */
export function NeedsFarm({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="panel mx-auto max-w-xl px-6 py-8 sm:px-8 sm:py-10">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="display display-md mt-5">{title}</h1>
      <p className="mt-3 max-w-[52ch] text-base leading-7 text-muted-foreground">
        {detail}
      </p>
      <Link
        href="/this-week"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Set up the farm
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <output className="block animate-pulse" aria-label={label}>
      <span className="block h-12 w-2/3 rounded-sm bg-muted" />
      <span className="mt-4 block h-4 w-1/2 rounded-sm bg-muted" />
      <span className="mt-8 block h-72 rounded-md bg-muted" />
    </output>
  );
}
