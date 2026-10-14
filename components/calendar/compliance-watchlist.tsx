"use client";

import { CalendarPlus, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { SectionHeading } from "@/components/ui/page-intro";
import {
  type ComplianceListFilter,
  type ComplianceListSort,
  filterAndSortComplianceItems,
} from "@/lib/compliance/calendar";
import { buildDeadlineIcs, deadlineIcsFileName } from "@/lib/compliance/ics";
import type { ComplianceDate } from "@/lib/compliance/rules";
import { cn } from "@/lib/utils";

type UpcomingComplianceDate = ComplianceDate & { days: number };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
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

function downloadIcs(item: ComplianceDate) {
  const blob = new Blob([buildDeadlineIcs(item)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = deadlineIcsFileName(item);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

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
      <div className="grid gap-4 border-b border-rule py-6 sm:grid-cols-[minmax(0,1fr)_200px_170px] sm:items-end">
        <SectionHeading
          id="watchlist-title"
          title="Dates that may need preparation"
          lede={`Showing ${visibleItems.length} of ${items.length} verified upcoming dates.`}
        />
        <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
          Filter by purpose
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ComplianceListFilter)
            }
            className="control"
          >
            {availableFilters.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
          Sort dates
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as ComplianceListSort)
            }
            className="control"
          >
            <option value="soonest">Soonest first</option>
            <option value="latest">Latest first</option>
          </select>
        </label>
      </div>

      <div className="divide-y divide-rule border-b border-rule">
        {visibleItems.length ? (
          visibleItems.map((item, index) => {
            const soon = item.days <= 14;
            return (
              <article
                key={item.id}
                className="grid gap-5 py-7 lg:grid-cols-[minmax(0,1fr)_220px]"
              >
                <div className="min-w-0">
                  <h3 className="display display-sm max-w-[30ch]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] font-semibold text-muted-foreground">
                    {categoryLabels[item.category]} · {formatDate(item.date)} ·{" "}
                    <span
                      data-days-until={item.days}
                      className={cn(soon ? "text-check" : "text-primary")}
                    >
                      {item.days === 0
                        ? "today"
                        : `${item.days} ${item.days === 1 ? "day" : "days"} away`}
                      {index === 0 && sort === "soonest" ? " · next" : ""}
                    </span>
                  </p>
                  <p className="mt-3 max-w-[64ch] text-sm leading-6 text-muted-foreground">
                    <strong className="font-semibold text-foreground">
                      Applies to:
                    </strong>{" "}
                    {item.applicability}
                  </p>
                  <p className="mt-2 max-w-[64ch] text-sm leading-6 text-muted-foreground">
                    {item.action}
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadIcs(item)}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-input bg-sheet px-3 text-[13px] font-semibold hover:border-foreground/40"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Add to my calendar
                  </button>
                </div>
                <div className="border-t border-rule pt-4 text-xs text-muted-foreground lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <dl className="grid content-start gap-2">
                    <div className="flex justify-between gap-3">
                      <dt>Published</dt>
                      <dd className="font-semibold text-foreground">
                        {formatShortDate(item.source.publishedAt)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Verified</dt>
                      <dd className="font-semibold text-foreground">
                        {formatShortDate(item.verifiedAt)}
                      </dd>
                    </div>
                  </dl>
                  <a
                    href={item.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    {item.source.label}
                    <ExternalLink
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </article>
            );
          })
        ) : (
          <div className="py-10">
            <p className="display display-sm">
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
