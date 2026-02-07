import { NextResponse } from "next/server";

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function normalizeDate(dateValue: string) {
  const [day, mon, year] = dateValue.toLowerCase().split("-");
  const month = MONTHS[mon];
  if (!month || !day || !year) {
    return null;
  }
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function toNumber(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId") ?? "3904";
  const from = searchParams.get("from") ?? "2018-01-01";
  const to = searchParams.get("to") ?? "2025-12-31";

  const response = await fetch(
    `https://cli.fusio.net/cli/climate_data/webdata/dly${stationId}.csv`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "historical upstream failed" },
      { status: 502 },
    );
  }

  const text = await response.text();
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.startsWith("date,ind,maxtp"),
  );

  if (headerIndex < 0) {
    return NextResponse.json(
      { error: "unexpected historical format" },
      { status: 502 },
    );
  }

  const dataLines = lines.slice(headerIndex + 1).filter(Boolean);
  const rows = dataLines
    .map((line) => {
      const cols = line.split(",");
      const normalizedDate = normalizeDate(cols[0]);
      if (!normalizedDate) {
        return null;
      }

      return {
        date: normalizedDate,
        maxTemp: toNumber(cols[2]),
        minTemp: toNumber(cols[4]),
        rainfall: toNumber(cols[8]),
        soilTemp: toNumber(cols[19]),
        smd: toNumber(cols[23]),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => row.date >= from && row.date <= to)
    .slice(-800);

  return NextResponse.json(rows);
}
