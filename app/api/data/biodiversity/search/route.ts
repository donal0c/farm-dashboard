import { NextResponse } from "next/server";

import {
  type BiodiversityRecord,
  searchBiodiversityRecords,
} from "@/lib/data/biodiversity";
import records from "@/lib/data/nbdc-sample-records.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "53.5");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "-7.5");
  const radiusKm = Number.parseFloat(searchParams.get("radiusKm") ?? "50");

  return NextResponse.json(
    searchBiodiversityRecords(
      records as BiodiversityRecord[],
      lat,
      lng,
      radiusKm,
    ),
  );
}
