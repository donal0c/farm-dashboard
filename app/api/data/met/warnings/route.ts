import { NextResponse } from "next/server";

export async function GET() {
  const response = await fetch(
    "https://www.met.ie/Open_Data/json/warning_IRELAND.json",
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "warnings upstream failed" },
      { status: 502 },
    );
  }

  return NextResponse.json(await response.json());
}
