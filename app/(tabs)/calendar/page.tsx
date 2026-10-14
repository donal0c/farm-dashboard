import { ShieldCheck } from "lucide-react";

import { ComplianceWatchlist } from "@/components/calendar/compliance-watchlist";
import { Fact, PageIntro } from "@/components/ui/page-intro";
import { upcomingComplianceItems } from "@/lib/compliance/calendar";
import { complianceDates2026 } from "@/lib/compliance/rules";

export const revalidate = 3600;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default function CalendarPage() {
  const now = new Date();
  const upcoming = upcomingComplianceItems(complianceDates2026, now);
  const lastVerified = complianceDates2026
    .map((item) => item.verifiedAt)
    .sort()
    .at(-1);
  const next = upcoming[0];

  return (
    <div>
      <PageIntro
        title="Deadlines worth checking"
        lede="A small, hand-verified watchlist, not a universal compliance calendar. Every date carries its official source and who it applies to; scheme correspondence and current terms remain authoritative."
      />

      <dl className="grid gap-4 border-b border-rule py-5 sm:grid-cols-3">
        <Fact label="Upcoming verified dates">{upcoming.length}</Fact>
        <Fact label="Next date">
          {next
            ? `${next.title} · ${next.days === 0 ? "today" : `in ${next.days} ${next.days === 1 ? "day" : "days"}`}`
            : "None published"}
        </Fact>
        <Fact label="Watchlist last verified">
          {lastVerified ? formatDate(lastVerified) : "Not recorded"}
        </Fact>
      </dl>

      <ComplianceWatchlist items={upcoming} />

      <section className="flex gap-3 py-7 text-sm leading-6 text-muted-foreground">
        <ShieldCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="max-w-[70ch]">
          AgriView intentionally omits dates that are stale, conditional, or not
          maintained from a primary source. Check MyAgFood, current terms,
          adviser guidance, and your own correspondence.
        </p>
      </section>
    </div>
  );
}
