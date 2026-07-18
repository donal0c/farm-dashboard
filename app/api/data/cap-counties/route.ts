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

export async function GET() {
  try {
    return NextResponse.json(await getCapCountySnapshot());
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<CapCountyAggregate[]>({
        source,
        scope: "national",
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
