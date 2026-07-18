"use client";

import { CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import {
  type ComplianceListFilter,
  type ComplianceListSort,
  filterAndSortComplianceItems,
} from "@/lib/compliance/calendar";
import type { ComplianceDate } from "@/lib/compliance/rules";

type UpcomingComplianceDate = ComplianceDate & { days: number };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

const categoryLabels: Record<ComplianceListFilter, string> = {
  all: "All verified dates",
  scheme: "Scheme",
  safety: "Safety",
  investment: "Investment",
  record: "Records",
};

export function ComplianceWatchlist({
  items,
}: {
  items: UpcomingComplianceDate[];
}) {
  const [filter, setFilter] = useState<ComplianceListFilter>("all");
  const [sort, setSort] = useState<ComplianceListSort>("soonest");
  const availableFilters = useMemo(
    () =>
      (Object.keys(categoryLabels) as ComplianceListFilter[]).filter(
        (category) =>
          category === "all" ||
          items.some((item) => item.category === category),
      ),
    [items],
  );
  const visibleItems = useMemo(
    () => filterAndSortComplianceItems(items, filter, sort),
    [filter, items, sort],
  );

  return (
    <section aria-labelledby="watchlist-title">
      <div className="grid gap-4 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_220px_180px] sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Working watchlist
          </p>
          <h2
            id="watchlist-title"
            className="font-editorial mt-1 text-3xl font-medium"
          >
            Dates that may need preparation
          </h2>
          <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
            Showing {visibleItems.length} of {items.length} verified upcoming
            dates.
          </p>
        </div>
        <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
          Filter by purpose
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ComplianceListFilter)
            }
            className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {availableFilters.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
          Sort dates
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as ComplianceListSort)
            }
            className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="soonest">Soonest first</option>
            <option value="latest">Latest first</option>
          </select>
        </label>
      </div>

      <div className="border-b border-border">
        {visibleItems.length ? (
          visibleItems.map((item, index) => (
            <article
              key={item.id}
              className="grid gap-5 border-b border-border py-7 last:border-b-0 lg:grid-cols-[110px_minmax(0,1fr)_220px]"
            >
              <div>
                <p
                  data-days-until
                  className="font-editorial text-3xl font-medium text-primary"
                >
                  {item.days}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {item.days === 1 ? "day away" : "days away"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {index === 0 && sort === "soonest" ? (
                    <CalendarClock className="h-4 w-4 text-warning" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {categoryLabels[item.category]} · {formatDate(item.date)}
                  </p>
                </div>
                <h3 className="font-editorial mt-2 text-3xl font-medium">
                  {item.title}
                </h3>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Verified {formatDate(item.verifiedAt)}
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
          ))
        ) : (
          <div className="py-10">
            <p className="font-editorial text-2xl font-medium">
              {items.length
                ? "No dates match this filter"
                : "No upcoming dates in this watchlist"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {items.length
                ? "Choose another purpose to return to the verified watchlist."
                : "No verified future date is currently published in this deliberately small list."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
