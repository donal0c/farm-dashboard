import { NextResponse } from "next/server";

export async function GET() {
  const response = await fetch("https://prodapi.metweb.ie/agriculture/report", {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "ag report upstream failed" },
      { status: 502 },
    );
  }

  return NextResponse.json(await response.json());
}
