import { NextResponse } from "next/server";

import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import {
  CAP_SOURCE,
  type CapCountyAggregate,
  getCapCountySnapshot,
} from "@/lib/sources/cap";

export async function GET(request: Request) {
  const county = new URL(request.url).searchParams
    .get("county")
    ?.trim()
    .toUpperCase();
  if (!county) {
    return NextResponse.json({ error: "county is required" }, { status: 400 });
  }

  try {
    const snapshot = await getCapCountySnapshot();
    const aggregate =
      snapshot.data?.find((item) => item.county === county) ?? null;
    return NextResponse.json({
      ...snapshot,
      data: aggregate,
      scope: "county",
      warning: aggregate
        ? snapshot.warning
        : `No ${county} aggregate was present in the ${CAP_SOURCE.label} release.`,
    });
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<CapCountyAggregate>({
        source: CAP_SOURCE,
        scope: "county",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "DAFM CAP is temporarily unavailable.",
        confidence: "authoritative",
      }),
      { status: 502 },
    );
  }
}
