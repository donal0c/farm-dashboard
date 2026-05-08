import { NextResponse } from "next/server";

import { type ExportPayload, loadExportsPayload } from "@/lib/data/exports";

let cache: ExportPayload | null = null;

export async function GET() {
  if (!cache) {
    cache = await loadExportsPayload(fetch);
  }

  return NextResponse.json(cache);
}
