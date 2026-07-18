import { CalendarCheck, ExternalLink } from "lucide-react";

const watchItems = [
  {
    title: "Nitrates and spreading rules",
    detail:
      "Confirm the current closed-period, weather, soil, buffer, and holding rules before application.",
    source: "DAFM Nitrates",
    href: "https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/collections/nitrates/",
  },
  {
    title: "CAP scheme dates",
    detail:
      "Use the official scheme page and your own correspondence for application and amendment deadlines.",
    source: "DAFM CAP",
    href: "https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/policies/common-agricultural-policy-cap/",
  },
];

export default function CalendarPage() {
  return (
    <div>
      <header className="border-b border-border pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Calendar
        </p>
        <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.03em]">
          Dates worth checking
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          AgriView will only show dated rules that can be traced to a maintained
          official source. This first surface keeps uncertain dates out.
        </p>
      </header>
      <div className="divide-y divide-border border-b border-border">
        {watchItems.map((item) => (
          <article
            key={item.title}
            className="grid gap-3 py-6 sm:grid-cols-[1fr_auto]"
          >
            <div className="flex gap-4">
              <CalendarCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-editorial text-2xl font-medium">
                  {item.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </div>
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="ml-9 flex min-h-11 items-center gap-2 text-sm font-semibold text-primary sm:ml-0"
            >
              {item.source}
              <ExternalLink className="h-4 w-4" />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
