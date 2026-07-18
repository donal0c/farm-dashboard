import { NextResponse } from "next/server";
import {
  availableSnapshot,
  unavailableSnapshot,
} from "@/lib/contracts/source-snapshot";
import { jsonStatDatasetSchema } from "@/lib/cso/jsonstat";
import { fetchValidated } from "@/lib/server/fetch-validated";
import { sourceCacheControl } from "@/lib/server/source-cache-policy";

const ALLOWED = new Set(["AEA01", "AHM05"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await params;
  const code = dataset.toUpperCase();

  if (!ALLOWED.has(code)) {
    return NextResponse.json(
      { error: "dataset not supported" },
      { status: 400 },
    );
  }

  const url = `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/${code}/JSON-stat/2.0/en`;
  const source = {
    id: `cso-${code.toLowerCase()}`,
    label: `CSO ${code}`,
    url,
  };
  try {
    const { data } = await fetchValidated(url, {
      sourceId: source.id,
      schema: jsonStatDatasetSchema,
      timeoutMs: 10_000,
      maxAttempts: 2,
      init: { next: { revalidate: 6 * 60 * 60 } },
    });
    const fetchedAt = new Date();
    return NextResponse.json(
      availableSnapshot({
        data,
        source,
        scope: "national",
        status: "cached",
        observedAt: null,
        fetchedAt: fetchedAt.toISOString(),
        staleAfter: new Date(
          fetchedAt.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        warning:
          "CSO series are national and lagged. They are context, not a farm price or income estimate.",
        confidence: "authoritative",
      }),
      { headers: { "Cache-Control": sourceCacheControl.cso } },
    );
  } catch (error) {
    return NextResponse.json(
      unavailableSnapshot({
        source,
        scope: "national",
        staleAfter: new Date().toISOString(),
        warning:
          error instanceof Error
            ? error.message
            : `CSO ${code} is temporarily unavailable.`,
        confidence: "authoritative",
      }),
      { status: 502 },
    );
  }
}
