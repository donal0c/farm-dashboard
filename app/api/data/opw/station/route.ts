import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const csvFile = searchParams.get("csv_file");

  if (!csvFile) {
    return NextResponse.json(
      { error: "csv_file is required" },
      { status: 400 },
    );
  }

  const response = await fetch(`http://waterlevel.ie${csvFile}`, {
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "opw station csv failed" },
      { status: 502 },
    );
  }

  const text = await response.text();
  const rows = text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [datetime, value] = line.split(",");
      return { datetime, value: Number.parseFloat(value) };
    })
    .filter((row) => Number.isFinite(row.value))
    .slice(-240);

  return NextResponse.json(rows);
}
