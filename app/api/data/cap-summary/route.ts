import { NextResponse } from "next/server";

type CapRow = {
  co?: string;
  z?: number;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const county = (searchParams.get("county") ?? "").toUpperCase();

  if (!county) {
    return NextResponse.json({ error: "county is required" }, { status: 400 });
  }

  const rows = await getCapRows();
  if (!rows) {
    return NextResponse.json(
      { error: "CAP dataset unavailable" },
      { status: 502 },
    );
  }

  let beneficiaryCount = 0;
  let totalPayment = 0;

  for (const row of rows) {
    if ((row.co ?? "").toUpperCase() !== county) {
      continue;
    }

    beneficiaryCount += 1;
    totalPayment += row.z ?? 0;
  }

  return NextResponse.json({
    county,
    beneficiaryCount,
    totalPayment,
  });
}
