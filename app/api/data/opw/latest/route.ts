import { NextResponse } from "next/server";

export async function GET() {
  const response = await fetch("http://waterlevel.ie/geojson/latest/", {
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "opw latest upstream failed" },
      { status: 502 },
    );
  }

  return NextResponse.json(await response.json());
}
