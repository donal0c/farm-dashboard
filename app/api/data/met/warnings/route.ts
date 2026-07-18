import { NextResponse } from "next/server";

import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import {
  type MetWarning,
  normalizeMetWarnings,
} from "@/lib/sources/met-warnings";

const source = {
  id: "met-eireann-warnings",
  label: "Met Éireann warnings",
  url: "https://www.met.ie/warnings-today.html",
};

export async function GET() {
  try {
    const response = await fetch(
      "https://www.met.ie/Open_Data/json/warning_IRELAND.json",
      {
        next: { revalidate: 10 * 60 },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) {
      throw new Error(`Met Éireann warnings returned ${response.status}.`);
    }
    return NextResponse.json(
      normalizeMetWarnings((await response.json()) as []),
    );
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<MetWarning[]>({
        source,
        scope: "national",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : "Met Éireann warnings are temporarily unavailable.",
        confidence: "authoritative",
      }),
      { status: 502 },
    );
  }
}
