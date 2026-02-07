import { NextResponse } from "next/server";

type CapRow = {
  co?: string;
  z?: number;
};

type CountyAggregate = {
  county: string;
  beneficiaries: number;
  totalPayment: number;
};

let capRowsCache: CapRow[] | null = null;

async function getCapRows() {
  if (capRowsCache) {
    return capRowsCache;
  }

  const response = await fetch(
    "https://capben-ui.apps.services.agriculture.gov.ie/assets/capben/2024.json",
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  capRowsCache = (await response.json()) as CapRow[];
  return capRowsCache;
}

export async function GET() {
  const rows = await getCapRows();
  if (!rows) {
    return NextResponse.json(
      { error: "CAP dataset unavailable" },
      { status: 502 },
    );
  }

  const map = new Map<string, CountyAggregate>();

  for (const row of rows) {
    const county = (row.co ?? "UNKNOWN").toUpperCase();
    const prev = map.get(county) ?? {
      county,
      beneficiaries: 0,
      totalPayment: 0,
    };

    prev.beneficiaries += 1;
    prev.totalPayment += row.z ?? 0;

    map.set(county, prev);
  }

  const aggregates = Array.from(map.values()).sort(
    (a, b) => b.totalPayment - a.totalPayment,
  );
  return NextResponse.json(aggregates);
}
