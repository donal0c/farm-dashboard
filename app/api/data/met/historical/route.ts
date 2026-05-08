import { NextResponse } from "next/server";

import { loadHistoricalWeather } from "@/lib/data/met-historical";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId") ?? "3904";
  const from = searchParams.get("from") ?? "2018-01-01";
  const to = searchParams.get("to") ?? "2025-12-31";

  return NextResponse.json(
    await loadHistoricalWeather(stationId, from, to, fetch),
  );
}
