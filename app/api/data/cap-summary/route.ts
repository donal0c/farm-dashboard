import { NextResponse } from "next/server";

import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import {
  type CapCountyAggregate,
  getCapCountySnapshot,
} from "@/lib/sources/cap";

const source = {
  id: "dafm-cap-beneficiaries-2025",
  label: "DAFM CAP beneficiaries 2025",
  url: "https://capben-ui.apps.services.agriculture.gov.ie/assets/capben/2025.json",
};

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
        : `No ${county} aggregate was present in the ${source.label} release.`,
    });
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<CapCountyAggregate>({
        source,
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
