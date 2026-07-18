import { ShieldCheck } from "lucide-react";

import { ComplianceWatchlist } from "@/components/calendar/compliance-watchlist";
import { upcomingComplianceItems } from "@/lib/compliance/calendar";
import { complianceDates2026 } from "@/lib/compliance/rules";

export const revalidate = 3600;

export default function CalendarPage() {
  const now = new Date();
  const upcoming = upcomingComplianceItems(complianceDates2026, now);

  return (
    <div>
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Calendar · verified official dates
        </p>
        <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.035em] sm:text-6xl">
          Deadlines worth checking
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          A small watchlist, not a universal compliance calendar. Every date has
          an official source and applicability note; scheme correspondence and
          current terms remain authoritative.
        </p>
      </header>

      <section className="grid gap-3 border-b border-border py-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Upcoming verified dates
          </p>
          <p className="mt-1 font-semibold">{upcoming.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Next review</p>
          <p className="mt-1 font-semibold">When DAFM publishes a change</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last source check</p>
          <p className="mt-1 font-semibold">18 July 2026</p>
        </div>
      </section>

      <ComplianceWatchlist items={upcoming} />

      <section className="flex gap-4 py-7 text-sm leading-6 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          AgriView intentionally omits dates that are stale, conditional, or not
          maintained from a primary source. Check MyAgFood, current terms,
          adviser guidance, and your own correspondence.
        </p>
      </section>
    </div>
  );
}
