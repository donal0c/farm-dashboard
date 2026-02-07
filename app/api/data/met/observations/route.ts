import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station") ?? "dublin-airport";

  const response = await fetch(
    `https://prodapi.metweb.ie/observations/${station}/today`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "observations upstream failed" },
      { status: 502 },
    );
  }

  return NextResponse.json(await response.json());
}
