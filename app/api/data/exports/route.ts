import { NextResponse } from "next/server";

const EXPORTS_URL =
  "https://opendata.agriculture.gov.ie/dataset/725bb5d4-0007-4e88-a575-fc9ee6ddeba2/resource/f1a03a1d-9c30-42b1-9c8e-3cbd3d7a9ce6/download/agri-food-exports-208-2022_21032023.csv";

type ExportRow = {
  category: string;
  year: number;
  amountEur: number;
  quantityTonnes: number;
};

let cache: ExportRow[] | null = null;

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const body = lines.slice(1);

  const rows: ExportRow[] = [];

  for (const line of body) {
    const [_, category, year, amount, quantity] = line.split(",");

    rows.push({
      category,
      year: Number.parseInt(year, 10),
      amountEur: Number.parseFloat(amount),
      quantityTonnes: Number.parseFloat(quantity),
    });
  }

  return rows;
}

export async function GET() {
  if (!cache) {
    const response = await fetch(EXPORTS_URL, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { error: "exports upstream failed" },
        { status: 502 },
      );
    }

    const text = await response.text();
    cache = parseCsv(text);
  }

  return NextResponse.json(cache);
}
