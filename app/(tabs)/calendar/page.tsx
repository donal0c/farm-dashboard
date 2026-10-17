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
        lede="A small, hand-verified watchlist with an official source for every date. Scheme correspondence and current terms remain authoritative."
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

      <section className="flex gap-3 py-6">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="footnote max-w-[70ch]">
          Dates that are stale, conditional or unsourced are left out on
          purpose. Check MyAgFood, current terms and your own correspondence.
        </p>
      </section>
    </div>
  );
}
