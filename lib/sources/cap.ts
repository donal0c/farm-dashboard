import { unstable_cache } from "next/cache";

import type { SourceSnapshot } from "@/lib/contracts/source-snapshot";

type CapRow = {
  co?: string;
  z?: number;
};

export type CapCountyAggregate = {
  county: string;
  beneficiaries: number;
  totalPayment: number;
};

const CAP_YEAR = 2025;
const CAP_URL = `https://capben-ui.apps.services.agriculture.gov.ie/assets/capben/${CAP_YEAR}.json`;

async function fetchAndAggregateCap() {
  const response = await fetch(CAP_URL, {
    next: { revalidate: 30 * 24 * 60 * 60 },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`DAFM CAP returned ${response.status}.`);
  }

  const rows = (await response.json()) as CapRow[];
  const aggregates = new Map<string, CapCountyAggregate>();

  for (const row of rows) {
    const county = (row.co ?? "").trim().toUpperCase();
    const payment = Number(row.z);
    if (!county || !Number.isFinite(payment)) continue;

    const current = aggregates.get(county) ?? {
      county,
      beneficiaries: 0,
      totalPayment: 0,
    };
    current.beneficiaries += 1;
    current.totalPayment += payment;
    aggregates.set(county, current);
  }

  if (!aggregates.size) {
    throw new Error("DAFM CAP returned no valid county aggregates.");
  }

  return Array.from(aggregates.values()).sort(
    (a, b) => b.totalPayment - a.totalPayment,
  );
}

const getCachedCapAggregates = unstable_cache(
  fetchAndAggregateCap,
  [`cap-${CAP_YEAR}-county-aggregates`],
  {
    revalidate: 30 * 24 * 60 * 60,
    tags: [`cap-${CAP_YEAR}`],
  },
);

export async function getCapCountySnapshot(): Promise<
  SourceSnapshot<CapCountyAggregate[]>
> {
  const fetchedAt = new Date();
  const data = await getCachedCapAggregates();
  return {
    data,
    source: {
      id: `dafm-cap-beneficiaries-${CAP_YEAR}`,
      label: `DAFM CAP beneficiaries ${CAP_YEAR}`,
      url: CAP_URL,
    },
    scope: "national",
    status: "cached",
    observedAt: null,
    fetchedAt: fetchedAt.toISOString(),
    staleAfter: new Date(
      fetchedAt.getTime() + 31 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    warning:
      "County totals are normalized from the official beneficiary release. They are not a farm payment estimate.",
    confidence: "authoritative",
  };
}
