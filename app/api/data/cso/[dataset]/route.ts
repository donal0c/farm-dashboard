import { NextResponse } from "next/server";

const ALLOWED = new Set([
  "AEA01",
  "ACA03",
  "AHM05",
  "AAA09",
  "ADM01",
  "AKM03",
  "AJM09",
  "PFSA03",
  "EAA01",
]);

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
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json({ error: "CSO upstream failed" }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
