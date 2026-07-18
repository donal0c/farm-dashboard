import { NextResponse } from "next/server";

import { unavailableSnapshot } from "@/lib/contracts/source-snapshot";
import { fetchValidated } from "@/lib/server/fetch-validated";
import { sourceCacheControl } from "@/lib/server/source-cache-policy";
import {
  MET_WARNINGS_SOURCE,
  type MetWarning,
  normalizeMetWarnings,
  rawMetWarningsSchema,
} from "@/lib/sources/met-warnings";

export async function GET() {
  try {
    const { data } = await fetchValidated(
      "https://www.met.ie/Open_Data/json/warning_IRELAND.json",
      {
        sourceId: MET_WARNINGS_SOURCE.id,
        schema: rawMetWarningsSchema,
        timeoutMs: 8_000,
        maxAttempts: 2,
        init: { next: { revalidate: 10 * 60 } },
      },
    );
    return NextResponse.json(normalizeMetWarnings(data), {
      headers: { "Cache-Control": sourceCacheControl.metWarnings },
    });
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot<MetWarning[]>({
        source: MET_WARNINGS_SOURCE,
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
