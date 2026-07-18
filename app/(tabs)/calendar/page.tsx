import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import { upcomingComplianceItems } from "@/lib/compliance/calendar";
import { complianceDates2026 } from "@/lib/compliance/rules";

export const revalidate = 3600;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

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

      <section className="border-b border-border">
        {upcoming.map((item, index) => (
          <article
            key={item.id}
            className="grid gap-5 border-b border-border py-7 last:border-b-0 lg:grid-cols-[110px_minmax(0,1fr)_220px]"
          >
            <div>
              <p className="font-editorial text-3xl font-medium text-primary">
                {item.days}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {item.days === 1 ? "day" : "days"}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                {index === 0 ? (
                  <CalendarClock className="h-4 w-4 text-warning" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {item.category} · {formatDate(item.date)}
                </p>
              </div>
              <h2 className="font-editorial mt-2 text-3xl font-medium">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                <strong className="font-semibold text-foreground">
                  Applies to:
                </strong>{" "}
                {item.applicability}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.action}
              </p>
            </div>
            <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <p className="text-xs text-muted-foreground">
                Published {formatDate(item.source.publishedAt)}
              </p>
              <a
                href={item.source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
              >
                {item.source.label}
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            </div>
          </article>
        ))}
      </section>

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
